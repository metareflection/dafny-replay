# Backend Abstraction Pattern

This codebase uses a backend abstraction layer that allows the same frontend code to work with different backend providers (Supabase, Cloudflare Workers, etc.).

> **Note:** The Cloudflare Worker infrastructure (auth, realtime, helpers) is shared via the `cloudflare/` package. Each app's worker imports from `@dafny-replay/cloudflare` and adds only app-specific routes and dispatch logic.

## Structure

Each app has a `src/backend/` directory:

```
src/backend/
├── types.ts        # Interface definitions
├── supabase.ts     # Supabase implementation
├── cloudflare.ts   # Cloudflare Workers implementation
└── index.ts        # Selects backend based on env vars
```

## Switching Backends

Set `VITE_BACKEND` environment variable:

```bash
# Use Supabase (default)
VITE_BACKEND=supabase

# Use Cloudflare Workers
VITE_BACKEND=cloudflare
VITE_API_URL=https://your-worker.workers.dev
```

## Provider Comparison

### What Changes Per Provider

| Component | Supabase | Cloudflare | Local-Only (future) |
|-----------|----------|------------|---------------------|
| **Database** | PostgreSQL + RLS | D1 (SQLite) | localStorage/IndexedDB |
| **Server Functions** | Edge Functions (Deno) | Workers (JS) | None (client-side) |
| **Realtime** | `postgres_changes` | Durable Objects (WebSocket) | BroadcastChannel |
| **Auth** | Supabase Auth (OAuth) | Simple JWT | None |
| **Access Control** | Database-level RLS | Application-level checks | N/A |

### What Stays the Same

- **Dafny-compiled dispatch logic** — pure JavaScript, portable
- **Effect state machine** — client-side state management
- **React components** — use backend abstraction, not provider-specific code
- **Domain model and proofs** — unchanged

## Core Interface

The `Backend` interface has these generic parts that are identical across all apps:

```ts
interface Backend {
  readonly isConfigured: boolean

  // Authentication - always the same
  auth: {
    getCurrentUser(): Promise<User | null>
    getAccessToken(): Promise<string | null>
    signIn(email: string, password: string): Promise<void>
    signUp(email: string, password: string): Promise<void>
    signOut(): Promise<void>
    onAuthChange(callback: (user: User | null) => void): () => void
  }

  // Dispatch - always the same shape
  dispatch: {
    single(entityId: string, baseVersion: number, action: any): Promise<DispatchResult>
  }

  // Realtime - always the same shape
  realtime: {
    subscribe(entityId: string, onUpdate: (version: number, state: any) => void): () => void
  }
}

interface User {
  id: string
  email: string
}

interface DispatchResult {
  status: 'accepted' | 'rejected' | 'conflict'
  version?: number
  state?: any
  error?: string
}
```

## Domain-Specific Parts

Each app adds its own entity types. The pattern is the same, just different names:

| clear-split | collab-todo | Shape |
|-------------|-------------|-------|
| `groups.*` | `projects.*` | `list`, `load`, `create`, `delete` |
| `members.*` | `members.*` | `list`, `add`, `remove` |
| `invites.*` | — | App-specific invite flow |

Example for a "projects" app:

```ts
interface Backend {
  // ... generic parts above ...

  projects: {
    list(userId: string): Promise<Project[]>
    load(id: string): Promise<{ state: any, version: number }>
    create(name: string): Promise<string>
    rename(id: string, name: string): Promise<void>
    delete(id: string): Promise<void>
  }

  members: {
    list(projectId: string): Promise<Member[]>
    add(projectId: string, email: string): Promise<void>
    remove(projectId: string, userId: string): Promise<void>
  }
}
```

## Implementation Examples

### Supabase Backend

```ts
// supabase.ts
export function createSupabaseBackend(): Backend {
  const supabase = createClient(url, key)

  return {
    auth: {
      getCurrentUser: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        return user ? { id: user.id, email: user.email } : null
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      // ...
    },

    projects: {
      list: async (userId) => {
        const { data } = await supabase
          .from('project_members')
          .select('project_id, role, projects(id, name)')
          .eq('user_id', userId)
        return data.map(...)
      },
      load: async (id) => {
        const { data } = await supabase
          .from('projects')
          .select('state, version')
          .eq('id', id)
          .single()
        return { state: data.state, version: data.version }
      },
      // ...
    },

    dispatch: {
      single: async (projectId, baseVersion, action) => {
        const { data } = await supabase.functions.invoke('dispatch', {
          body: { projectId, baseVersion, action }
        })
        return data
      }
    },

    realtime: {
      subscribe: (projectId, onUpdate) => {
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

        return () => supabase.removeChannel(channel)
      }
    }
  }
}
```

### Cloudflare Backend

```ts
// cloudflare.ts
export function createCloudflareBackend(apiUrl: string): Backend {
  const api = async (path, options) => {
    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${getToken()}`, ...options?.headers }
    })
    return res.json()
  }

  return {
    auth: {
      getCurrentUser: async () => api('/auth/me'),
      signIn: async (email, password) => {
        const { token, user } = await api('/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        setToken(token)
      },
      // ...
    },

    projects: {
      list: async () => api('/projects'),
      load: async (id) => api(`/projects/${id}`),
      create: async (name) => {
        const { id } = await api('/projects', {
          method: 'POST',
          body: JSON.stringify({ name })
        })
        return id
      },
      // ...
    },

    dispatch: {
      single: async (projectId, baseVersion, action) => {
        return api('/dispatch', {
          method: 'POST',
          body: JSON.stringify({ projectId, baseVersion, action })
        })
      }
    },

    realtime: {
      subscribe: (projectId, onUpdate) => {
        const ws = new WebSocket(`${apiUrl.replace('http', 'ws')}/realtime/${projectId}`)
        ws.onmessage = (e) => {
          const { version, state } = JSON.parse(e.data)
          onUpdate(version, state)
        }
        return () => ws.close()
      }
    }
  }
}
```

## Usage in React Hooks

Frontend code imports from `backend/index.ts` and is agnostic to which implementation is used:

```ts
import { backend, isBackendConfigured } from '../backend/index.ts'

// In hooks
const user = await backend.auth.getCurrentUser()
const projects = await backend.projects.list(user.id)
const result = await backend.dispatch.single(projectId, version, action)

// Realtime subscription
useEffect(() => {
  return backend.realtime.subscribe(projectId, (version, state) => {
    // Handle update
  })
}, [projectId])
```

## Adding a New Backend

1. Create `src/backend/newbackend.ts` implementing the `Backend` interface
2. Update `src/backend/index.ts` to support the new option:

```ts
const mode = import.meta.env.VITE_BACKEND || 'supabase'

export const backend: Backend =
  mode === 'cloudflare' ? createCloudflareBackend(apiUrl) :
  mode === 'newbackend' ? createNewBackend(...) :
  createSupabaseBackend()
```
