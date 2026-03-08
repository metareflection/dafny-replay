// Supabase backend implementation

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Backend, User, Project, ProjectState, Member, DispatchResult, MultiDispatchResult, Attachment } from './types'

export function createSupabaseBackend(): Backend {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const isConfigured = !!(
    supabaseUrl && supabaseAnonKey &&
    !supabaseUrl.includes('your-project')
  )

  const supabase: SupabaseClient | null = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

  return {
    isConfigured,

    auth: {
      getCurrentUser: async () => {
        if (!supabase) return null
        const { data: { user } } = await supabase.auth.getUser()
        return user ? { id: user.id, email: user.email! } : null
      },

      getAccessToken: async () => {
        if (!supabase) return null
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token ?? null
      },

      signIn: async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase not configured')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },

      signUp: async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase not configured')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin }
        })
        if (error) throw error
        if (data.user && !data.session) {
          throw new Error('Check your email for a confirmation link')
        }
      },

      signInWithGoogle: async () => {
        if (!supabase) throw new Error('Supabase not configured')
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        })
        if (error) throw error
      },

      signOut: async () => {
        if (!supabase) return
        await supabase.auth.signOut()
      },

      onAuthChange: (callback: (user: User | null) => void) => {
        if (!supabase) {
          setTimeout(() => callback(null), 0)
          return () => {}
        }

        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          callback(session?.user ? { id: session.user.id, email: session.user.email! } : null)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          callback(session?.user ? { id: session.user.id, email: session.user.email! } : null)
        })

        return () => subscription.unsubscribe()
      }
    },

    projects: {
      list: async (userId: string): Promise<Project[]> => {
        if (!supabase) return []

        const { data: memberships, error } = await supabase
          .from('project_members')
          .select('project_id, role, projects(id, name, owner_id)')
          .eq('user_id', userId)

        if (error) throw error

        return (memberships || []).map((m: any) => ({
          id: m.projects.id,
          name: m.projects.name,
          role: m.projects.owner_id === userId ? 'owner' : m.role
        }))
      },

      load: async (id: string): Promise<ProjectState> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase
          .from('projects')
          .select('state, version')
          .eq('id', id)
          .single()

        if (error) throw error
        return { state: data.state, version: data.version }
      },

      create: async (name: string): Promise<string> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase.rpc('create_project', {
          project_name: name
        })

        if (error) throw error
        return data
      },

      rename: async (id: string, name: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { error } = await supabase.rpc('rename_project', {
          p_project_id: id,
          p_new_name: name
        })

        if (error) throw error
      },

      delete: async (id: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { error } = await supabase.rpc('delete_project', {
          p_project_id: id
        })

        if (error) throw error
      }
    },

    members: {
      list: async (projectId: string): Promise<Member[]> => {
        if (!supabase) return []

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

        // Create user_id -> email map
        const emailMap: Record<string, string> = {}
        for (const p of (profilesData || [])) {
          emailMap[p.id] = p.email
        }

        return (membersData || []).map(m => ({
          userId: m.user_id,
          role: m.role,
          email: emailMap[m.user_id] || m.user_id.slice(0, 8) + '...'
        }))
      },

      add: async (projectId: string, email: string): Promise<string> => {
        if (!supabase) throw new Error('Supabase not configured')

        // Look up user by email
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

        return userData.id
      },

      remove: async (projectId: string, userId: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { error } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId)

        if (error) throw error
      }
    },

    dispatch: {
      single: async (projectId: string, baseVersion: number, action: any): Promise<DispatchResult> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase.functions.invoke('dispatch', {
          body: { projectId, baseVersion, action }
        })

        if (error) throw error
        return data
      },

      multi: async (baseVersions: Record<string, number>, action: any): Promise<MultiDispatchResult> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase.functions.invoke('multi-dispatch', {
          body: { action, baseVersions }
        })

        if (error) throw error
        return data
      }
    },

    realtime: {
      subscribe: (projectId: string, onUpdate: (version: number, state: any) => void) => {
        if (!supabase) return () => {}

        const channel = supabase
          .channel(`project:${projectId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${projectId}`
          }, (payload) => {
            onUpdate(payload.new.version, payload.new.state)
          })
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    },

    attachments: {
      list: async (projectId: string, taskId: number): Promise<Attachment[]> => {
        if (!supabase) return []

        const { data, error } = await supabase
          .from('task_attachments')
          .select('*')
          .eq('project_id', projectId)
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },

      uploadFile: async (projectId: string, taskId: number, file: File): Promise<Attachment> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // Upload to storage
        const filePath = `${projectId}/${taskId}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath)

        // Insert metadata
        const { data, error } = await supabase
          .from('task_attachments')
          .insert({
            project_id: projectId,
            task_id: taskId,
            type: 'file',
            name: file.name,
            url: publicUrl,
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error
        return data
      },

      addLink: async (projectId: string, taskId: number, name: string, url: string): Promise<Attachment> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('task_attachments')
          .insert({
            project_id: projectId,
            task_id: taskId,
            type: 'link',
            name,
            url,
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error
        return data
      },

      addMarkdown: async (projectId: string, taskId: number, name: string, content: string): Promise<Attachment> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('task_attachments')
          .insert({
            project_id: projectId,
            task_id: taskId,
            type: 'markdown',
            name,
            content,
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error
        return data
      },

      updateMarkdown: async (attachmentId: string, name: string, content: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { error } = await supabase
          .from('task_attachments')
          .update({ name, content })
          .eq('id', attachmentId)

        if (error) throw error
      },

      remove: async (attachmentId: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')

        // Get attachment to check if it has a file to delete from storage
        const { data: attachment, error: fetchError } = await supabase
          .from('task_attachments')
          .select('type, url')
          .eq('id', attachmentId)
          .single()

        if (fetchError) throw fetchError

        // Delete from storage if it's a file
        if (attachment.type === 'file' && attachment.url) {
          const urlObj = new URL(attachment.url)
          const storagePath = urlObj.pathname.split('/task-attachments/')[1]
          if (storagePath) {
            await supabase.storage
              .from('task-attachments')
              .remove([decodeURIComponent(storagePath)])
          }
        }

        const { error } = await supabase
          .from('task_attachments')
          .delete()
          .eq('id', attachmentId)

        if (error) throw error
      }
    }
  }
}
