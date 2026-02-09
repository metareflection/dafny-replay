// Backend configuration
// Switch between Supabase and Cloudflare based on VITE_BACKEND env var

import { createSupabaseBackend } from './supabase'
import { createCloudflareBackend } from './cloudflare'
import type { Backend } from './types'

export type { Backend, User, Group, GroupState, GroupInfo, Member, Invite, DispatchResult } from './types'

// Create the backend based on environment
const mode = import.meta.env.VITE_BACKEND || 'supabase'
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const backend: Backend = mode === 'cloudflare'
  ? createCloudflareBackend(apiUrl)
  : createSupabaseBackend()

// Helper to check if backend is configured
export const isBackendConfigured = (): boolean => backend.isConfigured
