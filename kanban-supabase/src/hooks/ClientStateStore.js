// ClientStateStore: Thin wrapper around Dafny-verified ClientState
//
// All state transitions go through verified Dafny functions.
// This class just holds the state and notifies subscribers.
// No async, no effects, no React.

import App from '../dafny/app-extras.js'

export class ClientStateStore {
  #state = null
  #listeners = new Set()

  // Initialize from server response
  init(version, modelJson) {
    this.#state = App.InitClient(version, modelJson)
    this.#notify()
  }

  // Optimistic local dispatch - VERIFIED via App.LocalDispatch
  localDispatch(action) {
    if (!this.#state) return
    this.#state = App.LocalDispatch(this.#state, action)
    this.#notify()
  }

  // Handle accepted reply - VERIFIED via App.ClientAcceptReply
  // Removes dispatched action, preserves and re-applies remaining pending
  acceptReply(newVersion, newPresentJson) {
    if (!this.#state) return
    this.#state = App.ClientAcceptReply(this.#state, newVersion, newPresentJson)
    this.#notify()
  }

  // Handle realtime update from other clients - VERIFIED via App.HandleRealtimeUpdate
  // Preserves all pending actions and re-applies them
  realtimeUpdate(serverVersion, serverModelJson) {
    if (!this.#state) return
    this.#state = App.HandleRealtimeUpdate(this.#state, serverVersion, serverModelJson)
    this.#notify()
  }

  // Reset to server state (discard pending) - used for conflict/rejected recovery
  sync(version, modelJson) {
    this.#state = App.InitClient(version, modelJson)
    this.#notify()
  }

  // For useSyncExternalStore - must be stable reference
  subscribe = (listener) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  // For useSyncExternalStore - must be stable reference
  getSnapshot = () => this.#state

  #notify() {
    this.#listeners.forEach(l => l())
  }
}
