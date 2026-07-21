// Aplica uma migration em transação única contra o banco do .env.backup.
// Uso: node scripts/apply-migration.mjs migrations/001_xxx.sql
// Regras do projeto: migrations ESTRITAMENTE ADITIVAS, backup verde antes.
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/apply-migration.mjs migrations/<arquivo>.sql");
  process.exit(1);
}
const sqlPath = path.isAbsolute(file) ? file : path.join(ROOT, file);
const sql = readFileSync(sqlPath, "utf8").replace(/^﻿/, "");

// Trava de segurança: bloqueia operações destrutivas por inspeção do texto
// (comentários removidos antes — o cabeçalho de rollback documenta DROPs)
const soCodigo = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const proibidos = /\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+\S+\s+DROP)\b/i;
if (proibidos.test(soCodigo)) {
  console.error("[ERRO] Migration contém operação destrutiva — proibido pelo protocolo.");
  process.exit(1);
}
if (/000_baseline/.test(sqlPath)) {
  console.error("[ERRO] 000_baseline é documentação, não executável.");
  process.exit(1);
}

const raw = readFileSync(path.join(ROOT, ".env.backup"), "utf8").replace(/^﻿/, "");
const url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length).trim();

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log(`Migration aplicada com sucesso: ${path.basename(sqlPath)}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error(`[ERRO] Rollback automático — ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
