import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, fetchMeuRegistro } from '../../lib/api'
import type { Aluno } from '../../lib/api'
import { carregarMeuTreino } from '../../player/carregarPrograma'
import type { CargaPlayer, ExercicioPlayer, SessaoPlayer } from '../../player/contrato'
import { MapaMuscular, MUSCULO_LABEL, MUSCULO_VISTA } from '../../player/MapaMuscular'
import type { MusculoId } from '../../player/MapaMuscular'
import {
  criarAlertaDor,
  fetchExecucaoAberta,
  finalizarExecucao,
  iniciarExecucao,
  salvarSerie,
} from '../../lib/execucoes'
import type { Execucao, ExecucaoSerie } from '../../lib/execucoes'
import { useAuth } from '../../lib/auth'
import { UI_MODO_TESTE } from '../../lib/flags'
import { prepararAudio, TimerDescanso } from '../../components/TimerDescanso'
import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconCheckCircle,
  IconChevronRight,
  IconClock,
  IconDumbbell,
  IconPlay,
  IconPlayFilled,
} from '../../components/icons'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-night px-3 py-3 text-white outline-none transition-colors placeholder:text-white/25 focus:border-flame'

/** Etiqueta de origem do coaching: biblioteca (geral) vs prescrição (do coach). */
function TagFonte({ fonte }: { fonte: 'biblioteca' | 'seu coach' }) {
  if (fonte === 'biblioteca') return null

  return (
    <span
      className="rounded-full bg-flame/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-flame"
    >
      {fonte}
    </span>
  )
}

/** Slugs vindos do banco filtrados para os 16 conhecidos pelo mapa. */
function slugsConhecidos(ex: ExercicioPlayer, papel: 'primario' | 'secundario'): MusculoId[] {
  return ex.musculos
    .filter((m) => m.papel === papel && m.slug in MUSCULO_VISTA)
    .map((m) => m.slug as MusculoId)
}

function BlocoMusculos({ ex }: { ex: ExercicioPlayer }) {
  const primarios = useMemo(() => slugsConhecidos(ex, 'primario'), [ex])
  const secundarios = useMemo(() => slugsConhecidos(ex, 'secundario'), [ex])

  // vista inicial: onde está a maioria dos músculos primários
  const vistaInicial = useMemo(() => {
    const costas = primarios.filter((m) => MUSCULO_VISTA[m] === 'costas').length
    return costas > primarios.length / 2 ? ('costas' as const) : ('frente' as const)
  }, [primarios])
  const [vista, setVista] = useState<'frente' | 'costas'>(vistaInicial)
  useEffect(() => setVista(vistaInicial), [vistaInicial])

  if (primarios.length === 0 && secundarios.length === 0) return null

  return (
    <div className="rounded-2xl border border-white/5 bg-carbon p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-base text-white">
          <IconActivity className="h-5 w-5 text-flame" />
          Músculos ativados
        </p>
        <div className="flex gap-1" role="group" aria-label="Alternar vista do mapa muscular">
          {(['frente', 'costas'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              aria-pressed={vista === v}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                vista === v
                  ? 'bg-flame text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <MapaMuscular vista={vista} primarios={primarios} secundarios={secundarios} />

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
        {primarios.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-flame" /> Primário:{' '}
            {primarios.map((m) => MUSCULO_LABEL[m]).join(', ')}
          </span>
        )}
        {secundarios.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-flame/35" /> Secundário:{' '}
            {secundarios.map((m) => MUSCULO_LABEL[m]).join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}

function imagemDoExercicio(ex: ExercicioPlayer): string | null {
  const nome = ex.biblioteca?.nome?.trim().toLocaleLowerCase('pt-BR')
  if (nome === 'agachamento livre') return '/images/exercises/squat-jump.gif'
  return ex.biblioteca?.imagem_url ?? null
}

/** Coaching da biblioteca: demonstração, como executar, erro comum e segurança. */
function BlocoComoExecutar({ ex }: { ex: ExercicioPlayer }) {
  const bib = ex.biblioteca
  const [demonstracaoAbertaId, setDemonstracaoAbertaId] = useState<string | null>(null)
  const [demonstracaoCarregadaId, setDemonstracaoCarregadaId] = useState<string | null>(null)

  if (!bib) return null
  const orientacoes = bib.orientacoes_base ?? []
  const imagem = imagemDoExercicio(ex)
  const temConteudoPrincipal = Boolean(imagem || orientacoes.length > 0 || bib.instrucoes)
  const demonstracaoAberta = demonstracaoAbertaId === ex.id
  const demonstracaoCarregada = demonstracaoCarregadaId === ex.id
  const alternarDemonstracao = () => {
    if (demonstracaoAberta) {
      setDemonstracaoAbertaId(null)
      return
    }
    setDemonstracaoCarregadaId(ex.id)
    setDemonstracaoAbertaId(ex.id)
  }

  return (
    <>
      {temConteudoPrincipal && (
        <section
          className={`overflow-hidden rounded-3xl border border-white/5 ${
            imagem ? 'bg-white' : 'bg-carbon'
          }`}
        >
          {imagem && (
            <div className="bg-white text-ink">
              <button
                type="button"
                onClick={alternarDemonstracao}
                aria-expanded={demonstracaoAberta}
                aria-controls={`demonstracao-${ex.id}`}
                className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left outline-none transition-colors hover:bg-cream/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-flame"
              >
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-flame">
                    Passo a passo
                  </span>
                  <span className="mt-0.5 block font-display text-lg text-ink">
                    Aprenda a fazer
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white transition-transform group-active:scale-95">
                  {demonstracaoAberta ? 'Fechar' : 'Ver vídeo'}
                  {demonstracaoAberta ? (
                    <IconChevronRight className="h-4 w-4 -rotate-90" />
                  ) : (
                    <IconPlay className="h-4 w-4" />
                  )}
                </span>
              </button>

              <div
                id={`demonstracao-${ex.id}`}
                className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  demonstracaoAberta
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="h-72 border-t border-ink/5 bg-white">
                    {demonstracaoCarregada && (
                      <img
                        src={imagem}
                        alt={`Demonstração de ${bib.nome}`}
                        className={`h-full w-full object-contain ${
                          demonstracaoAberta ? 'exercise-demo-media' : ''
                        }`}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className={`relative bg-carbon p-5 ${imagem ? 'rounded-t-3xl' : ''}`}>
            <p className="flex items-center gap-2 font-display text-base text-white">
              <IconActivity className="h-5 w-5 text-flame" />
              Execução rápida
            </p>
            {orientacoes.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/70">
                {orientacoes.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            ) : (
              bib.instrucoes && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                  {bib.instrucoes}
                </p>
              )
            )}
          </div>
        </section>
      )}

      {bib.erro_comum && (
        <div className="rounded-2xl border border-white/5 border-l-4 border-l-[#ff3b30] bg-carbon p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-base text-white">
              <IconAlertTriangle className="h-5 w-5 text-white/55" />
              Erro mais comum
            </p>
            <TagFonte fonte="biblioteca" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{bib.erro_comum}</p>
        </div>
      )}

      {bib.seguranca && (
        <div className="rounded-2xl border border-flame/35 bg-carbon p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-base text-white">
              <IconAlertTriangle className="h-5 w-5 text-flame" />
              Se sentir desconforto
            </p>
            <TagFonte fonte="biblioteca" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{bib.seguranca}</p>
        </div>
      )}
    </>
  )
}

/** Coaching da prescrição: por que está no plano + orientação personalizada. */
function BlocoCoachingPrescricao({ ex }: { ex: ExercicioPlayer }) {
  return (
    <>
      {ex.motivo_no_plano && (
        <div className="rounded-2xl border border-flame/25 bg-flame/10 p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-base text-white">
              Por que este exercício pra você
            </p>
            <TagFonte fonte="seu coach" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{ex.motivo_no_plano}</p>
        </div>
      )}
      {ex.orientacao_personalizada && (
        <div className="rounded-2xl border border-flame/25 bg-carbon p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-base text-white">
              Orientação personalizada
            </p>
            <TagFonte fonte="seu coach" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{ex.orientacao_personalizada}</p>
        </div>
      )}
    </>
  )
}

function BlocoAlternativa({ ex }: { ex: ExercicioPlayer }) {
  const alt = ex.alternativo
  const [aberto, setAberto] = useState(false)
  if (!alt) return null

  return (
    <div className="rounded-2xl border border-white/5 bg-carbon p-5">
      <p className="text-sm text-white/60">
        Sem como fazer? Alternativa: <span className="font-semibold text-white">{alt.nome}</span>
      </p>
      {alt.alternativa_nota && (
        <p className="mt-2 flex items-start gap-2 text-sm text-white/60">
          <TagFonte fonte="seu coach" />
          <span>{alt.alternativa_nota}</span>
        </p>
      )}
      {(alt.orientacoes_base?.length || alt.erro_comum) && (
        <>
          <button
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="mt-3 text-sm font-medium text-flame underline decoration-flame/40 underline-offset-4"
          >
            {aberto ? 'Fechar como fazer' : 'Como fazer a alternativa'}
          </button>
          {aberto && (
            <div className="mt-3 space-y-2 rounded-xl bg-night p-4 text-sm leading-relaxed text-white/70">
              {(alt.orientacoes_base ?? []).map((o) => (
                <p key={o} className="flex gap-2">
                  <span className="text-flame">•</span>
                  <span>{o}</span>
                </p>
              ))}
              {alt.erro_comum && (
                <p className="flex items-start gap-1.5 text-white/50">
                  <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{alt.erro_comum}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

type SerieLocal = {
  serie: number
  reps: string
  carga: string
  concluida: boolean
  rowId: string | null
  salvando: boolean
}

type DescansoAtivo = {
  id: number
  duracaoSeg: number
  proximo: string
}

type FaseExercicio = 'pronto' | 'iniciando' | 'ativo'

function cargaSemUnidade(valor: string | null | undefined): string {
  return valor?.replace(/\s*kg\s*$/i, '').trim() ?? ''
}

function cargaComUnidade(valor: string): string | null {
  const carga = cargaSemUnidade(valor)
  return carga === '' ? null : `${carga} kg`
}

function seriesIniciais(se: ExercicioPlayer, gravadas: ExecucaoSerie[]): SerieLocal[] {
  return Array.from({ length: se.series }, (_, i) => {
    const gravada = gravadas.find((g) => g.sessao_exercicio_id === se.id && g.serie === i + 1)
    return {
      serie: i + 1,
      reps: gravada?.reps_realizadas != null ? String(gravada.reps_realizadas) : '',
      carga: cargaSemUnidade(gravada?.carga_realizada),
      concluida: gravada?.concluida ?? false,
      rowId: gravada?.id ?? null,
      salvando: false,
    }
  })
}

function indicePrimeiraPendente(series: SerieLocal[]): number {
  const indice = series.findIndex((serie) => !serie.concluida)
  return indice === -1 ? Math.max(0, series.length - 1) : indice
}

function ExercicioAtual({
  se,
  execucaoId,
  gravadas,
  onSerieGravada,
  onSerieConcluida,
  descanso,
  onFecharDescanso,
}: {
  se: ExercicioPlayer
  execucaoId: string
  gravadas: ExecucaoSerie[]
  onSerieGravada: (s: ExecucaoSerie) => void
  onSerieConcluida: (serie: number) => void
  descanso: DescansoAtivo | null
  onFecharDescanso: () => void
}) {
  const { session } = useAuth()
  const [series, setSeries] = useState<SerieLocal[]>(() => seriesIniciais(se, gravadas))
  const [serieAtiva, setSerieAtiva] = useState(() =>
    indicePrimeiraPendente(seriesIniciais(se, gravadas))
  )
  const [fase, setFase] = useState<FaseExercicio>(() =>
    seriesIniciais(se, gravadas).some((serie) => serie.rowId !== null) ? 'ativo' : 'pronto'
  )
  const inicioTimerRef = useRef<number | null>(null)
  const seriesSectionRef = useRef<HTMLElement | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (inicioTimerRef.current !== null) window.clearTimeout(inicioTimerRef.current)
    const iniciais = seriesIniciais(se, gravadas)
    setSeries(iniciais)
    setSerieAtiva(indicePrimeiraPendente(iniciais))
    setFase(iniciais.some((serie) => serie.rowId !== null) ? 'ativo' : 'pronto')
    setErro(null)
    return () => {
      if (inicioTimerRef.current !== null) window.clearTimeout(inicioTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [se.id])

  useEffect(() => {
    if (fase !== 'ativo') return
    seriesSectionRef.current?.focus({ preventScroll: true })
  }, [fase])

  const iniciarExercicio = () => {
    if (fase !== 'pronto') return
    setFase('iniciando')
    inicioTimerRef.current = window.setTimeout(() => {
      setFase('ativo')
      inicioTimerRef.current = null
    }, 720)
  }

  const setSerie = (i: number, patch: Partial<SerieLocal>) =>
    setSeries((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const gravar = async (i: number, concluida: boolean) => {
    if (!session) {
      setErro('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    const s = series[i]
    const acabouDeConcluir = concluida && !s.concluida
    // Ainda dentro do gesto do tap: libera o AudioContext p/ o bipe do timer.
    if (acabouDeConcluir) prepararAudio()
    setSerie(i, { salvando: true, concluida })
    setErro(null)
    try {
      const salvo = await salvarSerie(
        session.access_token,
        execucaoId,
        {
          sessao_exercicio_id: se.id,
          exercicio_nome: se.biblioteca?.nome ?? 'exercício',
          serie: s.serie,
          reps_prescritas: se.repeticoes,
          carga_prescrita: se.carga_sugerida,
          reps_realizadas: s.reps.trim() === '' ? null : Number(s.reps),
          carga_realizada: cargaComUnidade(s.carga),
          concluida,
        },
        s.rowId
      )
      setSerie(i, { rowId: salvo.id, salvando: false })
      onSerieGravada(salvo)
      if (acabouDeConcluir) {
        onSerieConcluida(s.serie)
        const proxima = series.findIndex((item, indice) => indice > i && !item.concluida)
        if (proxima !== -1) setSerieAtiva(proxima)
      }
    } catch (err) {
      setSerie(i, { salvando: false, concluida: s.concluida })
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar a série.')
    }
  }

  const ativa = series[serieAtiva]
  if (!ativa) return null

  const nome = se.biblioteca?.nome ?? 'Exercício'
  const grupo = se.biblioteca?.grupo_muscular ?? 'exercício'

  return (
    <div className="space-y-3">
      <section className="px-1 pb-2 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-flame">{grupo}</p>
        <h2 className="mt-1 font-display text-2xl text-white">{nome}</h2>
        {se.biblioteca?.descricao && (
          <p className="mt-2 text-sm leading-relaxed text-white/55">{se.biblioteca.descricao}</p>
        )}
        {se.observacao && <p className="mt-3 text-sm font-medium text-flame">{se.observacao}</p>}
        {se.biblioteca?.video_url && (
          <a
            href={se.biblioteca.video_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-flame underline decoration-flame/30 underline-offset-4"
          >
            Ver vídeo <IconChevronRight className="h-4 w-4" />
          </a>
        )}
      </section>

      {fase !== 'ativo' ? (
        <section
          className="relative flex min-h-[25rem] flex-col justify-center overflow-hidden rounded-3xl border border-white/5 bg-carbon px-5 py-7 text-center"
          aria-live="polite"
        >
          <img
            src="/images/line-fundo.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-25"
          />

          <p className="relative z-[1] text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
            Pronto para começar
          </p>
          <h3 className="relative z-[1] mt-2 font-display text-2xl text-white">Assuma a posição</h3>

          <div className="relative mx-auto mt-3 flex h-44 w-44 items-center justify-center">
            <span
              className="exercise-launch-orbit pointer-events-none absolute inset-5 rounded-full border border-dashed border-flame/45"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute inset-[1.65rem] rounded-full bg-flame/10 blur-md"
              aria-hidden="true"
            />
            {fase === 'iniciando' && (
              <>
                <span
                  className="exercise-launch-wave pointer-events-none absolute inset-4 rounded-full border border-flame/60"
                  aria-hidden="true"
                />
                <span
                  className="exercise-launch-wave exercise-launch-wave-delay pointer-events-none absolute inset-4 rounded-full border border-flame/35"
                  aria-hidden="true"
                />
              </>
            )}
            <button
              type="button"
              onClick={iniciarExercicio}
              disabled={fase === 'iniciando'}
              aria-label={`Iniciar exercício ${nome}`}
              className={`exercise-launch-trigger relative z-[1] flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-flame to-[#d83e0a] text-white outline-none transition-[filter] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-white/30 disabled:cursor-wait ${
                fase === 'iniciando' ? 'is-starting' : ''
              }`}
            >
              {fase === 'iniciando' ? (
                <IconCheck className="h-8 w-8" />
              ) : (
                <IconPlayFilled className="relative top-0.5 h-10 w-10" />
              )}
              <span className="mt-1.5 text-sm font-semibold uppercase">
                {fase === 'iniciando' ? 'Iniciado' : 'Iniciar'}
              </span>
            </button>
          </div>

          <p className="relative z-[1] font-display text-lg text-white">
            {fase === 'iniciando' ? 'Exercício iniciado' : 'Iniciar exercício'}
          </p>
          <p className="relative z-[1] mt-1 text-xs text-white/40">
            {fase === 'iniciando'
              ? 'Preparando sua primeira série…'
              : `Ao iniciar, abriremos a série 1 de ${series.length}`}
          </p>
        </section>
      ) : (
      <section
        ref={seriesSectionRef}
        tabIndex={-1}
        className="exercise-series-reveal relative rounded-2xl border border-white/10 bg-carbon px-5 py-6 outline-none"
        aria-label={descanso ? 'Descanso entre séries' : undefined}
        aria-labelledby={descanso ? undefined : 'serie-atual'}
      >
        {descanso ? (
          <TimerDescanso
            key={descanso.id}
            duracaoSeg={descanso.duracaoSeg}
            proximo={descanso.proximo}
            onFechar={onFecharDescanso}
          />
        ) : (
          <>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p id="serie-atual" className="font-display text-base text-white">
              {ativa.concluida ? 'Série registrada' : 'Série atual'}
            </p>
            <p className="mt-0.5 text-xs text-white/40">
              {ativa.concluida ? 'Revise os valores ou escolha outra série' : 'Esta é a série que você faz agora'}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-carbon px-3 py-1.5 font-display text-sm text-white">
            <span className="text-flame">{ativa.serie}</span> de {series.length}
          </span>
        </div>

        <div className="mt-6 flex items-start" aria-label="Progresso das séries">
          {series.map((serie, indice) => {
            const selecionada = indice === serieAtiva
            return (
              <div key={serie.serie} className="relative flex flex-1 flex-col items-center">
                {indice > 0 && (
                  <span
                    className={`absolute right-1/2 top-4 h-px w-full ${
                      series[indice - 1].concluida ? 'bg-flame/55' : 'bg-white/15'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSerieAtiva(indice)}
                  aria-label={`Abrir série ${serie.serie}${serie.concluida ? ', concluída' : ''}`}
                  aria-current={selecionada ? 'step' : undefined}
                  className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    selecionada && !serie.concluida
                      ? 'exercise-active-series-pulse border-flame bg-flame text-white'
                      : selecionada && serie.concluida
                        ? 'border-flame bg-flame/20 text-flame ring-4 ring-flame/10'
                        : serie.concluida
                          ? 'border-flame/60 bg-night text-flame'
                          : 'border-white/20 bg-carbon text-white/45 hover:border-white/45'
                  }`}
                >
                  {serie.concluida ? <IconCheck className="h-4 w-4" /> : serie.serie}
                </button>
                <span
                  className={`mt-2 text-[9px] font-semibold uppercase tracking-wider ${
                    selecionada ? 'text-flame' : serie.concluida ? 'text-white/40' : 'text-white/25'
                  }`}
                >
                  {selecionada ? (serie.concluida ? 'revisando' : 'agora') : serie.concluida ? 'feita' : `série ${serie.serie}`}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 min-[390px]:grid-cols-3">
          <label className="rounded-xl border border-white/10 bg-slate p-3">
            <span className="flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
              <IconActivity className="h-4 w-4 text-flame" /> Repetições
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={ativa.reps}
              onChange={(e) => {
                const valor = e.target.value.replace(/\D/g, '').slice(0, 3)
                setSerie(serieAtiva, { reps: valor })
              }}
              placeholder={se.repeticoes}
              aria-label={`Repetições realizadas na série ${ativa.serie}`}
              className="mt-2 w-full bg-transparent text-center font-display text-2xl text-white outline-none placeholder:text-white/80"
            />
            <span className="block text-center text-[10px] text-white/30">meta {se.repeticoes}</span>
          </label>

          <label className="rounded-xl border border-white/10 bg-slate p-3">
            <span className="flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
              <IconDumbbell className="h-4 w-4 text-flame" /> Carga
            </span>
            <div className="mt-2 flex items-baseline justify-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={ativa.carga}
                onChange={(e) => {
                  const valor = e.target.value.replace(/[^\d.,]/g, '')
                  if (/^\d*(?:[.,]\d{0,3})?$/.test(valor)) {
                    setSerie(serieAtiva, { carga: valor })
                  }
                }}
                placeholder={cargaSemUnidade(se.carga_sugerida) || '—'}
                aria-label={`Carga realizada em quilogramas na série ${ativa.serie}`}
                className="max-w-full bg-transparent text-center font-display text-2xl text-white outline-none placeholder:text-white/80"
                style={{
                  width: `${Math.min(
                    8,
                    Math.max(
                      2,
                      (ativa.carga || cargaSemUnidade(se.carga_sugerida) || '—').length
                    )
                  )}ch`,
                }}
              />
              <span className="shrink-0 font-display text-base text-white/65" aria-hidden="true">
                kg
              </span>
            </div>
            <span className="block text-center text-[10px] text-white/30">
              sugerida {se.carga_sugerida ?? '—'}
            </span>
          </label>

          <div className="col-span-2 rounded-xl border border-white/10 bg-slate p-3 min-[390px]:col-span-1">
            <span className="flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
              <IconClock className="h-4 w-4 text-flame" /> Descanso
            </span>
            <p className="mt-2 text-center font-display text-2xl text-white">
              {se.intervalo_seg !== null ? `${se.intervalo_seg} s` : '—'}
            </p>
            <span className="block text-center text-[10px] text-white/30">após concluir</span>
          </div>
        </div>

        {(se.cadencia || se.rpe) && (
          <p className="mt-4 text-xs text-white/45">
            {se.cadencia ? `Cadência ${se.cadencia}` : ''}
            {se.cadencia && se.rpe ? ' · ' : ''}
            {se.rpe ? `RPE ${se.rpe}` : ''}
          </p>
        )}

        {erro && <p className="mt-3 rounded-xl bg-flame/10 px-4 py-3 text-sm text-flame">{erro}</p>}

        <button
          type="button"
          onClick={() => void gravar(serieAtiva, true)}
          disabled={ativa.salvando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-flame py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <IconCheckCircle className="h-5 w-5" />
          {ativa.salvando
            ? 'Salvando…'
            : ativa.concluida
              ? `Salvar alterações da série ${ativa.serie}`
              : `Concluir série ${ativa.serie}`}
        </button>

        {ativa.concluida && (
          <button
            type="button"
            onClick={() => void gravar(serieAtiva, false)}
            disabled={ativa.salvando}
            className="mt-2 w-full py-2 text-xs text-white/45 underline decoration-white/20 underline-offset-4 hover:text-white"
          >
            Marcar série {ativa.serie} como não concluída
          </button>
        )}
          </>
        )}
      </section>
      )}

      <BlocoComoExecutar ex={se} />
      <BlocoAlternativa ex={se} />
      <BlocoCoachingPrescricao ex={se} />
      <BlocoMusculos ex={se} />
    </div>
  )
}

function TelaFinalizar({
  execucao,
  aluno,
  todasConcluidas,
  demonstrativo,
  onVoltar,
}: {
  execucao: Execucao
  aluno: Aluno
  todasConcluidas: boolean
  /** Programa modo_teste (com a flag ligada): alerta de dor sai marcado. */
  demonstrativo: boolean
  onVoltar: () => void
}) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [esforco, setEsforco] = useState(7)
  const [dor, setDor] = useState(0)
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const concluir = async () => {
    if (!session) {
      setErro('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await finalizarExecucao(session.access_token, execucao.id, {
        status: todasConcluidas ? 'concluido' : 'parcial',
        esforco,
        dor,
        observacao: obs.trim() === '' ? null : obs.trim(),
        iniciado_em: execucao.iniciado_em,
      })
      if (dor >= 7) {
        // Decisão 2b: dor real de um testador ainda é sinal de segurança —
        // o alerta é criado normalmente, marcado como vindo de treino
        // simulado para o coach ter o contexto.
        const nota = obs.trim() === '' ? null : obs.trim()
        const mensagem = demonstrativo ? `[treino simulado]${nota ? ` ${nota}` : ''}` : nota
        await criarAlertaDor(session.access_token, {
          aluno_id: aluno.id,
          coach_id: aluno.coach_id,
          execucao_id: execucao.id,
          dor,
          mensagem,
        })
      }
      navigate('/aluno/progresso', { state: { treinoFinalizado: true } })
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível finalizar.')
      setSalvando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-carbon p-5">
      <h2 className="font-display text-2xl text-white">Como foi o treino?</h2>
      {!todasConcluidas && (
        <p className="mt-1 text-sm text-white/50">
          Você não marcou todas as séries — sem problema, registramos como treino parcial.
        </p>
      )}

      <div className="mt-5">
        <label htmlFor="fin-esforco" className="block text-sm font-medium text-white/70">
          Esforço percebido: <span className="font-semibold text-flame">{esforco}</span> / 10
        </label>
        <input
          id="fin-esforco"
          type="range"
          min={1}
          max={10}
          value={esforco}
          onChange={(e) => setEsforco(Number(e.target.value))}
          className="mt-2 w-full accent-flame"
        />
        <div className="flex justify-between text-xs text-white/35">
          <span>leve</span>
          <span>máximo</span>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="fin-dor" className="block text-sm font-medium text-white/70">
          Sentiu dor? <span className="font-semibold text-flame">{dor}</span> / 10
        </label>
        <input
          id="fin-dor"
          type="range"
          min={0}
          max={10}
          value={dor}
          onChange={(e) => setDor(Number(e.target.value))}
          className="mt-2 w-full accent-flame"
        />
        <div className="flex justify-between text-xs text-white/35">
          <span>nenhuma</span>
          <span>muito forte</span>
        </div>
      </div>

      {dor >= 7 && (
        <div className="mt-4 rounded-xl border border-flame/35 bg-flame/10 p-4 text-sm text-white/70">
          <p className="font-medium text-flame">Dor forte é sinal de parar.</p>
          <p className="mt-1 leading-relaxed">
            Interrompa o exercício que causou a dor e avise seu coach — ele vai receber um
            alerta com este registro e ajustar seu treino.
          </p>
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="fin-obs" className="mb-1.5 block text-sm font-medium text-white/70">
          Observação (opcional)
        </label>
        <textarea
          id="fin-obs"
          rows={2}
          maxLength={280}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex.: senti o joelho no agachamento"
          className={inputClass}
        />
      </div>

      {erro && (
        <p className="mt-3 rounded-xl bg-flame/10 px-4 py-3 text-sm text-flame">{erro}</p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={() => void concluir()}
          disabled={salvando}
          className="w-full rounded-xl bg-flame py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Concluir treino'}
        </button>
        <button
          onClick={onVoltar}
          disabled={salvando}
          className="w-full rounded-xl border border-white/10 bg-slate py-3 text-white/70 transition-colors hover:border-flame hover:text-white disabled:opacity-50"
        >
          Voltar aos exercícios
        </button>
      </div>
    </div>
  )
}

export function TreinoPlayer() {
  const { sessaoId } = useParams<{ sessaoId: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [carga, setCarga] = useState<CargaPlayer | null>(null)
  const [execucao, setExecucao] = useState<Execucao | null>(null)
  const [gravadas, setGravadas] = useState<ExecucaoSerie[]>([])
  const [idx, setIdx] = useState(0)
  const [finalizando, setFinalizando] = useState(false)
  // id força remount (reinício) quando outra série dispara um novo descanso
  const [descanso, setDescanso] = useState<DescansoAtivo | null>(null)
  const descansoSeq = useRef(0)
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando')
  const [erroMsg, setErroMsg] = useState<string | null>(null)

  const token = session?.access_token

  useEffect(() => {
    if (!token || !sessaoId) return
    let cancelado = false
    ;(async () => {
      try {
        const [meuAluno, meuTreino] = await Promise.all([
          fetchMeuRegistro(token),
          carregarMeuTreino(token),
        ])
        if (cancelado) return
        if (!meuAluno || !meuTreino) {
          setErroMsg('Treino não disponível — fale com seu coach.')
          setEstado('erro')
          return
        }
        const sessao = meuTreino.dados.sessoes.find((s) => s.sessao.id === sessaoId)
        if (!sessao) {
          setErroMsg('Sessão não encontrada no seu programa.')
          setEstado('erro')
          return
        }
        setAluno(meuAluno)
        setCarga(meuTreino)

        const aberta = await fetchExecucaoAberta(token, sessaoId)
        if (cancelado) return
        if (aberta) {
          setExecucao(aberta)
          setGravadas(aberta.execucao_series)
        } else {
          const nova = await iniciarExecucao(token, {
            aluno_id: meuAluno.id,
            programa_id: meuTreino.dados.programa.id,
            sessao_id: sessaoId,
          })
          if (cancelado) return
          setExecucao(nova)
          setGravadas([])
        }
        setEstado('pronto')
      } catch (err) {
        if (!cancelado) {
          setErroMsg(err instanceof ApiError ? err.message : 'Não foi possível carregar o treino.')
          setEstado('erro')
        }
      }
    })()
    return () => {
      cancelado = true
    }
  }, [token, sessaoId])

  const sessao: SessaoPlayer | null =
    carga?.dados.sessoes.find((s) => s.sessao.id === sessaoId) ?? null
  const itens = useMemo(
    () => (sessao ? [...sessao.exercicios].sort((a, b) => a.ordem - b.ordem) : []),
    [sessao]
  )

  const totalSeries = itens.reduce((acc, se) => acc + se.series, 0)
  const feitas = gravadas.filter((g) => g.concluida).length
  const todasConcluidas = totalSeries > 0 && feitas >= totalSeries

  if (estado === 'carregando') {
    return (
      <div className="aluno-app min-h-screen bg-night px-5 pt-20 text-white">
        <div className="mx-auto max-w-md animate-pulse space-y-3">
          <p className="font-display text-lg text-white/65">Carregando treino…</p>
          <div className="h-56 rounded-3xl bg-carbon" />
          <div className="h-72 rounded-2xl bg-carbon" />
        </div>
      </div>
    )
  }

  if (estado === 'erro' || !sessao || !execucao || !aluno || !carga) {
    return (
      <div className="aluno-app flex min-h-screen flex-col items-center justify-center bg-night px-6 text-center text-white">
        <p className="text-white/60">{erroMsg ?? 'Algo deu errado.'}</p>
        <Link to="/aluno" className="mt-4 font-medium text-flame underline underline-offset-4">
          Voltar para Hoje
        </Link>
      </div>
    )
  }

  const atual = itens[idx]

  const iniciarDescanso = (serie: number) => {
    if (!atual?.intervalo_seg) return
    // Última série do último exercício: treino acabou, sem descanso fantasma.
    if (idx === itens.length - 1 && serie >= atual.series) return
    descansoSeq.current += 1
    const proximo =
      serie < atual.series
        ? `Próxima: série ${serie + 1} de ${atual.series}`
        : `Próximo exercício: ${itens[idx + 1]?.biblioteca?.nome ?? 'exercício seguinte'}`
    setDescanso({ id: descansoSeq.current, duracaoSeg: atual.intervalo_seg, proximo })
  }

  const irParaFinalizar = () => {
    setDescanso(null)
    setFinalizando(true)
  }

  return (
    <div className="aluno-app min-h-screen bg-night pb-10 text-white">
      <header className="sticky top-0 z-10 border-b border-steel bg-night/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-[2.75rem_1fr_3.75rem] items-center gap-2 px-5 py-3">
          <button
            onClick={() => {
              // pausar = sair mantendo a execução aberta; retomamos depois
              if (window.confirm('Pausar o treino? Seu progresso fica salvo e você pode retomar.')) {
                navigate('/aluno')
              }
            }}
            aria-label="Pausar treino e voltar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-carbon hover:text-white"
          >
            <IconChevronRight className="h-6 w-6 rotate-180" />
          </button>
          <span className="truncate text-center font-display text-sm text-white">
            {sessao.sessao.titulo}
          </span>
          <span className="text-right">
            <span className="block text-xs font-semibold text-white/75">
              {idx + 1} de {itens.length}
            </span>
            <span className="mt-0.5 block text-[9px] text-white/35">
              {feitas}/{totalSeries} séries
            </span>
          </span>
        </div>
        <div className="h-0.5 bg-steel">
          <div
            className="h-full bg-flame transition-all"
            style={{ width: `${itens.length > 0 ? ((idx + 1) / itens.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-4">
        {UI_MODO_TESTE && carga.fonte === 'fallback' && (
          <p className="mb-3 rounded-xl border border-dashed border-white/15 bg-carbon px-4 py-2 text-xs text-white/45">
            dev: dados via <span className="font-semibold">fallback da biblioteca viva</span> —
            nenhuma publicação em programa_publicacoes ainda.
          </p>
        )}
        {finalizando ? (
          <TelaFinalizar
            execucao={execucao}
            aluno={aluno}
            todasConcluidas={todasConcluidas}
            demonstrativo={UI_MODO_TESTE && carga.dados.programa.modo_teste}
            onVoltar={() => setFinalizando(false)}
          />
        ) : itens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 bg-carbon p-5 text-sm text-white/50">
            Esta sessão não tem exercícios. Fale com seu coach.
          </p>
        ) : (
          <>
            <ExercicioAtual
              se={atual}
              execucaoId={execucao.id}
              gravadas={gravadas}
              onSerieConcluida={iniciarDescanso}
              descanso={descanso}
              onFecharDescanso={() => setDescanso(null)}
              onSerieGravada={(salvo) =>
                setGravadas((gs) => {
                  const i = gs.findIndex((g) => g.id === salvo.id)
                  if (i === -1) return [...gs, salvo]
                  const copia = [...gs]
                  copia[i] = salvo
                  return copia
                })
              }
            />

            <div className="mt-4 flex gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => {
                  setDescanso(null)
                  setIdx((i) => Math.max(0, i - 1))
                }}
                disabled={idx === 0}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/15 bg-carbon py-3 font-medium text-white/65 transition-colors hover:border-white/35 hover:text-white disabled:opacity-30"
              >
                <IconChevronRight className="h-4 w-4 rotate-180" /> Exercício anterior
              </button>
              {idx < itens.length - 1 ? (
                <button
                  onClick={() => {
                    setDescanso(null)
                    setIdx((i) => Math.min(itens.length - 1, i + 1))
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-flame py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Próximo exercício <IconChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={irParaFinalizar}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-flame py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Finalizar <IconCheck className="h-5 w-5" />
                </button>
              )}
            </div>

            <button
              onClick={irParaFinalizar}
              className="mt-3 w-full py-2 text-center text-sm text-white/40 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
            >
              Encerrar treino agora
            </button>
          </>
        )}
      </main>

    </div>
  )
}
