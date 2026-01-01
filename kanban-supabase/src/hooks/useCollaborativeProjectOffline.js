// useCollaborativeProjectRealtime: React hook with VERIFIED realtime handling
// Uses Dafny KanbanRealtimeCollaboration for flush/realtime coordination
// The skip-during-flush logic is PROVEN correct by FlushWithRealtimeEventsEquivalent theorem

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app.js'

/**
 * Hook for managing a collaborative project with VERIFIED realtime handling.
 *
 * KEY DIFFERENCE from useCollaborativeProjectOffline:
 * - The flush/realtime coordination logic is now in VERIFIED Dafny code
 * - ClientState has a `mode` field (Normal | Flushing) managed by Dafny
 * - HandleRealtimeUpdate skips updates when mode == Flushing (proven safe)
 * - No more React state for isFlushing - it's in the verified ClientState
 */
export function useCollaborativeProjectOffline(projectId) {
  const [clientState, setClientState] = useState(null)
  const [serverVersion, setServerVersion] = useState(0)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('syncing')
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  const dispatchingRef = useRef(false)
  const flushRef = useRef(null)

  // ============================================================================
  // Sync: Load state from Supabase and initialize ClientState
  // ============================================================================

  const sync = useCallback(async () => {
    if (!projectId || !isSupabaseConfigured()) return

    setStatus('syncing')
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('state, version')
        .eq('id', projectId)
        .single()

      if (fetchError) throw fetchError

      // Initialize with VERIFIED Dafny ClientState (mode = Normal)
      const newClientState = App.InitClient(data.version, data.state)
      setClientState(newClientState)
      setServerVersion(data.version)
      setStatus('synced')
      setError(null)
    } catch (e) {
      console.error('Sync error:', e)
      setError(e.message)
      setStatus('error')
    }
  }, [projectId])

  // ============================================================================
  // Dispatch: Optimistic local update + server dispatch
  // ============================================================================

  const dispatch = useCallback(async (action) => {
    if (!projectId || !clientState || !isSupabaseConfigured()) return

    // Optimistic local update using VERIFIED LocalDispatch
    const newClientState = App.LocalDispatch(clientState, action)
    setClientState(newClientState)

    if (isOffline) {
      setStatus('offline')
      return
    }

    if (dispatchingRef.current) {
      return
    }

    dispatchingRef.current = true
    setStatus('pending')

    try {
      const baseVersion = App.GetBaseVersion(clientState)

      const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
        body: {
          projectId,
          baseVersion,
          action: App.actionToJson(action)
        }
      })

      if (invokeError) throw invokeError

      if (data.status === 'accepted') {
        setServerVersion(data.version)
        const syncedClient = App.InitClient(data.version, data.state)
        setClientState(syncedClient)
        setStatus('synced')
        setError(null)
      } else if (data.status === 'conflict') {
        console.warn('Conflict detected, resyncing...')
        await sync()
      } else if (data.status === 'rejected') {
        console.warn('Action rejected:', data.reason)
        setError(`Action rejected: ${data.reason || 'Unknown'}`)
        await sync()
      } else if (data.error) {
        throw new Error(data.error)
      }
    } catch (e) {
      console.error('Dispatch error:', e)

      if (e.message?.includes('fetch') || e.message?.includes('network') || !navigator.onLine) {
        console.log('Network error detected, switching to offline mode')
        setIsOffline(true)
        setStatus('offline')
        setError(null)
      } else {
        setError(e.message)
        setStatus('error')
        await sync()
      }
    } finally {
      dispatchingRef.current = false
    }
  }, [projectId, clientState, isOffline, sync])

  // ============================================================================
  // Flush: Send all pending actions to server
  // Uses VERIFIED EnterFlushMode/Sync from Dafny
  // ============================================================================

  const flush = useCallback(async () => {
    if (!clientState || !isSupabaseConfigured()) return

    const pendingActions = App.GetPendingActions(clientState)
    if (pendingActions.length === 0) {
      setStatus('synced')
      return
    }

    // VERIFIED: Enter flushing mode - realtime updates will be skipped
    let currentClient = App.EnterFlushMode(clientState)
    setClientState(currentClient)
    setStatus('flushing')

    let acceptedCount = 0
    let rejectedCount = 0
    let actionIndex = 0
    let consecutiveConflicts = 0
    const maxConflictRetries = 5

    while (actionIndex < pendingActions.length) {
      const action = pendingActions[actionIndex]
      try {
        const baseVersion = App.GetBaseVersion(currentClient)
        const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
          body: {
            projectId,
            baseVersion,
            action: App.actionToJson(action)
          }
        })

        if (invokeError) throw invokeError

        if (data.status === 'accepted') {
          setServerVersion(data.version)
          // Update client to new server state (still in flushing mode conceptually,
          // but we re-init to clear pending for this action)
          currentClient = App.Sync(data.version, data.state)
          // Re-enter flush mode for remaining actions
          if (actionIndex < pendingActions.length - 1) {
            currentClient = App.EnterFlushMode(currentClient)
          }
          acceptedCount++
          consecutiveConflicts = 0
          actionIndex++
        } else if (data.status === 'conflict') {
          consecutiveConflicts++
          if (consecutiveConflicts >= maxConflictRetries) {
            console.error('Max conflict retries exceeded, aborting flush')
            setError('Too many conflicts, please try again')
            break
          }
          console.warn(`Conflict during flush (attempt ${consecutiveConflicts}), fetching fresh state...`)

          const { data: freshProject, error: fetchError } = await supabase
            .from('projects')
            .select('state, version')
            .eq('id', projectId)
            .single()

          if (fetchError || !freshProject) {
            console.error('Failed to fetch fresh state:', fetchError)
            break
          }

          currentClient = App.Sync(freshProject.version, freshProject.state)
          currentClient = App.EnterFlushMode(currentClient)
          setServerVersion(freshProject.version)
        } else {
          rejectedCount++
          console.warn('Action rejected during flush:', App.actionToJson(action))
          consecutiveConflicts = 0
          actionIndex++
        }
      } catch (e) {
        console.error('Flush error:', e)
        if (e.message?.includes('fetch') || e.message?.includes('network') || !navigator.onLine) {
          console.log('Network error during flush, staying offline')
          setIsOffline(true)
          setStatus('offline')
          setClientState(currentClient)
          return
        }
        setError('Failed to flush action')
        break
      }
    }

    // Final sync to get clean state (exits flushing mode)
    try {
      await sync()
    } catch (e) {
      if (!navigator.onLine) {
        setIsOffline(true)
        setStatus('offline')
      }
    }

    if (rejectedCount > 0) {
      setError(`Flushed: ${acceptedCount} accepted, ${rejectedCount} rejected`)
    }
  }, [clientState, projectId, sync])

  // ============================================================================
  // Toggle offline mode
  // ============================================================================

  const toggleOffline = useCallback(async () => {
    if (isOffline) {
      setIsOffline(false)
      await flush()
    } else {
      setIsOffline(true)
      setStatus('offline')
    }
  }, [isOffline, flush])

  flushRef.current = flush

  // ============================================================================
  // Auto-detect offline/online via browser events
  // ============================================================================

  useEffect(() => {
    const handleOffline = () => {
      console.log('Browser went offline')
      setIsOffline(true)
      setStatus('offline')
    }

    const handleOnline = () => {
      console.log('Browser came online, flushing pending actions...')
      setIsOffline(false)
      if (flushRef.current) {
        flushRef.current()
      }
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // ============================================================================
  // Initial sync
  // ============================================================================

  useEffect(() => {
    if (projectId) {
      sync()
    }
  }, [projectId, sync])

  // ============================================================================
  // Realtime subscription - NOW USING VERIFIED HandleRealtimeUpdate
  // The skip-during-flush is PROVEN correct by the Dafny theorem
  // ============================================================================

  useEffect(() => {
    if (!projectId || !isSupabaseConfigured()) return

    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          // Use VERIFIED HandleRealtimeUpdate from Dafny
          // This automatically skips updates when mode == Flushing
          // The theorem FlushWithRealtimeEventsEquivalent proves this is safe
          setClientState(prev => {
            if (!prev) return prev

            const newClient = App.HandleRealtimeUpdate(
              prev,
              payload.new.version,
              payload.new.state
            )

            // Log whether update was applied or skipped
            if (App.IsFlushing(prev)) {
              console.log('Realtime update skipped (flushing - VERIFIED):', payload.new.version)
            } else if (payload.new.version > App.GetBaseVersion(prev)) {
              console.log('Realtime update applied:', payload.new.version)
              setServerVersion(payload.new.version)
              if (!isOffline) {
                setStatus('synced')
              }
            }

            return newClient
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, isOffline])

  // ============================================================================
  // Derived state
  // ============================================================================

  const model = clientState ? App.GetPresent(clientState) : null
  const pendingCount = clientState ? App.GetPendingCount(clientState) : 0
  const pendingActions = clientState
    ? App.GetPendingActions(clientState).map(a => App.actionToJson(a))
    : []
  // isFlushing now comes from VERIFIED Dafny state
  const isFlushing = clientState ? App.IsFlushing(clientState) : false

  return {
    model,
    version: serverVersion,
    dispatch,
    sync,
    pendingCount,
    pendingActions,
    error,
    status,
    isOffline,
    toggleOffline,
    flush,
    isFlushing  // Now from verified Dafny ClientState.mode
  }
}
