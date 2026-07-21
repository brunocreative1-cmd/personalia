// Cadastra o "Programa Exemplo — Full Body (30 dias)" como RASCUNHO para um
// aluno FICTÍCIO de demonstração (aluno@teste.local). Serve como modelo de
// seed de programa com cobertura dos campos carga_sugerida/cadencia/rpe.
// NADA é publicado — status permanece 'rascunho'; publicação é manual no app.
// IDEMPOTENTE: se o programa deste seed já existir (mesmo título, rascunho),
// retoma e cria só as sessões faltantes.
// Uso: node scripts/seed-programa-exemplo.mjs
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(path.join(ROOT, ".env.backup"), "utf8").replace(/^﻿/, "");
const url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length).trim();

const COACH = "bab283a5-480d-41d5-b1b2-7a3ae9000ebd"; // coach titular (mesmo do seed-programa-samuel)
const ALUNO_EMAIL = "aluno@teste.local"; // Aluno Exemplo (fictício — domínio reservado)

const PROGRAMA_CAMPOS = {
  titulo: "Programa Exemplo — Full Body (30 dias)",
  objetivo: "Condicionamento geral (programa de demonstração)",
  descricao: "Full Body ABC — Seg A, Qua B, Sex C.",
  observacoes:
    "PROGRAMA DE DEMONSTRAÇÃO — cobertura dos campos carga/cadência/RPE. Não usar com aluno real; para acompanhamento real, criar programa baseado em anamnese.",
};

// exercicios: [nome, series, repeticoes, carga, cadencia, rpe, intervalo_seg, nomeAlternativo|null]
// carga/cadencia null = sem carga externa / cadência livre (exercícios isométricos e de core)
const SESSOES = [
  {
    titulo: "Sessão A — Full Body",
    ordem: 1,
    dias: ["seg"],
    observacoes: null,
    exercicios: [
      ["Agachamento goblet", 3, "12", "12", "2-0-2", "7", 60, null],
      ["Supino reto com halteres", 3, "10-12", "14", "2-1-2", "7", 60, null],
      ["Remada curvada com halteres", 3, "10-12", "14", "2-0-2", "7", 60, null],
      ["Desenvolvimento Arnold", 3, "10-12", "8", "2-0-2", "7", 60, null],
      ["Elevação de panturrilha em pé com halteres", 3, "15", "10", "1-1-1", "7", 45, null],
      ["Prancha", 3, "40s", null, null, "7", 30, null],
    ],
  },
  {
    titulo: "Sessão B — Full Body",
    ordem: 2,
    dias: ["qua"],
    observacoes: "Se não houver leg press, usar alternativa.",
    exercicios: [
      ["Leg press", 3, "12", "80", "2-0-2", "7", 75, "Agachamento sumô com halter"],
      ["Puxada frontal na polia", 3, "10-12", "45", "2-0-2", "7", 60, null],
      ["Flexão de braço", 3, "12", null, "2-0-2", "8", 60, null],
      ["Elevação lateral", 3, "12-15", "6", "2-0-2", "8", 45, null],
      ["Rosca martelo", 3, "10-12", "10", "2-0-2", "7", 45, null],
      ["Abdominal bicicleta", 3, "20", null, null, "7", 30, null],
    ],
  },
  {
    titulo: "Sessão C — Full Body",
    ordem: 3,
    dias: ["sex"],
    observacoes: "Finalizador opcional: 2 rounds de burpee 30s, pausa 30s.",
    exercicios: [
      ["Stiff com halteres", 3, "10-12", "16", "3-0-2", "7", 60, null],
      ["Passada caminhando", 3, "12 por perna", "10", "2-0-2", "8", 60, null],
      ["Elevação pélvica (hip thrust)", 3, "12-15", "20", "2-1-2", "8", 60, null],
      ["Face pull na polia", 3, "15", "15", "2-1-2", "7", 45, null],
      ["Tríceps na polia (corda)", 3, "12-15", "20", "2-0-2", "7", 45, null],
      ["Mountain climber", 3, "30s", null, null, "8", 30, null],
    ],
  },
];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

// ------------------------- validações antes de gravar ----------------------
const { rows: alunoRows } = await client.query(
  `SELECT a.id, a.coach_id, p.nome, u.email
     FROM public.alunos a
     JOIN public.profiles p ON p.id = a.profile_id
     JOIN auth.users u ON u.id = a.profile_id
    WHERE lower(u.email) = lower($1)`,
  [ALUNO_EMAIL]
);
if (alunoRows.length !== 1) {
  console.error(`Esperado exatamente 1 aluno com email ${ALUNO_EMAIL}, encontrados ${alunoRows.length}. Abortando sem gravar.`);
  console.error(JSON.stringify(alunoRows));
  process.exit(1);
}
const aluno = alunoRows[0];
if (aluno.coach_id !== COACH) {
  console.error(`Aluno ${aluno.nome} (${aluno.id}) não está vinculado ao coach ${COACH}. Abortando sem gravar.`);
  process.exit(1);
}
console.log(`aluno     ${aluno.nome} <${aluno.email}> (${aluno.id})`);

const { rows: progExistentes } = await client.query(
  `SELECT id, titulo, status FROM public.programas WHERE aluno_id = $1`,
  [aluno.id]
);
const mesmoTitulo = progExistentes.filter((p) => p.titulo === PROGRAMA_CAMPOS.titulo);
const naoRascunho = mesmoTitulo.filter((p) => p.status !== "rascunho");
if (naoRascunho.length > 0) {
  console.error(`Programa deste seed já existe fora de rascunho — nada será gravado:`);
  for (const p of naoRascunho) console.error(`  ${p.id} | ${p.status} | ${p.titulo}`);
  process.exit(1);
}
const doSeed = mesmoTitulo;
for (const p of progExistentes.filter((p) => p.titulo !== PROGRAMA_CAMPOS.titulo)) {
  console.log(`nota      programa pré-existente mantido: ${p.id} | ${p.status} | ${p.titulo}`);
}
if (doSeed.length > 1) {
  console.error(`Mais de um rascunho deste seed encontrado — resolver duplicidade antes de continuar:`);
  for (const p of doSeed) console.error(`  ${p.id}`);
  process.exit(1);
}
let programaId = doSeed[0]?.id ?? null;

const nomesNecessarios = [
  ...new Set(SESSOES.flatMap((s) => s.exercicios.flatMap(([n, , , , , , , alt]) => (alt ? [n, alt] : [n])))),
];
const { rows: exRows } = await client.query(
  `SELECT id, nome FROM public.exercicios WHERE ativo = true AND nome = ANY($1)`,
  [nomesNecessarios]
);
const idPorNome = new Map(exRows.map((r) => [r.nome, r.id]));
const faltando = nomesNecessarios.filter((n) => !idPorNome.has(n));
if (faltando.length > 0) {
  console.error(`Exercícios não encontrados (ativo=true): ${faltando.join(" | ")}. Abortando sem gravar.`);
  process.exit(1);
}

// ------------------------------- gravação ----------------------------------
let sessoesCriadas = 0;
let sessoesPuladas = 0;
let exerciciosVinculados = 0;
let erros = 0;

try {
  await client.query("BEGIN");

  if (!programaId) {
    const { rows: [novo] } = await client.query(
      `INSERT INTO public.programas (aluno_id, coach_id, titulo, objetivo, descricao, status, observacoes)
       VALUES ($1, $2, $3, $4, $5, 'rascunho', $6) RETURNING id`,
      [aluno.id, COACH, PROGRAMA_CAMPOS.titulo, PROGRAMA_CAMPOS.objetivo, PROGRAMA_CAMPOS.descricao, PROGRAMA_CAMPOS.observacoes]
    );
    programaId = novo.id;
    console.log(`programa  criado: ${PROGRAMA_CAMPOS.titulo} (${programaId}, rascunho, sem data de início)`);
  } else {
    console.log(`programa  já existe (${programaId}, rascunho) — retomando sessões faltantes`);
  }

  const { rows: sessExistentes } = await client.query(
    `SELECT titulo FROM public.sessoes WHERE programa_id = $1`,
    [programaId]
  );
  const titulosExistentes = new Set(sessExistentes.map((r) => r.titulo.trim().toLowerCase()));

  for (const sess of SESSOES) {
    if (titulosExistentes.has(sess.titulo.trim().toLowerCase())) {
      sessoesPuladas++;
      console.log(`  pulada  ${sess.titulo} (já existe)`);
      continue;
    }
    const { rows: [nova] } = await client.query(
      `INSERT INTO public.sessoes (programa_id, semana, ordem, titulo, dias_sugeridos, observacoes)
       VALUES ($1, 1, $2, $3, $4, $5) RETURNING id`,
      [programaId, sess.ordem, sess.titulo, sess.dias, sess.observacoes]
    );
    sessoesCriadas++;
    console.log(`  ok      ${sess.titulo} [${sess.dias.join(", ")}]`);

    let ordem = 1;
    for (const [nome, series, repeticoes, carga, cadencia, rpe, intervalo, alt] of sess.exercicios) {
      await client.query(
        `INSERT INTO public.sessao_exercicios
           (sessao_id, exercicio_id, exercicio_alternativo_id, ordem, series, repeticoes,
            carga_sugerida, cadencia, rpe, intervalo_seg)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [nova.id, idPorNome.get(nome), alt ? idPorNome.get(alt) : null, ordem++, series, repeticoes, carga, cadencia, rpe, intervalo]
      );
      exerciciosVinculados++;
      console.log(
        `          ${ordem - 1}. ${nome} — ${series}x${repeticoes} — carga ${carga ?? "—"} — cad ${cadencia ?? "—"} — RPE ${rpe} — ${intervalo}s${alt ? ` (alt: ${alt})` : ""}`
      );
    }
  }

  await client.query("COMMIT");
} catch (err) {
  erros++;
  await client.query("ROLLBACK");
  console.error(`ERRO — transação revertida, nada foi gravado: ${err.message}`);
}

if (programaId) {
  const { rows: [resumo] } = await client.query(
    `SELECT p.status, count(DISTINCT s.id)::int AS sessoes, count(se.id)::int AS exercicios,
            count(se.carga_sugerida)::int AS com_carga, count(se.cadencia)::int AS com_cadencia, count(se.rpe)::int AS com_rpe
       FROM public.programas p
       LEFT JOIN public.sessoes s ON s.programa_id = p.id
       LEFT JOIN public.sessao_exercicios se ON se.sessao_id = s.id
      WHERE p.id = $1 GROUP BY p.status`,
    [programaId]
  );
  console.log(`\n===== RESUMO =====`);
  console.log(`Programa ${programaId} | status: ${resumo.status}`);
  console.log(`Sessões criadas: ${sessoesCriadas} | puladas: ${sessoesPuladas} | Exercícios vinculados: ${exerciciosVinculados} | Erros: ${erros}`);
  console.log(`Estado no banco: ${resumo.sessoes} sessões, ${resumo.exercicios} exercícios | carga_sugerida: ${resumo.com_carga} | cadencia: ${resumo.com_cadencia} | rpe: ${resumo.com_rpe}`);
}
await client.end();
process.exit(erros > 0 ? 1 : 0);
