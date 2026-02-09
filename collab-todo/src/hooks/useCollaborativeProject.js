// useProjects: React hooks for project list and membership management
// Uses backend abstraction for persistence
//
// For multi-project state with offline support, use useAllProjects instead.

import { useEffect, useState, useCallback } from 'react'
import { backend, isBackendConfigured } from '../backend/index.ts'

/**
 * Hook for managing project list and membership
 * @param {string} userId - Current user ID (triggers re-fetch when changed)
 */
export function useProjects(userId) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    if (!isBackendConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Get current user
      const user = await backend.auth.getCurrentUser()
      if (!user) {
        setProjects([])
        return
      }

      // Get projects where user is a member
      const projectList = await backend.projects.list(user.id)

      // Map to expected format
      const formattedProjects = projectList.map(p => ({
        id: p.id,
        name: p.name,
        isOwner: p.role === 'owner',
        role: p.role
      }))

      setProjects(formattedProjects)
      setError(null)
    } catch (e) {
      console.error('Error fetching projects:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createProject = useCallback(async (name) => {
    if (!isBackendConfigured()) throw new Error('Backend not configured')

    const projectId = await backend.projects.create(name)

    // Refresh project list
    await fetchProjects()
    return projectId
  }, [fetchProjects])

  const renameProject = useCallback(async (projectId, newName) => {
    if (!isBackendConfigured()) throw new Error('Backend not configured')

    await backend.projects.rename(projectId, newName)

    // Refresh project list
    await fetchProjects()
  }, [fetchProjects])

  const deleteProject = useCallback(async (projectId) => {
    if (!isBackendConfigured()) throw new Error('Backend not configured')

    await backend.projects.delete(projectId)

    // Refresh project list
    await fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects, userId])

  return { projects, loading, error, refresh: fetchProjects, createProject, renameProject, deleteProject }
}

/**
 * Hook for managing project members
 */
export function useProjectMembers(projectId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMembers = useCallback(async () => {
    if (!projectId || !isBackendConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const memberList = await backend.members.list(projectId)

      // Map to expected format
      const formattedMembers = memberList.map(m => ({
        user_id: m.userId,
        role: m.role,
        email: m.email
      }))

      setMembers(formattedMembers)
      setError(null)
    } catch (e) {
      console.error('Error fetching members:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const inviteMember = useCallback(async (email) => {
    if (!projectId || !isBackendConfigured()) return

    const userId = await backend.members.add(projectId, email)
    await fetchMembers()
    return userId
  }, [projectId, fetchMembers])

  const removeMember = useCallback(async (userId) => {
    if (!projectId || !isBackendConfigured()) return

    await backend.members.remove(projectId, userId)
    await fetchMembers()
  }, [projectId, fetchMembers])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refresh: fetchMembers, inviteMember, removeMember }
}
