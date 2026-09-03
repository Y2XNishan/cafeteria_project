// ================================================
// Notifications Routes
// ================================================
import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export interface NotificationItem {
  id: number
  userId: number
  orderId?: number
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

const notifications = new Hono<{ Bindings: Bindings }>()

// Get notifications for a user
notifications.get('/user/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    if (isNaN(userId)) return c.json({ error: 'Invalid user ID' }, 400)
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
    if (isNaN(id)) return c.json({ error: 'Invalid notification ID' }, 400)
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'Marked as read' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Mark all as read for user
notifications.patch('/user/:userId/read-all', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    if (isNaN(userId)) return c.json({ error: 'Invalid user ID' }, 400)
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(userId).run()
    return c.json({ success: true, message: 'All notifications marked as read' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Delete single notification
notifications.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ error: 'Invalid notification ID' }, 400)
    await c.env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'Notification deleted' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default notifications
