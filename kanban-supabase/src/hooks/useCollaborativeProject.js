// useCollaborativeProject: React hook for Dafny-verified collaborative projects
// Uses Supabase for persistence + realtime, Edge Function for dispatch

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabase.js'

/**
 * Hook for managing a collaborative project with Dafny-verified state
 *
 * @param {string|null} projectId - The project ID to load
 * @param {object} domain - Domain adapter with:
 *   - TryStep(model, action) -> { is_Ok, dtor_value? }
 *   - modelFromJson(json) -> model
 *   - modelToJson(model) -> json
 *   - actionToJson(action) -> json
 * @returns {object} - { model, version, dispatch, sync, pending, error, status }
 */
export function useCollaborativeProject(projectId, domain) {
  const [model, setModel] = useState(null)
  const [version, setVersion] = useState(0)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('syncing')

  // Track base version for dispatch
  const baseVersionRef = useRef(0)

  // Sync: load state from Supabase
  const sync = useCallback(async () => {
    if (!projectId || !isSupabaseConfigured()) return

    setStatus('syncing')
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('state, version')
        .eq('id', projectId)
        .single()

      if (fetchError) throw fetchError

      const newModel = domain.modelFromJson(data.state)
      setModel(newModel)
      setVersion(data.version)
      baseVersionRef.current = data.version
      setStatus('synced')
      setError(null)
    } catch (e) {
      console.error('Sync error:', e)
      setError(e.message)
      setStatus('error')
    }
  }, [projectId, domain])

  // Dispatch: optimistic update + Edge Function
  const dispatch = useCallback(async (action) => {
    if (!projectId || !model || !isSupabaseConfigured()) return

    // Optimistic local update
    const result = domain.TryStep(model, action)
    if (result.is_Ok && result.dtor_value) {
      setModel(result.dtor_value)
    }

    setPending(p => p + 1)
    setStatus('pending')

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Call Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispatch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            projectId,
            baseVersion: baseVersionRef.current,
            action: domain.actionToJson(action)
          })
        }
      )

      const data = await response.json()

      if (data.status === 'accepted') {
        const newModel = domain.modelFromJson(data.state)
        setModel(newModel)
        setVersion(data.version)
        baseVersionRef.current = data.version
        setStatus('synced')
        setError(null)
      } else if (data.status === 'conflict') {
        // Concurrent modification - resync
        console.warn('Conflict detected, resyncing...')
        await sync()
      } else if (data.status === 'rejected') {
        // Domain rejected - resync to get consistent state
        console.warn('Action rejected:', data.reason)
        setError(`Action rejected: ${data.reason || 'Unknown'}`)
        await sync()
      } else if (data.error) {
        throw new Error(data.error)
      }
    } catch (e) {
      console.error('Dispatch error:', e)
      setError(e.message)
      setStatus('error')
      // Resync to recover
      await sync()
    } finally {
      setPending(p => Math.max(0, p - 1))
    }
  }, [projectId, model, domain, sync])

  // Initial sync
  useEffect(() => {
    if (projectId) {
      sync()
    }
  }, [projectId, sync])

  // Realtime subscription for updates from other clients
  useEffect(() => {
    if (!projectId || !isSupabaseConfigured()) return

    const channel = supabase
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
          // Only update if this is a newer version (from another client)
          if (payload.new.version > baseVersionRef.current) {
            console.log('Realtime update:', payload.new.version)
            const newModel = domain.modelFromJson(payload.new.state)
            setModel(newModel)
            setVersion(payload.new.version)
            baseVersionRef.current = payload.new.version
            if (pending === 0) {
              setStatus('synced')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, domain, pending])

  return { model, version, dispatch, sync, pending, error, status }
}

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
      const { data, error: fetchError } = await supabase
        .from('project_members')
        .select('user_id, role, users:user_id(email)')
        .eq('project_id', projectId)

      if (fetchError) throw fetchError

      // Note: This assumes you have a profiles/users table or use auth.users
      // You may need to adjust based on your schema
      setMembers(data || [])
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
