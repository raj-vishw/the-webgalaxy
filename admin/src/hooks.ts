import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './services/api'

/** Load-on-mount with a manual reload; errors are kept as messages. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loader()
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Request failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps])
  return { data, error, loading, reload }
}

export const describeError = (e: unknown) =>
  e instanceof ApiError ? (e.details?.length ? `${e.message} ${e.details.map((d) => `${d.path}: ${d.message}`).join('; ')}` : e.message) : 'Request failed'
