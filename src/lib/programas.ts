import { ApiError, pgRequest } from './api'
import type { Exercicio } from './exercicios'

export const PROGRAMA_STATUS = ['rascunho', 'publicado', 'pausado', 'concluido'] as const
export type ProgramaStatus = (typeof PROGRAMA_STATUS)[number]

export type ExercicioResumo = Pick<
  Exercicio,
  'id' | 'nome' | 'grupo_muscular' | 'equipamento' | 'instrucoes' | 'seguranca' | 'video_url' | 'imagem_url'
>

export type SessaoExercicio = {
  id: string
  sessao_id: string
  exercicio_id: string
  exercicio_alternativo_id: string | null
  ordem: number
  series: number
  repeticoes: string
  carga_sugerida: string | null
  intervalo_seg: number | null
  cadencia: string | null
  rpe: string | null
  observacao: string | null
  exercicio: ExercicioResumo
  alternativo: ExercicioResumo | null
}

export type Sessao = {
  id: string
  programa_id: string
  semana: number
  ordem: number
  titulo: string
  dias_sugeridos: string[] | null
  duracao_estimada_min: number | null
  observacoes: string | null
  sessao_exercicios: SessaoExercicio[]
}

export type Programa = {
  id: string
  aluno_id: string
  coach_id: string
  titulo: string
  objetivo: string | null
  descricao: string | null
  data_inicio: string | null
  data_fim: string | null
  status: ProgramaStatus
  observacoes: string | null
  /**
   * Programa demonstrativo (008). IMUTÁVEL após a criação (trigger no
   * banco) e SOMENTE LEITURA no cliente: nunca entra em payload de UPDATE
   * (não há grant). O select=* já traz o campo.
   */
  modo_teste: boolean
  updated_at: string
  sessoes: Sessao[]
}

export type ProgramaResumo = Omit<Programa, 'sessoes'>

const EX_EMBED =
  'exercicio:exercicios!exercicio_id(id,nome,grupo_muscular,equipamento,instrucoes,seguranca,video_url,imagem_url),' +
  'alternativo:exercicios!exercicio_alternativo_id(id,nome,grupo_muscular,equipamento,instrucoes,seguranca,video_url,imagem_url)'

const PROGRAMA_SELECT =
  `*,sessoes(*,sessao_exercicios(*,${EX_EMBED}))` +
  `&sessoes.order=semana,ordem&sessoes.sessao_exercicios.order=ordem`

/** Programas de um aluno (visão do coach). */
export function fetchProgramasDoAluno(token: string, alunoId: string): Promise<ProgramaResumo[]> {
  return pgRequest<ProgramaResumo[]>(
    `programas?select=*&aluno_id=eq.${encodeURIComponent(alunoId)}&order=created_at.desc`,
    token
  )
}

/** Programa completo com sessões e exercícios aninhados. */
export async function fetchPrograma(token: string, programaId: string): Promise<Programa | null> {
  const rows = await pgRequest<Programa[]>(
    `programas?select=${PROGRAMA_SELECT}&id=eq.${encodeURIComponent(programaId)}`,
    token
  )
  return rows[0] ?? null
}

/** Programa publicado de um aluno (visão do coach), com sessões completas. */
export async function fetchProgramaPublicadoDoAluno(
  token: string,
  alunoId: string
): Promise<Programa | null> {
  const rows = await pgRequest<Programa[]>(
    `programas?select=${PROGRAMA_SELECT}&aluno_id=eq.${encodeURIComponent(alunoId)}&status=eq.publicado&order=created_at.desc`,
    token
  )
  return rows[0] ?? null
}

/** Programa publicado do próprio aluno logado (RLS entrega 0..n; pegamos o vigente). */
export async function fetchMeuPrograma(token: string): Promise<Programa | null> {
  const rows = await pgRequest<Programa[]>(
    `programas?select=${PROGRAMA_SELECT}&order=created_at.desc`,
    token
  )
  return rows[0] ?? null
}

export type ProgramaForm = {
  titulo: string
  objetivo: string | null
  descricao: string | null
  data_inicio: string | null
  data_fim: string | null
  observacoes: string | null
}

export async function criarPrograma(
  token: string,
  coachId: string,
  alunoId: string,
  form: ProgramaForm
): Promise<string> {
  const rows = await pgRequest<Array<{ id: string }>>('programas', token, {
    method: 'POST',
    body: JSON.stringify({ ...form, aluno_id: alunoId, coach_id: coachId, status: 'rascunho' }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) throw new ApiError('O programa não foi criado — verifique suas permissões.')
  return rows[0].id
}

export async function atualizarPrograma(
  token: string,
  programaId: string,
  changes: Partial<ProgramaForm> & { status?: ProgramaStatus }
): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `programas?id=eq.${encodeURIComponent(programaId)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(changes), headers: { Prefer: 'return=representation' } }
  )
  if (rows.length === 0) throw new ApiError('Nada foi salvo — verifique suas permissões.')
}

/** Só rascunhos são deletáveis (policy no banco). */
export async function excluirPrograma(token: string, programaId: string): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `programas?id=eq.${encodeURIComponent(programaId)}`,
    token,
    { method: 'DELETE', headers: { Prefer: 'return=representation' } }
  )
  if (rows.length === 0) {
    throw new ApiError('Não foi possível excluir — só rascunhos podem ser excluídos.')
  }
}

export type SessaoForm = {
  semana: number
  ordem: number
  titulo: string
  dias_sugeridos: string[] | null
  duracao_estimada_min: number | null
  observacoes: string | null
}

export async function criarSessao(
  token: string,
  programaId: string,
  form: SessaoForm
): Promise<string> {
  const rows = await pgRequest<Array<{ id: string }>>('sessoes', token, {
    method: 'POST',
    body: JSON.stringify({ ...form, programa_id: programaId }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) throw new ApiError('A sessão não foi criada — verifique suas permissões.')
  return rows[0].id
}

export async function atualizarSessao(
  token: string,
  sessaoId: string,
  changes: Partial<SessaoForm>
): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `sessoes?id=eq.${encodeURIComponent(sessaoId)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(changes), headers: { Prefer: 'return=representation' } }
  )
  if (rows.length === 0) throw new ApiError('Nada foi salvo — verifique suas permissões.')
}

/**
 * Exclui uma sessão. Se ela já tiver execução registrada, o banco recusa
 * (FK RESTRICT da migration 004) — o histórico executado é imutável.
 */
export async function excluirSessao(token: string, sessaoId: string): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `sessoes?id=eq.${encodeURIComponent(sessaoId)}`,
    token,
    { method: 'DELETE', headers: { Prefer: 'return=representation' } }
  )
  if (rows.length === 0) throw new ApiError('Não foi possível excluir a sessão.')
}

/** Duplica a sessão com todos os exercícios (título ganha sufixo "(cópia)"). */
export async function duplicarSessao(token: string, sessao: Sessao): Promise<void> {
  const novaId = await criarSessao(token, sessao.programa_id, {
    semana: sessao.semana,
    ordem: sessao.ordem + 1,
    titulo: `${sessao.titulo} (cópia)`,
    dias_sugeridos: sessao.dias_sugeridos,
    duracao_estimada_min: sessao.duracao_estimada_min,
    observacoes: sessao.observacoes,
  })
  if (sessao.sessao_exercicios.length === 0) return
  const corpo = sessao.sessao_exercicios.map((se) => ({
    sessao_id: novaId,
    exercicio_id: se.exercicio_id,
    exercicio_alternativo_id: se.exercicio_alternativo_id,
    ordem: se.ordem,
    series: se.series,
    repeticoes: se.repeticoes,
    carga_sugerida: se.carga_sugerida,
    intervalo_seg: se.intervalo_seg,
    cadencia: se.cadencia,
    rpe: se.rpe,
    observacao: se.observacao,
  }))
  const rows = await pgRequest<unknown[]>('sessao_exercicios', token, {
    method: 'POST',
    body: JSON.stringify(corpo),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length !== corpo.length) {
    throw new ApiError('A cópia ficou incompleta — recarregue e confira a sessão duplicada.')
  }
}

export type SessaoExercicioForm = {
  exercicio_id: string
  exercicio_alternativo_id: string | null
  ordem: number
  series: number
  repeticoes: string
  carga_sugerida: string | null
  intervalo_seg: number | null
  cadencia: string | null
  rpe: string | null
  observacao: string | null
}

export async function adicionarExercicioNaSessao(
  token: string,
  sessaoId: string,
  form: SessaoExercicioForm
): Promise<void> {
  const rows = await pgRequest<unknown[]>('sessao_exercicios', token, {
    method: 'POST',
    body: JSON.stringify({ ...form, sessao_id: sessaoId }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) throw new ApiError('O exercício não foi adicionado.')
}

export async function atualizarExercicioDaSessao(
  token: string,
  id: string,
  changes: Partial<SessaoExercicioForm>
): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `sessao_exercicios?id=eq.${encodeURIComponent(id)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(changes), headers: { Prefer: 'return=representation' } }
  )
  if (rows.length === 0) throw new ApiError('Nada foi salvo — verifique suas permissões.')
}

export async function removerExercicioDaSessao(token: string, id: string): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `sessao_exercicios?id=eq.${encodeURIComponent(id)}`,
    token,
    { method: 'DELETE', headers: { Prefer: 'return=representation' } }
  )
  if (rows.length === 0) throw new ApiError('Não foi possível remover o exercício.')
}

/** Troca a ordem de dois itens (setas ↑/↓ na UI). */
export async function trocarOrdem(
  token: string,
  a: { id: string; ordem: number },
  b: { id: string; ordem: number }
): Promise<void> {
  await atualizarExercicioDaSessao(token, a.id, { ordem: b.ordem })
  await atualizarExercicioDaSessao(token, b.id, { ordem: a.ordem })
}
