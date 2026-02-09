// Dispatch endpoints for verified Dafny state transitions
// Uses compiled Dafny code for dispatch and multi-dispatch

import { Hono } from 'hono'
import { broadcastUpdate } from '@dafny-replay/cloudflare'
import type { Env, Variables } from './index'

// Import from compiled Dafny bundles
import { dispatch } from './dafny-bundle'
import { tryMultiStep, getTouchedProjects, getEffectiveAction, checkAuthorization } from './bundle-extras'

export const dispatchRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// ============================================================================
// Single-Project Dispatch
// ============================================================================

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
      reason: result.reason || 'No valid interpretation of action'
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

// ============================================================================
// Multi-Project Dispatch
// ============================================================================

dispatchRoutes.post('/multi-dispatch', async (c) => {
  const userId = c.get('userId')
  const { action, baseVersions } = await c.req.json<{
    action: any
    baseVersions: Record<string, number>
  }>()

  if (!action) {
    return c.json({ error: 'action is required' }, 400)
  }

  // Get touched projects from the action
  const touchedProjectIds = getTouchedProjects(action)

  if (touchedProjectIds.length === 0) {
    return c.json({ error: 'No projects touched by action' }, 400)
  }

  // Check membership for ALL touched projects
  const memberResults = await Promise.all(
    touchedProjectIds.map(async (projectId) => {
      const member = await c.env.DB.prepare(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
      ).bind(projectId, userId).first()
      return { projectId, isMember: !!member }
    })
  )

  const missingAccess = memberResults
    .filter(r => !r.isMember)
    .map(r => r.projectId)

  if (missingAccess.length > 0) {
    return c.json({
      error: 'Not a member of all touched projects',
      missingAccess
    }, 403)
  }

  // Load touched projects
  const projects: Record<string, {
    state: any
    version: number
    appliedLog: any[]
  }> = {}

  for (const projectId of touchedProjectIds) {
    const project = await c.env.DB.prepare(
      'SELECT state, version, applied_log FROM projects WHERE id = ?'
    ).bind(projectId).first<{
      state: string
      version: number
      applied_log: string
    }>()

    if (!project) {
      return c.json({ error: `Project ${projectId} not found` }, 404)
    }

    projects[projectId] = {
      state: JSON.parse(project.state),
      version: project.version,
      appliedLog: JSON.parse(project.applied_log)
    }
  }

  // Build multiModel from loaded projects (wrapped in { projects: ... } for Dafny)
  const multiModelJson = {
    projects: Object.fromEntries(
      Object.entries(projects).map(([id, p]) => [id, p.state])
    )
  }

  // ========================================================================
  // Run VERIFIED Dafny Authorization Check
  // ========================================================================

  const authorizationError = checkAuthorization(multiModelJson, userId, action)
  if (authorizationError) {
    return c.json({
      status: 'rejected',
      reason: authorizationError
    }, 403)
  }

  // ========================================================================
  // Run VERIFIED Dafny TryMultiStep
  // ========================================================================

  let result
  try {
    result = tryMultiStep(multiModelJson, action)
  } catch (e) {
    console.error('TryMultiStep failed:', e)
    return c.json({
      error: 'Multi-dispatch failed',
      details: String(e)
    }, 500)
  }

  if (result.status === 'rejected') {
    return c.json({
      status: 'rejected',
      reason: result.error || 'Action rejected'
    })
  }

  // Update all changed projects atomically using batch()
  const changedProjectIds = result.changedProjects || touchedProjectIds
  const newVersions: Record<string, number> = {}
  const newStates: Record<string, any> = {}

  // Build all UPDATE statements
  const statements: ReturnType<typeof c.env.DB.prepare>[] = []

  for (const projectId of changedProjectIds) {
    const project = projects[projectId]
    const newVersion = project.version + 1
    const newState = result.multiModel?.projects[projectId]

    // Get the effective single-project action for this project's applied_log
    const effectiveAction = getEffectiveAction(multiModelJson, action, projectId)

    statements.push(
      c.env.DB.prepare(`
        UPDATE projects
        SET state = ?, version = ?, applied_log = ?, updated_at = datetime('now')
        WHERE id = ? AND version = ?
      `).bind(
        JSON.stringify(newState),
        newVersion,
        JSON.stringify([...project.appliedLog, effectiveAction].filter(Boolean)),
        projectId,
        project.version
      )
    )

    newVersions[projectId] = newVersion
    newStates[projectId] = newState  // Already JSON from multimodelToJson
  }

  // Execute all updates atomically
  const batchResults = await c.env.DB.batch(statements)

  // Check for conflicts (any update with 0 changes means version mismatch)
  for (let i = 0; i < batchResults.length; i++) {
    if (batchResults[i].meta.changes === 0) {
      const conflictProjectId = changedProjectIds[i]
      return c.json({
        status: 'conflict',
        message: `Concurrent modification on project ${conflictProjectId}`
      }, 409)
    }
  }

  // Broadcast updates after successful commit
  for (const projectId of changedProjectIds) {
    try {
      await broadcastUpdate(c.env.REALTIME, projectId, newVersions[projectId], newStates[projectId])
    } catch (e) {
      console.error(`Broadcast failed for ${projectId}:`, e)
    }
  }

  return c.json({
    status: 'accepted',
    changed: changedProjectIds,
    versions: newVersions,
    states: newStates
  })
})
