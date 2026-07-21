// Preenche o "Programa de Samuel" (rascunho, criado 14/07) com o programa
// prescrito e aprovado pelo coach Willian Sousa (CREF 2904-G/GO):
// Programa Samuel — Perda de Gordura (30 dias), ABC 2x.
// NADA é publicado — status permanece 'rascunho'; publicação é manual no app.
// IDEMPOTENTE: sessão só é criada se não existir sessão com o mesmo título.
// Uso: node scripts/seed-programa-samuel.mjs
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(path.join(ROOT, ".env.backup"), "utf8").replace(/^﻿/, "");
const url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length).trim();

const COACH = "bab283a5-480d-41d5-b1b2-7a3ae9000ebd"; // Willian Sousa
const ALUNO = "0c2e1671-927b-44c7-b051-1c5abe58a572"; // Samuel
const PROGRAMA = "f3eabd76-4a1d-4c12-ac0a-c01913ad2f84"; // rascunho de 14/07 (o de 13/07 fica p/ o coach excluir)

const PROGRAMA_CAMPOS = {
  titulo: "Programa Samuel — Perda de Gordura (30 dias)",
  objetivo: "Emagrecimento e fortalecimento muscular",
  descricao: "Estrutura ABC 2x por semana: Seg A, Ter B, Qua C, Qui A, Sex B, Sáb C.",
  observacoes:
    "Progressão: semanas 1-2 base (RPE 7); semana 3 reduzir descansos em 15s ou +1 série nos compostos; semana 4 RPE 8-9 nos compostos, finalizadores mantidos.",
};

// exercicios: [nome, series, repeticoes, intervalo_seg, nomeAlternativo|null]
const SESSOES = [
  {
    titulo: "Sessão A — Peito, Ombro, Tríceps",
    ordem: 1,
    dias: ["seg", "qui"],
    observacoes:
      "Finalizador metabólico: 4 rounds de burpee 30s + pular corda 60s, 30s de pausa entre rounds.",
    exercicios: [
      ["Supino reto com halteres", 4, "10-12", 60, null],
      ["Supino inclinado com halteres", 3, "10-12", 60, null],
      ["Desenvolvimento Arnold", 3, "10-12", 60, null],
      ["Elevação lateral", 3, "12-15", 45, null],
      ["Tríceps na polia (corda)", 3, "12-15", 45, null],
      ["Tríceps testa com halteres", 3, "10-12", 45, null],
    ],
  },
  {
    titulo: "Sessão B — Costas, Bíceps, Core",
    ordem: 2,
    dias: ["ter", "sex"],
    observacoes:
      "Circuito de core ao final: prancha 3x40s + abdominal bicicleta 3x20 + mountain climber 3x30s, 30s de pausa.",
    exercicios: [
      ["Puxada frontal na polia", 4, "10-12", 60, null],
      ["Remada curvada com halteres", 3, "10-12", 60, null],
      ["Remada baixa na polia (triângulo)", 3, "10-12", 60, null],
      ["Face pull na polia", 3, "15", 45, null],
      ["Rosca alternada com halteres", 3, "10-12", 45, null],
      ["Rosca martelo", 3, "10-12", 45, null],
    ],
  },
  {
    titulo: "Sessão C — Pernas + Panturrilha",
    ordem: 3,
    dias: ["qua", "sab"],
    observacoes:
      "Finalizador: 3 rounds de agachamento com salto 15 reps + pular corda 45s, 30s de pausa. Se o condomínio não tiver leg press, substituir por Agachamento sumô com halter.",
    exercicios: [
      ["Agachamento goblet", 4, "12", 75, null],
      ["Leg press", 3, "12", 75, "Agachamento sumô com halter"],
      ["Stiff com halteres", 3, "10-12", 60, null],
      ["Passada caminhando", 3, "12 por perna", 60, null],
      ["Elevação pélvica (hip thrust)", 3, "12-15", 60, null],
      ["Elevação de panturrilha em pé com halteres", 4, "15-20", 45, null],
    ],
  },
];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

// ------------------------- validações antes de gravar ----------------------
const { rows: progRows } = await client.query(
  `SELECT id, aluno_id, coach_id, status FROM public.programas WHERE id = $1`,
  [PROGRAMA]
);
if (progRows.length !== 1) {
  console.error(`Programa ${PROGRAMA} não encontrado. Abortando.`);
  process.exit(1);
}
const prog = progRows[0];
if (prog.aluno_id !== ALUNO || prog.coach_id !== COACH || prog.status !== "rascunho") {
  console.error(`Programa não bate com o esperado (aluno/coach/status=rascunho). Abortando.`);
  console.error(JSON.stringify(prog));
  process.exit(1);
}

const nomesNecessarios = [
  ...new Set(SESSOES.flatMap((s) => s.exercicios.flatMap(([n, , , , alt]) => (alt ? [n, alt] : [n])))),
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

  await client.query(
    `UPDATE public.programas
        SET titulo = $2, objetivo = $3, descricao = $4, observacoes = $5
      WHERE id = $1 AND status = 'rascunho'`,
    [PROGRAMA, PROGRAMA_CAMPOS.titulo, PROGRAMA_CAMPOS.objetivo, PROGRAMA_CAMPOS.descricao, PROGRAMA_CAMPOS.observacoes]
  );
  console.log(`programa  atualizado: ${PROGRAMA_CAMPOS.titulo} (status permanece rascunho, sem data)`);

  const { rows: sessExistentes } = await client.query(
    `SELECT titulo FROM public.sessoes WHERE programa_id = $1`,
    [PROGRAMA]
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
      [PROGRAMA, sess.ordem, sess.titulo, sess.dias, sess.observacoes]
    );
    sessoesCriadas++;
    console.log(`  ok      ${sess.titulo} [${sess.dias.join(", ")}]`);

    let ordem = 1;
    for (const [nome, series, repeticoes, intervalo, alt] of sess.exercicios) {
      await client.query(
        `INSERT INTO public.sessao_exercicios
           (sessao_id, exercicio_id, exercicio_alternativo_id, ordem, series, repeticoes, intervalo_seg)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [nova.id, idPorNome.get(nome), alt ? idPorNome.get(alt) : null, ordem++, series, repeticoes, intervalo]
      );
      exerciciosVinculados++;
      console.log(`          ${ordem - 1}. ${nome} — ${series}x${repeticoes} — ${intervalo}s${alt ? ` (alt: ${alt})` : ""}`);
    }
  }

  await client.query("COMMIT");
} catch (err) {
  erros++;
  await client.query("ROLLBACK");
  console.error(`ERRO — transação revertida, nada foi gravado: ${err.message}`);
}

const { rows: [resumo] } = await client.query(
  `SELECT p.status, count(DISTINCT s.id)::int AS sessoes, count(se.id)::int AS exercicios
     FROM public.programas p
     LEFT JOIN public.sessoes s ON s.programa_id = p.id
     LEFT JOIN public.sessao_exercicios se ON se.sessao_id = s.id
    WHERE p.id = $1 GROUP BY p.status`,
  [PROGRAMA]
);
console.log(`\n===== RESUMO =====`);
console.log(`Programa ${PROGRAMA} | status: ${resumo.status}`);
console.log(`Sessões criadas: ${sessoesCriadas} | puladas: ${sessoesPuladas} | Exercícios vinculados: ${exerciciosVinculados} | Erros: ${erros}`);
console.log(`Estado no banco: ${resumo.sessoes} sessões, ${resumo.exercicios} exercícios de sessão`);
await client.end();
process.exit(erros > 0 ? 1 : 0);
