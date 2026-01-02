// useCollaborativeProjectOffline: React hook with VERIFIED offline support
//
// Architecture:
// - ClientStateStore: holds ClientState, all transitions via Dafny-verified functions
// - EffectManager: handles network I/O, subscriptions, offline detection
// - This hook: thin React wrapper using useSyncExternalStore
//
// The verified Dafny functions (LocalDispatch, ClientAcceptReply, HandleRealtimeUpdate)
// ensure state transitions are correct. This hook just wires them to React.

import { useEffect, useState, useCallback, useMemo, useSyncExternalStore } from 'react'
import { isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'
import { ClientStateStore } from './ClientStateStore.js'
import { EffectManager } from './EffectManager.js'

export function useCollaborativeProjectOffline(projectId) {
  // Create store and effect manager once per projectId
  const store = useMemo(() => new ClientStateStore(), [])
  const effects = useMemo(
    () => projectId && isSupabaseConfigured() ? new EffectManager(store, projectId) : null,
    [store, projectId]
  )

  // Status and error are managed here (not in store) since they're UI concerns
  const [status, setStatus] = useState('syncing')
  const [error, setError] = useState(null)

  // Wire up callbacks
  useEffect(() => {
    effects?.setCallbacks(setStatus, setError)
  }, [effects])

  // Start/stop effect manager
  useEffect(() => {
    if (!effects) return
    effects.start()
    return () => effects.stop()
  }, [effects])

  // Subscribe to store using React 18's useSyncExternalStore (no stale closures!)
  const clientState = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot  // getServerSnapshot for SSR
  )

  // Dispatch is synchronous - just calls verified LocalDispatch
  const dispatch = useCallback((action) => {
    store.localDispatch(action)
  }, [store])

  // Sync triggers a full resync
  const sync = useCallback(async () => {
    await effects?.sync()
  }, [effects])

  // Flush sends all pending actions
  const flush = useCallback(async () => {
    await effects?.flush()
  }, [effects])

  // Toggle offline mode
  const toggleOffline = useCallback(() => {
    const nowOffline = effects?.toggleOffline()
    if (nowOffline) {
      setStatus('offline')
    }
  }, [effects])

  // Derived state
  const model = clientState ? App.GetPresent(clientState) : null
  const pendingCount = clientState ? App.GetPendingCount(clientState) : 0
  const pendingActions = clientState
    ? App.GetPendingActions(clientState).map(a => App.actionToJson(a))
    : []

  return {
    model,
    version: effects?.serverVersion ?? 0,
    dispatch,
    sync,
    pendingCount,
    pendingActions,
    error,
    status,
    isOffline: !effects?.isOnline,
    toggleOffline,
    flush,
    isFlushing: effects?.isFlushing ?? false
  }
}
