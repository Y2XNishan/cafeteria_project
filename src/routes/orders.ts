// ================================================
// Orders Routes
// ================================================
import { Hono } from 'hono'

type Bindings = { DB: D1Database }

const orders = new Hono<{ Bindings: Bindings }>()

// Generate order number
function generateOrderNumber(): string {
  const now = new Date()
  const dateStr = now.toISOString().replace(/-/g, '').split('T')[0]
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `ORD-${dateStr}-${rand}`
}

// Calculate pickup slot based on queue position
function assignPickupSlot(queuePos: number, timeSlot: string, slotIntervalMins: number = 15, maxPerSlot: number = 20): string {
  const slotIndex = Math.floor(queuePos / maxPerSlot)
  const slotStarts: Record<string, number[]> = {
    breakfast: [7, 0],
    lunch: [11, 30],
    dinner: [17, 30],
  }
  const [baseHour, baseMin] = slotStarts[timeSlot] || [12, 0]
  const totalMins = baseHour * 60 + baseMin + slotIndex * slotIntervalMins
  const startH = Math.floor(totalMins / 60)
  const startM = totalMins % 60
  const endMins = totalMins + slotIntervalMins
  const endH = Math.floor(endMins / 60)
  const endM = endMins % 60
  return `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}-${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
}

// Place a new order
orders.post('/', async (c) => {
  try {
    const { userId, timeSlot, items, notes } = await c.req.json()
    if (!userId || !timeSlot || !items?.length) {
      return c.json({ error: 'userId, timeSlot and items are required' }, 400)
    }

    const today = new Date().toISOString().split('T')[0]

    // Validate items and compute total
    let totalAmount = 0
    const resolvedItems: Array<{ id: number; qty: number; price: number; name: string; prepTime: number }> = []
    for (const item of items) {
      const mi = await c.env.DB.prepare('SELECT id, name, price, preparation_time_minutes FROM menu_items WHERE id = ? AND is_active = 1').bind(item.menuItemId).first<any>()
      if (!mi) return c.json({ error: `Menu item ${item.menuItemId} not found` }, 400)
      const avail = await c.env.DB.prepare('SELECT status, quantity_remaining FROM menu_availability WHERE menu_item_id = ? AND date = ? AND time_slot = ?').bind(item.menuItemId, today, timeSlot).first<any>()
      if (avail?.status === 'sold_out') return c.json({ error: `${mi.name} is sold out` }, 400)
      const qty = item.quantity || 1
      totalAmount += mi.price * qty
      resolvedItems.push({ id: mi.id, qty, price: mi.price, name: mi.name, prepTime: mi.preparation_time_minutes })
    }

    // Get current queue length for slot assignment
    const queueCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM orders WHERE time_slot = ? AND DATE(created_at) = ? AND status NOT IN ('cancelled', 'completed')"
    ).bind(timeSlot, today).first<any>()
    const queuePos = (queueCount?.cnt ?? 0) as number
    const pickupSlot = assignPickupSlot(queuePos, timeSlot)
    const avgPrepTime = resolvedItems.reduce((max, i) => Math.max(max, i.prepTime), 0)
    const estimatedWait = Math.round((queuePos / 3) * avgPrepTime + avgPrepTime)

    const orderNumber = generateOrderNumber()

    // Insert order
    const orderResult = await c.env.DB.prepare(`
      INSERT INTO orders (user_id, order_number, status, time_slot, pickup_slot, estimated_wait_minutes, total_amount, notes, created_at)
      VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(userId, orderNumber, timeSlot, pickupSlot, estimatedWait, totalAmount, notes || null).run()
    
    const orderId = orderResult.meta.last_row_id as number

    // Insert order items
    for (const item of resolvedItems) {
      await c.env.DB.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `).bind(orderId, item.id, item.qty, item.price, item.price * item.qty).run()

      // Update sold quantity in availability
      await c.env.DB.prepare(`
        UPDATE menu_availability SET
          quantity_sold = quantity_sold + ?,
          quantity_remaining = MAX(0, quantity_remaining - ?),
          status = CASE 
            WHEN quantity_remaining - ? <= 0 THEN 'sold_out'
            WHEN (quantity_remaining - ?) * 100.0 / NULLIF(quantity_prepared, 0) <= 20 THEN 'running_low'
            ELSE 'available'
          END
        WHERE menu_item_id = ? AND date = ? AND time_slot = ?
      `).bind(item.qty, item.qty, item.qty, item.qty, item.id, today, timeSlot).run()
    }

    // Add to queue
    await c.env.DB.prepare(`
      INSERT INTO queue_entries (order_id, queue_position, time_slot, date, pickup_slot, status, entered_at)
      VALUES (?, ?, ?, ?, ?, 'waiting', CURRENT_TIMESTAMP)
    `).bind(orderId, queuePos + 1, timeSlot, today, pickupSlot).run()

    // Add notification
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, order_id, type, title, message)
      VALUES (?, ?, 'order_ready', 'Order Confirmed!', ?)
    `).bind(userId, orderId, `Your order ${orderNumber} is confirmed. Pickup slot: ${pickupSlot}. Est. wait: ${estimatedWait} mins.`).run()

    return c.json({
      success: true,
      order: {
        id: orderId,
        orderNumber,
        pickupSlot,
        estimatedWaitMinutes: estimatedWait,
        totalAmount: totalAmount.toFixed(2),
        status: 'confirmed',
        items: resolvedItems.map(i => ({ name: i.name, quantity: i.qty, price: i.price }))
      }
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get orders by user
orders.get('/user/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    const limit = parseInt(c.req.query('limit') || '10')
    const { results } = await c.env.DB.prepare(`
      SELECT o.*, GROUP_CONCAT(mi.name || ' x' || oi.quantity, ', ') as items_summary
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `).bind(userId, limit).all()
    return c.json({ orders: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get order detail
orders.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const order = await c.env.DB.prepare(`
      SELECT o.*, u.name as user_name, u.student_id, qe.queue_position, qe.status as queue_status
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN queue_entries qe ON qe.order_id = o.id
      WHERE o.id = ?
    `).bind(id).first()
    if (!order) return c.json({ error: 'Order not found' }, 404)

    const { results: items } = await c.env.DB.prepare(`
      SELECT oi.quantity, oi.unit_price, oi.subtotal, mi.name, mi.preparation_time_minutes
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = ?
    `).bind(id).all()

    return c.json({ order, items })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Update order status (kitchen staff)
orders.patch('/:id/status', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const { status } = await c.req.json()
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) return c.json({ error: 'Invalid status' }, 400)

    await c.env.DB.prepare(
      "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(status, id).run()

    // Update queue entry status
    const queueStatus = status === 'ready' ? 'ready' : status === 'completed' ? 'collected' : status === 'preparing' ? 'processing' : 'waiting'
    await c.env.DB.prepare("UPDATE queue_entries SET status = ? WHERE order_id = ?").bind(queueStatus, id).run()

    // If ready - send notification
    if (status === 'ready') {
      const order = await c.env.DB.prepare('SELECT user_id, order_number, pickup_slot FROM orders WHERE id = ?').bind(id).first<any>()
      if (order) {
        await c.env.DB.prepare(`
          INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, 'order_ready', '🍽️ Order Ready!', ?)
        `).bind(order.user_id, id, `Your order ${order.order_number} is ready! Pickup at: ${order.pickup_slot}`).run()
      }
    }

    return c.json({ success: true, status })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get all active orders (kitchen/admin)
orders.get('/active/all', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const timeSlot = c.req.query('slot') || 'lunch'
    const { results } = await c.env.DB.prepare(`
      SELECT o.*, u.name as user_name, u.student_id,
             GROUP_CONCAT(mi.name || ' x' || oi.quantity, ', ') as items_summary,
             qe.queue_position
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      LEFT JOIN queue_entries qe ON qe.order_id = o.id
      WHERE DATE(o.created_at) = ? AND o.time_slot = ?
        AND o.status NOT IN ('completed', 'cancelled')
      GROUP BY o.id
      ORDER BY qe.queue_position ASC
    `).bind(today, timeSlot).all()
    return c.json({ orders: results, count: results.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get today's stats (admin)
orders.get('/stats/today', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('confirmed','preparing','pending') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        ROUND(SUM(total_amount), 2) as total_revenue,
        ROUND(AVG(estimated_wait_minutes), 1) as avg_wait_minutes
      FROM orders WHERE DATE(created_at) = ?
    `).bind(today).first()

    const slotBreakdown = await c.env.DB.prepare(`
      SELECT time_slot, COUNT(*) as count, SUM(total_amount) as revenue
      FROM orders WHERE DATE(created_at) = ? GROUP BY time_slot
    `).bind(today).all()

    return c.json({ stats, slotBreakdown: slotBreakdown.results, date: today })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default orders
