// useAllProjects: React hook for loading multiple projects and aggregating task data
// Used for "All Projects" view mode where smart lists show tasks across all projects
//
// Now backed by MultiProjectEffectManager for verified state transitions,
// offline support, and cross-project operations.

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import { isSupabaseConfigured, supabase } from '../supabase.js'
import App from '../dafny/app-extras.ts'
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
  const [manager, setManager] = useState(null)
  const [projectMembers, setProjectMembers] = useState({}) // projectId -> member[]

  // Stable key for projectIds to detect changes
  const projectIdsKey = projectIds?.sort().join(',') || ''

  // Create/recreate manager in useEffect (proper React lifecycle)
  useEffect(() => {
    if (!isSupabaseConfigured() || !projectIds?.length) {
      setManager(null)
      return
    }

    const newManager = new MultiProjectEffectManager(projectIds)
    newManager.setCallbacks(setStatus, setError)
    newManager.start()
    setManager(newManager)

    return () => {
      newManager.stop()
    }
  }, [projectIdsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to multi-project state via useSyncExternalStore
  const multiModel = useSyncExternalStore(
    manager?.subscribe ?? (() => () => {}),
    manager?.getSnapshot ?? (() => null),
    manager?.getSnapshot ?? (() => null)
  )

  // Fetch members for all projects
  useEffect(() => {
    if (!projectIds?.length || !isSupabaseConfigured()) return

    const fetchAllMembers = async () => {
      try {
        // Batch fetch all members for all projects
        const { data: membersData, error: membersError } = await supabase
          .from('project_members')
          .select('project_id, user_id, role')
          .in('project_id', projectIds)

        if (membersError) throw membersError

        // Get unique user IDs
        const userIds = [...new Set((membersData || []).map(m => m.user_id))]

        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)

        if (profilesError) throw profilesError

        // Create user_id -> email map
        const emailMap = {}
        for (const p of (profilesData || [])) {
          emailMap[p.id] = p.email
        }

        // Group members by project
        const membersByProject = {}
        for (const m of (membersData || [])) {
          if (!membersByProject[m.project_id]) {
            membersByProject[m.project_id] = []
          }
          membersByProject[m.project_id].push({
            user_id: m.user_id,
            role: m.role,
            email: emailMap[m.user_id] || m.user_id.slice(0, 8) + '...'
          })
        }

        setProjectMembers(membersByProject)
      } catch (e) {
        console.error('Error fetching project members:', e)
      }
    }

    fetchAllMembers()
  }, [projectIds])

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

  const moveListToProject = useCallback((srcProject, dstProject, listId) => {
    manager?.moveListToProject(srcProject, dstProject, listId)
  }, [manager])

  // Helper to enrich a tagged task ID with full task data
  // Uses VERIFIED FindListForTask from Dafny
  const enrichTask = useCallback((tagged) => {
    const model = projectData[tagged.projectId]?.model
    if (!model) return null
    const task = App.GetTask(model, tagged.taskId)
    if (!task) return null
    // VERIFIED: Find which list contains this task using Dafny function
    const listId = App.FindListForTask(model, tagged.taskId)
    return {
      id: tagged.taskId,
      projectId: tagged.projectId,
      listId,
      listName: listId !== null ? App.GetListName(model, listId) : '',
      ...task
    }
  }, [projectData])

  // VERIFIED: Get priority tasks using Dafny function
  const priorityTasks = useMemo(() => {
    if (!multiModel) return []
    const tagged = App.MultiModel.getAllPriorityTasks(multiModel)
    return tagged.map(enrichTask).filter(t => t !== null)
  }, [multiModel, enrichTask])

  // VERIFIED: Get logbook tasks using Dafny function
  const logbookTasks = useMemo(() => {
    if (!multiModel) return []
    const tagged = App.MultiModel.getAllLogbookTasks(multiModel)
    return tagged.map(enrichTask).filter(t => t !== null)
  }, [multiModel, enrichTask])

  // VERIFIED: Get all visible (non-deleted, non-completed) tasks using Dafny function
  const allTasks = useMemo(() => {
    if (!multiModel) return []
    const tagged = App.MultiModel.getAllVisibleTasks(multiModel)
    return tagged.map(enrichTask).filter(t => t !== null && !t.completed)
  }, [multiModel, enrichTask])

  // VERIFIED: Get all deleted tasks across all projects (for Trash view)
  // Uses verified Dafny GetDeletedTaskIds function
  const trashTasks = useMemo(() => {
    if (!multiModel) return []
    const tasks = []
    const projectIdsList = App.MultiModel.getProjectIds(multiModel)

    for (const projectId of projectIdsList) {
      const model = App.MultiModel.getProject(multiModel, projectId)
      if (!model) continue

      // Use verified Dafny function to get deleted task IDs
      const deletedTaskIds = App.GetDeletedTaskIds(model)

      for (const taskId of deletedTaskIds) {
        const task = App.GetTask(model, taskId)
        if (task) {
          // Get original list from deletedFromList field
          const listId = task.deletedFromList
          const listName = listId !== null ? App.GetListName(model, listId) : ''
          // Check if original list still exists (needed for restore)
          const canRestore = listId !== null && listName !== ''
          tasks.push({
            id: taskId,
            projectId,
            listId,
            listName: canRestore ? listName : '(list deleted)',
            canRestore,
            ...task
          })
        }
      }
    }
    return tasks
  }, [multiModel])

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

  // Get members for a project (for assignee display)
  const getProjectMembers = useCallback((projectId) => {
    return projectMembers[projectId] || []
  }, [projectMembers])

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
    moveListToProject,

    // Smart lists (VERIFIED via Dafny)
    priorityTasks,
    logbookTasks,
    allTasks,
    trashTasks,

    // Helpers
    getProjectModel,
    getProjectLists,
    getListTaskCount,
    getProjectMembers,

    // Actions
    refresh,
    toggleOffline,

    // Manager status
    isOffline: manager ? !manager.isOnline : false,
    hasPending: manager?.hasPending ?? false,
    pendingCount: manager?.pendingCount ?? 0
  }
}
