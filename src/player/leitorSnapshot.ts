/**
 * Fonte DEFINITIVA do player: a última publicação imutável do programa em
 * programa_publicacoes (snapshot_json congelado pelo gate 007/008).
 * A RLS entrega ao aluno apenas as publicações dos próprios programas.
 */
import { pgRequest } from '../lib/api'
import { CONSULTA_SNAPSHOT } from './consultas'
import type { CargaPlayer, ProgramaPlayer } from './contrato'

type PublicacaoRow = {
  programa_id: string
  versao: number
  publicado_em: string
  snapshot_json: ProgramaPlayer & { congelado_em: string }
}

/**
 * Última publicação visível ao usuário logado (0..n via RLS; a mais recente
 * é a prescrição vigente). null = nenhuma publicação registrada ainda.
 */
export async function carregarDoSnapshot(token: string): Promise<CargaPlayer | null> {
  const rows = await pgRequest<PublicacaoRow[]>(CONSULTA_SNAPSHOT, token)
  const pub = rows[0]
  if (!pub) return null
  const snap = pub.snapshot_json
  return {
    fonte: 'snapshot',
    dados: {
      programa: snap.programa,
      sessoes: snap.sessoes ?? [],
      congelado_em: snap.congelado_em,
    },
  }
}
