// @dafny-replay/cloudflare - Shared Cloudflare Worker infrastructure
//
// Usage in app workers:
//
//   import {
//     createAuthRoutes,
//     createAuthMiddleware,
//     RealtimeDurableObject,
//     broadcastUpdate,
//     corsMiddleware,
//     type BaseEnv,
//     type AuthVariables
//   } from '@dafny-replay/cloudflare'
//
//   export { RealtimeDurableObject }
//
//   type Env = BaseEnv & { /* app-specific bindings */ }
//
//   const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()
//   app.use('*', corsMiddleware)
//   app.route('/auth', createAuthRoutes<Env>())
//   app.use('/projects/*', createAuthMiddleware<Env>())

// Types
export type {
  BaseEnv,
  AuthVariables,
  User,
  DispatchResult
} from './types'

// Auth
export {
  createAuthRoutes,
  createAuthMiddleware,
  verifyToken
} from './auth'

// Realtime (Durable Object)
export {
  RealtimeDurableObject,
  broadcastUpdate
} from './realtime'

// Helpers
export {
  corsMiddleware,
  checkMembership,
  checkOwnership,
  notFound,
  forbidden,
  badRequest
} from './helpers'
