import { useState } from 'react'
import { ApiError } from '../lib/api'
import type { Aluno } from '../lib/api'
import {
  fetchAlertasDoAluno,
  fetchExecucoesDoAluno,
  marcarAlertaLido,
} from '../lib/execucoes'
import { fetchProgramaPublicadoDoAluno } from '../lib/programas'
import {
  duracaoFmt,
  EXEC_STATUS_LABEL,
  resumoFrequencia,
} from '../lib/historico'
import { useAuth } from '../lib/auth'
import { UI_MODO_TESTE } from '../lib/flags'
import { usePgQuery } from '../hooks/usePgQuery'
import { ErrorBlock, LoadingBlock } from './DataState'
import { IconAlertTriangle } from './icons'

function Stat({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 p-4 text-center">
      <p className={`font-display text-2xl font-semibold ${cor ?? 'text-ink'}`}>{valor}</p>
      <p className="text-xs text-ink/50">{rotulo}</p>
    </div>
  )
}

/** Acompanhamento de execução na ficha do aluno (visão do coach). */
export function AcompanhamentoAluno({ aluno }: { aluno: Aluno }) {
  const { session } = useAuth()
  const [marcando, setMarcando] = useState<string | null>(null)
  const [erroAlerta, setErroAlerta] = useState<string | null>(null)

  const { status, data: execucoes, errorMsg, refetch } = usePgQuery(
    (token) => fetchExecucoesDoAluno(token, aluno.id),
    [aluno.id]
  )
  const { data: programa } = usePgQuery(
    (token) => fetchProgramaPublicadoDoAluno(token, aluno.id),
    [aluno.id]
  )
  const { data: alertas, refetch: refetchAlertas } = usePgQuery(
    (token) => fetchAlertasDoAluno(token, aluno.id),
    [aluno.id]
  )

  if (status === 'loading') return <LoadingBlock />
  if (status === 'error') return <ErrorBlock message={errorMsg} onRetry={refetch} />

  // Decisão 3b: AGREGADOS (frequência, última, dores) contam só execuções
  // reais; a LISTA continua completa, com badge "simulado" nas de teste.
  const reais = UI_MODO_TESTE
    ? (execucoes ?? []).filter((e) => !e.simulado)
    : (execucoes ?? [])
  const freq = resumoFrequencia(programa ?? null, reais, aluno.data_inicio)
  const ultima = reais[0] ?? null
  const comDor = reais.filter((e) => e.dor !== null && e.dor > 0)
  const naoLidos = (alertas ?? []).filter((a) => !a.lido)

  const marcarLido = async (alertaId: string) => {
    if (!session) {
      setErroAlerta('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    setMarcando(alertaId)
    setErroAlerta(null)
    try {
      await marcarAlertaLido(session.access_token, alertaId)
      refetchAlertas()
    } catch (err) {
      setErroAlerta(
        err instanceof ApiError ? err.message : 'Não foi possível marcar o alerta como lido.'
      )
    } finally {
      setMarcando(null)
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {erroAlerta && (
        <p className="rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
          {erroAlerta}
        </p>
      )}
      {naoLidos.length > 0 && (
        <div className="rounded-2xl border border-terracotta/40 bg-terracotta/5 p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-terracotta">
            <IconAlertTriangle className="h-4 w-4" />
            Alertas de dor não lidos
          </p>
          <ul className="mt-3 space-y-3">
            {naoLidos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">
                    Dor {a.dor}/10 em {new Date(a.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  {a.mensagem && <p className="text-sm text-ink/70">"{a.mensagem}"</p>}
                </div>
                <button
                  onClick={() => void marcarLido(a.id)}
                  disabled={marcando === a.id}
                  className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70 transition-colors hover:border-terracotta disabled:opacity-50"
                >
                  Marcar como lido
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!programa && (
        <p className="rounded-xl border border-dashed border-ink/20 bg-white/40 px-4 py-4 text-sm text-ink/60">
          Sem programa publicado — os números de frequência aparecem depois da publicação.
        </p>
      )}

      {(execucoes ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink/20 bg-white/40 px-4 py-4 text-sm text-ink/60">
          Nenhum treino executado ainda.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat rotulo="previstos" valor={String(freq.previstas)} />
            <Stat rotulo="concluídos" valor={String(freq.realizadas)} cor="text-sage" />
            <Stat rotulo="parciais" valor={String(freq.parciais)} cor="text-terracotta" />
            <Stat
              rotulo="frequência"
              valor={freq.percentual !== null ? `${freq.percentual}%` : '—'}
              cor="text-terracotta"
            />
          </div>

          {ultima && (
            <div className="rounded-2xl border border-ink/10 bg-white/60 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                Última sessão
              </p>
              <p className="mt-1 text-ink">
                {new Date(ultima.iniciado_em).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {EXEC_STATUS_LABEL[ultima.status] ?? ultima.status}
                {duracaoFmt(ultima.duracao_seg) ? ` · ${duracaoFmt(ultima.duracao_seg)}` : ''}
                {ultima.esforco ? ` · esforço ${ultima.esforco}/10` : ''}
                {ultima.dor !== null && ultima.dor > 0 ? ` · dor ${ultima.dor}/10` : ''}
              </p>
              {ultima.observacao && (
                <p className="mt-1 text-sm text-ink/70">"{ultima.observacao}"</p>
              )}
            </div>
          )}

          {comDor.length > 0 && (
            <div className="rounded-2xl border border-ink/10 bg-white/60 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                Dor relatada (últimos treinos)
              </p>
              <ul className="mt-2 space-y-1">
                {comDor.slice(0, 5).map((e) => (
                  <li key={e.id} className="text-sm text-ink/80">
                    {new Date(e.iniciado_em).toLocaleDateString('pt-BR')} — dor{' '}
                    <span className={e.dor! >= 7 ? 'font-semibold text-terracotta' : ''}>
                      {e.dor}/10
                    </span>
                    {e.observacao ? ` · "${e.observacao}"` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-ink/10 bg-white/60 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
              Sessões registradas
            </p>
            <ul className="mt-2 space-y-1.5">
              {(execucoes ?? []).slice(0, 15).map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <span className="text-ink/80">
                    {new Date(e.iniciado_em).toLocaleDateString('pt-BR')} ·{' '}
                    {e.execucao_series.filter((s) => s.concluida).length} séries
                    {duracaoFmt(e.duracao_seg) ? ` · ${duracaoFmt(e.duracao_seg)}` : ''}
                    {UI_MODO_TESTE && e.simulado && (
                      <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium text-ink/60">
                        simulado
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      e.status === 'concluido'
                        ? 'text-sage'
                        : e.status === 'parcial'
                          ? 'text-terracotta'
                          : 'text-ink/50'
                    }`}
                  >
                    {EXEC_STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
