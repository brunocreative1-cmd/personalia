/**
 * Resolvedor de fonte do player. Ordem fixa:
 *   1. snapshot (programa_publicacoes, imutável) — fonte definitiva;
 *   2. fallbackBiblioteca (temporário) — só quando NENHUM snapshot existe.
 * Nunca mistura as duas fontes num mesmo carregamento.
 */
import type { CargaPlayer } from './contrato'
import { carregarDoSnapshot } from './leitorSnapshot'
// REMOÇÃO FUTURA (pós-007b/backfill): apagar a linha abaixo e o ramo do fallback.
import { carregarDoFallback } from './fallbackBiblioteca'

/** Treino do aluno logado no shape do contrato, com etiqueta de fonte. */
export async function carregarMeuTreino(token: string): Promise<CargaPlayer | null> {
  const doSnapshot = await carregarDoSnapshot(token)
  if (doSnapshot) return doSnapshot
  return carregarDoFallback(token)
}
