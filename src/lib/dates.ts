const CICLO_DIAS = 30

/** Interpreta 'YYYY-MM-DD' como data local (evita o off-by-one do fuso em new Date(iso)). */
export function parseDateOnly(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function formatDateBR(iso: string | null): string {
  if (!iso) return '—'
  const d = parseDateOnly(iso)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR')
}

/** Data de hoje (só a data) no fuso America/Sao_Paulo. */
export function hojeSaoPaulo(): Date {
  // en-CA formata como YYYY-MM-DD
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parseDateOnly(iso)!
}

export type Programa =
  | { fase: 'sem-data' }
  | { fase: 'antes'; diasParaComecar: number }
  | { fase: 'andamento'; dia: number }
  | { fase: 'concluido' }

/**
 * Progresso do programa de 30 dias na visão do aluno, comparando datas
 * (nunca timestamps) no fuso America/Sao_Paulo. Dia clampado em 1–30.
 */
export function progressoPrograma(
  dataInicio: string | null,
  dataFim: string | null
): Programa {
  if (!dataInicio) return { fase: 'sem-data' }
  const inicio = parseDateOnly(dataInicio)
  if (!inicio) return { fase: 'sem-data' }

  const hoje = hojeSaoPaulo()
  const dia = Math.round((hoje.getTime() - inicio.getTime()) / 86_400_000) + 1
  if (dia < 1) return { fase: 'antes', diasParaComecar: 1 - dia }

  const fim = dataFim ? parseDateOnly(dataFim) : null
  if (fim && hoje.getTime() > fim.getTime()) return { fase: 'concluido' }

  return { fase: 'andamento', dia: Math.min(dia, 30) }
}

/** Data de hoje em YYYY-MM-DD (local, sem fuso). */
export function hojeISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export type Ciclo =
  | { fase: 'sem-data'; label: string }
  | { fase: 'antes'; label: string }
  | { fase: 'andamento'; dia: number; label: string }
  | { fase: 'encerrado'; label: string }

/** Dia atual do ciclo de 30 dias a partir de data_inicio. */
export function diaDoCiclo(dataInicio: string | null): Ciclo {
  if (!dataInicio) return { fase: 'sem-data', label: '—' }
  const inicio = parseDateOnly(dataInicio)
  if (!inicio) return { fase: 'sem-data', label: '—' }

  const hoje = new Date()
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dia = Math.floor((hojeSemHora.getTime() - inicio.getTime()) / 86_400_000) + 1

  if (dia < 1) return { fase: 'antes', label: 'não iniciado' }
  if (dia > CICLO_DIAS) return { fase: 'encerrado', label: 'encerrado' }
  return { fase: 'andamento', dia, label: `dia ${dia} de ${CICLO_DIAS}` }
}
