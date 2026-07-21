import { Link } from 'react-router-dom'
import { fetchMeuPrograma } from '../../lib/programas'
import { UI_MODO_TESTE } from '../../lib/flags'
import { usePgQuery } from '../../hooks/usePgQuery'
import { ErrorBlock, LoadingBlock } from '../../components/DataState'
import { TreinoView } from '../../components/TreinoView'

/** Aba Treino: o programa publicado do aluno, na íntegra. */
export function TreinoPage() {
  const { status, data: programa, errorMsg, refetch } = usePgQuery(fetchMeuPrograma)

  return (
    <div className="pt-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Meu treino</h1>

      {status === 'loading' && <LoadingBlock />}
      {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}

      {status === 'ready' && !programa && (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-white/40 p-6 text-center">
          <p className="text-ink/70">Seu programa de treino ainda não foi publicado.</p>
          <p className="mt-2 text-sm text-ink/50">
            Seu coach está preparando tudo — você recebe o treino aqui assim que ele publicar.
          </p>
        </div>
      )}

      {status === 'ready' && programa && (
        <div className="mt-6">
          {UI_MODO_TESTE && programa.modo_teste && (
            <p className="mb-4 inline-block rounded-full bg-ink/10 px-3 py-1 text-xs font-medium text-ink/70">
              Demonstrativo — não é uma prescrição ativa
            </p>
          )}
          <TreinoView
            programa={programa}
            acaoSessao={(s) =>
              s.sessao_exercicios.length > 0 ? (
                <Link
                  to={`/aluno/treino/sessao/${s.id}`}
                  className="mt-2 block rounded-xl border border-terracotta/40 bg-white py-2.5 text-center text-sm font-medium text-terracotta transition-colors hover:bg-terracotta/5"
                >
                  {UI_MODO_TESTE && programa.modo_teste ? 'Simular treino' : 'Iniciar esta sessão'}
                </Link>
              ) : null
            }
          />
        </div>
      )}
    </div>
  )
}
