// Invite management routes
import { Hono } from 'hono'
import { broadcastUpdate } from '@dafny-replay/cloudflare'
import type { Env, Variables } from './index'

export const inviteRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// List invites for current user
inviteRoutes.get('/', async (c) => {
  const userEmail = c.get('userEmail')

  const results = await c.env.DB.prepare(`
    SELECT gi.id, gi.group_id as groupId, g.name as groupName
    FROM group_invites gi
    JOIN groups g ON gi.group_id = g.id
    WHERE gi.email = ?
  `).bind(userEmail).all<{ id: string; groupId: string; groupName: string }>()

  return c.json(results.results || [])
})

// Accept an invite
inviteRoutes.post('/:groupId/accept', async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')
  const groupId = c.req.param('groupId')
  const { displayName } = await c.req.json<{ displayName: string }>()

  if (!displayName?.trim()) {
    return c.json({ error: 'Display name required' }, 400)
  }

  // Check invite exists
  const invite = await c.env.DB.prepare(
    'SELECT id FROM group_invites WHERE group_id = ? AND email = ?'
  ).bind(groupId, userEmail).first<{ id: string }>()

  if (!invite) {
    return c.json({ error: 'Invite not found' }, 404)
  }

  // Check not already a member
  const existingMember = await c.env.DB.prepare(
    'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, userId).first()

  if (existingMember) {
    // Delete the invite and return success
    await c.env.DB.prepare('DELETE FROM group_invites WHERE id = ?').bind(invite.id).run()
    return c.json({ success: true })
  }

  // Load current group state
  const group = await c.env.DB.prepare(
    'SELECT state, version FROM groups WHERE id = ?'
  ).bind(groupId).first<{ state: string; version: number }>()

  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  // Add member to state
  const state = JSON.parse(group.state)
  const trimmedName = displayName.trim()

  if (!state.members.includes(trimmedName)) {
    state.members.push(trimmedName)
    state.memberList.push(trimmedName)
    state.balances[trimmedName] = 0
  }

  // Update group state and add member (with optimistic locking)
  const newVersion = group.version + 1
  const updateResult = await c.env.DB.prepare(`
    UPDATE groups SET state = ?, version = ?, updated_at = datetime('now')
    WHERE id = ? AND version = ?
  `).bind(JSON.stringify(state), newVersion, groupId, group.version).run()

  if (updateResult.meta.changes === 0) {
    return c.json({ error: 'Concurrent modification, please retry' }, 409)
  }

  await c.env.DB.prepare(`
    INSERT INTO group_members (group_id, user_id, display_name, role)
    VALUES (?, ?, ?, 'member')
  `).bind(groupId, userId, trimmedName).run()

  // Delete the invite
  await c.env.DB.prepare('DELETE FROM group_invites WHERE id = ?').bind(invite.id).run()

  // Broadcast update to other clients
  try {
    await broadcastUpdate(c.env.REALTIME, groupId, newVersion, state)
  } catch (e) {
    console.error('Broadcast failed:', e)
  }

  return c.json({ success: true })
})

// Decline/cancel an invite
// Only group owner or the invited user can delete
inviteRoutes.delete('/:inviteId', async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')
  const inviteId = c.req.param('inviteId')

  // Fetch invite with group owner info
  const invite = await c.env.DB.prepare(`
    SELECT gi.email, g.owner_id
    FROM group_invites gi
    JOIN groups g ON gi.group_id = g.id
    WHERE gi.id = ?
  `).bind(inviteId).first<{ email: string; owner_id: string }>()

  if (!invite) {
    return c.json({ error: 'Invite not found' }, 404)
  }

  // Check authorization: must be group owner or the invited user
  const isOwner = invite.owner_id === userId
  const isInvitedUser = invite.email === userEmail

  if (!isOwner && !isInvitedUser) {
    return c.json({ error: 'Not authorized to delete this invite' }, 403)
  }

  await c.env.DB.prepare('DELETE FROM group_invites WHERE id = ?').bind(inviteId).run()

  return c.json({ success: true })
})
