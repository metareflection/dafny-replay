// useCollaborativeProject: React hook for collaborative expense splitting
//
// Integrates EffectManager with React's useSyncExternalStore for efficient updates.

import { useEffect, useState, useSyncExternalStore, useCallback } from 'react'
import { EffectManager } from './EffectManager.js'
import { isSupabaseConfigured } from '../supabase.js'

export function useCollaborativeProject(groupId) {
  const [manager, setManager] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!groupId || !isSupabaseConfigured()) {
      setStatus('offline')
      return
    }

    const mgr = new EffectManager(groupId)
    mgr.setCallbacks(setStatus, setError)
    mgr.start().then(() => setManager(mgr))

    return () => mgr.stop()
  }, [groupId])

  const client = useSyncExternalStore(
    manager?.subscribe ?? (() => () => {}),
    manager?.getSnapshot ?? (() => null)
  )

  const dispatch = useCallback((action) => {
    manager?.dispatch(action)
  }, [manager])

  const sync = useCallback(() => {
    manager?.sync()
  }, [manager])

  const toggleOffline = useCallback(() => {
    manager?.toggleOffline()
  }, [manager])

  return {
    client,
    status,
    error,
    dispatch,
    sync,
    toggleOffline,
    isOnline: manager?.isOnline ?? true,
    serverVersion: manager?.serverVersion ?? 0
  }
}
