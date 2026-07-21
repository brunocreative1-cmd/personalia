// Restore de desastre (Sessão 10) — SOMENTE em banco descartável.
// Uso: node scripts/restore.mjs --target-db-url <url> [--arquivo <caminho.enc>] [--local-ensaio]
//   --local-ensaio: aplica auth_storage_schema.sql (necessário em Postgres puro;
//                   NUNCA usar contra projeto Supabase hospedado).
//
// Travas anti-desastre:
//   - recusa alvo com o MESMO host da origem (.env.backup) — produção jamais;
//   - alvo remoto exige --permitir-remoto explícito (default: só localhost);
//   - ON_ERROR_STOP=1 em todos os passos; data.sql em transação única com
//     session_replication_role=replica (ordem oficial roles -> schema -> dados).
//
// psql roda em container postgres:17 (mesma major da origem) via Docker;
// nenhuma senha/URL é impressa.
import { spawnSync } from "node:child_process";
import { createDecipheriv, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_DIR = "C:\\Users\\willg\\backups-personalia";
const CRED_TARGET = "PersonalIA-BackupKey";
const t0 = Date.now();

const args = process.argv.slice(2);
const opt = (nome) => {
  const i = args.indexOf(nome);
  return i === -1 ? null : args[i + 1];
};
const flag = (nome) => args.includes(nome);

let TARGET = opt("--target-db-url") ?? "";
let ORIGEM_HOST = "";
const redact = (s) => String(s ?? "").replaceAll(TARGET || "\0", "<TARGET_URL>");
function fail(msg) { console.error(`\n[ERRO] ${redact(msg)}`); process.exit(1); }

function parseEnvFile(file) {
  const raw = readFileSync(file, "utf8").replace(/^﻿/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

// ------------------------------------------------ travas de alvo
if (!TARGET) fail("informe --target-db-url (banco DESCARTÁVEL, nunca produção).");
let alvo;
try { alvo = new URL(TARGET); } catch { fail("--target-db-url inválida."); }
try {
  ORIGEM_HOST = new URL(parseEnvFile(path.join(ROOT, ".env.backup")).DATABASE_URL).hostname;
} catch { /* sem .env.backup ainda assim protege via allowlist local */ }
if (ORIGEM_HOST && alvo.hostname === ORIGEM_HOST) {
  fail("alvo tem o MESMO host da ORIGEM (produção). Restore recusado.");
}
const localTargets = ["localhost", "127.0.0.1", "host.docker.internal"];
if (!localTargets.includes(alvo.hostname) && !flag("--permitir-remoto")) {
  fail("alvo não-local exige --permitir-remoto explícito (e nunca pode ser a produção).");
}

// ------------------------------------------------ chave + decriptação
const PS_CREDREAD = `
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class CredMan {
  [DllImport("advapi32", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredReadW(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32")] static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential)] struct CREDENTIAL {
    public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes;
    public IntPtr TargetAlias; public IntPtr UserName; }
  public static string Read(string target) {
    IntPtr p;
    if (!CredReadW(target, 1, 0, out p)) throw new Exception("credencial nao encontrada: " + target);
    var c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
    var s = Marshal.PtrToStringUni(c.CredentialBlob, c.CredentialBlobSize / 2);
    CredFree(p); return s; }
}
'@; [CredMan]::Read('${CRED_TARGET}')`;

const rKey = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", PS_CREDREAD], { encoding: "utf8" });
const hex = (rKey.stdout ?? "").trim();
if (rKey.status !== 0 || !/^[0-9a-f]{64}$/.test(hex)) {
  fail(`chave indisponível no Credential Manager (target ${CRED_TARGET}) — ver docs/DESASTRE.md.`);
}
const chave = Buffer.from(hex, "hex");

const arquivo = opt("--arquivo") ??
  readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".tar.gz.enc")).sort().map((f) => path.join(BACKUP_DIR, f)).at(-1);
if (!arquivo) fail("nenhum .tar.gz.enc encontrado.");
console.log(`restaurando: ${path.basename(arquivo)}`);

const blob = readFileSync(arquivo);
if (blob.subarray(0, 8).toString() !== "PIAENC1\0") fail("formato desconhecido (magic).");
const de = createDecipheriv("aes-256-gcm", chave, blob.subarray(8, 20));
de.setAuthTag(blob.subarray(20, 36));
let claro;
try { claro = Buffer.concat([de.update(blob.subarray(36)), de.final()]); }
catch { fail("falha de autenticação GCM — arquivo corrompido ou chave errada."); }
console.log(`decriptado: ${(claro.length / 1024).toFixed(1)} KB (sha256 ${createHash("sha256").update(claro).digest("hex").slice(0, 16)}…)`);

const work = path.join(BACKUP_DIR, `restore-work-${Date.now()}`);
mkdirSync(work, { recursive: true });
// O work dir contém dumps DECRIPTADOS (dado de saúde): precisa sumir em
// QUALQUER saída — sucesso, fail() (process.exit) ou exceção não tratada.
// O hook de exit cobre todos os caminhos; o rmSync do fim segue como está.
process.on("exit", () => {
  try { rmSync(work, { recursive: true, force: true }); } catch {}
});
writeFileSync(path.join(work, "pacote.tar.gz"), claro);
const rTar = spawnSync("tar", ["-xzf", path.join(work, "pacote.tar.gz"), "-C", work], { encoding: "utf8" });
if (rTar.status !== 0) fail(`tar: ${rTar.stderr}`);

const manifest = JSON.parse(readFileSync(path.join(work, "manifest.json"), "utf8"));
for (const [f, sha] of Object.entries(manifest.sha256_pre_criptografia)) {
  const got = createHash("sha256").update(readFileSync(path.join(work, f))).digest("hex");
  if (got !== sha) fail(`sha256 divergente em ${f} após extração.`);
}
console.log("sha256 dos 4 dumps extraídos conferem com o manifest");

// ------------------------------------------------ psql via docker
// localhost visto de dentro do container = host.docker.internal
const targetNoContainer = TARGET.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal");
const workDocker = work.replaceAll("\\", "/");

function psql(rotulo, arquivoSql, { env = null, singleTx = false } = {}) {
  const ini = Date.now();
  console.log(`psql: ${rotulo}...`);
  const dockerArgs = ["run", "--rm", "-v", `${workDocker}:/r:ro`];
  if (env) dockerArgs.push("-e", env);
  dockerArgs.push("postgres:17-alpine", "psql", targetNoContainer, "-v", "ON_ERROR_STOP=1", "-q");
  if (singleTx) dockerArgs.push("-1");
  dockerArgs.push("-f", `/r/${arquivoSql}`);
  const r = spawnSync("docker", dockerArgs, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) fail(`${rotulo}: exit ${r.status}\n${redact(r.stderr).slice(0, 3000)}`);
  console.log(`  ok (${((Date.now() - ini) / 1000).toFixed(1)}s)`);
}

// ANDAIME DO ENSAIO LOCAL: num projeto Supabase hospedado as roles da
// plataforma já existem (roles.sql só faz ALTER). Em Postgres puro, criamos
// a baseline padrão antes — isso NÃO é "recriar internals na força": é o
// substituto declarado do que a plataforma provê no destino real.
if (flag("--local-ensaio")) {
  writeFileSync(path.join(work, "local_baseline_roles.sql"), `
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','supabase_admin',
    'supabase_auth_admin','supabase_storage_admin','supabase_replication_admin',
    'supabase_read_only_user','dashboard_user','pgbouncer'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', r);
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
END $$;
GRANT anon, authenticated, service_role TO authenticator;

-- schema extensions + extensões que a plataforma provê (origem: pgcrypto,
-- uuid-ossp, pg_stat_statements em "extensions"; supabase_vault fica de fora —
-- não existe em Postgres puro e nada do dump de public depende dele)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- publication que o serviço Realtime da plataforma cria no projeto hospedado
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;
`, "utf8");
  psql("baseline da plataforma (roles + extensions) — ensaio local", "local_baseline_roles.sql");
}

// ordem oficial: roles -> (auth/storage no ensaio local) -> schema -> dados
psql("roles.sql", "roles.sql");
if (flag("--local-ensaio")) psql("auth_storage_schema.sql (ensaio local)", "auth_storage_schema.sql");
// ENSAIO LOCAL: extensões proprietárias da plataforma (vault etc.) não
// existem em Postgres puro e nada do schema do app depende delas. São
// comentadas SÓ no ensaio — o restore hospedado usa schema.sql intacto.
let schemaArq = "schema.sql";
if (flag("--local-ensaio")) {
  const EXT_PLATAFORMA = /^CREATE EXTENSION IF NOT EXISTS "?(supabase_vault|pgsodium|pg_graphql|pg_net|pgjwt)"?/;
  const puladas = [];
  const filtrado = readFileSync(path.join(work, "schema.sql"), "utf8").split("\n").map((l) => {
    if (EXT_PLATAFORMA.test(l)) { puladas.push(l.trim()); return `-- (ensaio local: extensão de plataforma pulada) ${l}`; }
    return l;
  }).join("\n");
  writeFileSync(path.join(work, "schema.local.sql"), filtrado, "utf8");
  schemaArq = "schema.local.sql";
  if (puladas.length > 0) console.log(`ensaio local — extensões de plataforma puladas: ${puladas.join(" | ")}`);
}
psql("schema.sql", schemaArq);
if (existsSync(path.join(work, "auth_storage_changes.sql"))) {
  psql("auth_storage_changes.sql (customizações auth/storage)", "auth_storage_changes.sql");
}
psql("data.sql (transação única, session_replication_role=replica)", "data.sql",
  { env: "PGOPTIONS=-c session_replication_role=replica", singleTx: true });

rmSync(work, { recursive: true, force: true });
const rto = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nRESTORE CONCLUÍDO em ${rto}s (RTO medido desta execução).`);
console.log("valide com: node scripts/verify-restore.mjs --target-db-url <mesma url>");
