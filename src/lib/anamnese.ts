import { ApiError, pgRequest } from './api'

export const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const
export type DiaSemana = (typeof DIAS_SEMANA)[number]

export type AnamneseStatus = 'incompleta' | 'concluida'

export type Anamnese = {
  id: string
  profile_id: string
  objetivo_principal: string | null
  historico_treino: string | null
  nivel: string | null
  frequencia_semanal: number | null
  dias_disponiveis: string[] | null
  local_treino: string | null
  equipamentos: string | null
  duracao_disponivel_min: number | null
  dores: string | null
  limitacoes: string | null
  lesoes: string | null
  condicoes_saude: string | null
  medicamentos: string | null
  restricao_medica: string | null
  qualidade_sono: string | null
  energia: string | null
  dificuldade_consistencia: string | null
  observacoes: string | null
  /** NULL = preenchida pelo coach, consentimento do aluno pendente. */
  consentimento_em: string | null
  status: AnamneseStatus
  preenchida_em: string | null
  updated_at: string
  /** Auditoria — preenchidos por trigger no banco, nunca pelo cliente. */
  atualizado_por: string | null
  atualizado_por_papel: 'aluno' | 'coach' | null
}

/** Campos editáveis no formulário (controle/auditoria ficam com o banco). */
export type AnamneseForm = Omit<
  Anamnese,
  | 'id'
  | 'profile_id'
  | 'consentimento_em'
  | 'preenchida_em'
  | 'updated_at'
  | 'atualizado_por'
  | 'atualizado_por_papel'
>

export const ANAMNESE_FORM_VAZIO: AnamneseForm = {
  objetivo_principal: null,
  historico_treino: null,
  nivel: null,
  frequencia_semanal: null,
  dias_disponiveis: null,
  local_treino: null,
  equipamentos: null,
  duracao_disponivel_min: null,
  dores: null,
  limitacoes: null,
  lesoes: null,
  condicoes_saude: null,
  medicamentos: null,
  restricao_medica: null,
  qualidade_sono: null,
  energia: null,
  dificuldade_consistencia: null,
  observacoes: null,
  status: 'incompleta',
}

const CAMPOS_TEXTO = [
  'objetivo_principal',
  'historico_treino',
  'nivel',
  'local_treino',
  'equipamentos',
  'dores',
  'limitacoes',
  'lesoes',
  'condicoes_saude',
  'medicamentos',
  'restricao_medica',
  'qualidade_sono',
  'energia',
  'dificuldade_consistencia',
  'observacoes',
] as const

/** Trim + vazio→null, aplicado SÓ no salvar (no onChange engoliria o espaço). */
export function normalizarAnamneseForm(form: AnamneseForm): AnamneseForm {
  const dados = { ...form }
  for (const campo of CAMPOS_TEXTO) {
    const v = dados[campo]
    dados[campo] = v == null || v.trim() === '' ? null : v.trim()
  }
  return dados
}

/**
 * Extrai só os campos de formulário de uma anamnese vinda do banco.
 * Pick EXPLÍCITO (nunca rest-destructuring): o objeto do PostgREST carrega
 * colunas fora do tipo (ex.: created_at), e qualquer coluna sem grant de
 * UPDATE que vaze para o corpo do PATCH derruba o salvamento com 403.
 */
export function anamneseParaForm(a: Anamnese): AnamneseForm {
  return {
    objetivo_principal: a.objetivo_principal,
    historico_treino: a.historico_treino,
    nivel: a.nivel,
    frequencia_semanal: a.frequencia_semanal,
    dias_disponiveis: a.dias_disponiveis,
    local_treino: a.local_treino,
    equipamentos: a.equipamentos,
    duracao_disponivel_min: a.duracao_disponivel_min,
    dores: a.dores,
    limitacoes: a.limitacoes,
    lesoes: a.lesoes,
    condicoes_saude: a.condicoes_saude,
    medicamentos: a.medicamentos,
    restricao_medica: a.restricao_medica,
    qualidade_sono: a.qualidade_sono,
    energia: a.energia,
    dificuldade_consistencia: a.dificuldade_consistencia,
    observacoes: a.observacoes,
    status: a.status,
  }
}

/** Anamnese do próprio aluno logado — RLS garante 0 ou 1 linha. */
export async function fetchMinhaAnamnese(token: string): Promise<Anamnese | null> {
  const rows = await pgRequest<Anamnese[]>('anamneses?select=*', token)
  return rows[0] ?? null
}

/** Anamnese de um aluno vinculado (visão do coach, somente leitura). */
export async function fetchAnamneseDoAluno(
  token: string,
  profileId: string
): Promise<Anamnese | null> {
  const rows = await pgRequest<Anamnese[]>(
    `anamneses?select=*&profile_id=eq.${encodeURIComponent(profileId)}`,
    token
  )
  return rows[0] ?? null
}

/**
 * Primeira gravação: exige consentimento explícito — o INSERT registra
 * consentimento_em (timestamp) e o banco recusa sem ele (NOT NULL).
 */
export async function criarMinhaAnamnese(
  token: string,
  profileId: string,
  form: AnamneseForm
): Promise<void> {
  const rows = await pgRequest<unknown[]>('anamneses', token, {
    method: 'POST',
    body: JSON.stringify({
      ...form,
      profile_id: profileId,
      consentimento_em: new Date().toISOString(),
      preenchida_em: new Date().toISOString(),
    }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) {
    throw new ApiError('A anamnese não foi salva — verifique suas permissões.')
  }
}

/**
 * Edições seguintes: consentimento original permanece imutável (trigger).
 * `consentir: true` confirma um consentimento PENDENTE (anamnese criada
 * pelo coach) — só tem efeito se ainda for NULL e se o editor for o dono.
 */
export async function atualizarMinhaAnamnese(
  token: string,
  profileId: string,
  form: AnamneseForm,
  opts?: { consentir?: boolean }
): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    // PostgREST exige WHERE em UPDATE; o RLS garante que só a própria passa
    `anamneses?profile_id=eq.${encodeURIComponent(profileId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ...form,
        preenchida_em: new Date().toISOString(),
        ...(opts?.consentir ? { consentimento_em: new Date().toISOString() } : {}),
      }),
      headers: { Prefer: 'return=representation' },
    }
  )
  if (rows.length === 0) {
    throw new ApiError('Nada foi salvo — a anamnese não existe ou você não tem permissão.')
  }
}

/**
 * Coach cria a anamnese de um aluno VINCULADO (RLS bloqueia os demais).
 * Nasce SEM consentimento (o trigger zera qualquer valor): o aluno precisa
 * revisar e confirmar na tela dele. Coach nunca consente pelo aluno.
 */
export async function criarAnamneseDoAluno(
  token: string,
  profileId: string,
  form: AnamneseForm
): Promise<void> {
  const rows = await pgRequest<unknown[]>('anamneses', token, {
    method: 'POST',
    body: JSON.stringify({
      ...form,
      profile_id: profileId,
      preenchida_em: new Date().toISOString(),
    }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) {
    throw new ApiError('A anamnese não foi criada — o aluno está vinculado a você?')
  }
}

/** Coach edita a anamnese de um aluno VINCULADO (RLS bloqueia os demais). */
export async function atualizarAnamneseDoAluno(
  token: string,
  profileId: string,
  form: AnamneseForm
): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `anamneses?profile_id=eq.${encodeURIComponent(profileId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ ...form, preenchida_em: new Date().toISOString() }),
      headers: { Prefer: 'return=representation' },
    }
  )
  if (rows.length === 0) {
    throw new ApiError('Nada foi salvo — o aluno está vinculado a você?')
  }
}
