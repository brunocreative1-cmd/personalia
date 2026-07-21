import type { ExecucaoComSeries } from './execucoes'
import type { Programa } from './programas'
import { semanaAtual } from './treino'

export const EXEC_STATUS_LABEL: Record<string, string> = {
  iniciado: 'em andamento',
  concluido: 'concluído',
  parcial: 'parcial',
  abandonado: 'abandonado',
}

export function duracaoFmt(seg: number | null): string | null {
  if (seg === null || seg <= 0) return null
  const min = Math.round(seg / 60)
  return min < 1 ? '<1 min' : `${min} min`
}

export type ResumoFrequencia = {
  /** Sessões planejadas nas semanas já decorridas do programa. */
  previstas: number
  realizadas: number
  parciais: number
  abandonadas: number
  /** realizadas ÷ previstas, 0–100; null sem previstas. */
  percentual: number | null
}

/**
 * Frequência objetiva: previsto = sessões das semanas já decorridas do
 * programa publicado; realizado = execuções concluídas (parciais contam
 * à parte). Sem pontuação motivacional — só previsto × realizado.
 */
export function resumoFrequencia(
  programa: Programa | null,
  execucoes: ExecucaoComSeries[],
  dataInicio: string | null
): ResumoFrequencia {
  const semana = programa ? semanaAtual(programa.data_inicio ?? dataInicio) : 0
  const previstas = programa
    ? programa.sessoes.filter((s) => s.semana <= semana).length
    : 0
  const realizadas = execucoes.filter((e) => e.status === 'concluido').length
  const parciais = execucoes.filter((e) => e.status === 'parcial').length
  const abandonadas = execucoes.filter((e) => e.status === 'abandonado').length
  return {
    previstas,
    realizadas,
    parciais,
    abandonadas,
    percentual: previstas > 0 ? Math.round((realizadas / previstas) * 100) : null,
  }
}

export type EvolucaoCarga = {
  exercicio: string
  primeiraCarga: number
  ultimaCarga: number
  registros: number
}

function parseCarga(carga: string | null): number | null {
  if (!carga) return null
  const m = carga.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : null
}

/**
 * Evolução de carga por exercício, quando há dados suficientes
 * (≥2 registros numéricos em execuções diferentes).
 */
export function evolucaoCargas(execucoes: ExecucaoComSeries[]): EvolucaoCarga[] {
  const porExercicio = new Map<string, Array<{ quando: string; carga: number }>>()
  for (const e of [...execucoes].reverse()) {
    // reverse: mais antigas primeiro
    const melhorPorNome = new Map<string, number>()
    for (const s of e.execucao_series) {
      if (!s.concluida) continue
      const carga = parseCarga(s.carga_realizada)
      if (carga === null) continue
      const atual = melhorPorNome.get(s.exercicio_nome)
      if (atual === undefined || carga > atual) melhorPorNome.set(s.exercicio_nome, carga)
    }
    for (const [nome, carga] of melhorPorNome) {
      const lista = porExercicio.get(nome) ?? []
      lista.push({ quando: e.iniciado_em, carga })
      porExercicio.set(nome, lista)
    }
  }
  const resultado: EvolucaoCarga[] = []
  for (const [exercicio, registros] of porExercicio) {
    if (registros.length < 2) continue
    resultado.push({
      exercicio,
      primeiraCarga: registros[0].carga,
      ultimaCarga: registros[registros.length - 1].carga,
      registros: registros.length,
    })
  }
  return resultado.sort((a, b) => a.exercicio.localeCompare(b.exercicio))
}
