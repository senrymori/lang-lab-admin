import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api'

/** Loads on mount and on `reload`; a 401 means the key went bad — back to sign-in. */
export function useLoad<T>(fn: () => Promise<T>, onAuthError: () => void) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try {
      setData(await fn())
      setError('')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onAuthError()
      else setError(String(e instanceof Error ? e.message : e))
    }
  }, [fn, onAuthError])
  useEffect(() => {
    reload()
  }, [reload])
  return { data, error, reload }
}
