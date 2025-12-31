// useCollaborativeProjectOffline: React hook with VERIFIED offline support
// Uses Dafny ClientState for pending queue management
// Uses Supabase for persistence + realtime, Edge Function for verified dispatch

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app.js'

/**
 * Hook for managing a collaborative project with Dafny-verified state and offline support.
 *
 * Unlike useCollaborativeProject which only tracks a pending counter,
 * this hook uses Dafny's verified ClientState which maintains:
 * - baseVersion: Last synced server version
 * - model: Current local model (with pending actions applied optimistically)
 * - pending: Full queue of actions waiting to be sent to server
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
 *   - isOffline: Whether offline mode is active
 *   - toggleOffline(): Toggle offline mode (flushes on go-online)
 *   - flush(): Manually flush pending actions to server
 */
export function useCollaborativeProjectOffline(projectId) {
  // Client state is the Dafny-verified ClientState datatype
  const [clientState, setClientState] = useState(null)
  const [serverVersion, setServerVersion] = useState(0)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('syncing')
  const [isOffline, setIsOffline] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)

  // Ref to track if we're currently dispatching (to avoid race conditions)
  const dispatchingRef = useRef(false)

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
    if (!projectId || !clientState || !isSupabaseConfigured()) return

    // 1. Optimistic local update using VERIFIED ClientLocalDispatch
    //    This adds the action to the pending queue and applies it optimistically
    const newClientState = App.LocalDispatch(clientState, action)
    setClientState(newClientState)

    // If offline, just keep the optimistic update
    if (isOffline) {
      setStatus('offline')
      return
    }

    // Avoid concurrent dispatches
    if (dispatchingRef.current) {
      // Action is queued in pending, will be flushed later
      return
    }

    dispatchingRef.current = true
    setStatus('pending')

    try {
      // Get base version from the PREVIOUS client state (before local dispatch)
      const baseVersion = App.GetBaseVersion(clientState)

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
        // 3. Re-initialize client from server state
        //    This clears the pending queue for this action since it's now confirmed
        setServerVersion(data.version)
        const syncedClient = App.InitClient(data.version, data.state)
        setClientState(syncedClient)
        setStatus('synced')
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
      setError(e.message)
      setStatus('error')
      // Resync to recover
      await sync()
    } finally {
      dispatchingRef.current = false
    }
  }, [projectId, clientState, isOffline, sync])

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

    for (const action of pendingActions) {
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
        } else if (data.status === 'conflict') {
          // Concurrent modification - sync and retry remaining
          console.warn('Conflict during flush, resyncing...')
          await sync()
          break
        } else {
          // Action rejected
          rejectedCount++
          const actionJson = App.actionToJson(action)
          console.warn('Action rejected during flush:', actionJson)
        }
      } catch (e) {
        console.error('Flush error:', e)
        setError('Failed to flush action')
        break
      }
    }

    // Final sync to get clean state
    await sync()
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
          // Only update if this is a newer version (from another client)
          if (payload.new.version > serverVersion) {
            console.log('Realtime update:', payload.new.version)

            // Re-initialize client state from server
            // This clears pending queue - if user has pending actions,
            // they may need to be re-applied or warned about
            const newClient = App.InitClient(payload.new.version, payload.new.state)
            setClientState(newClient)
            setServerVersion(payload.new.version)

            if (!isOffline && App.GetPendingCount(newClient) === 0) {
              setStatus('synced')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, serverVersion, isOffline])

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
