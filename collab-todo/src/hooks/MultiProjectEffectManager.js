// MultiProjectEffectManager: Verified effect orchestration for multi-project state
//
// Uses the COMPILED Dafny MultiProjectEffectStateMachine.Step for all state transitions.
// Supports BOTH single-project and cross-project operations.
//
// The verified Step function guarantees:
// - Correct dispatch/retry logic
// - Bounded retries (no infinite loops)
// - Proper preservation of pending actions across all projects
//
// This class only handles I/O (network calls, browser events).

import { backend, isBackendConfigured } from '../backend/index.ts'
import App from '../dafny/app-extras.ts'

export class MultiProjectEffectManager {
  #state = null           // EffectState (Dafny datatype - multi-project)
  #projectIds = []        // Array of project IDs we're managing
  #listeners = new Set()  // For useSyncExternalStore
  #realtimeUnsubscribers = []  // Cleanup functions for realtime subscriptions
  #statusCallback = null
  #errorCallback = null

  constructor(projectIds = []) {
    this.#projectIds = projectIds
  }

  // For useSyncExternalStore - must be stable references
  subscribe = (listener) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  getSnapshot = () => {
    return this.#state ? App.EffectState.getMultiModel(this.#state) : null
  }

  // Get model for a specific project
  getProjectModel = (projectId) => {
    if (!this.#state) return null
    const mm = App.EffectState.getMultiModel(this.#state)
    return App.MultiModel.getProject(mm, projectId)
  }

  // Get all project IDs from current state
  getProjectIds = () => {
    if (!this.#state) return []
    const mm = App.EffectState.getMultiModel(this.#state)
    return App.MultiModel.getProjectIds(mm)
  }

  // Get base versions map
  getBaseVersions = () => {
    return this.#state ? App.EffectState.getBaseVersions(this.#state) : {}
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
        const touchedProjects = App.EffectCommand.getTouchedProjects(command)
        const baseVersions = App.EffectCommand.getBaseVersions(command)
        const action = App.EffectCommand.getAction(command)
        const actionJson = App.MultiAction.toJson(action)

        // Determine endpoint based on action type
        const isSingleProject = App.MultiAction.isSingle(action) && touchedProjects.length === 1

        let response
        if (isSingleProject) {
          // Use single-project dispatch for efficiency
          const projectId = touchedProjects[0]
          const data = await backend.dispatch.single(
            projectId,
            baseVersions[projectId] || 0,
            actionJson.action // Unwrap from Single wrapper
          )

          // Convert single-project response to multi-project format
          if (data.status === 'accepted') {
            response = {
              status: 'accepted',
              changed: [projectId],
              versions: { [projectId]: data.version },
              states: { [projectId]: data.state }
            }
          } else {
            response = data
          }
        } else {
          // Use multi-dispatch for cross-project operations
          response = await backend.dispatch.multi(baseVersions, actionJson)
        }

        let event
        if (response.status === 'accepted') {
          event = App.EffectEvent.DispatchAccepted(response.versions, response.states)
          this.#setStatus('synced')
          this.#setError(null)
        } else if (response.status === 'conflict') {
          // Fetch fresh state for touched projects
          const freshVersions = {}
          const freshStates = {}
          for (const projectId of touchedProjects) {
            try {
              const { state, version } = await backend.projects.load(projectId)
              freshVersions[projectId] = version
              freshStates[projectId] = state
            } catch (e) {
              console.error(`Failed to load project ${projectId}:`, e)
            }
          }
          event = App.EffectEvent.DispatchConflict(freshVersions, freshStates)
        } else if (response.status === 'rejected') {
          // Fetch fresh state for touched projects
          const freshVersions = {}
          const freshStates = {}
          for (const projectId of touchedProjects) {
            try {
              const { state, version } = await backend.projects.load(projectId)
              freshVersions[projectId] = version
              freshStates[projectId] = state
            } catch (e) {
              console.error(`Failed to load project ${projectId}:`, e)
            }
          }
          event = App.EffectEvent.DispatchRejected(freshVersions, freshStates)
          this.#setError(`Action rejected: ${response.error || 'Unknown'}`)
        } else if (response.error) {
          throw new Error(response.error)
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
    if (!isBackendConfigured()) return
    if (this.#projectIds.length === 0) return

    this.#setStatus('syncing')
    try {
      // Load all projects
      const versions = {}
      const models = {}

      for (const projectId of this.#projectIds) {
        const { state, version } = await backend.projects.load(projectId)
        versions[projectId] = version
        models[projectId] = state
      }

      // Initialize via VERIFIED Init
      this.#state = App.EffectInit(versions, models)
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
    for (const unsubscribe of this.#realtimeUnsubscribers) {
      unsubscribe()
    }
    this.#realtimeUnsubscribers = []
    window.removeEventListener('online', this.#handleOnline)
    window.removeEventListener('offline', this.#handleOffline)
  }

  // Public: dispatch user action (single-project)
  dispatchSingle(projectId, action) {
    // DISABLED: Block all actions when offline (no queuing until conflict resolution is implemented)
    if (!this.isOnline) {
      console.warn('Cannot dispatch while offline')
      return
    }
    const multiAction = App.MultiAction.Single(projectId, action)
    const cmd = this.#transition(App.EffectEvent.UserAction(multiAction))
    if (cmd) this.#executeCommand(cmd)
  }

  // Public: dispatch user action (any MultiAction)
  dispatch(multiAction) {
    // DISABLED: Block all actions when offline (no queuing until conflict resolution is implemented)
    if (!this.isOnline) {
      console.warn('Cannot dispatch while offline')
      return
    }
    const cmd = this.#transition(App.EffectEvent.UserAction(multiAction))
    if (cmd) this.#executeCommand(cmd)
  }

  // Public: move task to another project
  moveTaskToProject(srcProject, dstProject, taskId, dstList, anchor = null) {
    const multiAction = App.MultiAction.MoveTaskTo(srcProject, dstProject, taskId, dstList, anchor)
    this.dispatch(multiAction)
  }

  // Public: copy task to another project
  copyTaskToProject(srcProject, dstProject, taskId, dstList) {
    const multiAction = App.MultiAction.CopyTaskTo(srcProject, dstProject, taskId, dstList)
    this.dispatch(multiAction)
  }

  // Public: move list to another project
  moveListToProject(srcProject, dstProject, listId) {
    const multiAction = App.MultiAction.MoveListTo(srcProject, dstProject, listId)
    this.dispatch(multiAction)
  }

  // Public: manual sync (reload all projects)
  // Uses RealtimeUpdate events to preserve pending actions
  async sync() {
    if (!isBackendConfigured()) return

    // Guard: Don't sync while dispatching - could cause state inconsistency
    if (this.#state && App.EffectState.isDispatching(this.#state)) {
      console.warn('Cannot sync while dispatching')
      return
    }

    this.#setStatus('syncing')
    try {
      if (!this.#state) {
        // Initial load - use EffectInit (no pending to preserve)
        const versions = {}
        const models = {}
        for (const projectId of this.#projectIds) {
          const { state, version } = await backend.projects.load(projectId)
          versions[projectId] = version
          models[projectId] = state
        }
        this.#state = App.EffectInit(versions, models)
      } else {
        // Existing state - use RealtimeUpdate events to preserve pending
        for (const projectId of this.#projectIds) {
          const { state, version } = await backend.projects.load(projectId)
          this.#transition(App.EffectEvent.RealtimeUpdate(projectId, version, state))
        }
      }

      this.#notify()
      this.#setStatus('synced')
      this.#setError(null)
    } catch (e) {
      this.#setError(e.message)
      this.#setStatus('error')
    }
  }

  // Public: add a project to manage
  // Uses RealtimeUpdate event to preserve pending actions
  async addProject(projectId) {
    if (this.#projectIds.includes(projectId)) return

    try {
      const { state, version } = await backend.projects.load(projectId)

      this.#projectIds.push(projectId)

      if (this.#state) {
        // Add to existing state using RealtimeUpdate (preserves pending)
        // MergeModels in Dafny will add the new project to the map
        this.#transition(App.EffectEvent.RealtimeUpdate(projectId, version, state))
      }

      // Subscribe to realtime for new project
      this.#subscribeToProject(projectId)
    } catch (e) {
      console.error('Error adding project:', e)
      this.#setError(e.message)
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
    for (const projectId of this.#projectIds) {
      this.#subscribeToProject(projectId)
    }
  }

  #subscribeToProject(projectId) {
    const unsubscribe = backend.realtime.subscribe(projectId, (version, state) => {
      if (!this.#state) return
      if (!App.EffectState.isOnline(this.#state)) return

      const currentVersions = App.EffectState.getBaseVersions(this.#state)
      const serverVersion = currentVersions[projectId] || 0

      if (version > serverVersion) {
        // VERIFIED: Use RealtimeUpdate event (preserves pending actions)
        this.#transition(App.EffectEvent.RealtimeUpdate(projectId, version, state))
      }
    })

    this.#realtimeUnsubscribers.push(unsubscribe)
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
  get hasPending() { return this.#state ? App.EffectState.hasPending(this.#state) : false }
  get pendingCount() { return this.#state ? App.EffectState.getPendingCount(this.#state) : 0 }
}
