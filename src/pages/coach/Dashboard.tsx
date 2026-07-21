import { fetchAlunos } from '../../lib/api'
import { usePgQuery } from '../../hooks/usePgQuery'
import { ErrorBlock, LoadingBlock } from '../../components/DataState'

function CounterCard({ label, value }: { label: string; value: number }) {
  const destaque = value > 0
  return (
    <div
      className={`rounded-2xl border bg-white/60 p-6 ${
        destaque ? 'border-terracotta/40' : 'border-ink/10'
      }`}
    >
      <p className="text-sm text-ink/60">{label}</p>
      <p
        className={`mt-2 font-display text-4xl font-semibold ${
          destaque ? 'text-terracotta' : 'text-ink/30'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export function CoachDashboard() {
  const { status, data: alunos, errorMsg, refetch } = usePgQuery(fetchAlunos)

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-ink/60">Visão geral dos seus alunos</p>

      {status === 'loading' && <LoadingBlock />}
      {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}
      {status === 'ready' && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <CounterCard label="Total de alunos" value={alunos.length} />
          <CounterCard
            label="Ativos"
            value={alunos.filter((a) => a.status === 'ativo').length}
          />
          <CounterCard label="Novos" value={alunos.filter((a) => a.status === 'novo').length} />
        </div>
      )}
    </div>
  )
}
