// ================================================
// Auth Routes
// ================================================
import { Hono } from 'hono'

type Bindings = { DB: D1Database }

const auth = new Hono<{ Bindings: Bindings }>()

// Simple login (demo - no real hashing in edge)
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400)

    const user = await c.env.DB.prepare(
      'SELECT id, name, email, role, student_id FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; name: string; email: string; role: string; student_id: string }>()

    if (!user) return c.json({ error: 'Invalid credentials' }, 401)

    // Demo: accept any password
    await c.env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run()

    return c.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, studentId: user.student_id },
      message: `Welcome back, ${user.name}!`
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get all users (admin)
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
