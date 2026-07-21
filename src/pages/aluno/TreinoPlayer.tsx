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
import { LoadingScreen } from '../../components/LoadingScreen'
import { prepararAudio, TimerDescanso } from '../../components/TimerDescanso'
import { IconAlertTriangle, IconCheck } from '../../components/icons'

const inputClass =
  'w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-terracotta'

/** Etiqueta de origem do coaching: biblioteca (geral) vs prescrição (do coach). */
function TagFonte({ fonte }: { fonte: 'biblioteca' | 'seu coach' }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        fonte === 'seu coach' ? 'bg-terracotta/15 text-terracotta' : 'bg-ink/10 text-ink/50'
      }`}
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
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Músculos ativados</p>
        <div className="flex gap-1" role="group" aria-label="Alternar vista do mapa muscular">
          {(['frente', 'costas'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              aria-pressed={vista === v}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                vista === v ? 'bg-ink text-cream' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <MapaMuscular vista={vista} primarios={primarios} secundarios={secundarios} />

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
        {primarios.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-terracotta" /> Primário:{' '}
            {primarios.map((m) => MUSCULO_LABEL[m]).join(', ')}
          </span>
        )}
        {secundarios.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-terracotta/35" /> Secundário:{' '}
            {secundarios.map((m) => MUSCULO_LABEL[m]).join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}

/** Coaching da biblioteca: como executar, erro comum e segurança. */
function BlocoComoExecutar({ ex }: { ex: ExercicioPlayer }) {
  const bib = ex.biblioteca
  const [mostraPassos, setMostraPassos] = useState(false)
  if (!bib) return null
  const orientacoes = bib.orientacoes_base ?? []

  return (
    <>
      {(orientacoes.length > 0 || bib.instrucoes) && (
        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Como executar</p>
            <TagFonte fonte="biblioteca" />
          </div>
          {orientacoes.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm text-ink/80">
              {orientacoes.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="text-terracotta">•</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{bib.instrucoes}</p>
          )}
          {orientacoes.length > 0 && bib.instrucoes && (
            <>
              <button
                onClick={() => setMostraPassos((v) => !v)}
                aria-expanded={mostraPassos}
                className="mt-2 text-sm font-medium text-terracotta underline"
              >
                {mostraPassos ? 'Fechar passo a passo' : 'Passo a passo completo'}
              </button>
              {mostraPassos && (
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-cream p-3 text-sm text-ink/80">
                  {bib.instrucoes}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {bib.erro_comum && (
        <div className="rounded-2xl border-l-4 border-ink/60 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink/50">
              <IconAlertTriangle className="h-4 w-4" />
              Erro mais comum
            </p>
            <TagFonte fonte="biblioteca" />
          </div>
          <p className="mt-1 text-sm text-ink/80">{bib.erro_comum}</p>
        </div>
      )}

      {bib.seguranca && (
        <div className="rounded-2xl border border-terracotta/40 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-terracotta">
              Se sentir desconforto
            </p>
            <TagFonte fonte="biblioteca" />
          </div>
          <p className="mt-1 text-sm text-ink/80">{bib.seguranca}</p>
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
        <div className="rounded-2xl border border-terracotta/30 bg-terracotta/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-terracotta">
              Por que este exercício pra você
            </p>
            <TagFonte fonte="seu coach" />
          </div>
          <p className="mt-1 text-sm text-ink/80">{ex.motivo_no_plano}</p>
        </div>
      )}
      {ex.orientacao_personalizada && (
        <div className="rounded-2xl border border-terracotta/30 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-terracotta">
              Orientação personalizada
            </p>
            <TagFonte fonte="seu coach" />
          </div>
          <p className="mt-1 text-sm text-ink/80">{ex.orientacao_personalizada}</p>
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
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-sm text-ink/70">
        Sem como fazer? Alternativa: <span className="font-medium text-ink">{alt.nome}</span>
      </p>
      {alt.alternativa_nota && (
        <p className="mt-1 flex items-start gap-2 text-sm text-ink/70">
          <TagFonte fonte="seu coach" />
          <span>{alt.alternativa_nota}</span>
        </p>
      )}
      {(alt.orientacoes_base?.length || alt.erro_comum) && (
        <>
          <button
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="mt-2 text-sm font-medium text-terracotta underline"
          >
            {aberto ? 'Fechar como fazer' : 'Como fazer a alternativa'}
          </button>
          {aberto && (
            <div className="mt-2 space-y-2 rounded-xl bg-cream p-3 text-sm text-ink/80">
              {(alt.orientacoes_base ?? []).map((o) => (
                <p key={o} className="flex gap-2">
                  <span className="text-terracotta">•</span>
                  <span>{o}</span>
                </p>
              ))}
              {alt.erro_comum && (
                <p className="flex items-start gap-1.5 text-ink/60">
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

function seriesIniciais(se: ExercicioPlayer, gravadas: ExecucaoSerie[]): SerieLocal[] {
  return Array.from({ length: se.series }, (_, i) => {
    const gravada = gravadas.find((g) => g.sessao_exercicio_id === se.id && g.serie === i + 1)
    return {
      serie: i + 1,
      reps: gravada?.reps_realizadas != null ? String(gravada.reps_realizadas) : '',
      carga: gravada?.carga_realizada ?? '',
      concluida: gravada?.concluida ?? false,
      rowId: gravada?.id ?? null,
      salvando: false,
    }
  })
}

function ExercicioAtual({
  se,
  execucaoId,
  gravadas,
  onSerieGravada,
  onSerieConcluida,
}: {
  se: ExercicioPlayer
  execucaoId: string
  gravadas: ExecucaoSerie[]
  onSerieGravada: (s: ExecucaoSerie) => void
  onSerieConcluida: (serie: number) => void
}) {
  const { session } = useAuth()
  const [series, setSeries] = useState<SerieLocal[]>(() => seriesIniciais(se, gravadas))
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setSeries(seriesIniciais(se, gravadas))
    setErro(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [se.id])

  const setSerie = (i: number, patch: Partial<SerieLocal>) =>
    setSeries((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const gravar = async (i: number, concluida: boolean) => {
    if (!session) {
      setErro('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    const s = series[i]
    // Ainda dentro do gesto do tap: libera o AudioContext p/ o bipe do timer.
    if (concluida) prepararAudio()
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
          carga_realizada: s.carga.trim() === '' ? null : s.carga.trim(),
          concluida,
        },
        s.rowId
      )
      setSerie(i, { rowId: salvo.id, salvando: false })
      onSerieGravada(salvo)
      if (concluida) onSerieConcluida(s.serie)
    } catch (err) {
      setSerie(i, { salvando: false, concluida: s.concluida })
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar a série.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          {se.biblioteca?.grupo_muscular ?? 'exercício'}
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
          {se.biblioteca?.nome ?? 'Exercício'}
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          {se.series} séries de {se.repeticoes}
          {se.carga_sugerida ? ` · ${se.carga_sugerida}` : ''}
          {se.intervalo_seg !== null ? ` · descanso ${se.intervalo_seg}s` : ''}
          {se.cadencia ? ` · cadência ${se.cadencia}` : ''}
          {se.rpe ? ` · RPE ${se.rpe}` : ''}
        </p>
        {se.observacao && <p className="mt-2 text-sm text-terracotta">{se.observacao}</p>}
        {se.biblioteca?.video_url && (
          <a
            href={se.biblioteca.video_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-terracotta underline"
          >
            ▶ Ver vídeo
          </a>
        )}

        <div className="mt-5 space-y-2">
          <div className="grid grid-cols-[2.2rem_1fr_1fr_3.4rem] items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink/40">
            <span>#</span>
            <span>reps</span>
            <span>carga</span>
            <span className="text-center">feita</span>
          </div>
          {series.map((s, i) => (
            <div
              key={s.serie}
              className={`grid grid-cols-[2.2rem_1fr_1fr_3.4rem] items-center gap-2 rounded-xl border p-2 ${
                s.concluida ? 'border-sage/40 bg-sage/5' : 'border-ink/10 bg-white'
              }`}
            >
              <span className="text-center font-medium text-ink/60">{s.serie}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={200}
                value={s.reps}
                onChange={(e) => setSerie(i, { reps: e.target.value })}
                placeholder={se.repeticoes}
                aria-label={`Repetições da série ${s.serie}`}
                className={inputClass}
              />
              <input
                type="text"
                value={s.carga}
                onChange={(e) => setSerie(i, { carga: e.target.value })}
                placeholder={se.carga_sugerida ?? 'kg'}
                aria-label={`Carga da série ${s.serie}`}
                className={inputClass}
              />
              <button
                onClick={() => void gravar(i, !s.concluida)}
                disabled={s.salvando}
                aria-label={`Marcar série ${s.serie} como ${s.concluida ? 'não feita' : 'feita'}`}
                aria-pressed={s.concluida}
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                  s.concluida
                    ? 'border-sage bg-sage text-white'
                    : 'border-ink/20 bg-white text-ink/30 hover:border-sage'
                } disabled:opacity-50`}
              >
                <IconCheck className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
        {erro && (
          <p className="mt-3 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{erro}</p>
        )}
      </div>

      <BlocoCoachingPrescricao ex={se} />
      <BlocoMusculos ex={se} />
      <BlocoComoExecutar ex={se} />
      <BlocoAlternativa ex={se} />
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
    <div className="rounded-2xl border border-ink/10 bg-white/80 p-5">
      <h2 className="font-display text-2xl font-semibold text-ink">Como foi o treino?</h2>
      {!todasConcluidas && (
        <p className="mt-1 text-sm text-ink/60">
          Você não marcou todas as séries — sem problema, registramos como treino parcial.
        </p>
      )}

      <div className="mt-5">
        <label htmlFor="fin-esforco" className="block text-sm font-medium text-ink/80">
          Esforço percebido: <span className="font-semibold text-terracotta">{esforco}</span> / 10
        </label>
        <input
          id="fin-esforco"
          type="range"
          min={1}
          max={10}
          value={esforco}
          onChange={(e) => setEsforco(Number(e.target.value))}
          className="mt-2 w-full accent-terracotta"
        />
        <div className="flex justify-between text-xs text-ink/40">
          <span>leve</span>
          <span>máximo</span>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="fin-dor" className="block text-sm font-medium text-ink/80">
          Sentiu dor? <span className="font-semibold text-terracotta">{dor}</span> / 10
        </label>
        <input
          id="fin-dor"
          type="range"
          min={0}
          max={10}
          value={dor}
          onChange={(e) => setDor(Number(e.target.value))}
          className="mt-2 w-full accent-terracotta"
        />
        <div className="flex justify-between text-xs text-ink/40">
          <span>nenhuma</span>
          <span>muito forte</span>
        </div>
      </div>

      {dor >= 7 && (
        <div className="mt-4 rounded-xl border border-terracotta/40 bg-terracotta/10 p-4 text-sm text-ink">
          <p className="font-medium text-terracotta">Dor forte é sinal de parar.</p>
          <p className="mt-1">
            Interrompa o exercício que causou a dor e avise seu coach — ele vai receber um
            alerta com este registro e ajustar seu treino.
          </p>
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="fin-obs" className="mb-1 block text-sm font-medium text-ink/80">
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
        <p className="mt-3 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{erro}</p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={() => void concluir()}
          disabled={salvando}
          className="w-full rounded-xl bg-terracotta py-3.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Concluir treino'}
        </button>
        <button
          onClick={onVoltar}
          disabled={salvando}
          className="w-full rounded-xl border border-ink/15 bg-white py-3 text-ink/70 transition-colors hover:border-terracotta disabled:opacity-50"
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
  const [descanso, setDescanso] = useState<{ id: number; duracaoSeg: number } | null>(null)
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

  if (estado === 'carregando') return <LoadingScreen />

  if (estado === 'erro' || !sessao || !execucao || !aluno || !carga) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
        <p className="text-ink/70">{erroMsg ?? 'Algo deu errado.'}</p>
        <Link to="/aluno" className="mt-4 font-medium text-terracotta underline">
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
    setDescanso({ id: descansoSeq.current, duracaoSeg: atual.intervalo_seg })
  }

  const irParaFinalizar = () => {
    setDescanso(null)
    setFinalizando(true)
  }

  return (
    <div className={`min-h-screen bg-cream ${descanso ? 'pb-64' : 'pb-10'}`}>
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <button
            onClick={() => {
              // pausar = sair mantendo a execução aberta; retomamos depois
              if (window.confirm('Pausar o treino? Seu progresso fica salvo e você pode retomar.')) {
                navigate('/aluno')
              }
            }}
            className="text-sm text-ink/60 transition-colors hover:text-terracotta"
          >
            ⏸ Pausar
          </button>
          <span className="text-sm font-medium text-ink/70">{sessao.sessao.titulo}</span>
          <span className="text-sm text-ink/50">
            {feitas}/{totalSeries}
          </span>
        </div>
        <div className="h-1 bg-ink/10">
          <div
            className="h-full bg-terracotta transition-all"
            style={{ width: `${totalSeries > 0 ? (feitas / totalSeries) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-5">
        {UI_MODO_TESTE && carga.fonte === 'fallback' && (
          <p className="mb-3 rounded-xl border border-dashed border-ink/30 bg-ink/5 px-4 py-2 text-xs text-ink/60">
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
          <p className="rounded-xl border border-dashed border-ink/20 p-5 text-sm text-ink/60">
            Esta sessão não tem exercícios. Fale com seu coach.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink/50">
              Exercício {idx + 1} de {itens.length}
            </p>
            <ExercicioAtual
              se={atual}
              execucaoId={execucao.id}
              gravadas={gravadas}
              onSerieConcluida={iniciarDescanso}
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

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="flex-1 rounded-xl border border-ink/15 bg-white py-3 font-medium text-ink/70 transition-colors hover:border-terracotta disabled:opacity-40"
              >
                ← Anterior
              </button>
              {idx < itens.length - 1 ? (
                <button
                  onClick={() => setIdx((i) => Math.min(itens.length - 1, i + 1))}
                  className="flex-1 rounded-xl bg-ink py-3 font-medium text-cream transition-opacity hover:opacity-90"
                >
                  Próximo →
                </button>
              ) : (
                <button
                  onClick={irParaFinalizar}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-terracotta py-3 font-medium text-white transition-opacity hover:opacity-90"
                >
                  Finalizar <IconCheck className="h-5 w-5" />
                </button>
              )}
            </div>

            <button
              onClick={irParaFinalizar}
              className="mt-3 w-full py-2 text-center text-sm text-ink/50 underline transition-colors hover:text-terracotta"
            >
              Encerrar treino agora
            </button>
          </>
        )}
      </main>

      {descanso && !finalizando && (
        <TimerDescanso
          key={descanso.id}
          duracaoSeg={descanso.duracaoSeg}
          onFechar={() => setDescanso(null)}
        />
      )}
    </div>
  )
}
