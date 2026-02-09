// Main Cloudflare Worker entry point for kanban-cloud
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
import { projectRoutes } from './projects'
import { dispatchRoutes } from './dispatch'

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
app.use('/projects/*', authMiddleware)
app.use('/dispatch', authMiddleware)

app.route('/projects', projectRoutes)
app.route('/', dispatchRoutes)

// WebSocket upgrade for realtime (with auth and membership check)
app.get('/realtime/:projectId', async (c) => {
  const projectId = c.req.param('projectId')
  const token = c.req.query('token')

  if (!token) {
    return c.json({ error: 'Token required' }, 401)
  }

  // Verify the JWT token
  let userId: string
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET)
    userId = payload.userId
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  // Check membership before allowing WebSocket upgrade
  const member = await c.env.DB.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).bind(projectId, userId).first()

  if (!member) {
    return c.json({ error: 'Not a member of this project' }, 403)
  }

  // Pass to Durable Object for WebSocket handling
  const id = c.env.REALTIME.idFromName(projectId)
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
