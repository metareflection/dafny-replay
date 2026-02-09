// Main Cloudflare Worker entry point for kanban-cloud
import { Hono } from 'hono'
import {
  createAuthRoutes,
  createAuthMiddleware,
  createRealtimeHandler,
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
app.get('/realtime/:projectId', createRealtimeHandler({
  paramName: 'projectId',
  memberTable: 'project_members',
  entityColumn: 'project_id',
  entityType: 'project'
}))

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: err.message || 'Internal error' }, 500)
})

export default app
