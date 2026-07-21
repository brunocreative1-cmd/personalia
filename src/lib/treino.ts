import type { Programa, Sessao } from './programas'
import { hojeSaoPaulo, parseDateOnly } from './dates'

const DIAS_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const

/** Chave do dia da semana de hoje ('seg'…'dom') no fuso de São Paulo. */
export function diaSemanaHoje(): string {
  return DIAS_KEY[hojeSaoPaulo().getDay()]
}

/** Semana corrente do programa (1–6) a partir da data de início. */
export function semanaAtual(dataInicio: string | null): number {
  if (!dataInicio) return 1
  const inicio = parseDateOnly(dataInicio)
  if (!inicio) return 1
  const dia = Math.round((hojeSaoPaulo().getTime() - inicio.getTime()) / 86_400_000) + 1
  return Math.min(Math.max(Math.ceil(dia / 7), 1), 6)
}

export type TreinoDoDia = {
  semana: number
  /** Sessão sugerida para hoje (dias_sugeridos contém o dia atual). */
  hoje: Sessao | null
  /** Próxima sessão da semana quando não há treino hoje. */
  proxima: Sessao | null
}

/**
 * Decide o treino de hoje: sessão da semana corrente cujo dias_sugeridos
 * inclui o dia de hoje. Sem correspondência, indica a próxima sessão
 * (da semana corrente, ou a primeira do programa como fallback).
 */
export function treinoDoDia(programa: Programa, dataInicio: string | null): TreinoDoDia {
  const semana = semanaAtual(programa.data_inicio ?? dataInicio)
  const hojeKey = diaSemanaHoje()

  const daSemana = programa.sessoes
    .filter((s) => s.semana === semana)
    .sort((a, b) => a.ordem - b.ordem)
  const pool = daSemana.length > 0 ? daSemana : [...programa.sessoes].sort(
    (a, b) => a.semana - b.semana || a.ordem - b.ordem
  )

  const deHoje = pool.find((s) => (s.dias_sugeridos ?? []).includes(hojeKey)) ?? null
  // sessões sem dias marcados contam como "qualquer dia" → viram treino de hoje
  const semDia = pool.find((s) => !s.dias_sugeridos || s.dias_sugeridos.length === 0) ?? null

  const hoje = deHoje ?? semDia
  const proxima = hoje ? null : (pool[0] ?? null)
  return { semana, hoje, proxima }
}
