import { NavLink, Outlet } from 'react-router-dom'
import { LogoutButton } from './LogoutButton'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors ${
    isActive ? 'font-medium text-terracotta' : 'text-ink/60 hover:text-ink'
  }`

export function CoachLayout() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <span className="font-display text-lg font-semibold text-ink">
            Personal IA <span className="text-terracotta">30 Dias</span>
          </span>
          <nav className="flex items-center gap-5">
            <NavLink to="/coach" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/coach/alunos" className={linkClass}>
              Alunos
            </NavLink>
            <NavLink to="/coach/exercicios" className={linkClass}>
              Exercícios
            </NavLink>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
