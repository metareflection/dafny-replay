// Cloudflare Workers + D1 + Durable Objects backend implementation

import type { Backend, User, Group, GroupState, GroupInfo, Member, Invite, DispatchResult } from './types'

export function createCloudflareBackend(apiUrl: string): Backend {
  let currentUser: User | null = null
  let authListeners: Array<(user: User | null) => void> = []

  const getToken = (): string | null => localStorage.getItem('auth_token')

  const setToken = (token: string | null) => {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  const authHeaders = (): HeadersInit => {
    const token = getToken()
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json'
    }
  }

  const api = async <T = any>(path: string, options?: RequestInit): Promise<T> => {
    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...options?.headers }
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(error || `HTTP ${res.status}`)
    }

    return res.json()
  }

  const notifyAuthChange = (user: User | null) => {
    currentUser = user
    authListeners.forEach(cb => cb(user))
  }

  return {
    isConfigured: !!apiUrl,

    auth: {
      getCurrentUser: async () => currentUser,

      getAccessToken: async () => getToken(),

      signIn: async (email: string, password: string) => {
        const { token, user } = await api<{ token: string; user: User }>('/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        setToken(token)
        notifyAuthChange(user)
      },

      signUp: async (email: string, password: string) => {
        const { token, user } = await api<{ token: string; user: User }>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        setToken(token)
        notifyAuthChange(user)
      },

      signOut: async () => {
        setToken(null)
        notifyAuthChange(null)
      },

      onAuthChange: (callback: (user: User | null) => void) => {
        authListeners.push(callback)

        // Check existing session on mount - only notify the registering callback
        const token = getToken()
        if (token) {
          api<User>('/auth/me')
            .then(user => {
              currentUser = user
              callback(user)
            })
            .catch(() => {
              setToken(null)
              currentUser = null
              callback(null)
            })
        } else {
          setTimeout(() => callback(null), 0)
        }

        return () => {
          authListeners = authListeners.filter(cb => cb !== callback)
        }
      }
    },

    groups: {
      list: async (_userId: string): Promise<Group[]> => {
        return api<Group[]>('/groups')
      },

      load: async (id: string): Promise<GroupState> => {
        return api<GroupState>(`/groups/${id}`)
      },

      getInfo: async (id: string): Promise<GroupInfo> => {
        return api<GroupInfo>(`/groups/${id}/info`)
      },

      create: async (name: string, displayName: string): Promise<string> => {
        const { id } = await api<{ id: string }>('/groups', {
          method: 'POST',
          body: JSON.stringify({ name, displayName })
        })
        return id
      },

      delete: async (id: string): Promise<void> => {
        await api(`/groups/${id}`, { method: 'DELETE' })
      }
    },

    members: {
      list: async (groupId: string): Promise<Member[]> => {
        return api<Member[]>(`/groups/${groupId}/members`)
      }
    },

    invites: {
      listForUser: async (_email: string): Promise<Invite[]> => {
        return api<Invite[]>('/invites')
      },

      listForGroup: async (groupId: string): Promise<Invite[]> => {
        return api<Invite[]>(`/groups/${groupId}/invites`)
      },

      create: async (groupId: string, email: string): Promise<void> => {
        await api(`/groups/${groupId}/invites`, {
          method: 'POST',
          body: JSON.stringify({ email })
        })
      },

      accept: async (groupId: string, displayName: string): Promise<void> => {
        await api(`/invites/${groupId}/accept`, {
          method: 'POST',
          body: JSON.stringify({ displayName })
        })
      },

      decline: async (inviteId: string): Promise<void> => {
        await api(`/invites/${inviteId}`, { method: 'DELETE' })
      },

      cancel: async (inviteId: string): Promise<void> => {
        await api(`/invites/${inviteId}`, { method: 'DELETE' })
      },

      getGroupName: async (groupId: string): Promise<string> => {
        const { name } = await api<{ name: string }>(`/groups/${groupId}/name`)
        return name
      }
    },

    dispatch: {
      single: async (groupId: string, baseVersion: number, action: any): Promise<DispatchResult> => {
        return api<DispatchResult>('/dispatch', {
          method: 'POST',
          body: JSON.stringify({ groupId, baseVersion, action })
        })
      }
    },

    realtime: {
      subscribe: (groupId: string, onUpdate: (version: number, state: any) => void) => {
        const token = getToken()
        const wsUrl = apiUrl.replace(/^http/, 'ws')
        const ws = new WebSocket(`${wsUrl}/realtime/${groupId}${token ? `?token=${token}` : ''}`)

        ws.onopen = () => {
          console.log(`[Realtime] Connected to group ${groupId}`)
        }

        ws.onmessage = (event) => {
          try {
            const { version, state } = JSON.parse(event.data)
            onUpdate(version, state)
          } catch (e) {
            console.error('[Realtime] Failed to parse message:', e)
          }
        }

        ws.onerror = (e) => {
          console.error('[Realtime] WebSocket error:', e)
        }

        ws.onclose = () => {
          console.log(`[Realtime] Disconnected from group ${groupId}`)
        }

        return () => {
          ws.close()
        }
      }
    }
  }
}
