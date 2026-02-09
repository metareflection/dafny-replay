// Supabase backend implementation

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Backend, User, Group, GroupState, GroupInfo, Member, Invite, DispatchResult } from './types'

export function createSupabaseBackend(): Backend {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const isConfigured = !!(
    supabaseUrl && supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseAnonKey.includes('your-anon-key')
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

    groups: {
      list: async (userId: string): Promise<Group[]> => {
        if (!supabase) return []

        const { data: memberData, error } = await supabase
          .from('group_members')
          .select('group_id, display_name')
          .eq('user_id', userId)

        if (error) throw error

        const groups = await Promise.all(
          (memberData || []).map(async (g) => {
            const { data: groupInfo } = await supabase
              .from('groups')
              .select('name, state')
              .eq('id', g.group_id)
              .single()
            return {
              id: g.group_id,
              name: groupInfo?.name || 'Expense Group',
              displayName: g.display_name,
              state: groupInfo?.state
            }
          })
        )

        return groups
      },

      load: async (id: string): Promise<GroupState> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase
          .from('groups')
          .select('state, version')
          .eq('id', id)
          .single()

        if (error) throw error
        return { state: data.state, version: data.version }
      },

      getInfo: async (id: string): Promise<GroupInfo> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase
          .from('groups')
          .select('owner_id, name')
          .eq('id', id)
          .single()

        if (error) throw error
        return { ownerId: data.owner_id, name: data.name }
      },

      create: async (name: string, displayName: string): Promise<string> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase.rpc('create_expense_group', {
          group_name: name || 'Expense Group',
          owner_display_name: displayName
        })

        if (error) throw error
        return data
      },

      delete: async (id: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')
        const { error } = await supabase.from('groups').delete().eq('id', id)
        if (error) throw error
      }
    },

    members: {
      list: async (groupId: string): Promise<Member[]> => {
        if (!supabase) return []

        const { data, error } = await supabase
          .from('group_members')
          .select('user_id, display_name')
          .eq('group_id', groupId)

        if (error) throw error
        return (data || []).map(m => ({
          userId: m.user_id,
          displayName: m.display_name
        }))
      }
    },

    invites: {
      listForUser: async (email: string): Promise<Invite[]> => {
        if (!supabase) return []

        const { data } = await supabase
          .from('group_invites')
          .select('id, group_id')
          .eq('email', email)

        const invites = await Promise.all(
          (data || []).map(async (inv) => {
            const { data: name } = await supabase.rpc('get_group_name', { p_group_id: inv.group_id })
            return {
              id: inv.id,
              groupId: inv.group_id,
              groupName: name
            }
          })
        )

        return invites
      },

      listForGroup: async (groupId: string): Promise<Invite[]> => {
        if (!supabase) return []

        const { data } = await supabase
          .from('group_invites')
          .select('id, email')
          .eq('group_id', groupId)

        return (data || []).map(inv => ({
          id: inv.id,
          groupId,
          email: inv.email
        }))
      },

      create: async (groupId: string, email: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { error } = await supabase.rpc('invite_to_group', {
          p_group_id: groupId,
          p_email: email
        })

        if (error) throw error
      },

      accept: async (groupId: string, displayName: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { error } = await supabase.rpc('join_group', {
          p_group_id: groupId,
          p_display_name: displayName
        })

        if (error) throw error
      },

      decline: async (inviteId: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')
        await supabase.from('group_invites').delete().eq('id', inviteId)
      },

      cancel: async (inviteId: string): Promise<void> => {
        if (!supabase) throw new Error('Supabase not configured')
        await supabase.from('group_invites').delete().eq('id', inviteId)
      },

      getGroupName: async (groupId: string): Promise<string> => {
        if (!supabase) return 'Expense Group'
        const { data } = await supabase.rpc('get_group_name', { p_group_id: groupId })
        return data || 'Expense Group'
      }
    },

    dispatch: {
      single: async (groupId: string, baseVersion: number, action: any): Promise<DispatchResult> => {
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase.functions.invoke('dispatch', {
          body: { groupId, baseVersion, action }
        })

        if (error) throw error
        return data
      }
    },

    realtime: {
      subscribe: (groupId: string, onUpdate: (version: number, state: any) => void) => {
        if (!supabase) return () => {}

        const channel = supabase
          .channel(`group:${groupId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'groups',
            filter: `id=eq.${groupId}`
          }, (payload) => {
            onUpdate(payload.new.version, payload.new.state)
          })
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }
  }
}
