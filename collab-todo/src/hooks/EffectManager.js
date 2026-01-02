// EffectManager: Verified effect orchestration for collaborative state (single project)
//
// Uses the MultiProjectEffectManager internally, wrapping single-project
// operations into multi-project format for the verified state machine.
//
// The verified Step function guarantees:
// - Correct dispatch/retry logic
// - Bounded retries (no infinite loops)
// - Proper preservation of pending actions
//
// This class only handles I/O (network calls, browser events).

import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'

export class EffectManager {
  #state = null           // EffectState (Dafny datatype - multi-project internally)
  #projectId
  #listeners = new Set()  // For useSyncExternalStore
  #realtimeChannel = null
  #statusCallback = null
  #errorCallback = null

  constructor(projectId) {
    this.#projectId = projectId
  }

  // For useSyncExternalStore - must be stable references
  // Returns single-project ClientState for backwards compatibility
  subscribe = (listener) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  getSnapshot = () => {
    if (!this.#state) return null
    // Return a client-state-like object for backwards compatibility
    const mm = App.EffectState.getMultiModel(this.#state)
    const model = App.MultiModel.getProject(mm, this.#projectId)
    const pending = App.EffectState.getPending(this.#state)
    return { present: model, pending }
  }

  #notify() {
    this.#listeners.forEach(l => l())
  }

  // Set callbacks for status/error (UI concerns, not in Dafny state)
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

  // Transition via VERIFIED Step function
  #transition(event) {
    if (!this.#state) return null
    const [newState, command] = App.EffectStep(this.#state, event)
    this.#state = newState
    this.#notify()
    return command
  }

  // Execute command returned by Step (I/O only)
  async #executeCommand(command) {
    if (App.EffectCommand.isNoOp(command)) return

    if (App.EffectCommand.isSendDispatch(command)) {
      this.#setStatus('pending')

      try {
        const baseVersions = App.EffectCommand.getBaseVersions(command)
        const action = App.EffectCommand.getAction(command)
        // Unwrap the MultiAction.Single to get the inner action
        const actionJson = App.MultiAction.toJson(action)
        const innerAction = actionJson.action // The single-project action

        const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
          body: {
            projectId: this.#projectId,
            baseVersion: baseVersions[this.#projectId] || 0,
            action: innerAction
          }
        })

        if (invokeError) throw invokeError

        let event
        if (data.status === 'accepted') {
          // Wrap response in multi-project format
          event = App.EffectEvent.DispatchAccepted(
            { [this.#projectId]: data.version },
            { [this.#projectId]: data.state }
          )
          this.#setStatus('synced')
          this.#setError(null)
        } else if (data.status === 'conflict') {
          const { data: fresh } = await supabase
            .from('projects').select('state, version')
            .eq('id', this.#projectId).single()
          event = App.EffectEvent.DispatchConflict(
            { [this.#projectId]: fresh.version },
            { [this.#projectId]: fresh.state }
          )
        } else if (data.status === 'rejected') {
          const { data: fresh } = await supabase
            .from('projects').select('state, version')
            .eq('id', this.#projectId).single()
          event = App.EffectEvent.DispatchRejected(
            { [this.#projectId]: fresh.version },
            { [this.#projectId]: fresh.state }
          )
          this.#setError(`Action rejected: ${data.reason || 'Unknown'}`)
        } else if (data.error) {
          throw new Error(data.error)
        }

        // Transition and execute next command
        if (event) {
          const nextCmd = this.#transition(event)
          if (nextCmd) await this.#executeCommand(nextCmd)
        }
      } catch (e) {
        console.error('Dispatch error:', e)
        if (e.message?.includes('fetch') || e.message?.includes('network') || !navigator.onLine) {
          this.#transition(App.EffectEvent.NetworkError())
          this.#setStatus('offline')
          this.#setError(null)
        } else {
          this.#setError(e.message)
          this.#setStatus('error')
        }
      }
    }
  }

  async start() {
    if (!isSupabaseConfigured()) return

    this.#setStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('projects').select('state, version')
        .eq('id', this.#projectId).single()

      if (error) throw error

      // Initialize via VERIFIED Init - wrap in multi-project format
      this.#state = App.EffectInit(
        { [this.#projectId]: data.version },
        { [this.#projectId]: data.state }
      )
      this.#notify()
      this.#setStatus('synced')
      this.#setError(null)

      this.#subscribeRealtime()
      window.addEventListener('online', this.#handleOnline)
      window.addEventListener('offline', this.#handleOffline)
    } catch (e) {
      console.error('Sync error:', e)
      this.#setError(e.message)
      this.#setStatus('error')
    }
  }

  stop() {
    if (this.#realtimeChannel) supabase.removeChannel(this.#realtimeChannel)
    window.removeEventListener('online', this.#handleOnline)
    window.removeEventListener('offline', this.#handleOffline)
  }

  // Public: dispatch user action (wraps in MultiAction.Single)
  dispatch(action) {
    const event = App.EffectEvent.SingleUserAction(this.#projectId, action)
    const cmd = this.#transition(event)
    if (cmd) this.#executeCommand(cmd)
  }

  // Public: manual sync
  async sync() {
    if (!isSupabaseConfigured()) return
    this.#setStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('projects').select('state, version')
        .eq('id', this.#projectId).single()
      if (error) throw error
      this.#state = App.EffectInit(
        { [this.#projectId]: data.version },
        { [this.#projectId]: data.state }
      )
      this.#notify()
      this.#setStatus('synced')
      this.#setError(null)
    } catch (e) {
      this.#setError(e.message)
      this.#setStatus('error')
    }
  }

  // Public: toggle offline
  toggleOffline() {
    if (App.EffectState.isOnline(this.#state)) {
      this.#transition(App.EffectEvent.ManualGoOffline())
      this.#setStatus('offline')
      return true
    } else {
      const cmd = this.#transition(App.EffectEvent.ManualGoOnline())
      if (cmd) this.#executeCommand(cmd)
      return false
    }
  }

  #subscribeRealtime() {
    this.#realtimeChannel = supabase
      .channel(`project:${this.#projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'projects',
        filter: `id=eq.${this.#projectId}`
      }, (payload) => {
        if (!this.#state) return
        if (!App.EffectState.isOnline(this.#state)) return
        if (App.EffectState.isDispatching(this.#state)) return

        const baseVersions = App.EffectState.getBaseVersions(this.#state)
        const currentVersion = baseVersions[this.#projectId] || 0

        if (payload.new.version > currentVersion) {
          // Reinit with new version in multi-project format
          this.#state = App.EffectInit(
            { [this.#projectId]: payload.new.version },
            { [this.#projectId]: payload.new.state }
          )
          this.#notify()
        }
      })
      .subscribe()
  }

  #handleOnline = () => {
    const cmd = this.#transition(App.EffectEvent.NetworkRestored())
    if (cmd) this.#executeCommand(cmd)
  }

  #handleOffline = () => {
    this.#transition(App.EffectEvent.NetworkError())
    this.#setStatus('offline')
  }

  // Accessors
  get isOnline() { return this.#state ? App.EffectState.isOnline(this.#state) : true }
  get isDispatching() { return this.#state ? App.EffectState.isDispatching(this.#state) : false }
  get serverVersion() {
    if (!this.#state) return 0
    const baseVersions = App.EffectState.getBaseVersions(this.#state)
    return baseVersions[this.#projectId] || 0
  }
}
