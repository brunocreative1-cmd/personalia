import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'
import { DESIGN_PREVIEW_ROLE } from './flags'
import { mockPgRequest } from './designMock'

const TIMEOUT_MS = 10_000

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

/**
 * Requisição direta ao PostgREST com o access_token da sessão — mesmo padrão
 * do auth.tsx (sem o lock interno do supabase-js) — com timeout de 10s para
 * nunca deixar a UI em loading infinito.
 */
export async function pgRequest<T>(
  path: string,
  token: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<T> {
  // DESIGN_PREVIEW (dev-only): serve mocks e nunca toca a rede. Constante em
  // build, então produção segue direto para o fetch real abaixo.
  if (DESIGN_PREVIEW_ROLE) {
    return mockPgRequest<T>(path, init)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      if (res.status === 401) {
        throw new ApiError('Sua sessão expirou. Saia e entre novamente.', 401)
      }
      // PostgREST devolve o motivo em JSON — mostrar ajuda a diagnosticar
      let detalhe = ''
      try {
        const corpo = (await res.json()) as { message?: string; hint?: string }
        detalhe = corpo.message ?? corpo.hint ?? ''
      } catch {
        // corpo não-JSON: segue sem detalhe
      }
      throw new ApiError(
        `Não foi possível concluir a operação (erro ${res.status}${detalhe ? `: ${detalhe}` : ''}).`,
        res.status
      )
    }
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('Não foi possível conectar ao servidor. Tente novamente.')
  } finally {
    clearTimeout(timer)
  }
}

export const STATUS_OPTIONS = ['novo', 'ativo', 'pausado', 'concluido'] as const
export type AlunoStatus = (typeof STATUS_OPTIONS)[number]

export type PerfilAluno = {
  nome: string | null
  whatsapp: string | null
  cidade: string | null
}

export type CoachContato = {
  nome: string | null
  whatsapp: string | null
}

export type Aluno = {
  id: string
  profile_id: string
  coach_id: string
  status: string
  objetivo: string | null
  nivel: string | null
  data_inicio: string | null
  data_fim: string | null
  perfil: PerfilAluno | null
  coach: CoachContato | null
}

// profiles!profile_id desambigua o embed (alunos também tem FK coach_id → profiles)
const ALUNO_SELECT =
  'id,profile_id,coach_id,status,objetivo,nivel,data_inicio,data_fim,' +
  'perfil:profiles!profile_id(nome,whatsapp,cidade),coach:profiles!coach_id(nome,whatsapp)'

export function fetchAlunos(token: string): Promise<Aluno[]> {
  return pgRequest<Aluno[]>(`alunos?select=${ALUNO_SELECT}`, token)
}

export async function fetchAluno(token: string, profileId: string): Promise<Aluno | null> {
  const rows = await pgRequest<Aluno[]>(
    `alunos?select=${ALUNO_SELECT}&profile_id=eq.${encodeURIComponent(profileId)}`,
    token
  )
  return rows[0] ?? null
}

/**
 * Registro do próprio aluno logado. SELECT sem filtro manual de usuário —
 * a RLS garante que o aluno enxerga apenas a própria linha (0 ou 1).
 */
export async function fetchMeuRegistro(token: string): Promise<Aluno | null> {
  const rows = await pgRequest<Aluno[]>(`alunos?select=${ALUNO_SELECT}`, token)
  return rows[0] ?? null
}

export type Candidato = {
  id: string
  nome: string | null
  whatsapp: string | null
  cidade: string | null
}

/**
 * Candidatos a vínculo: profiles com role='aluno' que ainda NÃO têm registro
 * em public.alunos. Anti-join via embed + filtro is.null do PostgREST.
 * Busca sempre por nome/WhatsApp — nunca por e-mail, nunca em auth.users.
 */
export function fetchCandidatos(token: string): Promise<Candidato[]> {
  return pgRequest<Array<Candidato & { alunos: unknown }>>(
    'profiles?select=id,nome,whatsapp,cidade,alunos!profile_id(profile_id)&role=eq.aluno&alunos=is.null&order=nome',
    token
  ).then((rows) => rows.map(({ alunos: _alunos, ...candidato }) => candidato))
}

export type NovoVinculo = {
  profile_id: string
  objetivo: string | null
  nivel: string | null
  data_inicio: string
}

/**
 * Único INSERT do app (Bloco 2): vincula um aluno existente ao coach logado.
 * data_fim nunca é enviada — o trigger do banco calcula.
 */
export async function vincularAluno(
  token: string,
  coachId: string,
  vinculo: NovoVinculo
): Promise<void> {
  const body = {
    profile_id: vinculo.profile_id,
    coach_id: coachId,
    status: 'novo',
    objetivo: vinculo.objetivo,
    nivel: vinculo.nivel,
    data_inicio: vinculo.data_inicio,
  }
  const rows = await pgRequest<unknown[]>('alunos', token, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) {
    throw new ApiError('O vínculo não foi criado — verifique suas permissões.')
  }
}

export type AlunoUpdate = {
  status?: string
  objetivo?: string | null
  nivel?: string | null
  data_inicio?: string | null
}

/**
 * UPDATE em public.alunos restrito por whitelist às únicas colunas
 * autorizadas: status, objetivo, nivel, data_inicio.
 * data_fim é calculada por trigger no banco; profile_id e coach_id são
 * imutáveis — nenhuma delas jamais entra no corpo do PATCH.
 */
export async function updateAluno(
  token: string,
  profileId: string,
  changes: AlunoUpdate
): Promise<void> {
  const body: AlunoUpdate = {}
  if (changes.status !== undefined) body.status = changes.status
  if (changes.objetivo !== undefined) body.objetivo = changes.objetivo
  if (changes.nivel !== undefined) body.nivel = changes.nivel
  if (changes.data_inicio !== undefined) body.data_inicio = changes.data_inicio

  const rows = await pgRequest<unknown[]>(
    `alunos?profile_id=eq.${encodeURIComponent(profileId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      // return=representation: RLS negando silenciosamente viraria 204 vazio;
      // assim detectamos e avisamos em vez de fingir sucesso
      headers: { Prefer: 'return=representation' },
    }
  )
  if (rows.length === 0) {
    throw new ApiError('Nada foi salvo — o registro não existe ou você não tem permissão.')
  }
}
