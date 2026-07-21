import type { ReactNode } from 'react'
import type { Programa, Sessao } from '../lib/programas'

function intervaloFmt(seg: number | null): string | null {
  if (seg === null) return null
  if (seg < 60) return `${seg}s`
  const m = Math.floor(seg / 60)
  const r = seg % 60
  return r === 0 ? `${m}min` : `${m}min${r}s`
}

export function SessaoCard({ sessao }: { sessao: Sessao }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">{sessao.titulo}</h3>
        <span className="text-xs text-ink/50">
          semana {sessao.semana}
          {sessao.duracao_estimada_min ? ` · ~${sessao.duracao_estimada_min} min` : ''}
        </span>
      </div>
      {sessao.dias_sugeridos && sessao.dias_sugeridos.length > 0 && (
        <p className="mt-1 text-sm capitalize text-ink/60">{sessao.dias_sugeridos.join(' · ')}</p>
      )}
      {sessao.observacoes && <p className="mt-2 text-sm text-ink/70">{sessao.observacoes}</p>}

      <ul className="mt-4 space-y-3">
        {sessao.sessao_exercicios.map((se) => (
          <li key={se.id} className="rounded-xl border border-ink/10 bg-white p-4">
            <p className="font-medium text-ink">{se.exercicio.nome}</p>
            <p className="mt-1 text-sm text-ink/70">
              {se.series}x {se.repeticoes}
              {se.carga_sugerida ? ` · ${se.carga_sugerida}` : ''}
              {intervaloFmt(se.intervalo_seg) ? ` · descanso ${intervaloFmt(se.intervalo_seg)}` : ''}
              {se.rpe ? ` · ${se.rpe}` : ''}
              {se.cadencia ? ` · cadência ${se.cadencia}` : ''}
            </p>
            {se.observacao && <p className="mt-1 text-sm text-ink/60">{se.observacao}</p>}
            {se.alternativo && (
              <p className="mt-1 text-xs text-ink/50">alternativa: {se.alternativo.nome}</p>
            )}
          </li>
        ))}
        {sessao.sessao_exercicios.length === 0 && (
          <li className="rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink/50">
            Sessão ainda sem exercícios.
          </li>
        )}
      </ul>
    </div>
  )
}

/** Visão do programa como o aluno enxerga (read-only). */
export function TreinoView({
  programa,
  acaoSessao,
}: {
  programa: Programa
  /** Ação opcional renderizada sob cada sessão (ex.: botão "Iniciar"). */
  acaoSessao?: (sessao: Sessao) => ReactNode
}) {
  const semanas = [...new Set(programa.sessoes.map((s) => s.semana))].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">{programa.titulo}</h2>
        {programa.objetivo && <p className="mt-1 text-sm text-ink/70">{programa.objetivo}</p>}
        {programa.descricao && <p className="mt-2 text-sm text-ink/60">{programa.descricao}</p>}
      </div>

      {semanas.map((semana) => (
        <div key={semana}>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink/40">
            Semana {semana}
          </p>
          <div className="space-y-4">
            {programa.sessoes
              .filter((s) => s.semana === semana)
              .map((s) => (
                <div key={s.id}>
                  <SessaoCard sessao={s} />
                  {acaoSessao?.(s)}
                </div>
              ))}
          </div>
        </div>
      ))}

      {programa.sessoes.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink/20 p-5 text-sm text-ink/50">
          Este programa ainda não tem sessões.
        </p>
      )}

      {programa.observacoes && (
        <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            Observações do coach
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{programa.observacoes}</p>
        </div>
      )}
    </div>
  )
}
