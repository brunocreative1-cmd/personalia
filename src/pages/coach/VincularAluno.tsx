import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Candidato } from '../../lib/api'
import { ApiError, fetchCandidatos, vincularAluno } from '../../lib/api'
import { usePgQuery } from '../../hooks/usePgQuery'
import { useAuth } from '../../lib/auth'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/DataState'
import { correspondeBusca } from '../../lib/busca'
import { hojeISO } from '../../lib/dates'

const inputClass =
  'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta'

export function VincularAluno() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { status, data: candidatos, errorMsg, refetch } = usePgQuery(fetchCandidatos)

  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Candidato | null>(null)
  const [fObjetivo, setFObjetivo] = useState('')
  const [fNivel, setFNivel] = useState('')
  const [fDataInicio, setFDataInicio] = useState(hojeISO())
  const [saving, setSaving] = useState(false)
  const [saveErro, setSaveErro] = useState<string | null>(null)

  const filtrados = (candidatos ?? []).filter((c) =>
    correspondeBusca(busca, c.nome, c.whatsapp)
  )

  const handleVincular = async (e: FormEvent) => {
    e.preventDefault()
    if (!selecionado || !fDataInicio) return
    if (!session) {
      setSaveErro('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    setSaving(true)
    setSaveErro(null)
    try {
      await vincularAluno(session.access_token, session.user.id, {
        profile_id: selecionado.id,
        objetivo: fObjetivo.trim() === '' ? null : fObjetivo.trim(),
        nivel: fNivel.trim() === '' ? null : fNivel.trim(),
        data_inicio: fDataInicio,
      })
      navigate(`/coach/alunos/${selecionado.id}`, { state: { vinculado: true } })
    } catch (err) {
      setSaveErro(
        err instanceof ApiError ? err.message : 'Não foi possível vincular. Tente novamente.'
      )
      setSaving(false)
    }
  }

  return (
    <div>
      <Link
        to="/coach/alunos"
        className="text-sm text-ink/60 transition-colors hover:text-terracotta"
      >
        ← Alunos
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
        Vincular aluno existente
      </h1>

      {!selecionado && (
        <>
          <p className="mt-1 text-sm text-ink/60">
            Encontre o aluno pela conta que ele já criou no app
          </p>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp…"
            className="mt-6 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta sm:max-w-sm"
          />

          {status === 'loading' && <LoadingBlock />}
          {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}
          {status === 'ready' && (
            <div className="mt-6">
              {candidatos.length === 0 ? (
                <EmptyBlock message="Nenhum aluno disponível para vínculo. O aluno precisa criar a conta dele no app primeiro — depois disso ele aparece aqui." />
              ) : filtrados.length === 0 ? (
                <EmptyBlock message="Nenhum aluno encontrado para essa busca." />
              ) : (
                <ul className="space-y-3">
                  {filtrados.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          setSelecionado(c)
                          setSaveErro(null)
                        }}
                        className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-ink/10 bg-white/60 p-4 text-left transition-colors hover:border-terracotta/50"
                      >
                        <span className="font-medium text-ink">{c.nome ?? 'Sem nome'}</span>
                        <span className="text-sm text-ink/60">
                          {c.whatsapp ?? '—'}
                          {c.cidade ? ` · ${c.cidade}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {selecionado && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-terracotta/40 bg-white/60 p-4">
            <div>
              <p className="font-medium text-ink">{selecionado.nome ?? 'Sem nome'}</p>
              <p className="text-sm text-ink/60">
                {selecionado.whatsapp ?? '—'}
                {selecionado.cidade ? ` · ${selecionado.cidade}` : ''}
              </p>
            </div>
            <button
              onClick={() => setSelecionado(null)}
              className="text-sm text-ink/60 underline transition-colors hover:text-terracotta"
            >
              trocar aluno
            </button>
          </div>

          <form onSubmit={handleVincular} className="mt-6 max-w-xl space-y-4">
            <div>
              <label htmlFor="v-objetivo" className="mb-1 block text-sm font-medium text-ink/80">
                Objetivo
              </label>
              <input
                id="v-objetivo"
                type="text"
                value={fObjetivo}
                onChange={(e) => setFObjetivo(e.target.value)}
                placeholder="Ex.: emagrecimento, hipertrofia…"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="v-nivel" className="mb-1 block text-sm font-medium text-ink/80">
                Nível
              </label>
              <input
                id="v-nivel"
                type="text"
                value={fNivel}
                onChange={(e) => setFNivel(e.target.value)}
                placeholder="Ex.: iniciante, intermediário, avançado"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="v-inicio" className="mb-1 block text-sm font-medium text-ink/80">
                Data de início
              </label>
              <input
                id="v-inicio"
                type="date"
                required
                value={fDataInicio}
                onChange={(e) => setFDataInicio(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-ink/50">
                A data de término (30 dias) é calculada automaticamente.
              </p>
            </div>

            {saveErro && (
              <p className="rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
                {saveErro}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-terracotta px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Vinculando…' : 'Confirmar vínculo'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
