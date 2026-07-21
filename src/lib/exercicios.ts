import { ApiError, pgRequest } from './api'

export const DIFICULDADES = ['iniciante', 'intermediario', 'avancado'] as const
export type Dificuldade = (typeof DIFICULDADES)[number]

export const GRUPOS_MUSCULARES = [
  'peito',
  'costas',
  'ombros',
  'biceps',
  'triceps',
  'pernas',
  'posteriores de coxa',
  'gluteos',
  'panturrilha',
  'core',
  'cardio',
  'corpo inteiro',
] as const

export type Exercicio = {
  id: string
  criado_por: string
  nome: string
  grupo_muscular: string | null
  descricao: string | null
  instrucoes: string | null
  equipamento: string | null
  dificuldade: Dificuldade | null
  video_url: string | null
  imagem_url: string | null
  seguranca: string | null
  ativo: boolean
  updated_at: string
}

export type ExercicioForm = Omit<Exercicio, 'id' | 'criado_por' | 'updated_at'>

/** Catálogo completo do coach logado (RLS restringe ao dono), inativos incluídos. */
export function fetchExercicios(token: string): Promise<Exercicio[]> {
  return pgRequest<Exercicio[]>('exercicios?select=*&order=nome', token)
}

export async function criarExercicio(
  token: string,
  coachId: string,
  form: ExercicioForm
): Promise<void> {
  const rows = await pgRequest<unknown[]>('exercicios', token, {
    method: 'POST',
    body: JSON.stringify({ ...form, criado_por: coachId }),
    headers: { Prefer: 'return=representation' },
  })
  if (rows.length === 0) {
    throw new ApiError('O exercício não foi criado — verifique suas permissões.')
  }
}

export async function atualizarExercicio(
  token: string,
  id: string,
  form: Partial<ExercicioForm>
): Promise<void> {
  const rows = await pgRequest<unknown[]>(
    `exercicios?id=eq.${encodeURIComponent(id)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(form),
      headers: { Prefer: 'return=representation' },
    }
  )
  if (rows.length === 0) {
    throw new ApiError('Nada foi salvo — o exercício não existe ou você não tem permissão.')
  }
}
