// Backend abstraction interface
// Allows swapping between Supabase, Cloudflare, or other backends

export interface User {
  id: string
  email: string
}

export interface Group {
  id: string
  name: string
  displayName: string  // User's display name in this group
  state?: any  // Optional state for cross-group summary
}

export interface GroupState {
  state: any
  version: number
}

export interface GroupInfo {
  ownerId: string
  name: string
}

export interface Member {
  userId: string
  displayName: string
}

export interface Invite {
  id: string
  groupId: string
  email?: string
  groupName?: string
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
    signOut(): Promise<void>
    onAuthChange(callback: (user: User | null) => void): () => void
  }

  groups: {
    list(userId: string): Promise<Group[]>
    load(id: string): Promise<GroupState>
    getInfo(id: string): Promise<GroupInfo>
    create(name: string, displayName: string): Promise<string>
    delete(id: string): Promise<void>
  }

  members: {
    list(groupId: string): Promise<Member[]>
  }

  invites: {
    listForUser(email: string): Promise<Invite[]>
    listForGroup(groupId: string): Promise<Invite[]>
    create(groupId: string, email: string): Promise<void>
    accept(groupId: string, displayName: string): Promise<void>
    decline(inviteId: string): Promise<void>
    cancel(inviteId: string): Promise<void>
    getGroupName(groupId: string): Promise<string>
  }

  dispatch: {
    single(groupId: string, baseVersion: number, action: any): Promise<DispatchResult>
  }

  realtime: {
    subscribe(groupId: string, onUpdate: (version: number, state: any) => void): () => void
  }
}
