// Backend configuration
// Switch between Supabase and Cloudflare based on VITE_BACKEND env var

import { createSupabaseBackend } from './supabase'
import { createCloudflareBackend } from './cloudflare'
import type { Backend } from './types'

export type { Backend, User, Project, ProjectState, Member, DispatchResult } from './types'

// Create the backend based on environment
const mode = import.meta.env.VITE_BACKEND || 'supabase'
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const backend: Backend = mode === 'cloudflare'
  ? createCloudflareBackend(apiUrl)
  : createSupabaseBackend()

// Helper to check if backend is configured
export const isBackendConfigured = (): boolean => backend.isConfigured

// Re-export auth helpers for convenience
export const signIn = backend.auth.signIn
export const signUp = backend.auth.signUp
export const signInWithGoogle = backend.auth.signInWithGoogle
export const signOut = backend.auth.signOut
export const getSession = backend.auth.getCurrentUser
export const getAccessToken = backend.auth.getAccessToken
