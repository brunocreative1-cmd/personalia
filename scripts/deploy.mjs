// Deploy FTP do personal-ia-os para Hostinger (public_html/app).
// Uso: node scripts/deploy.mjs
// Credenciais: lidas de .env.deploy na raiz do repo (nunca hardcoded).
import { Client } from "basic-ftp";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const ENV_FILE = path.join(ROOT, ".env.deploy");
// ATENCAO: a conta FTP esta enraizada na RAIZ DO DOMINIO (o "least privilege"
// da Hostinger nao restringiu ao subdiretorio). Portanto /public_html aqui e o
// public_html REAL do wsdigital.site — o app vive em /public_html/app.
const REMOTE_DIR = "/public_html/app";
// Artefatos locais que nao pertencem ao site (ex.: zip da tentativa de upload manual)
const EXCLUDE = [/\.zip$/i];

function fail(msg) {
  console.error(`\n[ERRO] ${msg}`);
  process.exit(1);
}

function loadEnv() {
  if (!existsSync(ENV_FILE)) fail(`.env.deploy nao encontrado em ${ENV_FILE}`);
  // strip BOM: o Notepad/PowerShell costuma salvar UTF-8 com BOM e isso quebra a primeira chave
  const raw = readFileSync(ENV_FILE, "utf8").replace(/^﻿/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    env[key] = value;
  }
  for (const key of ["FTP_HOST", "FTP_USER", "FTP_PASS"]) {
    if (!env[key] || env[key].startsWith("PREENCHER")) {
      fail(`${key} nao preenchido no .env.deploy — pegue as credenciais no hPanel (Arquivos -> Contas FTP).`);
    }
  }
  return env;
}

function listLocalFiles(dir, base = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.some((rx) => rx.test(entry.name))) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...listLocalFiles(path.join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files;
}

async function connect(env) {
  // Tenta FTPS (TLS explicito) primeiro; se o servidor nao suportar, cai para FTP simples.
  for (const secure of [true, false]) {
    const client = new Client(30000);
    try {
      await client.access({
        host: env.FTP_HOST,
        user: env.FTP_USER,
        password: env.FTP_PASS,
        port: 21,
        secure,
        // Hostinger compartilhado usa certificado do servidor, nao do dominio do cliente
        secureOptions: secure ? { rejectUnauthorized: false } : undefined,
      });
      console.log(`Conectado via ${secure ? "FTPS (TLS explicito)" : "FTP"} em ${env.FTP_HOST}`);
      return client;
    } catch (err) {
      client.close();
      if (secure) console.log(`FTPS indisponivel (${err.message}) — tentando FTP simples...`);
      else throw err;
    }
  }
}

async function uploadDir(client, localDir, remoteLabel, stats) {
  for (const entry of readdirSync(localDir, { withFileTypes: true })) {
    if (EXCLUDE.some((rx) => rx.test(entry.name))) {
      console.log(`  (ignorado) ${entry.name}`);
      continue;
    }
    const localPath = path.join(localDir, entry.name);
    const remotePath = `${remoteLabel}/${entry.name}`;
    if (entry.isDirectory()) {
      await client.ensureDir(entry.name); // cria e entra no diretorio remoto
      await uploadDir(client, localPath, remotePath, stats);
      await client.cdup();
    } else {
      try {
        await client.uploadFrom(localPath, entry.name);
        stats.ok++;
        console.log(`  ok  ${remotePath}`);
      } catch (err) {
        stats.failed.push(remotePath);
        console.error(`  FALHOU  ${remotePath}: ${err.message}`);
      }
    }
  }
}

async function main() {
  const env = loadEnv();

  if (!existsSync(DIST)) fail(`dist/ nao encontrado — rode "npm run build" antes do deploy.`);
  if (!existsSync(path.join(DIST, ".htaccess"))) {
    fail(`dist/.htaccess nao encontrado — o SPA vai quebrar sem ele. Recrie o .htaccess antes do deploy.`);
  }

  const expected = listLocalFiles(DIST);
  console.log(`${expected.length} arquivos em dist/ para enviar -> ${REMOTE_DIR}\n`);

  const client = await connect(env);
  const stats = { ok: 0, failed: [] };
  try {
    await client.ensureDir(REMOTE_DIR); // cria se preciso e entra
    // Guarda anti-desastre: nunca limpar um diretorio que pareca ser raiz de
    // conta/dominio (foi assim que a landing foi apagada em 2026-07-13).
    const remoteNames = (await client.list()).map((e) => e.name);
    if (remoteNames.includes("public_html") || remoteNames.includes("DO_NOT_UPLOAD_HERE")) {
      fail(
        `O diretorio remoto "${REMOTE_DIR}" contem public_html/DO_NOT_UPLOAD_HERE — ` +
          `parece raiz de conta/dominio, nao a pasta do app. Limpeza ABORTADA.`
      );
    }
    console.log(`Limpando conteudo remoto de ${REMOTE_DIR}...`);
    await client.clearWorkingDir();
    console.log("Enviando arquivos:");
    await uploadDir(client, DIST, "", stats);
  } finally {
    client.close();
  }

  console.log(`\n===== RESUMO =====`);
  console.log(`Enviados: ${stats.ok}/${expected.length} arquivos`);
  if (stats.failed.length > 0) {
    console.log(`Falharam (${stats.failed.length}):`);
    for (const f of stats.failed) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("Deploy concluido com sucesso.");
}

main().catch((err) => fail(err.message));
