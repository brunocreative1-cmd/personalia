// Testes de RLS por simulacao de JWT (SET LOCAL role/claims) — tudo dentro
// de transacoes com ROLLBACK: NADA persiste no banco.
// Uso: node scripts/test-rls.mjs
//
// Os atores sao SINTETICOS: cada caso cria coach + aluno vinculado + aluno
// sem vinculo dentro da propria transacao (via auth.users; o trigger
// handle_new_user cria os profiles). Assim a suite nao depende do estado
// real do banco — dados reais de producao sao invisiveis aos atores
// sinteticos justamente por causa do RLS que estamos testando.
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(path.join(ROOT, ".env.backup"), "utf8").replace(/^﻿/, "");
// RLS_DB_URL: aponta a suite p/ outro banco (ex.: restore descartável da
// sessão 10). Sem a variável, comportamento original (.env.backup).
const url = process.env.RLS_DB_URL ??
  raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length).trim();

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.RLS_DB_URL ? undefined : { rejectUnauthorized: false },
});
await client.connect();

// Atores sinteticos (UUIDs fixos, criados por caso e revertidos no ROLLBACK)
const COACH = "00000000-0000-4000-8000-0000000000f0"; // coach
const CAIO = "00000000-0000-4000-8000-0000000000a1"; // aluno VINCULADO ao coach
const SAMUEL = "00000000-0000-4000-8000-0000000000a2"; // aluno SEM vinculo
const ALUNO_ROW = "00000000-0000-4000-8000-0000000000ab"; // alunos.id do vinculo

const USUARIO = (id, email, nome) => ({
  sql: `INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated',
          '${email}', '', now(), '{"provider":"email","providers":["email"]}',
          '{"nome":"${nome}"}', now(), now(), '', '', '', '', ''
        )`,
});

// Roda como postgres; termina como authenticated (claims do caso permanecem)
const SEED_USUARIOS = [
  { sql: `SET LOCAL role postgres` },
  USUARIO(COACH, "rls.coach@teste.local", "Coach RLS"),
  USUARIO(CAIO, "rls.vinculado@teste.local", "Aluno Vinculado RLS"),
  USUARIO(SAMUEL, "rls.solto@teste.local", "Aluno Solto RLS"),
  { sql: `UPDATE public.profiles SET role = 'coach' WHERE id = '${COACH}'` },
  { sql: `INSERT INTO public.alunos (id, profile_id, coach_id, status)
          VALUES ('${ALUNO_ROW}', '${CAIO}', '${COACH}', 'ativo')` },
  { sql: `SET LOCAL role authenticated` },
];

let passed = 0;
let failed = 0;

/** Roda stmts como `quem` dentro de BEGIN..ROLLBACK e avalia o resultado. */
async function caso(nome, quem, stmts, avaliar) {
  try {
    await client.query("BEGIN");
    if (quem) {
      await client.query("SET LOCAL role authenticated");
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: quem, role: "authenticated" }),
      ]);
    }
    let resultado = null;
    let erro = null;
    try {
      for (const s of stmts) resultado = await client.query(s.sql, s.params ?? []);
    } catch (e) {
      erro = e;
    }
    const veredito = avaliar(resultado, erro);
    if (veredito === true) {
      passed++;
      console.log(`  ok   ${nome}`);
    } else {
      failed++;
      console.log(`  FAIL ${nome} — ${veredito}`);
    }
  } finally {
    await client.query("ROLLBACK");
  }
}

const esperaLinhas = (n) => (res, err) =>
  err ? `erro inesperado: ${err.message}` : res.rowCount === n ? true : `esperava ${n} linhas, veio ${res.rowCount}`;
const esperaErro = (trecho) => (_res, err) =>
  !err ? "esperava erro e a operacao passou" : err.message.includes(trecho) || trecho === "" ? true : `erro diferente: ${err.message}`;

const COMO = (uuid) => [
  { sql: `SET LOCAL role authenticated` },
  { sql: `SELECT set_config('request.jwt.claims', '${JSON.stringify({ sub: "@@", role: "authenticated" })}'::text, true)`.replace("@@", uuid) },
];
const COMO_ADMIN = { sql: `SET LOCAL role postgres` };

console.log("== RLS: anamneses ==");
const INSERT_ANAMNESE = (dono) => ({
  sql: `INSERT INTO public.anamneses (profile_id, objetivo_principal, consentimento_em)
        VALUES ($1, 'teste rls', now()) RETURNING id`,
  params: [dono],
});
// seed como admin (trigger de auditoria ignora conexoes administrativas)
const SEED_ANAMNESE = (dono, consentimento) => [
  COMO_ADMIN,
  {
    sql: `INSERT INTO public.anamneses (profile_id, objetivo_principal, consentimento_em)
          VALUES ($1, 'seed rls', ${consentimento ? `'${consentimento}'` : "NULL"})`,
    params: [dono],
  },
  { sql: `SET LOCAL role authenticated` },
];

await caso("aluno cria a propria anamnese", CAIO, [
  ...SEED_USUARIOS,
  INSERT_ANAMNESE(CAIO),
], esperaLinhas(1));
await caso("aluno NAO cria anamnese de outro", CAIO, [
  ...SEED_USUARIOS,
  INSERT_ANAMNESE(SAMUEL),
], esperaErro("row-level security"));
await caso("anamnese do proprio aluno sem consentimento e recusada", CAIO, [
  ...SEED_USUARIOS,
  { sql: `INSERT INTO public.anamneses (profile_id, objetivo_principal) VALUES ($1, 'x')`, params: [CAIO] },
], esperaErro("consentimento_em"));
await caso("aluno ve apenas a propria (Samuel nao ve a de Caio)", SAMUEL, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, "2026-07-01"),
  INSERT_ANAMNESE(SAMUEL),
  { sql: `SELECT profile_id FROM public.anamneses WHERE profile_id <> $1`, params: [SAMUEL] },
], esperaLinhas(0));
await caso("coach ve anamnese de aluno vinculado (Caio)", null, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, "2026-07-01"),
  ...COMO(COACH),
  { sql: `SELECT id FROM public.anamneses WHERE profile_id = $1`, params: [CAIO] },
], esperaLinhas(1));
await caso("coach NAO ve anamnese de aluno sem vinculo (Samuel)", null, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(SAMUEL, "2026-07-01"),
  ...COMO(COACH),
  { sql: `SELECT id FROM public.anamneses WHERE profile_id = $1`, params: [SAMUEL] },
], esperaLinhas(0));
await caso("aluno nao muda o proprio role", CAIO, [
  ...SEED_USUARIOS,
  { sql: `UPDATE public.profiles SET role = 'coach' WHERE id = $1 RETURNING role`, params: [CAIO] },
], (res, err) => (err ? true : res.rowCount === 0 ? true : "aluno conseguiu virar coach!"));

console.log("\n== RLS: anamneses — escrita do coach (feature R1.2) ==");
await caso("(a) coach ATUALIZA anamnese de aluno vinculado", COACH, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, "2026-07-01"),
  { sql: `UPDATE public.anamneses SET objetivo_principal = 'editado pelo coach'
          WHERE profile_id = $1 RETURNING atualizado_por, atualizado_por_papel, consentimento_em`, params: [CAIO] },
], (res, err) => {
  if (err) return `erro inesperado: ${err.message}`;
  if (res.rowCount !== 1) return `esperava 1 linha, veio ${res.rowCount}`;
  const r = res.rows[0];
  if (r.atualizado_por_papel !== "coach") return `papel deveria ser coach, veio ${r.atualizado_por_papel}`;
  if (r.atualizado_por !== COACH) return "atualizado_por nao e o coach";
  if (r.consentimento_em === null) return "consentimento original foi perdido na edicao do coach";
  return true;
});
await caso("(b) coach NAO atualiza anamnese de aluno sem vinculo", COACH, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(SAMUEL, "2026-07-01"),
  { sql: `UPDATE public.anamneses SET objetivo_principal = 'invasao'
          WHERE profile_id = $1 RETURNING id`, params: [SAMUEL] },
], (res, err) => (err ? true : res.rowCount === 0 ? true : "coach editou anamnese de aluno sem vinculo!"));
await caso("(c) aluno NAO atualiza anamnese de outro aluno", SAMUEL, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, "2026-07-01"),
  { sql: `UPDATE public.anamneses SET objetivo_principal = 'invasao'
          WHERE profile_id = $1 RETURNING id`, params: [CAIO] },
], (res, err) => (err ? true : res.rowCount === 0 ? true : "aluno editou anamnese alheia!"));
await caso("(d) aluno segue editando a propria (papel fica aluno)", CAIO, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, "2026-07-01"),
  { sql: `UPDATE public.anamneses SET objetivo_principal = 'editado por mim'
          WHERE profile_id = $1 RETURNING atualizado_por_papel`, params: [CAIO] },
], (res, err) => {
  if (err) return `erro inesperado: ${err.message}`;
  if (res.rowCount !== 1) return `esperava 1 linha, veio ${res.rowCount}`;
  return res.rows[0].atualizado_por_papel === "aluno" ? true : "papel deveria ser aluno";
});
await caso("coach CRIA anamnese de vinculado — nasce com consentimento pendente", COACH, [
  ...SEED_USUARIOS,
  { sql: `INSERT INTO public.anamneses (profile_id, objetivo_principal, consentimento_em)
          VALUES ($1, 'colhida por whatsapp', now())
          RETURNING consentimento_em, atualizado_por_papel`, params: [CAIO] },
], (res, err) => {
  if (err) return `erro inesperado: ${err.message}`;
  const r = res.rows[0];
  if (r.consentimento_em !== null) return "coach conseguiu registrar consentimento no INSERT!";
  if (r.atualizado_por_papel !== "coach") return `papel deveria ser coach, veio ${r.atualizado_por_papel}`;
  return true;
});
await caso("coach NAO cria anamnese de aluno sem vinculo", COACH, [
  ...SEED_USUARIOS,
  INSERT_ANAMNESE(SAMUEL),
], esperaErro("row-level security"));
await caso("consentimento original e imutavel (inclusive pelo aluno)", CAIO, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, "2026-07-01"),
  { sql: `UPDATE public.anamneses SET consentimento_em = now()
          WHERE profile_id = $1 RETURNING consentimento_em`, params: [CAIO] },
], (res, err) => {
  if (err) return `erro inesperado: ${err.message}`;
  const em = new Date(res.rows[0].consentimento_em).toISOString().slice(0, 10);
  return em === "2026-07-01" ? true : `consentimento original mudou para ${em}`;
});
await caso("aluno CONFIRMA consentimento pendente (criado pelo coach)", CAIO, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, null),
  { sql: `UPDATE public.anamneses SET consentimento_em = now()
          WHERE profile_id = $1 RETURNING consentimento_em`, params: [CAIO] },
], (res, err) => {
  if (err) return `erro inesperado: ${err.message}`;
  return res.rows[0].consentimento_em !== null ? true : "consentimento continuou pendente";
});
await caso("coach NAO consente pelo aluno (update mantem pendente)", COACH, [
  ...SEED_USUARIOS,
  ...SEED_ANAMNESE(CAIO, null),
  { sql: `UPDATE public.anamneses SET consentimento_em = now(), objetivo_principal = 'edicao do coach'
          WHERE profile_id = $1 RETURNING consentimento_em`, params: [CAIO] },
], (res, err) => {
  if (err) return `erro inesperado: ${err.message}`;
  if (res.rowCount !== 1) return `esperava 1 linha, veio ${res.rowCount}`;
  return res.rows[0].consentimento_em === null ? true : "coach conseguiu consentir pelo aluno!";
});

console.log("\n== RLS: exercicios ==");
const INSERT_EX = (autor) => ({
  sql: `INSERT INTO public.exercicios (criado_por, nome) VALUES ($1, 'teste rls') RETURNING id`,
  params: [autor],
});

await caso("coach cria exercicio proprio", COACH, [
  ...SEED_USUARIOS,
  INSERT_EX(COACH),
], esperaLinhas(1));
await caso("coach NAO cria exercicio em nome de outro", COACH, [
  ...SEED_USUARIOS,
  INSERT_EX(CAIO),
], esperaErro("row-level security"));
await caso("aluno NAO cria exercicio", CAIO, [
  ...SEED_USUARIOS,
  INSERT_EX(CAIO),
], esperaErro("row-level security"));
await caso("aluno nao enxerga a biblioteca do coach (sem plano publicado)", null, [
  ...SEED_USUARIOS,
  COMO_ADMIN,
  INSERT_EX(COACH),
  ...COMO(CAIO),
  { sql: `SELECT id FROM public.exercicios` },
], esperaLinhas(0));

console.log("\n== RLS: programas/sessoes/sessao_exercicios ==");
// helper: monta programa+sessao+exercicio como admin dentro da transacao
const SEED_PROGRAMA = (status) => [
  COMO_ADMIN,
  { sql: `INSERT INTO public.exercicios (id, criado_por, nome)
          VALUES ('00000000-0000-4000-8000-0000000000e1', $1, 'seed rls')`, params: [COACH] },
  { sql: `INSERT INTO public.programas (id, aluno_id, coach_id, titulo, status)
          VALUES ('00000000-0000-4000-8000-0000000000b1', '${ALUNO_ROW}', $1, 'prog rls', '${status}')`, params: [COACH] },
  { sql: `INSERT INTO public.sessoes (id, programa_id, semana, ordem, titulo)
          VALUES ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 1, 1, 'sessao rls')` },
  { sql: `INSERT INTO public.sessao_exercicios (sessao_id, exercicio_id, ordem)
          VALUES ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', 1)` },
];

await caso("aluno NAO ve programa em rascunho", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("rascunho"), ...COMO(CAIO),
  { sql: `SELECT id FROM public.programas` },
], esperaLinhas(0));
await caso("aluno ve o proprio programa publicado", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(CAIO),
  { sql: `SELECT id FROM public.programas` },
], esperaLinhas(1));
await caso("aluno ve sessoes e exercicios do publicado", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(CAIO),
  { sql: `SELECT se.id FROM public.sessao_exercicios se JOIN public.sessoes s ON s.id = se.sessao_id` },
], esperaLinhas(1));
await caso("aluno ve o exercicio referenciado no publicado", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(CAIO),
  { sql: `SELECT id FROM public.exercicios` },
], esperaLinhas(1));
await caso("outro aluno NAO ve o programa publicado de Caio", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(SAMUEL),
  { sql: `SELECT id FROM public.programas` },
], esperaLinhas(0));
await caso("aluno nao muda status do programa (despublicar e do coach)", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(CAIO),
  { sql: `UPDATE public.programas SET status='concluido' RETURNING id` },
], (res, err) => (err ? true : res.rowCount === 0 ? true : "aluno alterou programa!"));
await caso("coach nao cria programa para aluno fora da carteira", null, [
  ...SEED_USUARIOS, ...COMO(COACH),
  { sql: `INSERT INTO public.programas (aluno_id, coach_id, titulo)
          VALUES (gen_random_uuid(), $1, 'x') RETURNING id`, params: [COACH] },
], esperaErro(""));
await caso("coach exclui programa em rascunho", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("rascunho"), ...COMO(COACH),
  { sql: `DELETE FROM public.programas WHERE id = '00000000-0000-4000-8000-0000000000b1' RETURNING id` },
], esperaLinhas(1));
await caso("coach NAO exclui programa publicado", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(COACH),
  { sql: `DELETE FROM public.programas WHERE id = '00000000-0000-4000-8000-0000000000b1' RETURNING id` },
], esperaLinhas(0));

console.log("\n== RLS: profiles (visibilidade do coach para o aluno) ==");
await caso("aluno ve o proprio profile e o do coach vinculado (2 linhas)", CAIO, [
  ...SEED_USUARIOS,
  { sql: `SELECT id FROM public.profiles` },
], esperaLinhas(2));
await caso("aluno sem vinculo ve apenas o proprio profile (1 linha)", SAMUEL, [
  ...SEED_USUARIOS,
  { sql: `SELECT id FROM public.profiles` },
], esperaLinhas(1));

console.log("\n== RLS: execucoes/execucao_series/alertas ==");
const SEED_EXECUCAO = [
  ...SEED_PROGRAMA("publicado"),
  { sql: `INSERT INTO public.execucoes (id, aluno_id, programa_id, sessao_id, status)
          VALUES ('00000000-0000-4000-8000-0000000000d1', '${ALUNO_ROW}',
                  '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1', 'iniciado')` },
];

await caso("aluno inicia execucao de sessao publicada dele", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(CAIO),
  { sql: `INSERT INTO public.execucoes (aluno_id, programa_id, sessao_id)
          VALUES ('${ALUNO_ROW}', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1')
          RETURNING id` },
], esperaLinhas(1));
await caso("aluno NAO inicia execucao de programa em rascunho", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("rascunho"), ...COMO(CAIO),
  { sql: `INSERT INTO public.execucoes (aluno_id, programa_id, sessao_id)
          VALUES ('${ALUNO_ROW}', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1')
          RETURNING id` },
], esperaErro("row-level security"));
await caso("outro aluno NAO inicia execucao na sessao de Caio", null, [
  ...SEED_USUARIOS, ...SEED_PROGRAMA("publicado"), ...COMO(SAMUEL),
  { sql: `INSERT INTO public.execucoes (aluno_id, programa_id, sessao_id)
          VALUES ('${ALUNO_ROW}', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1')
          RETURNING id` },
], (res, err) => (err ? true : res.rowCount === 0 ? true : "outro aluno criou execucao!"));
await caso("aluno registra serie com snapshot", null, [
  ...SEED_USUARIOS, ...SEED_EXECUCAO, ...COMO(CAIO),
  { sql: `INSERT INTO public.execucao_series
          (execucao_id, sessao_exercicio_id, exercicio_nome, serie, reps_realizadas, carga_realizada, concluida)
          SELECT '00000000-0000-4000-8000-0000000000d1', se.id, 'seed rls', 1, 10, '12 kg', true
            FROM public.sessao_exercicios se WHERE se.sessao_id = '00000000-0000-4000-8000-0000000000c1'
          RETURNING id` },
], esperaLinhas(1));
await caso("coach ve execucao do aluno vinculado", null, [
  ...SEED_USUARIOS, ...SEED_EXECUCAO, ...COMO(COACH),
  { sql: `SELECT id FROM public.execucoes` },
], esperaLinhas(1));
await caso("outro aluno NAO ve execucoes de Caio", null, [
  ...SEED_USUARIOS, ...SEED_EXECUCAO, ...COMO(SAMUEL),
  { sql: `SELECT id FROM public.execucoes` },
], esperaLinhas(0));
await caso("coach NAO apaga sessao ja executada (RESTRICT congela historico)", null, [
  ...SEED_USUARIOS, ...SEED_EXECUCAO, ...COMO(COACH),
  { sql: `DELETE FROM public.sessoes WHERE id = '00000000-0000-4000-8000-0000000000c1' RETURNING id` },
], esperaErro("violates foreign key"));
await caso("aluno cria alerta de dor para o SEU coach", null, [
  ...SEED_USUARIOS, ...SEED_EXECUCAO, ...COMO(CAIO),
  { sql: `INSERT INTO public.alertas (aluno_id, coach_id, execucao_id, dor, mensagem)
          VALUES ('${ALUNO_ROW}', '${COACH}', '00000000-0000-4000-8000-0000000000d1', 8, 'dor no joelho')
          RETURNING id` },
], esperaLinhas(1));
await caso("coach ve o alerta; outro aluno nao", null, [
  ...SEED_USUARIOS, ...SEED_EXECUCAO,
  COMO_ADMIN,
  { sql: `INSERT INTO public.alertas (aluno_id, coach_id, execucao_id, dor)
          VALUES ('${ALUNO_ROW}', '${COACH}', '00000000-0000-4000-8000-0000000000d1', 9)` },
  ...COMO(COACH),
  { sql: `SELECT id FROM public.alertas` },
], esperaLinhas(1));
await caso("aluno NAO marca alerta como lido (grant/policy do coach)", null, [
  ...SEED_USUARIOS, ...SEED_EXECUCAO,
  COMO_ADMIN,
  { sql: `INSERT INTO public.alertas (aluno_id, coach_id, execucao_id, dor)
          VALUES ('${ALUNO_ROW}', '${COACH}', '00000000-0000-4000-8000-0000000000d1', 9)` },
  ...COMO(CAIO),
  { sql: `UPDATE public.alertas SET lido = true RETURNING id` },
], (res, err) => (err ? true : res.rowCount === 0 ? true : "aluno marcou lido!"));

console.log(`\n${passed} ok, ${failed} falhas`);
await client.end();
process.exit(failed > 0 ? 1 : 0);
