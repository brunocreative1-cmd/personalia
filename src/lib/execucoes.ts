import { ApiError, pgRequest } from './api'
import { UI_MODO_TESTE } from './flags'

export type ExecucaoStatus = 'iniciado' | 'concluido' | 'parcial' | 'abandonado'

export type Execucao = {
  id: string
  aluno_id: string
  programa_id: string
  sessao_id: string
  status: ExecucaoStatus
  iniciado_em: string
  finalizado_em: string | null
  duracao_seg: number | null
  esforco: number | null
  dor: number | null
  observacao: string | null
  /**
   * Derivado pelo BANCO (trigger da 008) a partir de programas.modo_teste.
   * SOMENTE LEITURA no cliente: nunca entra em payload de INSERT/PATCH —
   * não há grant de escrita e o trigger sobrescreveria de qualquer forma.
   */
  simulado: boolean
}

export type ExecucaoSerie = {
  id: string
  execucao_id: string
  sessao_exercicio_id: string
  exercicio_nome: string
  serie: number
  reps_prescritas: string | null
  carga_prescrita: string | null
  reps_realizadas: number | null
  carga_realizada: string | null
  concluida: boolean
  registrada_em: string
}

export type ExecucaoComSeries = Execucao & { execucao_series: ExecucaoSerie[] }

/** Execução em aberto (status=iniciado) da sessão, para retomar. */
export async function fetchExecucaoAberta(
  token: string,
  sessaoId: string
): Promise<ExecucaoComSeries | null> {
  const rows = await pgRequest<ExecucaoComSeries[]>(
    `execucoes?select=*,execucao_series(*)&sessao_id=eq.${encodeURIComponent(sessaoId)}&status=eq.iniciado&order=iniciado_em.desc`,
    token
  )
  return rows[0] ?? null
}

export async function iniciarExecucao(
  token: string,
  dados: { aluno_id: string; programa_id: string; sessao_id: string }
): Promise<Execucao> {
  const rows = await pgRequest<Execucao[]>('execucoes', token, {
    method: 'POST',
    body: JSON.stringify({ ...dados, status: 'iniciado' }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) throw new ApiError('Não foi possível iniciar o treino.')
  return rows[0]
}

export type SerieForm = {
  sessao_exercicio_id: string
  exercicio_nome: string
  serie: number
  reps_prescritas: string | null
  carga_prescrita: string | null
  reps_realizadas: number | null
  carga_realizada: string | null
  concluida: boolean
}

/** Grava/atualiza uma série. Upsert manual: PATCH se já existe, POST se não. */
export async function salvarSerie(
  token: string,
  execucaoId: string,
  form: SerieForm,
  existenteId: string | null
): Promise<ExecucaoSerie> {
  if (existenteId) {
    const rows = await pgRequest<ExecucaoSerie[]>(
      `execucao_series?id=eq.${encodeURIComponent(existenteId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reps_realizadas: form.reps_realizadas,
          carga_realizada: form.carga_realizada,
          concluida: form.concluida,
          registrada_em: new Date().toISOString(),
        }),
        headers: { Prefer: 'return=representation' },
      }
    )
    if (rows.length === 0) throw new ApiError('Não foi possível salvar a série.')
    return rows[0]
  }
  const rows = await pgRequest<ExecucaoSerie[]>('execucao_series', token, {
    method: 'POST',
    body: JSON.stringify({ ...form, execucao_id: execucaoId }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) throw new ApiError('Não foi possível salvar a série.')
  return rows[0]
}

export async function finalizarExecucao(
  token: string,
  execucaoId: string,
  dados: {
    status: Exclude<ExecucaoStatus, 'iniciado'>
    esforco: number | null
    dor: number | null
    observacao: string | null
    iniciado_em: string
  }
): Promise<void> {
  const fim = new Date()
  const duracao = Math.max(
    0,
    Math.round((fim.getTime() - new Date(dados.iniciado_em).getTime()) / 1000)
  )
  const rows = await pgRequest<unknown[]>(
    `execucoes?id=eq.${encodeURIComponent(execucaoId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: dados.status,
        esforco: dados.esforco,
        dor: dados.dor,
        observacao: dados.observacao,
        finalizado_em: fim.toISOString(),
        duracao_seg: duracao,
      }),
      headers: { Prefer: 'return=representation' },
    }
  )
  if (rows.length === 0) throw new ApiError('Não foi possível finalizar o treino.')
}

/** Alerta de dor ≥ 7 para o coach. Sem diagnóstico — só o fato. */
export async function criarAlertaDor(
  token: string,
  dados: {
    aluno_id: string
    coach_id: string
    execucao_id: string
    dor: number
    mensagem: string | null
  }
): Promise<void> {
  const rows = await pgRequest<unknown[]>('alertas', token, {
    method: 'POST',
    body: JSON.stringify({ ...dados, tipo: 'dor' }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) throw new ApiError('Não foi possível registrar o alerta.')
}

/**
 * Histórico do aluno logado (RLS restringe ao dono). Métrica REAL: com a
 * flag ligada, execuções simuladas ficam fora já na ORIGEM — todas as
 * superfícies (última atividade, frequência, evolução de carga) herdam.
 */
export function fetchMinhasExecucoes(token: string): Promise<ExecucaoComSeries[]> {
  const filtroSimulado = UI_MODO_TESTE ? '&simulado=eq.false' : ''
  return pgRequest<ExecucaoComSeries[]>(
    `execucoes?select=*,execucao_series(*)${filtroSimulado}&order=iniciado_em.desc&limit=60`,
    token
  )
}

/**
 * Execuções de um aluno (visão do coach). SEM filtro de simulado de
 * propósito (decisão 3b): a lista mostra tudo com badge "simulado"; os
 * AGREGADOS filtram no componente (AcompanhamentoAluno).
 */
export function fetchExecucoesDoAluno(
  token: string,
  alunoId: string
): Promise<ExecucaoComSeries[]> {
  return pgRequest<ExecucaoComSeries[]>(
    `execucoes?select=*,execucao_series(*)&aluno_id=eq.${encodeURIComponent(alunoId)}&order=iniciado_em.desc&limit=60`,
    token
  )
}

export type Alerta = {
  id: string
  aluno_id: string
  coach_id: string
  execucao_id: string | null
  tipo: string
  dor: number | null
  mensagem: string | null
  lido: boolean
  created_at: string
}

export function fetchAlertasDoAluno(token: string, alunoId: string): Promise<Alerta[]> {
  return pgRequest<Alerta[]>(
    `alertas?select=*&aluno_id=eq.${encodeURIComponent(alunoId)}&order=created_at.desc&limit=20`,
    token
  )
}

export async function marcarAlertaLido(token: string, alertaId: string): Promise<void> {
  await pgRequest<unknown[]>(`alertas?id=eq.${encodeURIComponent(alertaId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ lido: true }),
    headers: { Prefer: 'return=representation' },
  })
}
