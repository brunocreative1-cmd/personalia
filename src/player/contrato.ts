/**
 * CONTRATO do player do aluno — o shape é o do snapshot_json gravado por
 * montar_snapshot_programa (007/008) em programa_publicacoes, bloco
 * alternativo incluído. Toda fonte de dados do player produz este tipo:
 *   - leitorSnapshot (definitivo): lê a última publicação imutável;
 *   - fallbackBiblioteca (temporário): monta o mesmo shape da biblioteca
 *     viva enquanto programa_publicacoes não tem a primeira linha.
 * O player nunca sabe de qual fonte veio — só recebe a etiqueta `fonte`.
 */

export type PapelMusculo = 'primario' | 'secundario'

/** Músculo já resolvido para o slug interno (16 slugs de public.musculos). */
export type MusculoAtivado = {
  slug: string
  papel: PapelMusculo
}

/** Coaching DA BIBLIOTECA: como o exercício se executa, para qualquer aluno. */
export type BibliotecaExercicio = {
  id: string
  nome: string
  grupo_muscular: string | null
  equipamento: string | null
  descricao: string | null
  instrucoes: string | null
  seguranca: string | null
  erro_comum: string | null
  orientacoes_base: string[] | null
  video_url: string | null
  imagem_url: string | null
}

/** Bloco alternativo do snapshot (shape exato de montar_snapshot_programa). */
export type AlternativoPlayer = {
  nome: string
  instrucoes: string | null
  orientacoes_base: string[] | null
  erro_comum: string | null
  musculos: MusculoAtivado[]
  /** Coaching DA PRESCRIÇÃO: nota do coach sobre quando usar a alternativa. */
  alternativa_nota: string | null
}

/**
 * Um exercício prescrito: sessao_exercicios congelado + biblioteca +
 * músculos resolvidos + alternativo. Campos de coaching têm fonte distinta:
 *   biblioteca  -> orientacoes_base / erro_comum / seguranca / instrucoes
 *   prescrição  -> motivo_no_plano / orientacao_personalizada / alternativa_nota / observacao
 */
export type ExercicioPlayer = {
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
  motivo_no_plano: string | null
  orientacao_personalizada: string | null
  alternativa_nota: string | null
  biblioteca: BibliotecaExercicio | null
  musculos: MusculoAtivado[]
  alternativo: AlternativoPlayer | null
}

export type SessaoPlayer = {
  sessao: {
    id: string
    programa_id: string
    semana: number
    ordem: number
    titulo: string
    dias_sugeridos: string[] | null
    duracao_estimada_min: number | null
    observacoes: string | null
  }
  exercicios: ExercicioPlayer[]
}

export type ProgramaPlayer = {
  programa: {
    id: string
    aluno_id: string
    coach_id: string
    titulo: string
    status: string
    modo_teste: boolean
  }
  sessoes: SessaoPlayer[]
  /** Timestamp do congelamento (snapshot). null = dado montado na hora (fallback). */
  congelado_em: string | null
}

export type FontePlayer = 'snapshot' | 'fallback'

/** Resultado de um carregamento: dados + etiqueta de origem (nunca mistura). */
export type CargaPlayer = {
  fonte: FontePlayer
  dados: ProgramaPlayer
}
