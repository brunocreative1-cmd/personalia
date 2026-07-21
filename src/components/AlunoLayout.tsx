import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { IconHome, IconDumbbell, IconTrendingUp, IconUser } from './icons'
import { Logo } from './Logo'
import { LogoutButton } from './LogoutButton'

const ABAS = [
  { to: '/aluno', end: true, label: 'Hoje', Icone: IconHome },
  { to: '/aluno/treino', end: false, label: 'Treino', Icone: IconDumbbell },
  { to: '/aluno/progresso', end: false, label: 'Progresso', Icone: IconTrendingUp },
  { to: '/aluno/anamnese', end: false, label: 'Perfil', Icone: IconUser },
]

/**
 * Casca do app do aluno: conteúdo + bottom nav de 4 abas.
 *
 * O tema dark ainda está restrito à Hoje (estudo de design em andamento);
 * as demais telas seguem no tema claro até serem convertidas — sem isso,
 * o texto escuro delas ficaria ilegível sobre o fundo preto.
 * O cabeçalho (avatar/saudação) pertence à página, não à casca.
 */
export function AlunoLayout() {
  const dark = useLocation().pathname === '/aluno'

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
      isActive
        ? dark
          ? 'text-flame'
          : 'text-terracotta'
        : dark
          ? 'text-white/40 hover:text-white/70'
          : 'text-ink/50 hover:text-ink'
    }`

  const iconWrap = (isActive: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
      isActive ? (dark ? 'bg-flame/15' : 'bg-terracotta/10') : ''
    }`

  return (
    <div className={`aluno-app min-h-screen pb-24 ${dark ? 'bg-night text-white' : 'bg-cream text-ink'}`}>
      <header
        className={`sticky top-0 z-10 border-b backdrop-blur ${
          dark ? 'border-steel bg-night/90' : 'border-ink/10 bg-cream/90'
        }`}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-3.5">
          <Logo className="h-6 w-auto" />
          <LogoutButton
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              dark
                ? 'border-steel text-white/60 hover:border-flame hover:text-flame'
                : 'border-ink/20 text-ink/60 hover:border-terracotta hover:text-terracotta'
            }`}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className={`fixed inset-x-0 bottom-0 border-t backdrop-blur ${
          dark ? 'border-steel bg-carbon/95' : 'border-ink/10 bg-white/95'
        }`}
      >
        <div className="mx-auto flex max-w-md px-2 pb-2 pt-1.5">
          {ABAS.map(({ to, end, label, Icone }) => (
            <NavLink key={to} to={to} end={end} className={tabClass}>
              {({ isActive }) => (
                <>
                  <span className={iconWrap(isActive)}>
                    <Icone className="h-5 w-5" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
