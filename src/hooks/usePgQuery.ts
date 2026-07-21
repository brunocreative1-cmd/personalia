import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

type QueryState<T> =
  | { status: 'loading'; data: null; errorMsg: null }
  | { status: 'ready'; data: T; errorMsg: null }
  | { status: 'error'; data: null; errorMsg: string }

/**
 * Busca de dados com o padrão do app: loading/erro explícitos, timeout já
 * garantido pela camada de api, e retry/refetch que refaz a leitura no banco.
 */
export function usePgQuery<T>(query: (token: string) => Promise<T>, deps: unknown[] = []) {
  const { session } = useAuth()
  const token = session?.access_token ?? null
  const [state, setState] = useState<QueryState<T>>({
    status: 'loading',
    data: null,
    errorMsg: null,
  })
  const [attempt, setAttempt] = useState(0)
  const queryRef = useRef(query)
  queryRef.current = query

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState({ status: 'loading', data: null, errorMsg: null })
    queryRef.current(token)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, errorMsg: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg =
          err instanceof ApiError ? err.message : 'Algo deu errado ao carregar os dados.'
        setState({ status: 'error', data: null, errorMsg: msg })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempt, ...deps])

  const refetch = useCallback(() => setAttempt((n) => n + 1), [])

  return { ...state, refetch }
}
