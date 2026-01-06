// EffectManager: Verified effect orchestration for collaborative expense splitting
//
// Uses the COMPILED Dafny EffectStateMachine.Step for all state transitions.
// Exposes subscribe/getSnapshot for React's useSyncExternalStore.

import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.ts'

export class EffectManager {
  #state = null
  #groupId
  #listeners = new Set()
  #realtimeChannel = null
  #statusCallback = null
  #errorCallback = null

  constructor(groupId) {
    this.#groupId = groupId
  }

  subscribe = (listener) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  getSnapshot = () => {
    return this.#state ? App.EffectState.getClient(this.#state) : null
  }

  #notify() {
    this.#listeners.forEach(l => l())
  }

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

  #transition(event) {
    if (!this.#state) return null
    const [newState, command] = App.EffectStep(this.#state, event)
    this.#state = newState
    this.#notify()
    return command
  }

  async #executeCommand(command) {
    if (App.EffectCommand.isNoOp(command)) return

    if (App.EffectCommand.isSendDispatch(command)) {
      this.#setStatus('pending')

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
          body: {
            groupId: this.#groupId,
            baseVersion: App.EffectCommand.getBaseVersion(command),
            action: App.actionToJson(App.EffectCommand.getAction(command))
          }
        })

        if (invokeError) throw invokeError

        let event
        if (data.status === 'accepted') {
          event = App.EffectEvent.DispatchAccepted(data.version, data.state)
          this.#setStatus('synced')
          this.#setError(null)
        } else if (data.status === 'conflict') {
          const { data: fresh } = await supabase
            .from('groups').select('state, version')
            .eq('id', this.#groupId).single()
          event = App.EffectEvent.DispatchConflict(fresh.version, fresh.state)
        } else if (data.status === 'rejected') {
          const { data: fresh } = await supabase
            .from('groups').select('state, version')
            .eq('id', this.#groupId).single()
          event = App.EffectEvent.DispatchRejected(fresh.version, fresh.state)
          this.#setError(`Action rejected: ${data.reason || 'Unknown'}`)
        } else if (data.error) {
          throw new Error(data.error)
        }

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
        .from('groups').select('state, version')
        .eq('id', this.#groupId).single()

      if (error) throw error

      this.#state = App.EffectInit(data.version, data.state)
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

  dispatch(action) {
    const cmd = this.#transition(App.EffectEvent.UserAction(action))
    if (cmd) this.#executeCommand(cmd)
  }

  async sync() {
    if (!isSupabaseConfigured()) return
    this.#setStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('groups').select('state, version')
        .eq('id', this.#groupId).single()
      if (error) throw error
      this.#state = App.EffectInit(data.version, data.state)
      this.#notify()
      this.#setStatus('synced')
      this.#setError(null)
    } catch (e) {
      this.#setError(e.message)
      this.#setStatus('error')
    }
  }

  toggleOffline() {
    if (App.EffectState.isOnline(this.#state)) {
      this.#transition(App.EffectEvent.ManualGoOffline())
      this.#setStatus('offline')
      return true
    } else {
      const cmd = this.#transition(App.EffectEvent.ManualGoOnline())
      if (cmd && !App.EffectCommand.isNoOp(cmd)) {
        this.#executeCommand(cmd)
      } else {
        this.#setStatus('synced')
      }
      return false
    }
  }

  #subscribeRealtime() {
    this.#realtimeChannel = supabase
      .channel(`group:${this.#groupId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'groups',
        filter: `id=eq.${this.#groupId}`
      }, (payload) => {
        if (!this.#state) return
        if (!App.EffectState.isOnline(this.#state)) return
        if (App.EffectState.isDispatching(this.#state)) return

        if (payload.new.version > App.EffectState.getServerVersion(this.#state)) {
          this.#state = App.EffectInit(payload.new.version, payload.new.state)
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

  get isOnline() { return this.#state ? App.EffectState.isOnline(this.#state) : true }
  get isDispatching() { return this.#state ? App.EffectState.isDispatching(this.#state) : false }
  get serverVersion() { return this.#state ? App.EffectState.getServerVersion(this.#state) : 0 }
}
