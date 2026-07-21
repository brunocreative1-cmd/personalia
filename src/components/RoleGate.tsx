import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../lib/auth'
import { useAuth } from '../lib/auth'
import { DESIGN_PREVIEW_ROLE } from '../lib/flags'
import { LoadingScreen } from './LoadingScreen'
import { SemPerfil } from '../pages/SemPerfil'

/**
 * Garante que o usuário logado tem o papel esperado.
 * Sem perfil ou erro ao carregar → tela de erro amigável.
 * Papel diferente → redireciona para a área correta.
 */
export function RoleGate({ expected, children }: { expected: Role; children: ReactNode }) {
  const { profileStatus, role } = useAuth()

  // DESIGN_PREVIEW (dev-only): libera todas as rotas (coach e aluno) com uma
  // única sessão, para o redesign navegar direto sem alternar a flag.
  if (DESIGN_PREVIEW_ROLE) return <>{children}</>

  if (profileStatus === 'loading') return <LoadingScreen />
  if (profileStatus === 'missing' || profileStatus === 'error') {
    return <SemPerfil kind={profileStatus} />
  }
  if (role !== expected) {
    return <Navigate to={role === 'coach' ? '/coach' : '/aluno'} replace />
  }

  return <>{children}</>
}
