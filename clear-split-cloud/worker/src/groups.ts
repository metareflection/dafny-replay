// Group CRUD and member management
import { Hono } from 'hono'
import type { Env, Variables } from './index'

export const groupRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// List all groups for current user
groupRoutes.get('/', async (c) => {
  const userId = c.get('userId')

  const results = await c.env.DB.prepare(`
    SELECT g.id, g.name, g.state, gm.display_name as displayName
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
    ORDER BY g.created_at DESC
  `).bind(userId).all<{ id: string; name: string; state: string; displayName: string }>()

  const groups = (results.results || []).map(g => ({
    id: g.id,
    name: g.name,
    displayName: g.displayName,
    state: JSON.parse(g.state)
  }))

  return c.json(groups)
})

// Get a specific group's state
groupRoutes.get('/:id', async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, userId).first()

  if (!member) {
    return c.json({ error: 'Not a member of this group' }, 403)
  }

  const group = await c.env.DB.prepare(
    'SELECT state, version FROM groups WHERE id = ?'
  ).bind(groupId).first<{ state: string; version: number }>()

  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  return c.json({
    state: JSON.parse(group.state),
    version: group.version
  })
})

// Get group info (owner, name)
groupRoutes.get('/:id/info', async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, userId).first()

  if (!member) {
    return c.json({ error: 'Not a member of this group' }, 403)
  }

  const group = await c.env.DB.prepare(
    'SELECT owner_id, name FROM groups WHERE id = ?'
  ).bind(groupId).first<{ owner_id: string; name: string }>()

  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  return c.json({
    ownerId: group.owner_id,
    name: group.name
  })
})

// Get group name (public for invites)
groupRoutes.get('/:id/name', async (c) => {
  const groupId = c.req.param('id')

  const group = await c.env.DB.prepare(
    'SELECT name FROM groups WHERE id = ?'
  ).bind(groupId).first<{ name: string }>()

  return c.json({ name: group?.name || 'Expense Group' })
})

// Create a new group
groupRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const { name, displayName } = await c.req.json<{ name: string; displayName: string }>()

  if (!displayName?.trim()) {
    return c.json({ error: 'Display name required' }, 400)
  }

  const groupId = crypto.randomUUID()
  const groupName = name?.trim() || 'Expense Group'
  const trimmedName = displayName.trim()

  // Initial state - not using Dafny's Init() because it expects memberList parameter
  // balances is maintained by worker code (invites.ts), not part of Dafny model
  const initialState = {
    members: [trimmedName],
    memberList: [trimmedName],
    expenses: [],
    settlements: [],
    balances: { [trimmedName]: 0 }
  }

  // Create group
  await c.env.DB.prepare(`
    INSERT INTO groups (id, name, owner_id, state, version)
    VALUES (?, ?, ?, ?, 0)
  `).bind(groupId, groupName, userId, JSON.stringify(initialState)).run()

  // Add owner as member
  await c.env.DB.prepare(`
    INSERT INTO group_members (group_id, user_id, display_name, role)
    VALUES (?, ?, ?, 'owner')
  `).bind(groupId, userId, displayName.trim()).run()

  return c.json({ id: groupId })
})

// Delete a group (owner only)
groupRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')

  // Check ownership
  const group = await c.env.DB.prepare(
    'SELECT owner_id FROM groups WHERE id = ?'
  ).bind(groupId).first<{ owner_id: string }>()

  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  if (group.owner_id !== userId) {
    return c.json({ error: 'Only the owner can delete the group' }, 403)
  }

  // Delete group (cascade deletes members and invites)
  await c.env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run()

  return c.json({ success: true })
})

// List group members
groupRoutes.get('/:id/members', async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, userId).first()

  if (!member) {
    return c.json({ error: 'Not a member of this group' }, 403)
  }

  const results = await c.env.DB.prepare(`
    SELECT user_id as userId, display_name as displayName
    FROM group_members
    WHERE group_id = ?
  `).bind(groupId).all<{ userId: string; displayName: string }>()

  return c.json(results.results || [])
})

// List group invites (owner only)
groupRoutes.get('/:id/invites', async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')

  // Check ownership
  const group = await c.env.DB.prepare(
    'SELECT owner_id FROM groups WHERE id = ?'
  ).bind(groupId).first<{ owner_id: string }>()

  if (!group || group.owner_id !== userId) {
    return c.json({ error: 'Only the owner can view invites' }, 403)
  }

  const results = await c.env.DB.prepare(`
    SELECT id, email FROM group_invites WHERE group_id = ?
  `).bind(groupId).all<{ id: string; email: string }>()

  return c.json((results.results || []).map(inv => ({
    id: inv.id,
    groupId,
    email: inv.email
  })))
})

// Create invite (owner only)
groupRoutes.post('/:id/invites', async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')
  const { email } = await c.req.json<{ email: string }>()

  if (!email?.trim()) {
    return c.json({ error: 'Email required' }, 400)
  }

  // Check ownership
  const group = await c.env.DB.prepare(
    'SELECT owner_id FROM groups WHERE id = ?'
  ).bind(groupId).first<{ owner_id: string }>()

  if (!group || group.owner_id !== userId) {
    return c.json({ error: 'Only the owner can invite members' }, 403)
  }

  const inviteId = crypto.randomUUID()

  try {
    await c.env.DB.prepare(`
      INSERT INTO group_invites (id, group_id, email)
      VALUES (?, ?, ?)
    `).bind(inviteId, groupId, email.toLowerCase().trim()).run()
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Invite already exists' }, 400)
    }
    throw e
  }

  return c.json({ success: true })
})
