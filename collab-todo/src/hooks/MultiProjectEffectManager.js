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

import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'

export class MultiProjectEffectManager {
  #state = null           // EffectState (Dafny datatype - multi-project)
  #projectIds = []        // Array of project IDs we're managing
  #listeners = new Set()  // For useSyncExternalStore
  #realtimeChannels = []  // One per project
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
          const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
            body: {
              projectId,
              baseVersion: baseVersions[projectId] || 0,
              action: actionJson.action // Unwrap from Single wrapper
            }
          })

          if (invokeError) throw invokeError

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
          const { data, error: invokeError } = await supabase.functions.invoke('multi-dispatch', {
            body: {
              action: actionJson,
              baseVersions
            }
          })

          if (invokeError) throw invokeError
          response = data
        }

        let event
        if (response.status === 'accepted') {
          event = App.EffectEvent.DispatchAccepted(response.versions, response.states)
          this.#setStatus('synced')
          this.#setError(null)
        } else if (response.status === 'conflict') {
          // Fetch fresh state for touched projects
          const { data: freshProjects } = await supabase
            .from('projects')
            .select('id, state, version')
            .in('id', touchedProjects)

          const freshVersions = {}
          const freshStates = {}
          for (const p of (freshProjects || [])) {
            freshVersions[p.id] = p.version
            freshStates[p.id] = p.state
          }
          event = App.EffectEvent.DispatchConflict(freshVersions, freshStates)
        } else if (response.status === 'rejected') {
          // Fetch fresh state for touched projects
          const { data: freshProjects } = await supabase
            .from('projects')
            .select('id, state, version')
            .in('id', touchedProjects)

          const freshVersions = {}
          const freshStates = {}
          for (const p of (freshProjects || [])) {
            freshVersions[p.id] = p.version
            freshStates[p.id] = p.state
          }
          event = App.EffectEvent.DispatchRejected(freshVersions, freshStates)
          this.#setError(`Action rejected: ${response.reason || 'Unknown'}`)
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
    if (!isSupabaseConfigured()) return
    if (this.#projectIds.length === 0) return

    this.#setStatus('syncing')
    try {
      // Load all projects
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, state, version')
        .in('id', this.#projectIds)

      if (error) throw error

      // Build versions and models maps
      const versions = {}
      const models = {}
      for (const p of projects) {
        versions[p.id] = p.version
        models[p.id] = p.state
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
    for (const channel of this.#realtimeChannels) {
      supabase.removeChannel(channel)
    }
    this.#realtimeChannels = []
    window.removeEventListener('online', this.#handleOnline)
    window.removeEventListener('offline', this.#handleOffline)
  }

  // Public: dispatch user action (single-project)
  dispatchSingle(projectId, action) {
    const multiAction = App.MultiAction.Single(projectId, action)
    const cmd = this.#transition(App.EffectEvent.UserAction(multiAction))
    if (cmd) this.#executeCommand(cmd)
  }

  // Public: dispatch user action (any MultiAction)
  dispatch(multiAction) {
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

  // Public: manual sync (reload all projects)
  async sync() {
    if (!isSupabaseConfigured()) return
    this.#setStatus('syncing')
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, state, version')
        .in('id', this.#projectIds)

      if (error) throw error

      const versions = {}
      const models = {}
      for (const p of projects) {
        versions[p.id] = p.version
        models[p.id] = p.state
      }

      this.#state = App.EffectInit(versions, models)
      this.#notify()
      this.#setStatus('synced')
      this.#setError(null)
    } catch (e) {
      this.#setError(e.message)
      this.#setStatus('error')
    }
  }

  // Public: add a project to manage
  async addProject(projectId) {
    if (this.#projectIds.includes(projectId)) return

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('id, state, version')
        .eq('id', projectId)
        .single()

      if (error) throw error

      this.#projectIds.push(projectId)

      if (this.#state) {
        // Add to existing state - reinitialize with new project
        const currentVersions = App.EffectState.getBaseVersions(this.#state)
        const currentModelsJson = App.EffectState.getMultiModelJson(this.#state)

        currentVersions[projectId] = project.version
        currentModelsJson.projects[projectId] = project.state

        this.#state = App.EffectInit(currentVersions, currentModelsJson.projects)
        this.#notify()
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
    const channel = supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`
      }, (payload) => {
        if (!this.#state) return
        if (!App.EffectState.isOnline(this.#state)) return

        const currentVersions = App.EffectState.getBaseVersions(this.#state)
        const serverVersion = currentVersions[projectId] || 0

        if (payload.new.version > serverVersion) {
          // VERIFIED: Use RealtimeUpdate event (preserves pending actions)
          this.#transition(App.EffectEvent.RealtimeUpdate(
            projectId,
            payload.new.version,
            payload.new.state
          ))
        }
      })
      .subscribe()

    this.#realtimeChannels.push(channel)
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
