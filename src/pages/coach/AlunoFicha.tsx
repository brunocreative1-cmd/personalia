import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError, fetchAluno, STATUS_OPTIONS, updateAluno } from '../../lib/api'
import { usePgQuery } from '../../hooks/usePgQuery'
import { useAuth } from '../../lib/auth'
import { AcompanhamentoAluno } from '../../components/AcompanhamentoAluno'
import { AnamneseResumo } from '../../components/AnamneseResumo'
import { ProgramasDoAluno } from '../../components/ProgramasDoAluno'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/DataState'
import { StatusBadge } from '../../components/StatusBadge'
import { diaDoCiclo, formatDateBR } from '../../lib/dates'

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink/40">{rotulo}</dt>
      <dd className="mt-1 text-ink">{children}</dd>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta'

export function AlunoFicha() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const recemVinculado = Boolean((location.state as { vinculado?: boolean } | null)?.vinculado)
  const { session } = useAuth()
  const { status, data: aluno, errorMsg, refetch } = usePgQuery(
    (token) => fetchAluno(token, id ?? ''),
    [id]
  )

  const [fStatus, setFStatus] = useState('novo')
  const [fObjetivo, setFObjetivo] = useState('')
  const [fNivel, setFNivel] = useState('')
  const [fDataInicio, setFDataInicio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    if (aluno) {
      setFStatus(aluno.status)
      setFObjetivo(aluno.objetivo ?? '')
      setFNivel(aluno.nivel ?? '')
      setFDataInicio(aluno.data_inicio ?? '')
    }
  }, [aluno])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!session || !id) {
      setSaveMsg({ tipo: 'erro', texto: 'Sessão não encontrada — recarregue a página e tente de novo.' })
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      await updateAluno(session.access_token, id, {
        status: fStatus,
        objetivo: fObjetivo.trim() === '' ? null : fObjetivo.trim(),
        nivel: fNivel.trim() === '' ? null : fNivel.trim(),
        data_inicio: fDataInicio === '' ? null : fDataInicio,
      })
      setSaveMsg({ tipo: 'ok', texto: 'Alterações salvas.' })
      refetch()
    } catch (err) {
      setSaveMsg({
        tipo: 'erro',
        texto: err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente novamente.',
      })
    } finally {
      setSaving(false)
    }
  }

  const ciclo = aluno ? diaDoCiclo(aluno.data_inicio) : null

  return (
    <div>
      <Link to="/coach/alunos" className="text-sm text-ink/60 transition-colors hover:text-terracotta">
        ← Alunos
      </Link>

      {status === 'loading' && <LoadingBlock />}
      {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}
      {status === 'ready' && !aluno && <EmptyBlock message="Aluno não encontrado." />}

      {status === 'ready' && aluno && (
        <div className="mt-4">
          {recemVinculado && (
            <p className="mb-4 rounded-xl bg-sage/10 px-4 py-3 text-sm text-sage">
              Aluno vinculado com sucesso.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {aluno.perfil?.nome ?? 'Sem nome'}
            </h1>
            <StatusBadge status={aluno.status} />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-ink/10 bg-white/60 p-6 sm:grid-cols-3">
            <Campo rotulo="WhatsApp">{aluno.perfil?.whatsapp ?? '—'}</Campo>
            <Campo rotulo="Cidade">{aluno.perfil?.cidade ?? '—'}</Campo>
            <Campo rotulo="Nível">{aluno.nivel ?? '—'}</Campo>
            <Campo rotulo="Início">{formatDateBR(aluno.data_inicio)}</Campo>
            <Campo rotulo="Término (automático)">{formatDateBR(aluno.data_fim)}</Campo>
            <Campo rotulo="Progresso">
              {ciclo?.fase === 'andamento' ? (
                <span>
                  dia <span className="font-medium text-terracotta">{ciclo.dia}</span> de 30
                </span>
              ) : (
                (ciclo?.label ?? '—')
              )}
            </Campo>
            <div className="col-span-2 sm:col-span-3">
              <Campo rotulo="Objetivo">{aluno.objetivo ?? '—'}</Campo>
            </div>
          </dl>

          <h2 className="mt-10 font-display text-xl font-semibold text-ink">
            Execução e frequência
          </h2>
          <AcompanhamentoAluno aluno={aluno} />

          <h2 className="mt-10 font-display text-xl font-semibold text-ink">
            Programa de treino
          </h2>
          <ProgramasDoAluno alunoId={aluno.id} nomeAluno={aluno.perfil?.nome ?? 'aluno'} />

          <h2 className="mt-10 font-display text-xl font-semibold text-ink">Anamnese</h2>
          {id && <AnamneseResumo profileId={id} />}

          <h2 className="mt-10 font-display text-xl font-semibold text-ink">Acompanhamento</h2>
          <p className="mt-1 text-sm text-ink/60">
            A data de término é recalculada automaticamente ao mudar a data de início.
          </p>

          <form onSubmit={handleSave} className="mt-5 max-w-xl space-y-4">
            <div>
              <label htmlFor="f-status" className="mb-1 block text-sm font-medium text-ink/80">
                Status
              </label>
              <select
                id="f-status"
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!STATUS_OPTIONS.includes(fStatus as (typeof STATUS_OPTIONS)[number]) && (
                  <option value={fStatus}>{fStatus}</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="f-objetivo" className="mb-1 block text-sm font-medium text-ink/80">
                Objetivo
              </label>
              <input
                id="f-objetivo"
                type="text"
                value={fObjetivo}
                onChange={(e) => setFObjetivo(e.target.value)}
                placeholder="Ex.: emagrecimento, hipertrofia…"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="f-nivel" className="mb-1 block text-sm font-medium text-ink/80">
                Nível
              </label>
              <input
                id="f-nivel"
                type="text"
                value={fNivel}
                onChange={(e) => setFNivel(e.target.value)}
                placeholder="Ex.: iniciante, intermediário, avançado"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="f-inicio" className="mb-1 block text-sm font-medium text-ink/80">
                Data de início
              </label>
              <input
                id="f-inicio"
                type="date"
                value={fDataInicio}
                onChange={(e) => setFDataInicio(e.target.value)}
                className={inputClass}
              />
            </div>

            {saveMsg && (
              <p
                className={`rounded-xl px-4 py-3 text-sm ${
                  saveMsg.tipo === 'ok'
                    ? 'bg-sage/10 text-sage'
                    : 'bg-terracotta/10 text-terracotta'
                }`}
              >
                {saveMsg.texto}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-terracotta px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
