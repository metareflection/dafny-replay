// useAllProjects: React hook for loading multiple projects and aggregating task data
// Used for "All Projects" view mode where smart lists show tasks across all projects
//
// Now backed by MultiProjectEffectManager for verified state transitions,
// offline support, and cross-project operations.

import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app-extras.js'
import { MultiProjectEffectManager } from './MultiProjectEffectManager.js'

/**
 * Hook for loading and managing multiple projects simultaneously
 * Uses MultiProjectEffectManager for verified state transitions.
 *
 * @param {string[]} projectIds - Array of project IDs to load
 * @returns {object} - Aggregated project data and dispatch functions
 */
export function useAllProjects(projectIds) {
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

  // Derive loading state from status
  const loading = status === 'syncing'

  // Build projectData from multiModel for backwards compatibility
  const projectData = useMemo(() => {
    if (!multiModel) return {}

    const data = {}
    const projectIdsList = App.MultiModel.getProjectIds(multiModel)
    const baseVersions = manager?.getBaseVersions() || {}

    for (const projectId of projectIdsList) {
      const model = App.MultiModel.getProject(multiModel, projectId)
      if (model) {
        data[projectId] = { model, version: baseVersions[projectId] || 0 }
      }
    }
    return data
  }, [multiModel, manager])

  // Create dispatch function for a specific project (single-project action)
  const createDispatch = useCallback((projectId) => {
    return (action) => {
      manager?.dispatchSingle(projectId, action)
    }
  }, [manager])

  // Dispatch any MultiAction (for cross-project operations)
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

  // Aggregate all tasks across projects
  const aggregatedTasks = useMemo(() => {
    const tasks = []

    for (const [projectId, data] of Object.entries(projectData)) {
      if (!data.model) continue

      const lists = App.GetLists(data.model)
      for (const listId of lists) {
        const taskIds = App.GetTasksInList(data.model, listId)
        for (const taskId of taskIds) {
          const task = App.GetTask(data.model, taskId)
          if (!task.deleted) {
            tasks.push({
              id: taskId,
              projectId,
              listId,
              listName: App.GetListName(data.model, listId),
              ...task
            })
          }
        }
      }
    }

    return tasks
  }, [projectData])

  // Filter helpers
  const priorityTasks = useMemo(() => {
    return aggregatedTasks.filter(t => t.starred && !t.completed)
  }, [aggregatedTasks])

  const logbookTasks = useMemo(() => {
    return aggregatedTasks.filter(t => t.completed)
  }, [aggregatedTasks])

  // Get project model by ID
  const getProjectModel = useCallback((projectId) => {
    return projectData[projectId]?.model || null
  }, [projectData])

  // Get lists for a project
  const getProjectLists = useCallback((projectId) => {
    const model = projectData[projectId]?.model
    if (!model) return []

    const listIds = App.GetLists(model)
    return listIds.map(id => ({
      id,
      name: App.GetListName(model, id)
    }))
  }, [projectData])

  // Count tasks in a list
  const getListTaskCount = useCallback((projectId, listId) => {
    const model = projectData[projectId]?.model
    if (!model) return 0

    const taskIds = App.GetTasksInList(model, listId)
    return taskIds.filter(id => {
      const task = App.GetTask(model, id)
      return !task.deleted && !task.completed
    }).length
  }, [projectData])

  // Sync / refresh
  const refresh = useCallback(() => manager?.sync(), [manager])

  // Offline support
  const toggleOffline = useCallback(() => manager?.toggleOffline() ?? false, [manager])

  return {
    // State
    projectData,
    multiModel,
    loading,
    error,
    status,

    // Single-project dispatch (backwards compatible)
    createDispatch,

    // Multi-project dispatch (new)
    dispatch,
    moveTaskToProject,
    copyTaskToProject,

    // Aggregations
    aggregatedTasks,
    priorityTasks,
    logbookTasks,

    // Helpers
    getProjectModel,
    getProjectLists,
    getListTaskCount,

    // Actions
    refresh,
    toggleOffline,

    // Manager status
    isOffline: manager ? !manager.isOnline : false,
    hasPending: manager?.hasPending ?? false,
    pendingCount: manager?.pendingCount ?? 0
  }
}
