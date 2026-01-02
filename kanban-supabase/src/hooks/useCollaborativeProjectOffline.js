// useCollaborativeProjectOffline: React hook with VERIFIED offline support
//
// Uses EffectManager which is backed by the compiled Dafny EffectStateMachine.
// All state transitions go through the verified Step function.

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react'
import { isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'
import { EffectManager } from './EffectManager.js'

export function useCollaborativeProjectOffline(projectId) {
  const [status, setStatus] = useState('syncing')
  const [error, setError] = useState(null)
  const effectsRef = useRef(null)
  const currentProjectIdRef = useRef(null)

  // Create or recreate effect manager when projectId changes
  if (projectId && isSupabaseConfigured() && currentProjectIdRef.current !== projectId) {
    // Stop old manager if it exists
    if (effectsRef.current) {
      effectsRef.current.stop()
    }
    effectsRef.current = new EffectManager(projectId)
    currentProjectIdRef.current = projectId
  }

  const effects = effectsRef.current

  // Subscribe to client state via useSyncExternalStore
  const clientState = useSyncExternalStore(
    effects?.subscribe ?? (() => () => {}),
    effects?.getSnapshot ?? (() => null),
    effects?.getSnapshot ?? (() => null)
  )

  // Wire up callbacks and start/stop
  useEffect(() => {
    if (!effects) return
    effects.setCallbacks(setStatus, setError)
    effects.start()
    return () => effects.stop()
  }, [effects])

  // Dispatch - synchronous, calls verified Step
  const dispatch = useCallback((action) => {
    effects?.dispatch(action)
  }, [effects])

  const sync = useCallback(() => effects?.sync(), [effects])
  const flush = useCallback(() => effects?.sync(), [effects])
  const toggleOffline = useCallback(() => effects?.toggleOffline() ?? false, [effects])

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
    isOffline: effects ? !effects.isOnline : false,
    toggleOffline,
    flush,
    isFlushing: effects?.isDispatching ?? false
  }
}
