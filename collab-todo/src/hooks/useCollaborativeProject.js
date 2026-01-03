// useProjects: React hooks for project list and membership management
// Uses Supabase for persistence
//
// For multi-project state with offline support, use useAllProjects instead.

import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../supabase.js'

/**
 * Hook for managing project list and membership
 */
export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProjects([])
        return
      }

      // Get projects where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, role, projects(id, name, owner_id)')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      const projectList = (memberships || []).map(m => ({
        id: m.projects.id,
        name: m.projects.name,
        isOwner: m.projects.owner_id === user.id,
        role: m.role
      }))

      setProjects(projectList)
      setError(null)
    } catch (e) {
      console.error('Error fetching projects:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createProject = useCallback(async (name) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

    // Use RPC to create project (handles membership automatically)
    const { data, error } = await supabase.rpc('create_project', {
      project_name: name
    })

    if (error) throw error

    // Refresh project list
    await fetchProjects()
    return data // Returns project ID
  }, [fetchProjects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

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
    if (!projectId || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId)

      if (membersError) throw membersError

      // Fetch profiles for these users
      const userIds = (membersData || []).map(m => m.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      if (profilesError) throw profilesError

      // Create a map of user_id -> email
      const emailMap = {}
      for (const p of (profilesData || [])) {
        emailMap[p.id] = p.email
      }

      // Combine members with emails
      const memberList = (membersData || []).map(m => ({
        user_id: m.user_id,
        role: m.role,
        email: emailMap[m.user_id] || m.user_id.slice(0, 8) + '...'
      }))
      setMembers(memberList)
      setError(null)
    } catch (e) {
      console.error('Error fetching members:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const inviteMember = useCallback(async (email) => {
    if (!projectId || !isSupabaseConfigured()) return

    // This is a simplified version - in production you'd want to:
    // 1. Look up user by email
    // 2. Handle invitations for users who don't exist yet
    // For now, we assume the user exists and we know their ID

    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (userError) throw new Error(`User not found: ${email}`)

    const { error: insertError } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userData.id, role: 'member' })

    if (insertError) throw insertError

    await fetchMembers()
  }, [projectId, fetchMembers])

  const removeMember = useCallback(async (userId) => {
    if (!projectId || !isSupabaseConfigured()) return

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (error) throw error

    await fetchMembers()
  }, [projectId, fetchMembers])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refresh: fetchMembers, inviteMember, removeMember }
}
