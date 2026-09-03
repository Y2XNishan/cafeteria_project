import { requireAuth, requireRole, JWTPayload } from '../src/middleware/auth'

describe('JWT Auth and Role Middleware', () => {
  it('exports requireAuth and requireRole middleware factories', () => {
    expect(typeof requireAuth).toBe('function')
    expect(typeof requireRole).toBe('function')
  })

  it('creates role restriction middleware function for specified roles', () => {
    const adminMiddleware = requireRole('admin')
    expect(typeof adminMiddleware).toBe('function')
  })

  it('correctly types JWTPayload structure', () => {
    const payload: JWTPayload = {
      userId: 1,
      role: 'admin',
      name: 'Admin User',
      email: 'admin@cafeteria.edu',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    expect(payload.userId).toBe(1)
    expect(payload.role).toBe('admin')
  })
})
