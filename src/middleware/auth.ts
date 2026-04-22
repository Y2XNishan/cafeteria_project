// ================================================
// JWT Authentication & Role-Based Access Middleware
// ================================================
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export interface JWTPayload {
  userId: number
  role: string
  name: string
  email: string
  exp: number
}

type Env = {
  Bindings: { DB: D1Database; JWT_SECRET: string }
  Variables: { jwtPayload: JWTPayload }
}

/**
 * Validates the Bearer token from the Authorization header.
 * Sets `jwtPayload` in context variables on success.
 * Returns 401 if the token is missing, malformed, or expired.
 */
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized – missing or malformed token' }, 401)
  }
  try {
    const payload = await verify(authHeader.slice(7), c.env.JWT_SECRET) as unknown as JWTPayload
    c.set('jwtPayload', payload)
  } catch {
    return c.json({ error: 'Unauthorized – invalid or expired token' }, 401)
  }
  await next()
})

/**
 * Restricts access to users with one of the given roles.
 * Must be applied AFTER requireAuth so that jwtPayload is in context.
 */
export const requireRole = (...roles: string[]) =>
  createMiddleware<Env>(async (c, next) => {
    const payload = c.get('jwtPayload')
    if (!payload || !roles.includes(payload.role)) {
      return c.json({ error: 'Forbidden – insufficient permissions' }, 403)
    }
    await next()
  })
