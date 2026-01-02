// useCollaborativeProjectOffline: React hook with VERIFIED offline support
//
// Uses MultiProjectEffectManager which is backed by the compiled Dafny
// MultiProjectEffectStateMachine. All state transitions go through the verified Step function.

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react'
import { isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'
import { MultiProjectEffectManager } from './MultiProjectEffectManager.js'

export function useCollaborativeProjectOffline(projectId) {
  const [status, setStatus] = useState('syncing')
  const [error, setError] = useState(null)
  const managerRef = useRef(null)
  const currentProjectIdRef = useRef(null)

  // Create or recreate manager when projectId changes
  if (projectId && isSupabaseConfigured() && currentProjectIdRef.current !== projectId) {
    // Stop old manager if it exists
    if (managerRef.current) {
      managerRef.current.stop()
    }
    managerRef.current = new MultiProjectEffectManager([projectId])
    currentProjectIdRef.current = projectId
  }

  const manager = managerRef.current

  // Subscribe to multi-model state via useSyncExternalStore
  const multiModel = useSyncExternalStore(
    manager?.subscribe ?? (() => () => {}),
    manager?.getSnapshot ?? (() => null),
    manager?.getSnapshot ?? (() => null)
  )

  // Wire up callbacks and start/stop
  useEffect(() => {
    if (!manager) return
    manager.setCallbacks(setStatus, setError)
    manager.start()
    return () => manager.stop()
  }, [manager])

  // Dispatch - synchronous, calls verified Step (wraps in single-project action)
  const dispatch = useCallback((action) => {
    manager?.dispatchSingle(projectId, action)
  }, [manager, projectId])

  const sync = useCallback(() => manager?.sync(), [manager])
  const flush = useCallback(() => manager?.sync(), [manager])
  const toggleOffline = useCallback(() => manager?.toggleOffline() ?? false, [manager])

  // Derived state - get single project model from multi-model
  const model = multiModel ? App.MultiModel.getProject(multiModel, projectId) : null
  const pendingCount = manager?.pendingCount ?? 0
  const version = manager?.getBaseVersions()[projectId] ?? 0

  return {
    model,
    version,
    dispatch,
    sync,
    pendingCount,
    pendingActions: [], // TODO: filter to this project's actions if needed
    error,
    status,
    isOffline: manager ? !manager.isOnline : false,
    toggleOffline,
    flush,
    isFlushing: manager?.isDispatching ?? false
  }
}
