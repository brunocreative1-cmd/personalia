/**
 * FALLBACK TEMPORÁRIO do player — REMOVER quando programa_publicacoes tiver
 * a primeira linha (pós-007b/backfill): basta apagar este arquivo e o import
 * em carregarPrograma.ts.
 *
 * Enquanto o gate de publicação está desligado e não existem snapshots,
 * monta EM MEMÓRIA o mesmo shape do snapshot a partir da biblioteca viva,
 * via PostgREST (RLS do aluno). Nunca é usado se houver snapshot.
 */
import { pgRequest } from '../lib/api'
import { CONSULTA_FALLBACK } from './consultas'
import type {
  AlternativoPlayer,
  CargaPlayer,
  ExercicioPlayer,
  MusculoAtivado,
  PapelMusculo,
} from './contrato'

type MusculoEmbed = { papel: PapelMusculo; musculo: { slug: string } | null }

type ExercicioEmbed = {
  nome: string
  instrucoes: string | null
  orientacoes_base: string[] | null
  erro_comum: string | null
  exercicio_musculos: MusculoEmbed[]
}

type SessaoExercicioRow = Omit<ExercicioPlayer, 'biblioteca' | 'musculos' | 'alternativo'> & {
  biblioteca: (ExercicioPlayer['biblioteca'] & { exercicio_musculos: MusculoEmbed[] }) | null
  alternativo: ExercicioEmbed | null
}

type ProgramaRow = {
  id: string
  aluno_id: string
  coach_id: string
  titulo: string
  status: string
  modo_teste: boolean
  sessoes: Array<{
    id: string
    programa_id: string
    semana: number
    ordem: number
    titulo: string
    dias_sugeridos: string[] | null
    duracao_estimada_min: number | null
    observacoes: string | null
    sessao_exercicios: SessaoExercicioRow[]
  }>
}

/** Mesma ordenação do snapshot (jsonb_agg ... order by papel, slug). */
function mapearMusculos(embed: MusculoEmbed[] | undefined): MusculoAtivado[] {
  return (embed ?? [])
    .flatMap((em) => (em.musculo ? [{ slug: em.musculo.slug, papel: em.papel }] : []))
    .sort((a, b) => a.papel.localeCompare(b.papel) || a.slug.localeCompare(b.slug))
}

function mapearAlternativo(
  alt: ExercicioEmbed | null,
  alternativaNota: string | null
): AlternativoPlayer | null {
  if (!alt) return null
  return {
    nome: alt.nome,
    instrucoes: alt.instrucoes,
    orientacoes_base: alt.orientacoes_base,
    erro_comum: alt.erro_comum,
    musculos: mapearMusculos(alt.exercicio_musculos),
    alternativa_nota: alternativaNota,
  }
}

/**
 * Programa publicado do aluno logado montado no shape do contrato.
 * null = aluno sem programa publicado.
 */
export async function carregarDoFallback(token: string): Promise<CargaPlayer | null> {
  const rows = await pgRequest<ProgramaRow[]>(CONSULTA_FALLBACK, token)
  const prog = rows[0]
  if (!prog) return null

  return {
    fonte: 'fallback',
    dados: {
      programa: {
        id: prog.id,
        aluno_id: prog.aluno_id,
        coach_id: prog.coach_id,
        titulo: prog.titulo,
        status: prog.status,
        modo_teste: prog.modo_teste,
      },
      sessoes: prog.sessoes.map((s) => ({
        sessao: {
          id: s.id,
          programa_id: s.programa_id,
          semana: s.semana,
          ordem: s.ordem,
          titulo: s.titulo,
          dias_sugeridos: s.dias_sugeridos,
          duracao_estimada_min: s.duracao_estimada_min,
          observacoes: s.observacoes,
        },
        exercicios: s.sessao_exercicios.map((se): ExercicioPlayer => {
          const { biblioteca, alternativo, ...prescricao } = se
          const bib = biblioteca
            ? (({ exercicio_musculos: _em, ...campos }) => campos)(biblioteca)
            : null
          return {
            ...prescricao,
            biblioteca: bib,
            musculos: mapearMusculos(biblioteca?.exercicio_musculos),
            alternativo: mapearAlternativo(alternativo, se.alternativa_nota),
          }
        }),
      })),
      congelado_em: null,
    },
  }
}
