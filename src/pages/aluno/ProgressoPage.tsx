import { useLocation } from 'react-router-dom'
import { fetchMeuRegistro } from '../../lib/api'
import { fetchMinhasExecucoes } from '../../lib/execucoes'
import { fetchMeuPrograma } from '../../lib/programas'
import {
  duracaoFmt,
  EXEC_STATUS_LABEL,
  evolucaoCargas,
  resumoFrequencia,
} from '../../lib/historico'
import { usePgQuery } from '../../hooks/usePgQuery'
import { ErrorBlock, LoadingBlock } from '../../components/DataState'
import { IconCheckCircle } from '../../components/icons'
import { formatDateBR, progressoPrograma } from '../../lib/dates'

const STATUS_COR: Record<string, string> = {
  concluido: 'bg-sage/15 text-sage',
  parcial: 'bg-terracotta/15 text-terracotta',
  abandonado: 'bg-ink/10 text-ink/50',
  iniciado: 'bg-ink/10 text-ink/60',
}

/** Aba Progresso: ciclo, frequência objetiva, histórico e evolução de cargas. */
export function ProgressoPage() {
  const location = useLocation()
  const recemFinalizado = Boolean(
    (location.state as { treinoFinalizado?: boolean } | null)?.treinoFinalizado
  )
  const { status, data: aluno, errorMsg, refetch } = usePgQuery(fetchMeuRegistro)
  const { data: programa } = usePgQuery(fetchMeuPrograma)
  const { status: statusExec, data: execucoes } = usePgQuery(fetchMinhasExecucoes)

  const freq = resumoFrequencia(programa ?? null, execucoes ?? [], aluno?.data_inicio ?? null)
  const cargas = evolucaoCargas(execucoes ?? [])

  return (
    <div className="pt-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Meu progresso</h1>

      {recemFinalizado && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-sage/10 px-4 py-3 text-sm text-sage">
          <IconCheckCircle className="h-5 w-5 shrink-0" />
          <span>Treino registrado — bom trabalho!</span>
        </p>
      )}

      {status === 'loading' && <LoadingBlock />}
      {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}

      {status === 'ready' && aluno && (
        <div className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-6">
          {(() => {
            const p = progressoPrograma(aluno.data_inicio, aluno.data_fim)
            const dia = p.fase === 'andamento' ? p.dia : p.fase === 'concluido' ? 30 : 0
            return (
              <>
                <p className="text-sm text-ink/60">Ciclo de 30 dias</p>
                <p className="mt-1 font-display text-3xl font-semibold text-ink">
                  {p.fase === 'andamento' && `Dia ${dia} de 30`}
                  {p.fase === 'concluido' && 'Ciclo concluído!'}
                  {p.fase === 'antes' && 'Começa em breve'}
                  {p.fase === 'sem-data' && 'Sem data definida'}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-terracotta transition-all"
                    style={{ width: `${(dia / 30) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-ink/50">
                  <span>início {formatDateBR(aluno.data_inicio)}</span>
                  <span>término {formatDateBR(aluno.data_fim)}</span>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {statusExec === 'ready' && programa && freq.previstas > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-center">
            <p className="font-display text-2xl font-semibold text-ink">{freq.previstas}</p>
            <p className="text-xs text-ink/50">previstos</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-center">
            <p className="font-display text-2xl font-semibold text-sage">{freq.realizadas}</p>
            <p className="text-xs text-ink/50">concluídos</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-center">
            <p className="font-display text-2xl font-semibold text-terracotta">
              {freq.percentual ?? 0}%
            </p>
            <p className="text-xs text-ink/50">frequência</p>
          </div>
        </div>
      )}

      {cargas.length > 0 && (
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/70 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            Evolução de carga
          </p>
          <ul className="mt-3 space-y-2">
            {cargas.map((c) => (
              <li key={c.exercicio} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink">{c.exercicio}</span>
                <span className="whitespace-nowrap text-sm font-medium text-ink">
                  {c.primeiraCarga} → {c.ultimaCarga}
                  <span
                    className={`ml-1 ${
                      c.ultimaCarga >= c.primeiraCarga ? 'text-sage' : 'text-terracotta'
                    }`}
                  >
                    {c.ultimaCarga > c.primeiraCarga ? '↑' : c.ultimaCarga < c.primeiraCarga ? '↓' : '='}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">Histórico de treinos</h2>
      {statusExec === 'loading' && <LoadingBlock />}
      {statusExec === 'ready' && (!execucoes || execucoes.length === 0) && (
        <div className="mt-3 rounded-2xl border border-dashed border-ink/20 bg-white/40 p-6 text-center">
          <p className="text-ink/70">Seu histórico de treinos aparece aqui.</p>
          <p className="mt-2 text-sm text-ink/50">
            A cada sessão concluída, você acompanha frequência, esforço e evolução de cargas.
          </p>
        </div>
      )}
      {statusExec === 'ready' && execucoes && execucoes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {execucoes.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/10 bg-white/60 p-4"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {new Date(e.iniciado_em).toLocaleDateString('pt-BR')}
                  {duracaoFmt(e.duracao_seg) ? ` · ${duracaoFmt(e.duracao_seg)}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {e.execucao_series.filter((s) => s.concluida).length} séries
                  {e.esforco ? ` · esforço ${e.esforco}/10` : ''}
                  {e.dor !== null && e.dor > 0 ? ` · dor ${e.dor}/10` : ''}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  STATUS_COR[e.status] ?? 'bg-ink/10 text-ink/60'
                }`}
              >
                {EXEC_STATUS_LABEL[e.status] ?? e.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
