/**
 * Queries PostgREST do player — módulo PURO (sem imports) para o harness de
 * validação local conseguir importar e exercitar exatamente as mesmas
 * strings que o front envia.
 */

/** Última publicação imutável visível ao usuário logado (leitorSnapshot). */
export const CONSULTA_SNAPSHOT =
  'programa_publicacoes?select=programa_id,versao,publicado_em,snapshot_json' +
  '&order=publicado_em.desc,versao.desc&limit=1'

const CAMPOS_BIBLIOTECA =
  'id,nome,grupo_muscular,equipamento,descricao,instrucoes,seguranca,erro_comum,orientacoes_base,video_url,imagem_url'

/**
 * FALLBACK TEMPORÁRIO: programa publicado com o embed completo (biblioteca +
 * músculos resolvidos + alternativo) — some junto com fallbackBiblioteca.ts.
 */
export const CONSULTA_FALLBACK =
  'programas?select=id,aluno_id,coach_id,titulo,status,modo_teste,' +
  'sessoes(id,programa_id,semana,ordem,titulo,dias_sugeridos,duracao_estimada_min,observacoes,' +
  'sessao_exercicios(id,sessao_id,exercicio_id,exercicio_alternativo_id,ordem,series,repeticoes,' +
  'carga_sugerida,intervalo_seg,cadencia,rpe,observacao,motivo_no_plano,orientacao_personalizada,alternativa_nota,' +
  `biblioteca:exercicios!exercicio_id(${CAMPOS_BIBLIOTECA},exercicio_musculos(papel,musculo:musculos(slug))),` +
  'alternativo:exercicios!exercicio_alternativo_id(nome,instrucoes,orientacoes_base,erro_comum,' +
  'exercicio_musculos(papel,musculo:musculos(slug)))))' +
  '&status=eq.publicado&order=created_at.desc&limit=1' +
  '&sessoes.order=semana,ordem&sessoes.sessao_exercicios.order=ordem'
