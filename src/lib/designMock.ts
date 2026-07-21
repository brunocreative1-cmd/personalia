/**
 * DESIGN_PREVIEW (dev-only): dados mock servidos no lugar do PostgREST.
 *
 * Ativado apenas quando DESIGN_PREVIEW_ROLE !== null (ver flags.ts), o que só
 * ocorre em dev com VITE_DESIGN_PREVIEW definido. Em produção este módulo fica
 * inerte — mockPgRequest nunca é chamado porque o guard em api.ts é constante.
 *
 * Objetivo: permitir trabalhar o design system com telas populadas, sem
 * Supabase real. NÃO é fonte de verdade de nenhuma regra de negócio.
 */
const COACH_ID = '00000000-0000-0000-0000-000000000000'

// ————— catálogo de exercícios —————
const EXERCICIOS = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    criado_por: COACH_ID,
    nome: 'Agachamento Livre',
    grupo_muscular: 'pernas',
    descricao: 'Agachamento com barra nas costas.',
    instrucoes: 'Desça controlando até a coxa ficar paralela ao chão e suba.',
    equipamento: 'Barra',
    dificuldade: 'intermediario',
    video_url: null,
    imagem_url: null,
    seguranca: 'Mantenha a coluna neutra e os joelhos alinhados aos pés.',
    ativo: true,
    updated_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    criado_por: COACH_ID,
    nome: 'Supino Reto',
    grupo_muscular: 'peito',
    descricao: 'Supino com barra no banco reto.',
    instrucoes: 'Desça a barra até o peito e empurre até estender os cotovelos.',
    equipamento: 'Barra',
    dificuldade: 'intermediario',
    video_url: null,
    imagem_url: null,
    seguranca: 'Use pegador de segurança ou parceiro para as séries pesadas.',
    ativo: true,
    updated_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'e3333333-3333-3333-3333-333333333333',
    criado_por: COACH_ID,
    nome: 'Remada Curvada',
    grupo_muscular: 'costas',
    descricao: 'Remada com barra, tronco inclinado.',
    instrucoes: 'Puxe a barra em direção ao abdômen mantendo o tronco firme.',
    equipamento: 'Barra',
    dificuldade: 'intermediario',
    video_url: null,
    imagem_url: null,
    seguranca: 'Evite arredondar a lombar durante a puxada.',
    ativo: true,
    updated_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'e4444444-4444-4444-4444-444444444444',
    criado_por: COACH_ID,
    nome: 'Desenvolvimento com Halteres',
    grupo_muscular: 'ombros',
    descricao: 'Desenvolvimento sentado com halteres.',
    instrucoes: 'Empurre os halteres acima da cabeça sem travar os cotovelos.',
    equipamento: 'Halteres',
    dificuldade: 'iniciante',
    video_url: null,
    imagem_url: null,
    seguranca: 'Não hiperestenda a lombar no topo do movimento.',
    ativo: true,
    updated_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'e5555555-5555-5555-5555-555555555555',
    criado_por: COACH_ID,
    nome: 'Levantamento Terra',
    grupo_muscular: 'posteriores de coxa',
    descricao: 'Terra convencional com barra.',
    instrucoes: 'Levante a barra mantendo-a próxima ao corpo, quadril e ombros subindo juntos.',
    equipamento: 'Barra',
    dificuldade: 'avancado',
    video_url: null,
    imagem_url: null,
    seguranca: 'Priorize a técnica; pare a série se a lombar arredondar.',
    ativo: true,
    updated_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'e6666666-6666-6666-6666-666666666666',
    criado_por: COACH_ID,
    nome: 'Prancha Abdominal',
    grupo_muscular: 'core',
    descricao: 'Isometria de prancha frontal.',
    instrucoes: 'Sustente o corpo alinhado apoiado nos antebraços e pontas dos pés.',
    equipamento: 'Peso corporal',
    dificuldade: 'iniciante',
    video_url: null,
    imagem_url: null,
    seguranca: 'Não deixe o quadril cair; respire de forma contínua.',
    ativo: true,
    updated_at: '2026-07-01T12:00:00Z',
  },
]

// Alias `exercicio` do embed do coach (ProgramaBuilder / programas.ts).
const exResumo = (ex: (typeof EXERCICIOS)[number]) => ({
  id: ex.id,
  nome: ex.nome,
  grupo_muscular: ex.grupo_muscular,
  equipamento: ex.equipamento,
  instrucoes: ex.instrucoes,
  seguranca: ex.seguranca,
  video_url: ex.video_url,
  imagem_url: ex.imagem_url,
})

// Alias `biblioteca` do embed do player (fallbackBiblioteca / contrato.ts),
// com exercicio_musculos aninhado como o PostgREST devolveria.
const bibResumo = (ex: (typeof EXERCICIOS)[number]) => ({
  id: ex.id,
  nome: ex.nome,
  grupo_muscular: ex.grupo_muscular,
  equipamento: ex.equipamento,
  descricao: ex.descricao,
  instrucoes: ex.instrucoes,
  seguranca: ex.seguranca,
  erro_comum: 'Evite compensar com a lombar; controle a fase excêntrica.',
  orientacoes_base: [
    'Aqueça com séries leves antes das cargas de trabalho.',
    'Respire de forma controlada em cada repetição.',
  ],
  video_url: ex.video_url,
  imagem_url: ex.imagem_url,
  exercicio_musculos: [] as Array<{ papel: string; musculo: { slug: string } | null }>,
})

// ————— alunos —————
const ALUNO_ANA = {
  id: 'a1111111-1111-1111-1111-1111111111aa',
  profile_id: '11111111-1111-1111-1111-111111111111',
  coach_id: COACH_ID,
  status: 'ativo',
  objetivo: 'Ganho de força e hipertrofia',
  nivel: 'intermediario',
  data_inicio: '2026-07-06',
  data_fim: '2026-08-16',
  perfil: { nome: 'Ana Souza', whatsapp: '(11) 99876-5432', cidade: 'São Paulo' },
  coach: { nome: 'Coach Preview', whatsapp: '(11) 90000-0000' },
}

const ALUNO_BRUNO = {
  id: 'a2222222-2222-2222-2222-2222222222aa',
  profile_id: '22222222-2222-2222-2222-222222222222',
  coach_id: COACH_ID,
  status: 'novo',
  objetivo: 'Emagrecimento',
  nivel: 'iniciante',
  data_inicio: '2026-07-18',
  data_fim: '2026-08-28',
  perfil: { nome: 'Bruno Lima', whatsapp: '(21) 98765-4321', cidade: 'Rio de Janeiro' },
  coach: { nome: 'Coach Preview', whatsapp: '(11) 90000-0000' },
}

const ALUNO_CARLA = {
  id: 'a3333333-3333-3333-3333-3333333333aa',
  profile_id: '33333333-3333-3333-3333-333333333333',
  coach_id: COACH_ID,
  status: 'pausado',
  objetivo: 'Condicionamento geral',
  nivel: 'intermediario',
  data_inicio: '2026-06-01',
  data_fim: '2026-07-12',
  perfil: { nome: 'Carla Dias', whatsapp: '(31) 91234-5678', cidade: 'Belo Horizonte' },
  coach: { nome: 'Coach Preview', whatsapp: '(11) 90000-0000' },
}

const ALUNOS = [ALUNO_ANA, ALUNO_BRUNO, ALUNO_CARLA]

// candidatos a vínculo (profiles role=aluno sem registro em alunos)
const CANDIDATOS = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    nome: 'Diego Martins',
    whatsapp: '(41) 99999-1111',
    cidade: 'Curitiba',
    alunos: null,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    nome: 'Elisa Ferreira',
    whatsapp: '(51) 98888-2222',
    cidade: 'Porto Alegre',
    alunos: null,
  },
]

// ————— programa publicado da Ana (com sessões e exercícios) —————
const mkSessaoEx = (
  idx: number,
  sessaoId: string,
  ex: (typeof EXERCICIOS)[number],
  series: number,
  reps: string,
  carga: string | null
) => ({
  id: `se${idx}-${sessaoId}`,
  sessao_id: sessaoId,
  exercicio_id: ex.id,
  exercicio_alternativo_id: null,
  ordem: idx,
  series,
  repeticoes: reps,
  carga_sugerida: carga,
  intervalo_seg: 90,
  cadencia: '2-0-1',
  rpe: '7-8',
  observacao: null,
  // campos de prescrição extras que o player lê
  motivo_no_plano: null,
  orientacao_personalizada: null,
  alternativa_nota: null,
  // alias do coach e alias do player convivem no mesmo objeto
  exercicio: exResumo(ex),
  biblioteca: bibResumo(ex),
  alternativo: null,
})

const PROGRAMA_ANA = {
  id: 'ba111111-1111-1111-1111-111111111111',
  aluno_id: ALUNO_ANA.id,
  coach_id: COACH_ID,
  titulo: 'Base de Força — 6 Semanas',
  objetivo: 'Ganho de força e hipertrofia',
  descricao: 'Programa full-body progressivo, 3x por semana.',
  data_inicio: '2026-07-06',
  data_fim: '2026-08-16',
  status: 'publicado',
  observacoes: 'Ajustar cargas conforme RPE alvo.',
  modo_teste: false,
  updated_at: '2026-07-05T10:00:00Z',
  sessoes: [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      programa_id: 'ba111111-1111-1111-1111-111111111111',
      semana: 1,
      ordem: 1,
      titulo: 'A — Inferiores + Core',
      dias_sugeridos: ['seg', 'qui'],
      duracao_estimada_min: 55,
      observacoes: null,
      sessao_exercicios: [
        mkSessaoEx(1, 'c1111111-1111-1111-1111-111111111111', EXERCICIOS[0], 4, '8-10', '40 kg'),
        mkSessaoEx(2, 'c1111111-1111-1111-1111-111111111111', EXERCICIOS[4], 3, '6-8', '60 kg'),
        mkSessaoEx(3, 'c1111111-1111-1111-1111-111111111111', EXERCICIOS[5], 3, '40s', null),
      ],
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      programa_id: 'ba111111-1111-1111-1111-111111111111',
      semana: 1,
      ordem: 2,
      titulo: 'B — Superiores',
      dias_sugeridos: ['ter', 'sex'],
      duracao_estimada_min: 50,
      observacoes: null,
      sessao_exercicios: [
        mkSessaoEx(1, 'c2222222-2222-2222-2222-222222222222', EXERCICIOS[1], 4, '8-10', '30 kg'),
        mkSessaoEx(2, 'c2222222-2222-2222-2222-222222222222', EXERCICIOS[2], 4, '10-12', '25 kg'),
        mkSessaoEx(3, 'c2222222-2222-2222-2222-222222222222', EXERCICIOS[3], 3, '12', '10 kg'),
      ],
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      programa_id: 'ba111111-1111-1111-1111-111111111111',
      semana: 2,
      ordem: 1,
      titulo: 'A — Inferiores + Core',
      dias_sugeridos: ['seg', 'qui'],
      duracao_estimada_min: 55,
      observacoes: null,
      sessao_exercicios: [
        mkSessaoEx(1, 'c3333333-3333-3333-3333-333333333333', EXERCICIOS[0], 4, '8-10', '42.5 kg'),
        mkSessaoEx(2, 'c3333333-3333-3333-3333-333333333333', EXERCICIOS[4], 3, '6-8', '65 kg'),
        mkSessaoEx(3, 'c3333333-3333-3333-3333-333333333333', EXERCICIOS[5], 3, '45s', null),
      ],
    },
  ],
}

// ————— execuções da Ana (histórico) —————
/**
 * Datas relativas a hoje: mantêm gráficos e métricas sempre populados,
 * independentemente de quando o preview for aberto.
 */
function diasAtras(n: number, hora = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hora, 30, 0, 0)
  return d.toISOString()
}

const mkSerie = (
  execId: string,
  idx: number,
  nome: string,
  serie: number,
  reps: string,
  carga: string
) => ({
  id: `sr${idx}-${execId}`,
  execucao_id: execId,
  sessao_exercicio_id: `se${idx}-x`,
  exercicio_nome: nome,
  serie,
  reps_prescritas: reps,
  carga_prescrita: carga,
  reps_realizadas: Number(reps.split('-')[0]) || 8,
  carga_realizada: carga,
  concluida: true,
  registrada_em: '2026-07-13T11:20:00Z',
})

const EXECUCOES_ANA = [
  {
    id: 'ea111111-1111-1111-1111-111111111111',
    aluno_id: ALUNO_ANA.id,
    programa_id: PROGRAMA_ANA.id,
    sessao_id: PROGRAMA_ANA.sessoes[0].id,
    status: 'concluido',
    iniciado_em: diasAtras(0),
    finalizado_em: diasAtras(0, 11),
    duracao_seg: 3300,
    esforco: 7,
    dor: 2,
    observacao: 'Boa sessão, cargas subindo bem.',
    simulado: false,
    execucao_series: [
      mkSerie('ea111111-1111-1111-1111-111111111111', 1, 'Agachamento Livre', 1, '8-10', '40 kg'),
      mkSerie('ea111111-1111-1111-1111-111111111111', 2, 'Levantamento Terra', 1, '6-8', '60 kg'),
    ],
  },
  {
    id: 'ea222222-2222-2222-2222-222222222222',
    aluno_id: ALUNO_ANA.id,
    programa_id: PROGRAMA_ANA.id,
    sessao_id: PROGRAMA_ANA.sessoes[1].id,
    status: 'concluido',
    iniciado_em: diasAtras(2),
    finalizado_em: diasAtras(2, 11),
    duracao_seg: 3000,
    esforco: 8,
    dor: 1,
    observacao: null,
    simulado: false,
    execucao_series: [
      mkSerie('ea222222-2222-2222-2222-222222222222', 1, 'Supino Reto', 1, '8-10', '28 kg'),
      mkSerie('ea222222-2222-2222-2222-222222222222', 2, 'Remada Curvada', 1, '10-12', '24 kg'),
    ],
  },
  {
    id: 'ea333333-3333-3333-3333-333333333333',
    aluno_id: ALUNO_ANA.id,
    programa_id: PROGRAMA_ANA.id,
    sessao_id: PROGRAMA_ANA.sessoes[0].id,
    status: 'parcial',
    iniciado_em: diasAtras(4),
    finalizado_em: diasAtras(4, 11),
    duracao_seg: 1500,
    esforco: 6,
    dor: 3,
    observacao: 'Faltou tempo, parei antes do core.',
    simulado: false,
    execucao_series: [
      mkSerie('ea333333-3333-3333-3333-333333333333', 1, 'Agachamento Livre', 1, '8-10', '37.5 kg'),
    ],
  },
]

const ALERTAS_ANA = [
  {
    id: 'af111111-1111-1111-1111-111111111111',
    aluno_id: ALUNO_ANA.id,
    coach_id: COACH_ID,
    execucao_id: EXECUCOES_ANA[2].id,
    tipo: 'dor',
    dor: 7,
    mensagem: 'Senti fisgada no joelho no agachamento.',
    lido: false,
    created_at: diasAtras(4, 11),
  },
]

const ANAMNESE_ANA = {
  id: 'ad111111-1111-1111-1111-111111111111',
  profile_id: ALUNO_ANA.profile_id,
  objetivo_principal: 'Ganhar força e melhorar a composição corporal',
  historico_treino: 'Treina há 2 anos, com pausas.',
  nivel: 'intermediario',
  frequencia_semanal: 3,
  dias_disponiveis: ['seg', 'ter', 'qui', 'sex'],
  local_treino: 'Academia',
  equipamentos: 'Completa (barras, halteres, máquinas)',
  duracao_disponivel_min: 60,
  dores: 'Leve desconforto no joelho direito ocasional.',
  limitacoes: null,
  lesoes: 'Entorse de tornozelo em 2023, recuperada.',
  condicoes_saude: null,
  medicamentos: null,
  restricao_medica: null,
  qualidade_sono: 'boa',
  energia: 'alta',
  dificuldade_consistencia: 'Viagens de trabalho atrapalham a rotina.',
  observacoes: null,
  consentimento_em: '2026-07-05T09:00:00Z',
  status: 'concluida',
  preenchida_em: '2026-07-05T09:00:00Z',
  updated_at: '2026-07-05T09:00:00Z',
  atualizado_por: ALUNO_ANA.profile_id,
  atualizado_por_papel: 'aluno',
}

// ————— roteador —————
function param(params: URLSearchParams, key: string): string | null {
  const raw = params.get(key)
  if (raw === null) return null
  return raw.replace(/^eq\./, '')
}

/** Resolve leituras GET conforme o recurso/filtros do PostgREST. */
function resolveGet(resource: string, params: URLSearchParams): unknown {
  switch (resource) {
    case 'profiles': {
      // fetchCandidatos: role=eq.aluno & alunos=is.null
      if (param(params, 'role') === 'aluno') return CANDIDATOS
      return []
    }
    case 'alunos': {
      const pid = param(params, 'profile_id')
      if (pid) return ALUNOS.filter((a) => a.profile_id === pid)
      // sem filtro: devolve a lista toda. Telas do coach usam o conjunto;
      // telas do aluno pegam só rows[0] (a Ana), então serve para os dois.
      return ALUNOS
    }
    case 'exercicios':
      return EXERCICIOS
    case 'programas': {
      const id = param(params, 'id')
      if (id) return [PROGRAMA_ANA]
      // aluno_id filter (coach) ou sem filtro (aluno): devolve o programa da Ana
      return [PROGRAMA_ANA]
    }
    case 'execucoes': {
      // fetchExecucaoAberta: status=iniciado → nenhuma em aberto
      if (param(params, 'status') === 'iniciado') return []
      return EXECUCOES_ANA
    }
    case 'alertas':
      return ALERTAS_ANA
    case 'anamneses':
      return [ANAMNESE_ANA]
    default:
      return []
  }
}

/**
 * Substituto de pgRequest no modo DESIGN_PREVIEW. GET devolve mocks; escritas
 * (POST/PATCH/DELETE) apenas ecoam um registro com id, para os callers que
 * checam `rows.length > 0` seguirem felizes. Nada é persistido.
 */
export async function mockPgRequest<T>(
  path: string,
  init: { method?: string; body?: BodyInit | null } = {}
): Promise<T> {
  const [resource, qs = ''] = path.split('?')
  const params = new URLSearchParams(qs)
  const method = (init.method ?? 'GET').toUpperCase()

  // pequena latência para exercitar estados de loading do design
  await new Promise((r) => setTimeout(r, 120))

  if (method === 'GET') {
    return resolveGet(resource, params) as T
  }

  // escrita: ecoa representação mínima (o corpo do app é sempre JSON string)
  let body: Record<string, unknown> = {}
  try {
    body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {}
  } catch {
    body = {}
  }
  const echoed = Array.isArray(body)
    ? body.map((b) => ({ id: crypto.randomUUID(), ...(b as object) }))
    : [{ id: crypto.randomUUID(), ...body }]
  return echoed as T
}
