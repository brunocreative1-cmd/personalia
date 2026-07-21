import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const PADRAO =
  'rounded-full border border-ink/20 px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-terracotta hover:text-terracotta'

/** `className` permite temar o botão (ex.: área dark do aluno). */
export function LogoutButton({ className }: { className?: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <button onClick={handleLogout} className={className ?? PADRAO}>
      Sair
    </button>
  )
}
