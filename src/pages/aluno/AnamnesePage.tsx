import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import {
  ANAMNESE_FORM_VAZIO,
  anamneseParaForm,
  atualizarMinhaAnamnese,
  criarMinhaAnamnese,
  fetchMinhaAnamnese,
  normalizarAnamneseForm,
} from '../../lib/anamnese'
import type { AnamneseForm } from '../../lib/anamnese'
import { useAuth } from '../../lib/auth'
import { usePgQuery } from '../../hooks/usePgQuery'
import { AnamneseCampos } from '../../components/AnamneseCampos'
import { ErrorBlock, LoadingBlock } from '../../components/DataState'
import { LogoutButton } from '../../components/LogoutButton'

export function AnamnesePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { status, data: existente, errorMsg, refetch } = usePgQuery(fetchMinhaAnamnese)

  const [form, setForm] = useState<AnamneseForm>(ANAMNESE_FORM_VAZIO)
  const [consentiu, setConsentiu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    if (existente) setForm(anamneseParaForm(existente))
  }, [existente])

  const set = <K extends keyof AnamneseForm>(campo: K, valor: AnamneseForm[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  // Coach preencheu pelo aluno: existe anamnese, mas sem consentimento dele.
  const consentimentoPendente = Boolean(existente && !existente.consentimento_em)

  const salvar = async (statusFinal: 'incompleta' | 'concluida') => {
    if (!session) {
      setMsg({ tipo: 'erro', texto: 'Sessão não encontrada — recarregue a página e tente de novo.' })
      return
    }
    if (!existente && !consentiu) {
      setMsg({
        tipo: 'erro',
        texto: 'Para salvar, é preciso autorizar o uso das informações de saúde.',
      })
      return
    }
    setSaving(true)
    setMsg(null)
    const dados = normalizarAnamneseForm({ ...form, status: statusFinal })
    try {
      if (existente) {
        await atualizarMinhaAnamnese(session.access_token, session.user.id, dados, {
          consentir: consentimentoPendente && consentiu,
        })
      } else {
        await criarMinhaAnamnese(session.access_token, session.user.id, dados)
      }
      if (statusFinal === 'concluida') {
        navigate('/aluno', { state: { anamneseConcluida: true } })
        return
      }
      setMsg({ tipo: 'ok', texto: 'Rascunho salvo.' })
      refetch()
    } catch (err) {
      setMsg({
        tipo: 'erro',
        texto:
          err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente novamente.',
      })
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void salvar('concluida')
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          <Link to="/aluno" className="text-sm text-ink/60 transition-colors hover:text-terracotta">
            ← Voltar
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-16 pt-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Minha anamnese</h1>
        <p className="mt-1 text-sm text-ink/60">
          Essas respostas ajudam seu coach a montar um treino seguro e sob medida. Sem
          diagnóstico — só o que importa para o programa.
        </p>

        {status === 'loading' && <LoadingBlock />}
        {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}

        {status === 'ready' && consentimentoPendente && (
          <p className="mt-4 rounded-xl border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-sm text-ink">
            <span className="font-medium text-terracotta">
              Esta anamnese foi preenchida pelo seu coach.
            </span>{' '}
            Revise as respostas e confirme a autorização no fim da página — sem ela, o
            consentimento continua pendente.
          </p>
        )}

        {status === 'ready' && (
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <AnamneseCampos form={form} set={set} />

            {(!existente || consentimentoPendente) && (
              <label className="flex items-start gap-3 rounded-xl border border-ink/15 bg-white p-4">
                <input
                  type="checkbox"
                  checked={consentiu}
                  onChange={(e) => setConsentiu(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-terracotta"
                />
                <span className="text-sm text-ink/80">
                  Autorizo o uso destas informações, incluindo dados de saúde, exclusivamente
                  para que meu coach monte e acompanhe meu programa de treino. Posso pedir a
                  exclusão quando quiser.
                </span>
              </label>
            )}
            {existente && existente.consentimento_em && (
              <p className="text-xs text-ink/50">
                Consentimento registrado em{' '}
                {new Date(existente.consentimento_em).toLocaleString('pt-BR')}.
              </p>
            )}

            {msg && (
              <p
                className={`rounded-xl px-4 py-3 text-sm ${
                  msg.tipo === 'ok' ? 'bg-sage/10 text-sage' : 'bg-terracotta/10 text-terracotta'
                }`}
              >
                {msg.texto}
              </p>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-terracotta py-3.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Concluir anamnese'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void salvar('incompleta')}
                className="w-full rounded-xl border border-ink/15 bg-white py-3.5 font-medium text-ink/70 transition-colors hover:border-terracotta disabled:opacity-50"
              >
                Salvar rascunho
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
