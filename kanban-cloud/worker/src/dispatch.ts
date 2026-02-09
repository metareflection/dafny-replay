// Dispatch endpoint for verified Dafny state transitions (kanban)
// Uses compiled Dafny code for single-project dispatch

import { Hono } from 'hono'
import { broadcastUpdate } from '@dafny-replay/cloudflare'
import type { Env, Variables } from './index'

// Import from compiled Dafny bundle
import { dispatch } from './dafny-bundle'

export const dispatchRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// Single-Project Dispatch
dispatchRoutes.post('/dispatch', async (c) => {
  const userId = c.get('userId')
  const { projectId, baseVersion, action } = await c.req.json<{
    projectId: string
    baseVersion: number
    action: any
  }>()

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400)
  }

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).bind(projectId, userId).first()

  if (!member) {
    return c.json({ error: 'Not a member of this project' }, 403)
  }

  // Load current project state
  const project = await c.env.DB.prepare(
    'SELECT state, version, applied_log, audit_log FROM projects WHERE id = ?'
  ).bind(projectId).first<{
    state: string
    version: number
    applied_log: string
    audit_log: string
  }>()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  // Validate baseVersion
  if (baseVersion > project.version) {
    return c.json({ error: 'Invalid base version' }, 400)
  }

  // Parse stored JSON
  const state = JSON.parse(project.state)
  const appliedLog = JSON.parse(project.applied_log)
  const auditLog = JSON.parse(project.audit_log)

  // ========================================================================
  // Run VERIFIED Dafny Dispatch
  // ========================================================================

  let result
  try {
    result = dispatch(state, appliedLog, baseVersion, action, auditLog)
  } catch (e) {
    console.error('Dispatch call failed:', e)
    return c.json({
      error: 'Dispatch failed',
      details: String(e)
    }, 500)
  }

  if (result.status === 'rejected') {
    return c.json({
      status: 'rejected',
      reason: result.reason || 'Action rejected'
    })
  }

  // Persist new state with optimistic lock
  const newVersion = result.newVersion!  // Safe: exists after rejection check

  const updateResult = await c.env.DB.prepare(`
    UPDATE projects
    SET state = ?, version = ?, applied_log = ?, audit_log = ?, updated_at = datetime('now')
    WHERE id = ? AND version = ?
  `).bind(
    JSON.stringify(result.state),
    newVersion,
    JSON.stringify(result.appliedLog),
    JSON.stringify(result.auditLog),
    projectId,
    project.version
  ).run()

  if (updateResult.meta.changes === 0) {
    return c.json({
      status: 'conflict',
      message: 'Concurrent modification, please retry'
    }, 409)
  }

  // Broadcast update via Durable Object
  try {
    await broadcastUpdate(c.env.REALTIME, projectId, newVersion, result.state)
  } catch (e) {
    console.error('Broadcast failed:', e)
    // Don't fail the request if broadcast fails
  }

  return c.json({
    status: 'accepted',
    version: newVersion,
    state: result.state,
    noChange: result.noChange
  })
})
