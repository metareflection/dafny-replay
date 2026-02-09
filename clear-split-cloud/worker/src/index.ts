// Main Cloudflare Worker entry point for clear-split
import { Hono } from 'hono'
import {
  createAuthRoutes,
  createAuthMiddleware,
  verifyToken,
  RealtimeDurableObject,
  corsMiddleware,
  type BaseEnv,
  type AuthVariables
} from '@dafny-replay/cloudflare'
import { groupRoutes } from './groups'
import { dispatchRoutes } from './dispatch'
import { inviteRoutes } from './invites'

// Re-export Durable Object from shared package
export { RealtimeDurableObject }

// Environment bindings (extends BaseEnv)
export type Env = BaseEnv

// Re-export for other modules
export type Variables = AuthVariables

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// CORS for frontend
app.use('*', corsMiddleware)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Public auth routes
app.route('/auth', createAuthRoutes<Env>())

// Auth middleware
const authMiddleware = createAuthMiddleware<Env>()

// Protected routes - require authentication
app.use('/groups/*', authMiddleware)
app.use('/invites/*', authMiddleware)
app.use('/dispatch', authMiddleware)

app.route('/groups', groupRoutes)
app.route('/invites', inviteRoutes)
app.route('/', dispatchRoutes)

// WebSocket upgrade for realtime (with auth)
app.get('/realtime/:groupId', async (c) => {
  const groupId = c.req.param('groupId')
  const token = c.req.query('token')

  if (!token) {
    return c.json({ error: 'Token required' }, 401)
  }

  // Verify the JWT token
  try {
    await verifyToken(token, c.env.JWT_SECRET)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  // Pass to Durable Object for WebSocket handling
  const id = c.env.REALTIME.idFromName(groupId)
  const stub = c.env.REALTIME.get(id)
  return stub.fetch(c.req.raw)
})

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: err.message || 'Internal error' }, 500)
})

export default app
