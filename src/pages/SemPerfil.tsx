import { LogoutButton } from '../components/LogoutButton'
import { useAuth } from '../lib/auth'

export function SemPerfil({ kind }: { kind: 'missing' | 'error' }) {
  const { retryProfile } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        {kind === 'missing' ? 'Perfil não encontrado' : 'Algo deu errado'}
      </h1>
      <p className="mt-3 max-w-sm text-ink/60">
        {kind === 'missing'
          ? 'Sua conta foi criada, mas ainda não há um perfil vinculado a ela. Fale com seu coach para liberar o acesso.'
          : 'Não conseguimos carregar seu perfil agora. Verifique sua conexão e tente novamente.'}
      </p>
      <div className="mt-8 flex items-center gap-3">
        {kind === 'error' && (
          <button
            onClick={retryProfile}
            className="rounded-full bg-terracotta px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        )}
        <LogoutButton />
      </div>
    </div>
  )
}
