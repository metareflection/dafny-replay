// EffectManager: Handles all side effects for collaborative state
//
// Watches ClientStateStore for pending actions and flushes them to server.
// Manages online/offline detection, realtime subscriptions, and error recovery.
// All state transitions are delegated to the store (which uses verified Dafny functions).

import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'

export class EffectManager {
  #store
  #projectId
  #isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  #isFlushing = false
  #unsubscribeStore = null
  #realtimeChannel = null
  #serverVersion = 0
  #statusCallback = null
  #errorCallback = null

  constructor(store, projectId) {
    this.#store = store
    this.#projectId = projectId
  }

  // Set callbacks for status/error updates (called by React hook)
  setCallbacks(statusCallback, errorCallback) {
    this.#statusCallback = statusCallback
    this.#errorCallback = errorCallback
  }

  #setStatus(status) {
    this.#statusCallback?.(status)
  }

  #setError(error) {
    this.#errorCallback?.(error)
  }

  async start() {
    if (!isSupabaseConfigured()) return

    // Initial sync
    await this.#sync()

    // Watch for pending actions
    this.#unsubscribeStore = this.#store.subscribe(() => {
      this.#maybeFlush()
    })

    // Realtime subscription
    this.#subscribeRealtime()

    // Online/offline detection
    window.addEventListener('online', this.#handleOnline)
    window.addEventListener('offline', this.#handleOffline)
  }

  stop() {
    this.#unsubscribeStore?.()
    if (this.#realtimeChannel) {
      supabase.removeChannel(this.#realtimeChannel)
    }
    window.removeEventListener('online', this.#handleOnline)
    window.removeEventListener('offline', this.#handleOffline)
  }

  async #sync() {
    this.#setStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('state, version')
        .eq('id', this.#projectId)
        .single()

      if (error) throw error

      this.#serverVersion = data.version
      this.#store.init(data.version, data.state)
      this.#setStatus('synced')
      this.#setError(null)
    } catch (e) {
      console.error('Sync error:', e)
      this.#setError(e.message)
      this.#setStatus('error')
    }
  }

  // Trigger sync from outside (e.g., manual refresh)
  async sync() {
    await this.#sync()
  }

  #maybeFlush() {
    if (this.#isFlushing || !this.#isOnline) return

    const state = this.#store.getSnapshot()
    if (!state || App.GetPendingCount(state) === 0) return

    this.#flush()
  }

  async #flush() {
    this.#isFlushing = true
    this.#setStatus('pending')

    try {
      let consecutiveConflicts = 0
      const maxConflictRetries = 5

      while (true) {
        const state = this.#store.getSnapshot()
        if (!state || App.GetPendingCount(state) === 0) {
          this.#setStatus('synced')
          break
        }

        const pending = App.GetPendingActions(state)
        const action = pending[0]
        const baseVersion = App.GetBaseVersion(state)

        const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
          body: {
            projectId: this.#projectId,
            baseVersion,
            action: App.actionToJson(action)
          }
        })

        if (invokeError) throw invokeError

        if (data.status === 'accepted') {
          this.#serverVersion = data.version
          this.#store.acceptReply(data.version, data.state)
          consecutiveConflicts = 0
          this.#setError(null)
        } else if (data.status === 'conflict') {
          consecutiveConflicts++
          if (consecutiveConflicts >= maxConflictRetries) {
            console.error('Max conflict retries exceeded')
            this.#setError('Too many conflicts, please try again')
            break
          }
          console.warn(`Conflict (attempt ${consecutiveConflicts}), resyncing...`)

          // Fetch fresh state
          const { data: fresh, error: fetchError } = await supabase
            .from('projects')
            .select('state, version')
            .eq('id', this.#projectId)
            .single()

          if (fetchError) throw fetchError

          this.#serverVersion = fresh.version
          this.#store.sync(fresh.version, fresh.state)
        } else if (data.status === 'rejected') {
          console.warn('Action rejected:', data.reason)
          this.#setError(`Action rejected: ${data.reason || 'Unknown'}`)
          // Sync to recover - this discards the rejected action
          await this.#sync()
          consecutiveConflicts = 0
        } else if (data.error) {
          throw new Error(data.error)
        }
      }
    } catch (e) {
      console.error('Flush error:', e)

      if (e.message?.includes('fetch') || e.message?.includes('network') || !navigator.onLine) {
        console.log('Network error, switching to offline mode')
        this.#isOnline = false
        this.#setStatus('offline')
        this.#setError(null)
      } else {
        this.#setError(e.message)
        this.#setStatus('error')
      }
    } finally {
      this.#isFlushing = false
    }
  }

  // Manual flush (e.g., when going back online)
  async flush() {
    if (!this.#isOnline) {
      this.#isOnline = true
    }
    await this.#flush()
  }

  #subscribeRealtime() {
    this.#realtimeChannel = supabase
      .channel(`project:${this.#projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${this.#projectId}`
      }, (payload) => {
        // Skip if flushing or offline
        if (this.#isFlushing || !this.#isOnline) return

        if (payload.new.version > this.#serverVersion) {
          console.log('Realtime update:', payload.new.version)
          this.#serverVersion = payload.new.version
          this.#store.realtimeUpdate(payload.new.version, payload.new.state)
        }
      })
      .subscribe()
  }

  #handleOnline = () => {
    console.log('Browser came online')
    this.#isOnline = true
    this.#maybeFlush()
  }

  #handleOffline = () => {
    console.log('Browser went offline')
    this.#isOnline = false
    this.#setStatus('offline')
  }

  // Toggle offline mode (for testing)
  toggleOffline() {
    if (this.#isOnline) {
      this.#isOnline = false
      this.#setStatus('offline')
    } else {
      this.#isOnline = true
      this.#maybeFlush()
    }
    return !this.#isOnline
  }

  get isOnline() {
    return this.#isOnline
  }

  get isFlushing() {
    return this.#isFlushing
  }

  get serverVersion() {
    return this.#serverVersion
  }
}
