// Inspeção READ-ONLY de uma tabela: colunas, RLS, policies, grants, triggers.
// Uso: node scripts/inspect-schema.mjs <tabela> [<tabela2> ...]
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tabelas = process.argv.slice(2);
if (tabelas.length === 0) {
  console.error("Uso: node scripts/inspect-schema.mjs <tabela> [...]");
  process.exit(1);
}
const raw = readFileSync(path.join(ROOT, ".env.backup"), "utf8").replace(/^﻿/, "");
const url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length).trim();
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const t of tabelas) {
  console.log(`\n===== public.${t} =====`);
  const [{ rls } = {}] = (await client.query(
    `SELECT relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=$1`, [t])).rows;
  console.log(`RLS: ${rls ?? "TABELA NAO EXISTE"}`);
  if (rls === undefined) continue;

  for (const c of (await client.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])).rows) {
    console.log(` col ${c.column_name} ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}`);
  }
  for (const p of (await client.query(
    `SELECT policyname, cmd, qual, with_check FROM pg_policies
      WHERE schemaname='public' AND tablename=$1 ORDER BY policyname`, [t])).rows) {
    console.log(` policy ${p.policyname} [${p.cmd}] USING ${p.qual ?? "-"} CHECK ${p.with_check ?? "-"}`);
  }
  for (const g of (await client.query(
    `SELECT grantee, privilege_type, count(*)::int AS cols FROM information_schema.column_privileges
      WHERE table_schema='public' AND table_name=$1 AND grantee IN ('anon','authenticated')
      GROUP BY 1,2 ORDER BY 1,2`, [t])).rows) {
    console.log(` grant ${g.grantee}: ${g.privilege_type} (${g.cols} colunas)`);
  }
  for (const tr of (await client.query(
    `SELECT trigger_name, action_timing, string_agg(event_manipulation, ',') AS ev
       FROM information_schema.triggers
      WHERE event_object_schema='public' AND event_object_table=$1 GROUP BY 1,2`, [t])).rows) {
    console.log(` trigger ${tr.trigger_name} ${tr.action_timing} ${tr.ev}`);
  }
}
await client.end();
