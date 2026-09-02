// ================================================
// Queue Routes
// ================================================
import { Hono } from 'hono'
import { optimizeQueue } from '../lib/forecast'

type Bindings = { DB: D1Database }

const queue = new Hono<{ Bindings: Bindings }>()

// Get current queue status for a time slot
queue.get('/status', async (c) => {
  try {
    const timeSlot = c.req.query('slot') || 'lunch'
    const today = new Date().toISOString().split('T')[0]

    const { results: entries } = await c.env.DB.prepare(`
      SELECT qe.*, o.order_number, o.status as order_status, o.pickup_slot,
             u.name as user_name, u.student_id,
             GROUP_CONCAT(mi.name || ' x' || oi.quantity, ', ') as items
      FROM queue_entries qe
      JOIN orders o ON o.id = qe.order_id
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE qe.date = ? AND qe.time_slot = ? AND qe.status NOT IN ('collected')
      GROUP BY qe.id
      ORDER BY qe.queue_position ASC
    `).bind(today, timeSlot).all()

    // Get avg prep time
    const avgPrepTime = await c.env.DB.prepare(`
      SELECT AVG(mi.preparation_time_minutes) as avg_prep
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.time_slot = ? AND DATE(o.created_at) = ?
        AND o.status NOT IN ('completed','cancelled')
    `).bind(timeSlot, today).first<any>()

    const queueLength = entries.length
    const avgPrep = avgPrepTime?.avg_prep ?? 6
    const optimization = optimizeQueue(queueLength, avgPrep, 15, 20, new Date())

    // Group by pickup slot
    const slotGroups: Record<string, any[]> = {}
    for (const e of entries as any[]) {
      const slot = e.pickup_slot || 'unassigned'
      if (!slotGroups[slot]) slotGroups[slot] = []
      slotGroups[slot].push(e)
    }

    return c.json({
      timeSlot,
      date: today,
      queueLength,
      estimatedWaitMinutes: optimization.estimatedWaitMinutes,
      isSurge: optimization.isSurge,
      nextAvailableSlot: optimization.nextAvailableSlot,
      availableSlots: optimization.availableSlots.slice(0, 4),
      entries,
      slotGroups,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get queue position for specific order
queue.get('/position/:orderId', async (c) => {
  try {
    const orderId = parseInt(c.req.param('orderId'))
    if (isNaN(orderId)) return c.json({ error: 'Invalid order ID' }, 400)
    const entry = await c.env.DB.prepare(`
      SELECT qe.*, o.order_number, o.status, o.pickup_slot, o.estimated_wait_minutes
      FROM queue_entries qe
      JOIN orders o ON o.id = qe.order_id
      WHERE qe.order_id = ?
    `).bind(orderId).first()
    if (!entry) return c.json({ error: 'Queue entry not found' }, 404)
    return c.json({ entry })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get surge alerts
queue.get('/alerts', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { results } = await c.env.DB.prepare(`
      SELECT sa.*, mi.name as item_name
      FROM surge_alerts sa
      LEFT JOIN menu_items mi ON mi.id = sa.menu_item_id
      WHERE sa.date = ? AND sa.is_resolved = 0
      ORDER BY sa.created_at DESC
    `).bind(today).all()
    return c.json({ alerts: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Resolve alert
queue.patch('/alerts/:id/resolve', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ error: 'Invalid alert ID' }, 400)
    await c.env.DB.prepare('UPDATE surge_alerts SET is_resolved = 1 WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Live queue feed (polling endpoint)
queue.get('/live', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const summary = await c.env.DB.prepare(`
      SELECT
        time_slot,
        COUNT(*) as queue_length,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_count,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting_count
      FROM queue_entries WHERE date = ? AND status != 'collected'
      GROUP BY time_slot
    `).bind(today).all()

    const alerts = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM surge_alerts WHERE date = ? AND is_resolved = 0"
    ).bind(today).first<any>()

    return c.json({
      timestamp: new Date().toISOString(),
      date: today,
      summary: summary.results,
      activeAlerts: alerts?.count ?? 0
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default queue
