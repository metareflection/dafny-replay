// Common helper functions for Cloudflare Workers
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import type { BaseEnv, AuthVariables } from './types'

// Validate SQL identifier to prevent SQL injection
// Only allows alphanumeric characters and underscores
const SQL_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function validateSqlIdentifier(value: string, name: string): void {
  if (!SQL_IDENTIFIER_REGEX.test(value)) {
    throw new Error(`Invalid SQL identifier for ${name}: ${value}`)
  }
}

// Standard CORS configuration for frontend access
export const corsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type']
})

// Check if user is a member of an entity (project/group)
export async function checkMembership(
  c: Context<{ Bindings: BaseEnv; Variables: AuthVariables }>,
  table: string,
  entityColumn: string,
  entityId: string
): Promise<{ role: string } | null> {
  validateSqlIdentifier(table, 'table')
  validateSqlIdentifier(entityColumn, 'entityColumn')
  const userId = c.get('userId')
  return c.env.DB.prepare(
    `SELECT role FROM ${table} WHERE ${entityColumn} = ? AND user_id = ?`
  ).bind(entityId, userId).first<{ role: string }>()
}

// Check if user is owner of an entity
export async function checkOwnership(
  c: Context<{ Bindings: BaseEnv; Variables: AuthVariables }>,
  table: string,
  entityId: string
): Promise<{ owner_id: string } | null> {
  validateSqlIdentifier(table, 'table')
  return c.env.DB.prepare(
    `SELECT owner_id FROM ${table} WHERE id = ?`
  ).bind(entityId).first<{ owner_id: string }>()
}

// Standard error responses
export function notFound(c: Context, message = 'Not found') {
  return c.json({ error: message }, 404)
}

export function forbidden(c: Context, message = 'Forbidden') {
  return c.json({ error: message }, 403)
}

export function badRequest(c: Context, message: string) {
  return c.json({ error: message }, 400)
}

// Configuration for realtime WebSocket route
export interface RealtimeRouteConfig {
  // URL param name (e.g., 'projectId' or 'groupId')
  paramName: string
  // Membership table name (e.g., 'project_members' or 'group_members')
  memberTable: string
  // Column name for entity ID (e.g., 'project_id' or 'group_id')
  entityColumn: string
  // Entity type for error messages (e.g., 'project' or 'group')
  entityType: string
}
