// Shared types for Cloudflare Workers

// Base environment bindings - apps extend this
export type BaseEnv = {
  DB: D1Database
  REALTIME: DurableObjectNamespace
  JWT_SECRET: string
}

// Extended context with authenticated user info
export type AuthVariables = {
  userId: string
  userEmail: string
}

// Common user type
export type User = {
  id: string
  email: string
}

// Dispatch result from Dafny
export type DispatchResult = {
  status: 'accepted' | 'rejected' | 'conflict'
  version?: number
  state?: unknown
  error?: string
}
