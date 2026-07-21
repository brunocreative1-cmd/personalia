import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { DESIGN_PREVIEW_ROLE } from '../lib/flags'
import { LoadingScreen } from '../components/LoadingScreen'
import { normalizarWhatsapp } from '../lib/whatsapp'

type Mode = 'login' | 'signup'

/** Traduz o erro do Supabase em mensagem amigável, sem expor detalhes técnicos. */
function friendlyAuthError(error: unknown, mode: Mode): string {
  if (isAuthRetryableFetchError(error)) {
    return 'Não foi possível conectar ao servidor. Tente novamente.'
  }
  if (mode === 'login' && isAuthApiError(error) && error.status === 400) {
    return 'E-mail ou senha incorretos.'
  }
  return mode === 'login'
    ? 'Não foi possível entrar. Tente novamente mais tarde.'
    : 'Não foi possível criar a conta. Tente novamente.'
}

export function AuthPage() {
  const { sessionLoading, session } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  if (sessionLoading) return <LoadingScreen />
  // DESIGN_PREVIEW (dev-only): a sessão é fake, então mantém /auth visível
  // para permitir redesenhar a própria tela de login.
  if (session && !DESIGN_PREVIEW_ROLE) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setErrorMsg(friendlyAuthError(error, 'login'))
        } else {
          navigate('/', { replace: true })
        }
      } else {
        const nomeLimpo = nome.trim()
        const whatsappFormatado = normalizarWhatsapp(whatsapp)
        if (nomeLimpo.length < 3) {
          setErrorMsg('Informe seu nome completo.')
          setSubmitting(false)
          return
        }
        if (!whatsappFormatado) {
          setErrorMsg('Informe um WhatsApp válido com DDD, ex.: (62) 99999-9999.')
          setSubmitting(false)
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // handle_new_user (trigger no banco) grava nome/whatsapp no profile
          options: { data: { nome: nomeLimpo, whatsapp: whatsappFormatado } },
        })
        if (error) {
          setErrorMsg(friendlyAuthError(error, 'signup'))
        } else if (!data.session) {
          setInfoMsg('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
        } else {
          navigate('/', { replace: true })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setErrorMsg(null)
    setInfoMsg(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Personal IA <span className="text-terracotta">30 Dias</span>
        </h1>
        <p className="mt-2 text-sm text-ink/60">Seu sistema de treino e evolução</p>
      </header>

      <main className="w-full max-w-sm">
        <div className="mb-6 flex rounded-full border border-ink/10 bg-white/60 p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
              mode === 'signup' ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="nome" className="mb-1 block text-sm font-medium text-ink/80">
                  Nome completo
                </label>
                <input
                  id="nome"
                  type="text"
                  required
                  minLength={3}
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label htmlFor="whatsapp" className="mb-1 block text-sm font-medium text-ink/80">
                  WhatsApp
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta"
                  placeholder="(62) 99999-9999"
                />
                <p className="mt-1 text-xs text-ink/50">
                  Seu coach usa o WhatsApp para acompanhar você.
                </p>
              </div>
            </>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink/80">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink/80">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
              {errorMsg}
            </p>
          )}
          {infoMsg && (
            <p className="rounded-xl bg-sage/10 px-4 py-3 text-sm text-sage">{infoMsg}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-terracotta py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </main>
    </div>
  )
}
