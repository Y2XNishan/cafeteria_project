// ================================================
// Auth Routes
// ================================================
import { Hono } from 'hono'
import { sign } from 'hono/jwt'

type Bindings = { DB: D1Database; JWT_SECRET: string }

const TOKEN_TTL_SECONDS = 24 * 3600 // 24 hours

const auth = new Hono<{ Bindings: Bindings }>()

// Login – validates credentials and returns a signed JWT
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400)

    const user = await c.env.DB.prepare(
      'SELECT id, name, email, role, student_id, password_hash FROM users WHERE email = ?'
    ).bind(email).first<{
      id: number; name: string; email: string
      role: string; student_id: string; password_hash: string
    }>()

    if (!user) return c.json({ error: 'Invalid credentials' }, 401)

    // ⚠️  Demo mode: plain-text comparison.
    // Production: replace password_hash column with PBKDF2/bcrypt hashes
    // and use a constant-time comparison (e.g. @noble/hashes timingSafeEqual).
    if (user.password_hash !== password) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    await c.env.DB.prepare(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(user.id).run()

    const now = Math.floor(Date.now() / 1000)
    const token = await sign(
      { userId: user.id, role: user.role, name: user.name, email: user.email, exp: now + TOKEN_TTL_SECONDS },
      c.env.JWT_SECRET
    )

    return c.json({
      success: true,
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, studentId: user.student_id
      },
      message: `Welcome back, ${user.name}!`
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get all users – protected at the app level by requireAuth + requireRole('admin')
auth.get('/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, email, role, student_id, created_at, last_login FROM users ORDER BY role, name'
    ).all()
    return c.json({ users: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default auth
