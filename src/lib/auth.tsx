import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'
import { DESIGN_PREVIEW_ROLE } from './flags'

/**
 * Sessão fake usada apenas no modo DESIGN_PREVIEW (dev-only). Satisfaz o
 * mínimo consumido pela app (user.id / access_token). Nunca é criada em
 * produção porque DESIGN_PREVIEW_ROLE é sempre null fora de dev.
 */
const DESIGN_PREVIEW_SESSION = {
  access_token: 'design-preview',
  refresh_token: 'design-preview',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Number.MAX_SAFE_INTEGER,
  user: {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'design-preview@local',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  },
} as unknown as Session

export type Role = 'coach' | 'aluno'

export type ProfileStatus = 'loading' | 'ready' | 'missing' | 'error'

const PROFILE_TIMEOUT_MS = 10_000

type AuthContextValue = {
  /** true enquanto a sessão inicial ainda não foi resolvida */
  sessionLoading: boolean
  session: Session | null
  profileStatus: ProfileStatus
  role: Role | null
  /** refaz a leitura do profile após um erro/timeout */
  retryProfile: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Lê profiles.role via PostgREST com fetch direto, usando o access_token da
 * sessão. Não passa pelo lock interno de auth do supabase-js — uma query
 * disparada logo após o login pode ficar presa nesse lock para sempre
 * (deadlock conhecido), deixando a tela em "Carregando…" eterno.
 * Timeout de 10s garante que qualquer travamento vira erro recuperável.
 */
async function fetchRole(
  userId: string,
  accessToken: string
): Promise<{ role: Role | null; status: ProfileStatus }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS)
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      }
    )
    if (!res.ok) return { role: null, status: 'error' }
    const rows: Array<{ role: string | null }> = await res.json()
    if (rows.length === 0) return { role: null, status: 'missing' }
    const role = rows[0].role
    if (role === 'coach' || role === 'aluno') return { role, status: 'ready' }
    return { role: null, status: 'missing' }
  } catch {
    // Falha de rede ou timeout (abort)
    return { role: null, status: 'error' }
  } finally {
    clearTimeout(timer)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // DESIGN_PREVIEW (dev-only): entrega sessão+papel fake e ignora o Supabase.
  // DESIGN_PREVIEW_ROLE é constante por build, então a ordem de hooks abaixo
  // permanece estável entre renders.
  if (DESIGN_PREVIEW_ROLE) {
    return (
      <AuthContext.Provider
        value={{
          sessionLoading: false,
          session: DESIGN_PREVIEW_SESSION,
          profileStatus: 'ready',
          role: DESIGN_PREVIEW_ROLE,
          retryProfile: () => {},
          signOut: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    )
  }

  const [sessionLoading, setSessionLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading')
  const [role, setRole] = useState<Role | null>(null)
  const [profileAttempt, setProfileAttempt] = useState(0)

  useEffect(() => {
    // getSession também pode ficar presa no lock de auth (ex.: outra aba
    // segurando o navigator lock) — o timeout evita spinner eterno no boot.
    const bootTimer = setTimeout(() => setSessionLoading(false), PROFILE_TIMEOUT_MS)

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setSessionLoading(false)
      }
    )

    return () => {
      clearTimeout(bootTimer)
      subscription.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null
  const accessToken = session?.access_token ?? null

  useEffect(() => {
    if (!userId || !accessToken) {
      setRole(null)
      setProfileStatus('loading')
      return
    }

    let cancelled = false
    setProfileStatus('loading')
    fetchRole(userId, accessToken).then((result) => {
      if (cancelled) return
      setRole(result.role)
      setProfileStatus(result.status)
    })

    return () => {
      cancelled = true
    }
  }, [userId, accessToken, profileAttempt])

  const retryProfile = useCallback(() => setProfileAttempt((n) => n + 1), [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ sessionLoading, session, profileStatus, role, retryProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
