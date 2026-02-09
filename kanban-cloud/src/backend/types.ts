// Backend abstraction interface
// Allows swapping between Supabase, Cloudflare, or other backends

export interface User {
  id: string
  email: string
}

export interface Project {
  id: string
  name: string
  role: 'owner' | 'member'
}

export interface ProjectState {
  state: any
  version: number
}

export interface Member {
  userId: string
  email: string
  role: 'owner' | 'member'
}

export interface DispatchResult {
  status: 'accepted' | 'rejected' | 'conflict'
  version?: number
  state?: any
  error?: string
  reason?: string
}

export interface Backend {
  readonly isConfigured: boolean

  auth: {
    getCurrentUser(): Promise<User | null>
    getAccessToken(): Promise<string | null>
    signIn(email: string, password: string): Promise<void>
    signUp(email: string, password: string): Promise<void>
    signInWithGoogle(): Promise<void>
    signOut(): Promise<void>
    onAuthChange(callback: (user: User | null) => void): () => void
  }

  projects: {
    list(userId: string): Promise<Project[]>
    load(id: string): Promise<ProjectState>
    create(name: string): Promise<string>
    rename(id: string, name: string): Promise<void>
    delete(id: string): Promise<void>
  }

  members: {
    list(projectId: string): Promise<Member[]>
    add(projectId: string, email: string): Promise<void>
    remove(projectId: string, userId: string): Promise<void>
  }

  dispatch: {
    single(projectId: string, baseVersion: number, action: any): Promise<DispatchResult>
  }

  realtime: {
    subscribe(projectId: string, onUpdate: (version: number, state: any) => void): () => void
  }
}
