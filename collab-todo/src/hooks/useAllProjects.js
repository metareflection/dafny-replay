// useAllProjects: React hook for loading multiple projects and aggregating task data
// Used for "All Projects" view mode where smart lists show tasks across all projects

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import App from '../dafny/app.js'

/**
 * Hook for loading and managing multiple projects simultaneously
 *
 * @param {string[]} projectIds - Array of project IDs to load
 * @returns {object} - Aggregated project data and dispatch functions
 */
export function useAllProjects(projectIds) {
  const [projectData, setProjectData] = useState({}) // { [projectId]: { model, version } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const baseVersions = useRef({})

  // Load all projects
  const loadProjects = useCallback(async () => {
    if (!projectIds || projectIds.length === 0 || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('id, state, version')
        .in('id', projectIds)

      if (fetchError) throw fetchError

      const newData = {}
      for (const project of data || []) {
        const model = App.modelFromJson(project.state)
        newData[project.id] = { model, version: project.version }
        baseVersions.current[project.id] = project.version
      }

      setProjectData(newData)
    } catch (e) {
      console.error('Error loading projects:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [projectIds])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Subscribe to realtime updates for all projects
  useEffect(() => {
    if (!projectIds || projectIds.length === 0 || !isSupabaseConfigured()) return

    const channels = projectIds.map(projectId => {
      return supabase
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
            if (payload.new.version > (baseVersions.current[projectId] || 0)) {
              const model = App.modelFromJson(payload.new.state)
              setProjectData(prev => ({
                ...prev,
                [projectId]: { model, version: payload.new.version }
              }))
              baseVersions.current[projectId] = payload.new.version
            }
          }
        )
        .subscribe()
    })

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [projectIds])

  // Create dispatch function for a specific project
  const createDispatch = useCallback((projectId) => {
    return async (action) => {
      const currentData = projectData[projectId]
      if (!currentData || !currentData.model) return

      // Optimistic update
      const result = App.TryStep(currentData.model, action)
      if (result.is_Ok && result.dtor_value) {
        setProjectData(prev => ({
          ...prev,
          [projectId]: { ...prev[projectId], model: result.dtor_value }
        }))
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('dispatch', {
          body: {
            projectId,
            baseVersion: baseVersions.current[projectId] || 0,
            action: App.actionToJson(action)
          }
        })

        if (invokeError) throw invokeError

        if (data.status === 'accepted') {
          const newModel = App.modelFromJson(data.state)
          setProjectData(prev => ({
            ...prev,
            [projectId]: { model: newModel, version: data.version }
          }))
          baseVersions.current[projectId] = data.version
        } else if (data.status === 'conflict' || data.status === 'rejected') {
          // Resync this project
          const { data: refreshed } = await supabase
            .from('projects')
            .select('state, version')
            .eq('id', projectId)
            .single()

          if (refreshed) {
            const model = App.modelFromJson(refreshed.state)
            setProjectData(prev => ({
              ...prev,
              [projectId]: { model, version: refreshed.version }
            }))
            baseVersions.current[projectId] = refreshed.version
          }
        }
      } catch (e) {
        console.error('Dispatch error:', e)
        setError(e.message)
        // Resync on error
        loadProjects()
      }
    }
  }, [projectData, loadProjects])

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

  return {
    projectData,
    loading,
    error,
    refresh: loadProjects,
    createDispatch,
    aggregatedTasks,
    priorityTasks,
    logbookTasks,
    getProjectModel,
    getProjectLists,
    getListTaskCount
  }
}
