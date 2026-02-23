// ================================================
// Notifications Routes
// ================================================
import { Hono } from 'hono'

type Bindings = { DB: D1Database }

const notifications = new Hono<{ Bindings: Bindings }>()

// Get notifications for a user
notifications.get('/user/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    const { results } = await c.env.DB.prepare(`
      SELECT n.*, o.order_number
      FROM notifications n
      LEFT JOIN orders o ON o.id = n.order_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 20
    `).bind(userId).all()
    const unreadCount = (results as any[]).filter(n => !n.is_read).length
    return c.json({ notifications: results, unreadCount })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Mark notification as read
notifications.patch('/:id/read', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Mark all as read for user
notifications.patch('/user/:userId/read-all', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(userId).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default notifications
