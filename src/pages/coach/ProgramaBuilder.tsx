import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import { fetchExercicios } from '../../lib/exercicios'
import type { Exercicio } from '../../lib/exercicios'
import {
  adicionarExercicioNaSessao,
  atualizarExercicioDaSessao,
  atualizarPrograma,
  atualizarSessao,
  criarSessao,
  duplicarSessao,
  excluirPrograma,
  excluirSessao,
  fetchPrograma,
  removerExercicioDaSessao,
  trocarOrdem,
} from '../../lib/programas'
import type { ProgramaStatus, Sessao, SessaoExercicio } from '../../lib/programas'
import { DIAS_SEMANA } from '../../lib/anamnese'
import { useAuth } from '../../lib/auth'
import { usePgQuery } from '../../hooks/usePgQuery'
import { ErrorBlock, LoadingBlock } from '../../components/DataState'
import { TreinoView } from '../../components/TreinoView'

const inputClass =
  'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta'
const btnSec =
  'rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70 transition-colors hover:border-terracotta disabled:opacity-50'

const STATUS_LABEL: Record<ProgramaStatus, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  pausado: 'Pausado',
  concluido: 'Concluído',
}

function StatusPill({ status }: { status: ProgramaStatus }) {
  const cores: Record<ProgramaStatus, string> = {
    rascunho: 'bg-ink/10 text-ink/60',
    publicado: 'bg-sage/15 text-sage',
    pausado: 'bg-terracotta/15 text-terracotta',
    concluido: 'bg-ink/10 text-ink/60',
  }
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${cores[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------

function FormExercicioSessao({
  sessaoId,
  proximaOrdem,
  exercicios,
  editando,
  onFechar,
  onSalvo,
}: {
  sessaoId: string
  proximaOrdem: number
  exercicios: Exercicio[]
  editando: SessaoExercicio | null
  onFechar: () => void
  onSalvo: () => void
}) {
  const { session } = useAuth()
  const [exercicioId, setExercicioId] = useState(editando?.exercicio_id ?? '')
  const [alternativoId, setAlternativoId] = useState(editando?.exercicio_alternativo_id ?? '')
  const [series, setSeries] = useState(editando?.series ?? 3)
  const [repeticoes, setRepeticoes] = useState(editando?.repeticoes ?? '10')
  const [carga, setCarga] = useState(editando?.carga_sugerida ?? '')
  const [intervalo, setIntervalo] = useState<string>(String(editando?.intervalo_seg ?? '60'))
  const [cadencia, setCadencia] = useState(editando?.cadencia ?? '')
  const [rpe, setRpe] = useState(editando?.rpe ?? '')
  const [obs, setObs] = useState(editando?.observacao ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const texto = (v: string) => (v.trim() === '' ? null : v.trim())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!session || !exercicioId) return
    setSalvando(true)
    setErro(null)
    const form = {
      exercicio_id: exercicioId,
      exercicio_alternativo_id: alternativoId === '' ? null : alternativoId,
      series,
      repeticoes: repeticoes.trim() === '' ? '10' : repeticoes.trim(),
      carga_sugerida: texto(carga),
      intervalo_seg: intervalo === '' ? null : Number(intervalo),
      cadencia: texto(cadencia),
      rpe: texto(rpe),
      observacao: texto(obs),
    }
    try {
      if (editando) {
        await atualizarExercicioDaSessao(session.access_token, editando.id, form)
      } else {
        await adicionarExercicioNaSessao(session.access_token, sessaoId, {
          ...form,
          ordem: proximaOrdem,
        })
      }
      onSalvo()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar.')
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-terracotta/30 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-ex-${sessaoId}`}>
          Exercício *
        </label>
        <select
          id={`se-ex-${sessaoId}`}
          required
          value={exercicioId}
          onChange={(e) => setExercicioId(e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione…</option>
          {exercicios.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.nome}
              {ex.grupo_muscular ? ` (${ex.grupo_muscular})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-series-${sessaoId}`}>
            Séries
          </label>
          <input
            id={`se-series-${sessaoId}`}
            type="number"
            min={1}
            max={10}
            value={series}
            onChange={(e) => setSeries(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-reps-${sessaoId}`}>
            Repetições
          </label>
          <input
            id={`se-reps-${sessaoId}`}
            type="text"
            value={repeticoes}
            onChange={(e) => setRepeticoes(e.target.value)}
            placeholder="10 ou 8-12"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-carga-${sessaoId}`}>
            Carga sugerida
          </label>
          <input
            id={`se-carga-${sessaoId}`}
            type="text"
            value={carga}
            onChange={(e) => setCarga(e.target.value)}
            placeholder="Ex.: 12 kg"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-int-${sessaoId}`}>
            Intervalo (s)
          </label>
          <input
            id={`se-int-${sessaoId}`}
            type="number"
            min={0}
            max={600}
            value={intervalo}
            onChange={(e) => setIntervalo(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-cad-${sessaoId}`}>
            Cadência
          </label>
          <input
            id={`se-cad-${sessaoId}`}
            type="text"
            value={cadencia}
            onChange={(e) => setCadencia(e.target.value)}
            placeholder="Ex.: 2-0-2"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-rpe-${sessaoId}`}>
            RPE/RIR
          </label>
          <input
            id={`se-rpe-${sessaoId}`}
            type="text"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            placeholder="Ex.: RPE 8"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-alt-${sessaoId}`}>
            Alternativo
          </label>
          <select
            id={`se-alt-${sessaoId}`}
            value={alternativoId}
            onChange={(e) => setAlternativoId(e.target.value)}
            className={inputClass}
          >
            <option value="">Nenhum</option>
            {exercicios
              .filter((ex) => ex.id !== exercicioId)
              .map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.nome}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`se-obs-${sessaoId}`}>
          Observação
        </label>
        <input
          id={`se-obs-${sessaoId}`}
          type="text"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex.: foco na descida controlada"
          className={inputClass}
        />
      </div>

      {erro && <p className="rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={salvando || !exercicioId}
          className="rounded-xl bg-terracotta px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Adicionar'}
        </button>
        <button type="button" onClick={onFechar} className={btnSec}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------

function SessaoEditor({
  sessao,
  exercicios,
  onMudou,
}: {
  sessao: Sessao
  exercicios: Exercicio[]
  onMudou: () => void
}) {
  const { session } = useAuth()
  const [expandida, setExpandida] = useState(true)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [fTitulo, setFTitulo] = useState(sessao.titulo)
  const [fSemana, setFSemana] = useState(sessao.semana)
  const [fDuracao, setFDuracao] = useState<string>(String(sessao.duracao_estimada_min ?? ''))
  const [fDias, setFDias] = useState<string[]>(sessao.dias_sugeridos ?? [])
  const [fObs, setFObs] = useState(sessao.observacoes ?? '')
  const [formEx, setFormEx] = useState<'novo' | SessaoExercicio | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const token = session?.access_token

  const acao = async (fn: () => Promise<void>) => {
    setOcupado(true)
    setErro(null)
    try {
      await fn()
      onMudou()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setOcupado(false)
    }
  }

  const salvarMeta = () =>
    acao(async () => {
      if (!token) return
      await atualizarSessao(token, sessao.id, {
        titulo: fTitulo.trim() || sessao.titulo,
        semana: fSemana,
        duracao_estimada_min: fDuracao === '' ? null : Number(fDuracao),
        dias_sugeridos: fDias.length > 0 ? fDias : null,
        observacoes: fObs.trim() === '' ? null : fObs.trim(),
      })
      setEditandoMeta(false)
    })

  const itens = [...sessao.sessao_exercicios].sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => setExpandida((v) => !v)}
          className="text-left font-display text-lg font-semibold text-ink"
          aria-expanded={expandida}
        >
          {expandida ? '▾' : '▸'} {sessao.titulo}
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditandoMeta((v) => !v)} className={btnSec} disabled={ocupado}>
            Editar
          </button>
          <button
            onClick={() => token && acao(() => duplicarSessao(token, sessao))}
            className={btnSec}
            disabled={ocupado}
          >
            Duplicar
          </button>
          <button
            onClick={() => {
              if (
                token &&
                window.confirm(
                  `Excluir a sessão "${sessao.titulo}" e todos os exercícios dela? Essa ação não pode ser desfeita.`
                )
              ) {
                void acao(() => excluirSessao(token, sessao.id))
              }
            }}
            className={`${btnSec} hover:border-terracotta hover:text-terracotta`}
            disabled={ocupado}
          >
            Excluir
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        semana {sessao.semana}
        {sessao.duracao_estimada_min ? ` · ~${sessao.duracao_estimada_min} min` : ''}
        {sessao.dias_sugeridos?.length ? ` · ${sessao.dias_sugeridos.join(', ')}` : ''}
      </p>

      {editandoMeta && (
        <div className="mt-3 space-y-3 rounded-xl border border-terracotta/30 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`s-tit-${sessao.id}`}>
                Título
              </label>
              <input
                id={`s-tit-${sessao.id}`}
                type="text"
                value={fTitulo}
                onChange={(e) => setFTitulo(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`s-sem-${sessao.id}`}>
                Semana
              </label>
              <select
                id={`s-sem-${sessao.id}`}
                value={fSemana}
                onChange={(e) => setFSemana(Number(e.target.value))}
                className={inputClass}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    semana {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`s-dur-${sessao.id}`}>
                Duração estimada (min)
              </label>
              <input
                id={`s-dur-${sessao.id}`}
                type="number"
                min={5}
                max={240}
                value={fDuracao}
                onChange={(e) => setFDuracao(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-ink/80">Dias sugeridos</p>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map((dia) => {
                  const ativo = fDias.includes(dia)
                  return (
                    <button
                      key={dia}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() =>
                        setFDias((ds) => (ativo ? ds.filter((d) => d !== dia) : [...ds, dia]))
                      }
                      className={`rounded-full border px-2.5 py-1.5 text-xs capitalize transition-colors ${
                        ativo
                          ? 'border-terracotta bg-terracotta text-white'
                          : 'border-ink/15 bg-white text-ink/70'
                      }`}
                    >
                      {dia}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor={`s-obs-${sessao.id}`}>
              Observações
            </label>
            <input
              id={`s-obs-${sessao.id}`}
              type="text"
              value={fObs}
              onChange={(e) => setFObs(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void salvarMeta()}
              disabled={ocupado}
              className="rounded-xl bg-terracotta px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Salvar sessão
            </button>
            <button onClick={() => setEditandoMeta(false)} className={btnSec}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {expandida && (
        <>
          <ul className="mt-4 space-y-2">
            {itens.map((se, i) => (
              <li
                key={se.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/10 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {se.ordem}. {se.exercicio.nome}
                  </p>
                  <p className="text-sm text-ink/60">
                    {se.series}x {se.repeticoes}
                    {se.carga_sugerida ? ` · ${se.carga_sugerida}` : ''}
                    {se.intervalo_seg !== null ? ` · ${se.intervalo_seg}s` : ''}
                    {se.rpe ? ` · ${se.rpe}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    aria-label="Mover para cima"
                    disabled={i === 0 || ocupado}
                    onClick={() =>
                      session &&
                      void acao(() => trocarOrdem(session.access_token, itens[i], itens[i - 1]))
                    }
                    className={btnSec}
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Mover para baixo"
                    disabled={i === itens.length - 1 || ocupado}
                    onClick={() =>
                      session &&
                      void acao(() => trocarOrdem(session.access_token, itens[i], itens[i + 1]))
                    }
                    className={btnSec}
                  >
                    ↓
                  </button>
                  <button onClick={() => setFormEx(se)} className={btnSec} disabled={ocupado}>
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (
                        token &&
                        window.confirm(`Remover "${se.exercicio.nome}" desta sessão?`)
                      ) {
                        void acao(() => removerExercicioDaSessao(token, se.id))
                      }
                    }}
                    className={btnSec}
                    disabled={ocupado}
                  >
                    Remover
                  </button>
                </div>
                {formEx !== null && formEx !== 'novo' && formEx.id === se.id && (
                  <div className="w-full">
                    <FormExercicioSessao
                      sessaoId={sessao.id}
                      proximaOrdem={itens.length + 1}
                      exercicios={exercicios}
                      editando={se}
                      onFechar={() => setFormEx(null)}
                      onSalvo={() => {
                        setFormEx(null)
                        onMudou()
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {formEx === 'novo' ? (
            <FormExercicioSessao
              sessaoId={sessao.id}
              proximaOrdem={itens.length + 1}
              exercicios={exercicios}
              editando={null}
              onFechar={() => setFormEx(null)}
              onSalvo={() => {
                setFormEx(null)
                onMudou()
              }}
            />
          ) : (
            <button
              onClick={() => setFormEx('novo')}
              disabled={ocupado || exercicios.length === 0}
              className="mt-3 w-full rounded-xl border border-dashed border-ink/25 bg-white/40 py-3 text-sm text-ink/60 transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-50"
            >
              + Adicionar exercício
            </button>
          )}
          {exercicios.length === 0 && (
            <p className="mt-2 text-xs text-ink/50">
              Sua biblioteca está vazia — crie exercícios em Exercícios antes de montar a sessão.
            </p>
          )}
        </>
      )}

      {erro && (
        <p className="mt-3 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{erro}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function ProgramaBuilder() {
  const { programaId } = useParams<{ programaId: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()

  const { status, data: programa, errorMsg, refetch } = usePgQuery(
    (token) => fetchPrograma(token, programaId ?? ''),
    [programaId]
  )
  const { data: exerciciosTodos } = usePgQuery(fetchExercicios)
  const exerciciosAtivos = (exerciciosTodos ?? []).filter((e) => e.ativo)

  const [fTitulo, setFTitulo] = useState('')
  const [fObjetivo, setFObjetivo] = useState('')
  const [fDescricao, setFDescricao] = useState('')
  const [fInicio, setFInicio] = useState('')
  const [fFim, setFFim] = useState('')
  const [fObs, setFObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [novaSessao, setNovaSessao] = useState(false)
  const [nsTitulo, setNsTitulo] = useState('')
  const [nsSemana, setNsSemana] = useState(1)
  const [comoAluno, setComoAluno] = useState(false)

  useEffect(() => {
    if (programa) {
      setFTitulo(programa.titulo)
      setFObjetivo(programa.objetivo ?? '')
      setFDescricao(programa.descricao ?? '')
      setFInicio(programa.data_inicio ?? '')
      setFFim(programa.data_fim ?? '')
      setFObs(programa.observacoes ?? '')
    }
  }, [programa])

  const token = session?.access_token

  const salvarCabecalho = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !programaId) {
      setMsg({ tipo: 'erro', texto: 'Sessão não encontrada — recarregue a página e tente de novo.' })
      return
    }
    setSalvando(true)
    setMsg(null)
    try {
      await atualizarPrograma(token, programaId, {
        titulo: fTitulo.trim() || 'Programa sem título',
        objetivo: fObjetivo.trim() === '' ? null : fObjetivo.trim(),
        descricao: fDescricao.trim() === '' ? null : fDescricao.trim(),
        data_inicio: fInicio === '' ? null : fInicio,
        data_fim: fFim === '' ? null : fFim,
        observacoes: fObs.trim() === '' ? null : fObs.trim(),
      })
      setMsg({ tipo: 'ok', texto: 'Programa salvo.' })
      refetch()
    } catch (err) {
      setMsg({ tipo: 'erro', texto: err instanceof ApiError ? err.message : 'Erro ao salvar.' })
    } finally {
      setSalvando(false)
    }
  }

  const mudarStatus = async (novo: ProgramaStatus, confirmar?: string) => {
    if (!token || !programaId) {
      setMsg({ tipo: 'erro', texto: 'Sessão não encontrada — recarregue a página e tente de novo.' })
      return
    }
    if (confirmar && !window.confirm(confirmar)) return
    setSalvando(true)
    setMsg(null)
    try {
      await atualizarPrograma(token, programaId, { status: novo })
      refetch()
    } catch (err) {
      setMsg({ tipo: 'erro', texto: err instanceof ApiError ? err.message : 'Erro ao mudar status.' })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!token || !programaId || !programa) return
    if (
      !window.confirm(
        `Excluir o rascunho "${programa.titulo}" com todas as sessões? Essa ação não pode ser desfeita.`
      )
    )
      return
    try {
      await excluirPrograma(token, programaId)
      navigate(-1)
    } catch (err) {
      setMsg({ tipo: 'erro', texto: err instanceof ApiError ? err.message : 'Erro ao excluir.' })
    }
  }

  const criarNovaSessao = async () => {
    if (!token || !programaId || !programa) return
    const titulo = nsTitulo.trim()
    if (titulo.length < 2) return
    const ordens = programa.sessoes.filter((s) => s.semana === nsSemana).map((s) => s.ordem)
    try {
      await criarSessao(token, programaId, {
        semana: nsSemana,
        ordem: ordens.length > 0 ? Math.max(...ordens) + 1 : 1,
        titulo,
        dias_sugeridos: null,
        duracao_estimada_min: null,
        observacoes: null,
      })
      setNovaSessao(false)
      setNsTitulo('')
      refetch()
    } catch (err) {
      setMsg({ tipo: 'erro', texto: err instanceof ApiError ? err.message : 'Erro ao criar sessão.' })
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-ink/60 transition-colors hover:text-terracotta"
      >
        ← Voltar
      </button>

      {status === 'loading' && <LoadingBlock />}
      {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}
      {status === 'ready' && !programa && (
        <p className="mt-6 text-ink/60">
          Programa não encontrado.{' '}
          <Link to="/coach/alunos" className="text-terracotta underline">
            Voltar aos alunos
          </Link>
        </p>
      )}

      {status === 'ready' && programa && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                {programa.titulo}
              </h1>
              <StatusPill status={programa.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setComoAluno((v) => !v)}
                className={btnSec}
                aria-pressed={comoAluno}
              >
                {comoAluno ? 'Voltar à edição' : 'Visualizar como aluno'}
              </button>
              {programa.status !== 'publicado' && (
                <button
                  onClick={() =>
                    void mudarStatus(
                      'publicado',
                      'Publicar este programa? O aluno passa a ver o treino imediatamente.'
                    )
                  }
                  disabled={salvando || programa.sessoes.length === 0}
                  className="rounded-lg bg-sage px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Publicar
                </button>
              )}
              {programa.status === 'publicado' && (
                <>
                  <button
                    onClick={() =>
                      void mudarStatus(
                        'rascunho',
                        'Despublicar? O aluno deixa de ver este programa até você publicar de novo.'
                      )
                    }
                    disabled={salvando}
                    className={btnSec}
                  >
                    Despublicar
                  </button>
                  <button
                    onClick={() => void mudarStatus('pausado')}
                    disabled={salvando}
                    className={btnSec}
                  >
                    Pausar
                  </button>
                  <button
                    onClick={() =>
                      void mudarStatus('concluido', 'Marcar o programa como concluído?')
                    }
                    disabled={salvando}
                    className={btnSec}
                  >
                    Concluir
                  </button>
                </>
              )}
              {programa.status === 'pausado' && (
                <button
                  onClick={() => void mudarStatus('publicado')}
                  disabled={salvando}
                  className="rounded-lg bg-sage px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Retomar (publicar)
                </button>
              )}
              {programa.status === 'rascunho' && (
                <button
                  onClick={() => void excluir()}
                  disabled={salvando}
                  className={`${btnSec} hover:text-terracotta`}
                >
                  Excluir rascunho
                </button>
              )}
            </div>
          </div>

          {programa.sessoes.length === 0 && programa.status !== 'publicado' && (
            <p className="mt-2 text-sm text-ink/50">
              Adicione ao menos uma sessão para poder publicar.
            </p>
          )}

          {msg && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                msg.tipo === 'ok' ? 'bg-sage/10 text-sage' : 'bg-terracotta/10 text-terracotta'
              }`}
            >
              {msg.texto}
            </p>
          )}

          {comoAluno ? (
            <div className="mt-6 rounded-2xl border border-sage/30 bg-sage/5 p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-sage">
                Pré-visualização — é assim que o aluno vê
              </p>
              <TreinoView programa={programa} />
            </div>
          ) : (
            <>
              <form
                onSubmit={salvarCabecalho}
                className="mt-6 space-y-4 rounded-2xl border border-ink/10 bg-white/60 p-5"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="p-titulo">
                      Título *
                    </label>
                    <input
                      id="p-titulo"
                      type="text"
                      required
                      value={fTitulo}
                      onChange={(e) => setFTitulo(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="p-objetivo">
                      Objetivo
                    </label>
                    <input
                      id="p-objetivo"
                      type="text"
                      value={fObjetivo}
                      onChange={(e) => setFObjetivo(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="p-descricao">
                    Descrição
                  </label>
                  <textarea
                    id="p-descricao"
                    rows={2}
                    value={fDescricao}
                    onChange={(e) => setFDescricao(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="p-inicio">
                      Início
                    </label>
                    <input
                      id="p-inicio"
                      type="date"
                      value={fInicio}
                      onChange={(e) => setFInicio(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="p-fim">
                      Término
                    </label>
                    <input
                      id="p-fim"
                      type="date"
                      value={fFim}
                      onChange={(e) => setFFim(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="p-obs">
                    Observações gerais (o aluno vê)
                  </label>
                  <textarea
                    id="p-obs"
                    rows={2}
                    value={fObs}
                    onChange={(e) => setFObs(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-terracotta px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : 'Salvar programa'}
                </button>
              </form>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-ink">Sessões de treino</h2>
                {!novaSessao && (
                  <button
                    onClick={() => setNovaSessao(true)}
                    className="rounded-xl bg-terracotta px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    + Nova sessão
                  </button>
                )}
              </div>

              {novaSessao && (
                <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-terracotta/30 bg-white/70 p-4">
                  <div className="min-w-40 flex-1">
                    <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="ns-titulo">
                      Título da sessão
                    </label>
                    <input
                      id="ns-titulo"
                      type="text"
                      value={nsTitulo}
                      onChange={(e) => setNsTitulo(e.target.value)}
                      placeholder="Ex.: Treino A — Inferiores"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink/80" htmlFor="ns-semana">
                      Semana
                    </label>
                    <select
                      id="ns-semana"
                      value={nsSemana}
                      onChange={(e) => setNsSemana(Number(e.target.value))}
                      className={inputClass}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          semana {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void criarNovaSessao()}
                      disabled={nsTitulo.trim().length < 2}
                      className="rounded-xl bg-terracotta px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Criar
                    </button>
                    <button onClick={() => setNovaSessao(false)} className={btnSec}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-4">
                {programa.sessoes.length === 0 && !novaSessao && (
                  <p className="rounded-xl border border-dashed border-ink/20 p-5 text-sm text-ink/50">
                    Nenhuma sessão ainda. Crie a primeira — ex.: "Treino A — Corpo inteiro",
                    semana 1.
                  </p>
                )}
                {programa.sessoes.map((s) => (
                  <SessaoEditor
                    key={s.id}
                    sessao={s}
                    exercicios={exerciciosAtivos}
                    onMudou={refetch}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
