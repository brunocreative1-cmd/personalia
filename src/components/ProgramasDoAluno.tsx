import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { criarPrograma, fetchProgramasDoAluno } from '../lib/programas'
import { useAuth } from '../lib/auth'
import { UI_MODO_TESTE } from '../lib/flags'
import { usePgQuery } from '../hooks/usePgQuery'
import { ErrorBlock, LoadingBlock } from './DataState'
import { formatDateBR } from '../lib/dates'

const STATUS_ESTILO: Record<string, string> = {
  rascunho: 'bg-ink/10 text-ink/60',
  publicado: 'bg-sage/15 text-sage',
  pausado: 'bg-terracotta/15 text-terracotta',
  concluido: 'bg-ink/10 text-ink/60',
}

/** Programas do aluno na ficha do coach: lista + criação de rascunho. */
export function ProgramasDoAluno({
  alunoId,
  nomeAluno,
}: {
  alunoId: string
  nomeAluno: string
}) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { status, data: programas, errorMsg, refetch } = usePgQuery(
    (token) => fetchProgramasDoAluno(token, alunoId),
    [alunoId]
  )
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const criar = async () => {
    if (!session) {
      setErro('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    setCriando(true)
    setErro(null)
    try {
      const id = await criarPrograma(session.access_token, session.user.id, alunoId, {
        titulo: `Programa de ${nomeAluno}`,
        objetivo: null,
        descricao: null,
        data_inicio: null,
        data_fim: null,
        observacoes: null,
      })
      navigate(`/coach/programas/${id}`)
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível criar o programa.')
      setCriando(false)
    }
  }

  if (status === 'loading') return <LoadingBlock />
  if (status === 'error') return <ErrorBlock message={errorMsg} onRetry={refetch} />

  return (
    <div className="mt-4">
      {programas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink/20 bg-white/40 px-4 py-5 text-sm text-ink/60">
          Nenhum programa ainda. Crie o primeiro como rascunho — o aluno só vê depois que você
          publicar.
        </p>
      ) : (
        <ul className="space-y-3">
          {programas.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => navigate(`/coach/programas/${p.id}`)}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/10 bg-white/60 p-4 text-left transition-colors hover:border-terracotta/50"
              >
                <div>
                  <p className="font-medium text-ink">{p.titulo}</p>
                  <p className="mt-0.5 text-sm text-ink/60">
                    {p.data_inicio ? `início ${formatDateBR(p.data_inicio)}` : 'sem data'}
                    {p.objetivo ? ` · ${p.objetivo}` : ''}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {UI_MODO_TESTE && p.modo_teste && (
                    <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-medium text-ink/70">
                      Demonstrativo
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_ESTILO[p.status] ?? 'bg-ink/10 text-ink/60'
                    }`}
                  >
                    {p.status}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {erro && (
        <p className="mt-3 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{erro}</p>
      )}

      <button
        onClick={() => void criar()}
        disabled={criando}
        className="mt-4 rounded-xl bg-terracotta px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {criando ? 'Criando…' : '+ Criar programa'}
      </button>
    </div>
  )
}
