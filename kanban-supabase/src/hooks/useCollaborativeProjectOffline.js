// useCollaborativeProjectOffline: React hook with VERIFIED offline support
// Uses Dafny ClientState for pending queue management
// Uses Supabase for persistence + realtime, Edge Function for verified dispatch

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'

/**
 * Hook for managing a collaborative project with Dafny-verified state and offline support.
 *
 * Uses Dafny's verified ClientState which maintains:
 * - baseVersion: Last synced server version
 * - model: Current local model (with pending actions applied optimistically)
 * - pending: Full queue of actions waiting to be sent to server
 *
 * Offline support:
 * - Auto-detects offline state via navigator.onLine and browser events
 * - Automatically switches to offline mode on network errors
 * - Auto-flushes pending actions when network is restored
 * - Manual toggle also available for testing
 *
 * @param {string|null} projectId - The project ID to load
 * @returns {object} Hook result with:
 *   - model: Current Dafny Model (optimistic, includes pending)
 *   - version: Server version at last sync
 *   - dispatch(action): Queue action locally and send to server
 *   - sync(): Force re-sync with server
 *   - pendingCount: Number of pending actions
 *   - pendingActions: Array of pending actions (for debugging)
 *   - error: Error message or null
 *   - status: 'syncing' | 'synced' | 'pending' | 'offline' | 'flushing' | 'error'
 *   - isOffline: Whether offline mode is active (auto-detected or manual)
 *   - toggleOffline(): Manual toggle for offline mode (flushes on go-online)
 *   - flush(): Manually flush pending actions to server
 */
export function useCollaborativeProjectOffline(projectId) {
  // Client state is the Dafny-verified ClientState datatype
  const [clientState, setClientState] = useState(null)
  const [serverVersion, setServerVersion] = useState(0)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('syncing')
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [isFlushing, setIsFlushing] = useState(false)

  // Ref to track if we're currently dispatching (to avoid race conditions)
  const dispatchingRef = useRef(false)
  // Ref for flush function to avoid stale closures in event handlers
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

      // Initialize Dafny ClientState from server response
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
    if (!projectId || !isSupabaseConfigured()) return

    // 1. Optimistic local update using VERIFIED ClientLocalDispatch
    //    This adds the action to the pending queue and applies it optimistically
    //    IMPORTANT: Use functional update to avoid stale closure issues when
    //    multiple dispatches happen rapidly before React re-renders
    let baseVersion
    setClientState(currentState => {
      if (!currentState) return currentState
      baseVersion = App.GetBaseVersion(currentState)
      return App.LocalDispatch(currentState, action)
    })

    // If offline, just keep the optimistic update
    if (isOffline) {
      setStatus('offline')
      return
    }

    // Avoid concurrent dispatches - action is already queued in pending
    if (dispatchingRef.current) {
      return
    }

    dispatchingRef.current = true
    setStatus('pending')

    try {
      // baseVersion was captured in the functional update above

      // 2. Send to server via Edge Function (which uses VERIFIED Dispatch)
      const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
        body: {
          projectId,
          baseVersion,
          action: App.actionToJson(action)
        }
      })

      if (invokeError) {
        console.error('Invoke error:', invokeError)
        throw invokeError
      }

      if (data.status === 'accepted') {
        // 3. Use VERIFIED ClientAcceptReply to update client state
        //    This removes the dispatched action and preserves any actions
        //    that were added to pending while this dispatch was in progress
        setServerVersion(data.version)
        setClientState(currentState => {
          if (!currentState) {
            return App.InitClient(data.version, data.state)
          }
          return App.ClientAcceptReply(currentState, data.version, data.state)
        })
        setStatus(s => s === 'pending' ? 'synced' : s)
        setError(null)
      } else if (data.status === 'conflict') {
        // Concurrent modification - resync
        console.warn('Conflict detected, resyncing...')
        await sync()
      } else if (data.status === 'rejected') {
        // Domain rejected
        console.warn('Action rejected:', data.reason)
        setError(`Action rejected: ${data.reason || 'Unknown'}`)
        // Resync to recover consistent state
        await sync()
      } else if (data.error) {
        throw new Error(data.error)
      }
    } catch (e) {
      console.error('Dispatch error:', e)

      // Check if this is a network error - switch to offline mode
      if (e.message?.includes('fetch') || e.message?.includes('network') || !navigator.onLine) {
        console.log('Network error detected, switching to offline mode')
        setIsOffline(true)
        setStatus('offline')
        setError(null)
        // Action is already in pending queue from optimistic update
      } else {
        setError(e.message)
        setStatus('error')
        // Resync to recover
        await sync()
      }
    } finally {
      dispatchingRef.current = false
      // Check if there are remaining pending actions and continue flushing
      // Use functional update to get latest state
      setClientState(currentState => {
        if (currentState && App.GetPendingCount(currentState) > 0 && !isOffline) {
          // Schedule flush for remaining pending actions
          setTimeout(() => flushRef.current?.(), 0)
        }
        return currentState
      })
    }
  }, [projectId, isOffline, sync])

  // ============================================================================
  // Flush: Send all pending actions to server (for going back online)
  // ============================================================================

  const flush = useCallback(async () => {
    if (!clientState || !isSupabaseConfigured()) return

    const pendingActions = App.GetPendingActions(clientState)
    if (pendingActions.length === 0) {
      setStatus('synced')
      return
    }

    setIsFlushing(true)
    setStatus('flushing')

    let currentClient = clientState
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

        if (invokeError) {
          console.error('Flush invoke error:', invokeError)
          throw invokeError
        }

        if (data.status === 'accepted') {
          setServerVersion(data.version)
          // Update client to new server state with empty pending
          currentClient = App.InitClient(data.version, data.state)
          acceptedCount++
          consecutiveConflicts = 0
          actionIndex++
        } else if (data.status === 'conflict') {
          // Concurrent modification - fetch fresh state and retry same action
          consecutiveConflicts++
          if (consecutiveConflicts >= maxConflictRetries) {
            console.error('Max conflict retries exceeded, aborting flush')
            setError('Too many conflicts, please try again')
            break
          }
          console.warn(`Conflict during flush (attempt ${consecutiveConflicts}), fetching fresh state...`)

          // Fetch fresh state directly (don't use sync() which affects React state)
          const { data: freshProject, error: fetchError } = await supabase
            .from('projects')
            .select('state, version')
            .eq('id', projectId)
            .single()

          if (fetchError || !freshProject) {
            console.error('Failed to fetch fresh state:', fetchError)
            break
          }

          // Update currentClient with fresh state, then retry (don't increment actionIndex)
          currentClient = App.InitClient(freshProject.version, freshProject.state)
          setServerVersion(freshProject.version)
          // Loop continues with same actionIndex to retry
        } else {
          // Action rejected by domain - move on
          rejectedCount++
          const actionJson = App.actionToJson(action)
          console.warn('Action rejected during flush:', actionJson)
          consecutiveConflicts = 0
          actionIndex++
        }
      } catch (e) {
        console.error('Flush error:', e)
        // Network error during flush - go back to offline mode
        if (e.message?.includes('fetch') || e.message?.includes('network') || !navigator.onLine) {
          console.log('Network error during flush, staying offline')
          setIsOffline(true)
          setStatus('offline')
          setIsFlushing(false)
          return
        }
        setError('Failed to flush action')
        break
      }
    }

    // Final sync to get clean state
    try {
      await sync()
    } catch (e) {
      // If sync fails due to network, stay offline
      if (!navigator.onLine) {
        setIsOffline(true)
        setStatus('offline')
      }
    }
    setIsFlushing(false)

    if (rejectedCount > 0) {
      setError(`Flushed: ${acceptedCount} accepted, ${rejectedCount} rejected`)
    }
  }, [clientState, projectId, sync])

  // ============================================================================
  // Toggle offline mode
  // ============================================================================

  const toggleOffline = useCallback(async () => {
    if (isOffline) {
      // Going online - flush pending actions
      setIsOffline(false)
      await flush()
    } else {
      // Going offline
      setIsOffline(true)
      setStatus('offline')
    }
  }, [isOffline, flush])

  // Keep flushRef updated for use in event handlers
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
      // Use ref to get latest flush function
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
  // Realtime subscription for updates from other clients
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
          // Skip realtime updates while flushing or offline
          // - Flushing: we're handling our own actions, will sync at end
          // - Offline: user doesn't expect to see network updates
          if (isFlushing || isOffline) {
            console.log('Realtime update skipped (flushing/offline):', payload.new.version)
            return
          }

          // Only update if this is a newer version (from another client)
          if (payload.new.version > serverVersion) {
            console.log('Realtime update:', payload.new.version)

            // Use functional setState to get current clientState (avoids stale closure)
            setClientState(currentClientState => {
              if (!currentClientState) {
                return App.InitClient(payload.new.version, payload.new.state)
              }
              // Use VERIFIED HandleRealtimeUpdate - preserves pending actions automatically
              return App.HandleRealtimeUpdate(currentClientState, payload.new.version, payload.new.state)
            })
            setServerVersion(payload.new.version)

            // Check pending count after state update
            setClientState(current => {
              if (!isOffline && current && App.GetPendingCount(current) === 0) {
                setStatus('synced')
              }
              return current
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, serverVersion, isOffline, isFlushing])

  // ============================================================================
  // Derived state
  // ============================================================================

  const model = clientState ? App.GetPresent(clientState) : null
  const pendingCount = clientState ? App.GetPendingCount(clientState) : 0
  const pendingActions = clientState
    ? App.GetPendingActions(clientState).map(a => App.actionToJson(a))
    : []

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
    isFlushing
  }
}
