import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useUrlState() {
  const [params, setParams] = useSearchParams()

  const get = useCallback((key: string, fallback = '') => params.get(key) ?? fallback, [params])
  const getNumber = useCallback(
    (key: string, fallback: number) => {
      const v = params.get(key)
      if (v == null || v === '') return fallback
      const n = Number(v)
      return Number.isFinite(n) ? n : fallback
    },
    [params],
  )
  const getBool = useCallback((key: string) => {
    const v = params.get(key)
    return v === 'true' || v === '1'
  }, [params])

  const setMany = useCallback(
    (updates: Record<string, string | number | boolean | null | undefined>, replace = false) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(updates)) {
            if (v === null || v === undefined || v === '') next.delete(k)
            else next.set(k, String(v))
          }
          return next
        },
        { replace },
      )
    },
    [setParams],
  )

  const page = getNumber('page', 1)
  const pageSize = getNumber('pageSize', 20)
  const search = get('search')

  return useMemo(
    () => ({ params, get, getNumber, getBool, setMany, page, pageSize, search }),
    [params, get, getNumber, getBool, setMany, page, pageSize, search],
  )
}
