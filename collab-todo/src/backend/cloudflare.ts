// Cloudflare Workers + D1 + Durable Objects backend implementation

import type { Backend, User, Project, ProjectState, Member, DispatchResult, MultiDispatchResult } from './types'

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
        const { token, user } = await api<{ token: string, user: User }>('/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        setToken(token)
        notifyAuthChange(user)
      },

      signUp: async (email: string, password: string) => {
        const { token, user } = await api<{ token: string, user: User }>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        setToken(token)
        notifyAuthChange(user)
      },

      signInWithGoogle: async () => {
        // Redirect to OAuth endpoint
        window.location.href = `${apiUrl}/auth/google`
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
          // Notify immediately if no token
          setTimeout(() => callback(null), 0)
        }

        return () => {
          authListeners = authListeners.filter(cb => cb !== callback)
        }
      }
    },

    projects: {
      list: async (_userId: string): Promise<Project[]> => {
        return api<Project[]>('/projects')
      },

      load: async (id: string): Promise<ProjectState> => {
        return api<ProjectState>(`/projects/${id}`)
      },

      create: async (name: string): Promise<string> => {
        const { id } = await api<{ id: string }>('/projects', {
          method: 'POST',
          body: JSON.stringify({ name })
        })
        return id
      },

      rename: async (id: string, name: string): Promise<void> => {
        await api(`/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name })
        })
      },

      delete: async (id: string): Promise<void> => {
        await api(`/projects/${id}`, { method: 'DELETE' })
      }
    },

    members: {
      list: async (projectId: string): Promise<Member[]> => {
        return api<Member[]>(`/projects/${projectId}/members`)
      },

      add: async (projectId: string, email: string): Promise<string> => {
        const { userId } = await api<{ userId: string }>(`/projects/${projectId}/members`, {
          method: 'POST',
          body: JSON.stringify({ email })
        })
        return userId
      },

      remove: async (projectId: string, userId: string): Promise<void> => {
        await api(`/projects/${projectId}/members/${userId}`, {
          method: 'DELETE'
        })
      }
    },

    dispatch: {
      single: async (projectId: string, baseVersion: number, action: any): Promise<DispatchResult> => {
        return api<DispatchResult>('/dispatch', {
          method: 'POST',
          body: JSON.stringify({ projectId, baseVersion, action })
        })
      },

      multi: async (baseVersions: Record<string, number>, action: any): Promise<MultiDispatchResult> => {
        return api<MultiDispatchResult>('/multi-dispatch', {
          method: 'POST',
          body: JSON.stringify({ baseVersions, action })
        })
      }
    },

    realtime: {
      subscribe: (projectId: string, onUpdate: (version: number, state: any) => void) => {
        const token = getToken()
        const wsUrl = apiUrl.replace(/^http/, 'ws')
        const ws = new WebSocket(`${wsUrl}/realtime/${projectId}${token ? `?token=${token}` : ''}`)

        ws.onopen = () => {
          console.log(`[Realtime] Connected to project ${projectId}`)
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
          console.log(`[Realtime] Disconnected from project ${projectId}`)
        }

        return () => {
          ws.close()
        }
      }
    }
  }
}
