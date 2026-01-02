// useMultiProject: React hook for verified multi-project state management
//
// Uses MultiProjectEffectManager which is backed by the compiled Dafny
// MultiProjectEffectStateMachine. All state transitions go through the verified Step function.
//
// Supports both single-project and cross-project operations.

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react'
import { isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'
import { MultiProjectEffectManager } from './MultiProjectEffectManager.js'

/**
 * React hook for multi-project state management with verified transitions.
 *
 * @param {string[]} projectIds - Array of project IDs to manage
 * @returns {object} - Multi-project state and dispatch functions
 */
export function useMultiProject(projectIds) {
  const [status, setStatus] = useState('syncing')
  const [error, setError] = useState(null)
  const managerRef = useRef(null)
  const currentProjectIdsRef = useRef(null)

  // Create or recreate manager when projectIds change
  const projectIdsKey = projectIds?.sort().join(',') || ''
  if (isSupabaseConfigured() && currentProjectIdsRef.current !== projectIdsKey) {
    // Stop old manager if it exists
    if (managerRef.current) {
      managerRef.current.stop()
    }
    managerRef.current = projectIds?.length > 0 ? new MultiProjectEffectManager(projectIds) : null
    currentProjectIdsRef.current = projectIdsKey
  }

  const manager = managerRef.current

  // Subscribe to multi-project state via useSyncExternalStore
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

  // Get model for a specific project
  const getProjectModel = useCallback((projectId) => {
    if (!multiModel) return null
    return App.MultiModel.getProject(multiModel, projectId)
  }, [multiModel])

  // Dispatch single-project action
  const dispatchSingle = useCallback((projectId, action) => {
    manager?.dispatchSingle(projectId, action)
  }, [manager])

  // Dispatch any MultiAction
  const dispatch = useCallback((multiAction) => {
    manager?.dispatch(multiAction)
  }, [manager])

  // Cross-project operations
  const moveTaskToProject = useCallback((srcProject, dstProject, taskId, dstList, anchor = null) => {
    manager?.moveTaskToProject(srcProject, dstProject, taskId, dstList, anchor)
  }, [manager])

  const copyTaskToProject = useCallback((srcProject, dstProject, taskId, dstList) => {
    manager?.copyTaskToProject(srcProject, dstProject, taskId, dstList)
  }, [manager])

  // Add a project dynamically
  const addProject = useCallback(async (projectId) => {
    await manager?.addProject(projectId)
  }, [manager])

  // Sync / refresh all projects
  const sync = useCallback(() => manager?.sync(), [manager])

  // Offline support
  const toggleOffline = useCallback(() => manager?.toggleOffline() ?? false, [manager])

  return {
    // State
    multiModel,
    status,
    error,
    loading: status === 'syncing',

    // Project access
    getProjectModel,
    projectIds: multiModel ? App.MultiModel.getProjectIds(multiModel) : [],
    baseVersions: manager?.getBaseVersions() ?? {},

    // Dispatch
    dispatchSingle,
    dispatch,

    // Cross-project operations
    moveTaskToProject,
    copyTaskToProject,

    // Management
    addProject,
    sync,
    toggleOffline,

    // Status flags
    isOffline: manager ? !manager.isOnline : false,
    isDispatching: manager?.isDispatching ?? false,
    hasPending: manager?.hasPending ?? false,
    pendingCount: manager?.pendingCount ?? 0
  }
}
