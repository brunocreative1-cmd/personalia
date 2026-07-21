// Prova de recuperação (Sessão 10): compara ORIGEM (somente leitura) com o
// DESTINO restaurado — contagens, hash canônico por tabela (linhas ordenadas),
// auth, fingerprints de segurança (policies/funções/triggers/grants/RLS) e os
// dois hashes canônicos aprovados do produto. NUNCA imprime valores de linha.
// Uso: node scripts/verify-restore.mjs --target-db-url <url do descartável>
// Exit 0 somente com TUDO igual; qualquer divergência => exit 1.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };

const TARGET = opt("--target-db-url");
if (!TARGET) { console.error("[ERRO] informe --target-db-url"); process.exit(1); }

function parseEnvFile(file) {
  const raw = readFileSync(file, "utf8").replace(/^﻿/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq !== -1) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}
const ORIGEM = parseEnvFile(path.join(ROOT, ".env.backup")).DATABASE_URL;
if (new URL(TARGET).hostname === new URL(ORIGEM).hostname) {
  console.error("[ERRO] destino == origem; verificação exige um descartável distinto.");
  process.exit(1);
}

// hashes canônicos aprovados (adendo 1 da sessão) — valores fixos de aceite
const HASH_MUSCULOS_APROVADO = "3bbcde46a70016a255c1a3b4daa0a2f23791942b788f53226ae01d6958d116d4";
const HASH_ORIENTACOES_APROVADO = "c77df6c88a56e26c4eb0b640adac072a02e96edbf26af6477bd58ea31f52cd8e";

async function conectar(url, comSsl) {
  const c = new pg.Client({ connectionString: url, ssl: comSsl ? { rejectUnauthorized: false } : undefined, statement_timeout: 120000 });
  await c.connect();
  await c.query("BEGIN");
  await c.query("SET TRANSACTION READ ONLY");
  // sessão determinística p/ serialização idêntica nos dois lados
  await c.query("SET LOCAL timezone = 'UTC'");
  await c.query("SET LOCAL datestyle = 'ISO'");
  await c.query("SET LOCAL extra_float_digits = 3");
  return c;
}

const origem = await conectar(ORIGEM, true);
const destino = await conectar(TARGET, false);
const q = async (c, sql) => (await c.query(sql)).rows;
const um = async (c, sql) => (await c.query(sql)).rows[0];

let falhas = 0;
const linhaOk = (nome, a, b) => {
  const ok = a === b;
  if (!ok) falhas++;
  console.log(` ${ok ? "ok  " : "DIFF"} ${nome}${ok ? "" : ` — origem=${a} destino=${b}`}`);
  return ok;
};

// digest: extensions.digest (pgcrypto) existe nos dois lados
const HASH_TABELA = (schema, t) => `
  SELECT count(*)::int AS n,
         encode(extensions.digest(convert_to(coalesce(string_agg(j, E'\n' ORDER BY j), ''), 'UTF8'), 'sha256'), 'hex') AS h
    FROM (SELECT to_jsonb(t.*)::text AS j FROM ${schema}."${t}" t) s`;

console.log("== 1. tabelas de aplicação: contagem + hash canônico de linhas ==");
const tabelas = (await q(origem, `SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1`)).map((r) => r.t);
for (const t of tabelas) {
  const a = await um(origem, HASH_TABELA("public", t));
  const b = await um(destino, HASH_TABELA("public", t));
  const ok = a.n === b.n && a.h === b.h;
  if (!ok) falhas++;
  console.log(` ${ok ? "ok  " : "DIFF"} public.${t} (${a.n} linhas)${ok ? "" : ` — origem n=${a.n} h=${a.h.slice(0, 12)} | destino n=${b.n} h=${b.h.slice(0, 12)}`}`);
}

console.log("\n== 2. auth: contagem + hash (valores jamais impressos) ==");
for (const t of ["users", "identities"]) {
  const a = await um(origem, HASH_TABELA("auth", t));
  const b = await um(destino, HASH_TABELA("auth", t));
  const ok = a.n === b.n && a.h === b.h;
  if (!ok) falhas++;
  console.log(` ${ok ? "ok  " : "DIFF"} auth.${t} (${a.n} linhas, hash ${ok ? "igual" : "DIFERENTE"})`);
}

console.log("\n== 3. fingerprints de segurança ==");
const FINGERPRINTS = {
  "policies RLS": `SELECT encode(extensions.digest(convert_to(coalesce(string_agg(x, E'\n' ORDER BY x), ''), 'UTF8'), 'sha256'), 'hex') AS h FROM (
     SELECT schemaname||'|'||tablename||'|'||policyname||'|'||cmd||'|'||coalesce(array_to_string(roles,','),'')||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'') AS x
       FROM pg_policies WHERE schemaname='public') s`,
  "funções (public)": `SELECT encode(extensions.digest(convert_to(coalesce(string_agg(x, E'\n' ORDER BY x), ''), 'UTF8'), 'sha256'), 'hex') AS h FROM (
     SELECT p.proname||'|'||pg_get_function_identity_arguments(p.oid)||'|'||pg_get_functiondef(p.oid) AS x
       FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') s`,
  "triggers (public, com estado ENABLE/DISABLE)": `SELECT encode(extensions.digest(convert_to(coalesce(string_agg(x, E'\n' ORDER BY x), ''), 'UTF8'), 'sha256'), 'hex') AS h FROM (
     SELECT c.relname||'|'||t.tgname||'|'||t.tgenabled::text||'|'||pg_get_triggerdef(t.oid) AS x
       FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal) s`,
  "grants por coluna (anon/authenticated/service_role)": `SELECT encode(extensions.digest(convert_to(coalesce(string_agg(x, E'\n' ORDER BY x), ''), 'UTF8'), 'sha256'), 'hex') AS h FROM (
     SELECT table_name||'|'||column_name||'|'||grantee||'|'||privilege_type AS x
       FROM information_schema.column_privileges
      WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role')) s`,
  "grants por tabela (anon/authenticated/service_role)": `SELECT encode(extensions.digest(convert_to(coalesce(string_agg(x, E'\n' ORDER BY x), ''), 'UTF8'), 'sha256'), 'hex') AS h FROM (
     SELECT table_name||'|'||grantee||'|'||privilege_type AS x
       FROM information_schema.table_privileges
      WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role')) s`,
  "estado ENABLE/FORCE RLS por tabela": `SELECT encode(extensions.digest(convert_to(coalesce(string_agg(x, E'\n' ORDER BY x), ''), 'UTF8'), 'sha256'), 'hex') AS h FROM (
     SELECT c.relname||'|'||c.relrowsecurity||'|'||c.relforcerowsecurity AS x
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r') s`,
  "trigger custom de auth (on_auth_user_created)": `SELECT encode(extensions.digest(convert_to(coalesce(string_agg(x, E'\n' ORDER BY x), ''), 'UTF8'), 'sha256'), 'hex') AS h FROM (
     SELECT c.relname||'|'||t.tgname||'|'||t.tgenabled::text||'|'||pg_get_triggerdef(t.oid) AS x
       FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
       JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
      WHERE n.nspname IN ('auth','storage') AND NOT t.tgisinternal AND pn.nspname='public') s`,
};
for (const [nome, sql] of Object.entries(FINGERPRINTS)) {
  linhaOk(nome, (await um(origem, sql)).h, (await um(destino, sql)).h);
}

console.log("\n== 4. produto: flags e hashes canônicos aprovados ==");
const FLAGS = {
  "programas.modo_teste=true": `SELECT count(*)::int AS n FROM public.programas WHERE modo_teste`,
  "execucoes.simulado=true": `SELECT count(*)::int AS n FROM public.execucoes WHERE simulado`,
  "programa_publicacoes (linhas)": `SELECT count(*)::int AS n FROM public.programa_publicacoes`,
  "consentimentos (linhas)": `SELECT count(*)::int AS n FROM public.consentimentos`,
  "atendimentos (linhas)": `SELECT count(*)::int AS n FROM public.atendimentos`,
  "triagens_parq (linhas)": `SELECT count(*)::int AS n FROM public.triagens_parq`,
};
for (const [nome, sql] of Object.entries(FLAGS)) {
  linhaOk(nome, (await um(origem, sql)).n, (await um(destino, sql)).n);
}

const SQL_HASH_MUSCULOS = `SELECT encode(extensions.digest(
    string_agg(em.exercicio_id::text || '|' || m.slug || '|' || em.papel::text, E'\n'
               ORDER BY em.exercicio_id::text, m.slug, em.papel::text), 'sha256'), 'hex') AS h
  FROM public.exercicio_musculos em JOIN public.musculos m ON m.id = em.musculo_id`;
const SQL_HASH_ORIENTACOES = `SELECT encode(extensions.digest(
    string_agg(e.id::text || '|' || array_to_string(e.orientacoes_base,'|') || '|' || e.erro_comum, E'\n'
               ORDER BY e.id::text), 'sha256'), 'hex') AS h
  FROM public.exercicios e WHERE e.orientacoes_base IS NOT NULL`;
linhaOk("hash canônico APROVADO — mapa muscular (destino)", HASH_MUSCULOS_APROVADO, (await um(destino, SQL_HASH_MUSCULOS)).h);
linhaOk("hash canônico APROVADO — orientações/erro_comum (destino)", HASH_ORIENTACOES_APROVADO, (await um(destino, SQL_HASH_ORIENTACOES)).h);

await origem.query("ROLLBACK"); await origem.end();
await destino.query("ROLLBACK"); await destino.end();

console.log(`\n${falhas === 0 ? "PROVA DE RECUPERAÇÃO: TUDO IGUAL" : `${falhas} DIVERGÊNCIA(S) — restore REPROVADO`}`);
process.exit(falhas === 0 ? 0 : 1);
