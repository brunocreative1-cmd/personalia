import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Aluno } from '../../lib/api'
import { fetchAlunos } from '../../lib/api'
import { usePgQuery } from '../../hooks/usePgQuery'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/DataState'
import { StatusBadge } from '../../components/StatusBadge'
import { correspondeBusca } from '../../lib/busca'
import { diaDoCiclo, formatDateBR } from '../../lib/dates'

function AlunoRow({ aluno }: { aluno: Aluno }) {
  const navigate = useNavigate()
  const ciclo = diaDoCiclo(aluno.data_inicio)

  return (
    <button
      onClick={() => navigate(`/coach/alunos/${aluno.profile_id}`)}
      className="w-full rounded-xl border border-ink/10 bg-white/60 p-4 text-left transition-colors hover:border-terracotta/50 md:grid md:grid-cols-[1.6fr_1.2fr_0.9fr_1.6fr_0.9fr_0.9fr] md:items-center md:gap-3 md:rounded-none md:border-x-0 md:border-t-0 md:bg-transparent md:px-2 md:py-3"
    >
      <span className="block font-medium text-ink">{aluno.perfil?.nome ?? 'Sem nome'}</span>
      <span className="mt-0.5 block text-sm text-ink/60 md:mt-0">
        {aluno.perfil?.whatsapp ?? '—'}
      </span>
      <span className="mt-2 block md:mt-0">
        <StatusBadge status={aluno.status} />
      </span>
      <span className="mt-2 block truncate text-sm text-ink/70 md:mt-0">
        {aluno.objetivo ?? '—'}
      </span>
      <span className="mt-1 block text-sm text-ink/60 md:mt-0">{ciclo.label}</span>
      <span className="mt-0.5 block text-sm text-ink/60 md:mt-0">
        <span className="text-ink/40 md:hidden">término </span>
        {formatDateBR(aluno.data_fim)}
      </span>
    </button>
  )
}

export function AlunosList() {
  const { status, data: alunos, errorMsg, refetch } = usePgQuery(fetchAlunos)
  const [busca, setBusca] = useState('')

  const filtrados = (alunos ?? []).filter((a) =>
    correspondeBusca(busca, a.perfil?.nome ?? null, a.perfil?.whatsapp ?? null)
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Alunos</h1>
          <p className="mt-1 text-sm text-ink/60">Toque em um aluno para abrir a ficha</p>
        </div>
        <Link
          to="/coach/alunos/vincular"
          className="rounded-xl bg-terracotta px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          + Vincular aluno existente
        </Link>
      </div>

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
          {alunos.length === 0 ? (
            <EmptyBlock message="Nenhum aluno por aqui ainda." />
          ) : filtrados.length === 0 ? (
            <EmptyBlock message="Nenhum aluno encontrado para essa busca." />
          ) : (
            <div className="space-y-3 md:space-y-0">
              <div className="hidden gap-3 border-b border-ink/15 px-2 pb-2 text-xs font-medium uppercase tracking-wide text-ink/40 md:grid md:grid-cols-[1.6fr_1.2fr_0.9fr_1.6fr_0.9fr_0.9fr]">
                <span>Nome</span>
                <span>WhatsApp</span>
                <span>Status</span>
                <span>Objetivo</span>
                <span>Ciclo</span>
                <span>Término</span>
              </div>
              {filtrados.map((a) => (
                <AlunoRow key={a.profile_id} aluno={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
