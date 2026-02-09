// Shared authentication module for Cloudflare Workers
import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import type { Context, Next } from 'hono'
import type { BaseEnv, AuthVariables } from './types'

// PBKDF2-SHA256 password hashing with per-user salt
// Format: pbkdf2$iterations$salt$hash (all base64 encoded)
const PBKDF2_ITERATIONS = 100000 // Cloudflare Workers max (OWASP recommends 310k but Workers caps at 100k)

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    256
  )
  const saltB64 = btoa(String.fromCharCode(...salt))
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`
}

// Verify password against stored PBKDF2 hash
// Format: pbkdf2$iterations$salt$hash
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [, iterStr, saltB64, hashB64] = storedHash.split('$')
  const iterations = parseInt(iterStr, 10)
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
  const expectedHash = atob(hashB64)

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    key,
    256
  )
  const computedHash = String.fromCharCode(...new Uint8Array(hash))
  return computedHash === expectedHash
}

function generateId(): string {
  return crypto.randomUUID()
}

// Create auth routes for an app
export function createAuthRoutes<E extends BaseEnv>() {
  const authRoutes = new Hono<{ Bindings: E }>()

  // Sign up with email/password
  authRoutes.post('/signup', async (c) => {
    const { email, password } = await c.req.json<{ email: string; password: string }>()

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const id = generateId()
    const passwordHash = await hashPassword(password)

    try {
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
      ).bind(id, email.toLowerCase(), passwordHash).run()
    } catch (e: unknown) {
      const error = e as { message?: string }
      if (error.message?.includes('UNIQUE constraint failed')) {
        return c.json({ error: 'Email already exists' }, 400)
      }
      throw e
    }

    const token = await sign(
      { sub: id, email: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
      c.env.JWT_SECRET
    )

    return c.json({ token, user: { id, email: email.toLowerCase() } })
  })

  // Sign in with email/password
  authRoutes.post('/signin', async (c) => {
    const { email, password } = await c.req.json<{ email: string; password: string }>()

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first<{ id: string; email: string; password_hash: string }>()

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const token = await sign(
      { sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
      c.env.JWT_SECRET
    )

    return c.json({ token, user: { id: user.id, email: user.email } })
  })

  // Get current user from token
  authRoutes.get('/me', async (c) => {
    const auth = c.req.header('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const payload = await verify(auth.slice(7), c.env.JWT_SECRET, 'HS256')
      return c.json({ id: payload.sub, email: payload.email })
    } catch {
      return c.json({ error: 'Invalid token' }, 401)
    }
  })

  return authRoutes
}

// Auth middleware for protected routes
export function createAuthMiddleware<E extends BaseEnv>() {
  return async function authMiddleware(
    c: Context<{ Bindings: E; Variables: AuthVariables }>,
    next: Next
  ) {
    const auth = c.req.header('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const payload = await verify(auth.slice(7), c.env.JWT_SECRET, 'HS256')
      c.set('userId', payload.sub as string)
      c.set('userEmail', payload.email as string)
      await next()
    } catch {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
}

// Verify a JWT token and return the payload (for WebSocket auth)
export async function verifyToken(
  token: string,
  jwtSecret: string
): Promise<{ userId: string; email: string }> {
  const payload = await verify(token, jwtSecret, 'HS256')
  return {
    userId: payload.sub as string,
    email: payload.email as string
  }
}
