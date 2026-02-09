// Hooks for project list and membership management
// For collaborative project state, use useCollaborativeProjectOffline

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

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects, userId])

  return { projects, loading, error, refresh: fetchProjects, createProject }
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

    await backend.members.add(projectId, email)
    await fetchMembers()
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
