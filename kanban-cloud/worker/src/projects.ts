// Project CRUD and member management for kanban-cloud
import { Hono } from 'hono'
import type { Env, Variables } from './index'
import { init } from './dafny-bundle'

export const projectRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// List all projects for current user
projectRoutes.get('/', async (c) => {
  const userId = c.get('userId')

  const results = await c.env.DB.prepare(`
    SELECT p.id, p.name, pm.role
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ?
    ORDER BY p.created_at DESC
  `).bind(userId).all<{ id: string; name: string; role: string }>()

  return c.json(results.results || [])
})

// Get a specific project's state
projectRoutes.get('/:id', async (c) => {
  const userId = c.get('userId')
  const projectId = c.req.param('id')

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).bind(projectId, userId).first()

  if (!member) {
    return c.json({ error: 'Not a member of this project' }, 403)
  }

  const project = await c.env.DB.prepare(
    'SELECT state, version FROM projects WHERE id = ?'
  ).bind(projectId).first<{ state: string; version: number }>()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  return c.json({
    state: JSON.parse(project.state),
    version: project.version
  })
})

// Create a new project
projectRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const { name } = await c.req.json<{ name: string }>()

  if (!name?.trim()) {
    return c.json({ error: 'Project name required' }, 400)
  }

  const projectId = crypto.randomUUID()

  // Get initial state from Dafny's Init() function
  const initialState = init()

  // Create project with proper initial state
  await c.env.DB.prepare(`
    INSERT INTO projects (id, name, owner_id, state, version)
    VALUES (?, ?, ?, ?, 0)
  `).bind(projectId, name.trim(), userId, JSON.stringify(initialState)).run()

  // Add owner as member
  await c.env.DB.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, 'owner')
  `).bind(projectId, userId).run()

  return c.json({ id: projectId })
})

// Rename a project (owner only)
projectRoutes.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const projectId = c.req.param('id')
  const { name } = await c.req.json<{ name: string }>()

  // Check ownership
  const project = await c.env.DB.prepare(
    'SELECT owner_id FROM projects WHERE id = ?'
  ).bind(projectId).first<{ owner_id: string }>()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  if (project.owner_id !== userId) {
    return c.json({ error: 'Only the owner can rename the project' }, 403)
  }

  await c.env.DB.prepare(`
    UPDATE projects SET name = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(name.trim(), projectId).run()

  return c.json({ success: true })
})

// Delete a project (owner only)
projectRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const projectId = c.req.param('id')

  // Check ownership
  const project = await c.env.DB.prepare(
    'SELECT owner_id FROM projects WHERE id = ?'
  ).bind(projectId).first<{ owner_id: string }>()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  if (project.owner_id !== userId) {
    return c.json({ error: 'Only the owner can delete the project' }, 403)
  }

  // Delete project (cascade deletes members)
  await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run()

  return c.json({ success: true })
})

// List project members
projectRoutes.get('/:id/members', async (c) => {
  const userId = c.get('userId')
  const projectId = c.req.param('id')

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).bind(projectId, userId).first()

  if (!member) {
    return c.json({ error: 'Not a member of this project' }, 403)
  }

  const results = await c.env.DB.prepare(`
    SELECT u.id as userId, u.email, pm.role
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).bind(projectId).all<{ userId: string; email: string; role: string }>()

  return c.json(results.results || [])
})

// Add a member to project (owner only)
projectRoutes.post('/:id/members', async (c) => {
  const userId = c.get('userId')
  const projectId = c.req.param('id')
  const { email } = await c.req.json<{ email: string }>()

  // Check ownership
  const project = await c.env.DB.prepare(
    'SELECT owner_id FROM projects WHERE id = ?'
  ).bind(projectId).first<{ owner_id: string }>()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  if (project.owner_id !== userId) {
    return c.json({ error: 'Only the owner can add members' }, 403)
  }

  // Find user by email
  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first<{ id: string }>()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  // Check if already a member
  const existingMember = await c.env.DB.prepare(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
  ).bind(projectId, user.id).first()

  if (existingMember) {
    return c.json({ error: 'User is already a member' }, 400)
  }

  // Add member
  await c.env.DB.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, 'member')
  `).bind(projectId, user.id).run()

  return c.json({ success: true })
})

// Remove a member from project (owner only)
projectRoutes.delete('/:id/members/:memberId', async (c) => {
  const userId = c.get('userId')
  const projectId = c.req.param('id')
  const memberId = c.req.param('memberId')

  // Check ownership
  const project = await c.env.DB.prepare(
    'SELECT owner_id FROM projects WHERE id = ?'
  ).bind(projectId).first<{ owner_id: string }>()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  if (project.owner_id !== userId) {
    return c.json({ error: 'Only the owner can remove members' }, 403)
  }

  // Can't remove owner
  if (memberId === project.owner_id) {
    return c.json({ error: 'Cannot remove the project owner' }, 400)
  }

  await c.env.DB.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).bind(projectId, memberId).run()

  return c.json({ success: true })
})
