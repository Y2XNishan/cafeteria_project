// ================================================
// Orders Routes
// ================================================
import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export interface OrderItemRequest {
  menuItemId: number
  quantity: number
}

const orders = new Hono<{ Bindings: Bindings }>()

// Generate order number
function generateOrderNumber(): string {
  const now = new Date()
  const dateStr = now.toISOString().replace(/-/g, '').split('T')[0]
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `ORD-${dateStr}-${rand}`
}

// Calculate pickup slot based on queue position and current operating window
export function assignPickupSlot(queuePos: number, timeSlot: string, slotIntervalMins: number = 15, maxPerSlot: number = 20): string {
  const slotIndex = Math.floor(queuePos / maxPerSlot)
  const slotStarts: Record<string, number[]> = {
    breakfast: [7, 0],
    lunch: [11, 30],
    dinner: [17, 30],
  }
  const [baseHour, baseMin] = slotStarts[timeSlot] || [12, 0]
  const baseMins = baseHour * 60 + baseMin

  const now = new Date()
  const currentTotalMins = now.getHours() * 60 + now.getMinutes()
  const startWindowMins = Math.max(baseMins, Math.ceil((currentTotalMins + 5) / slotIntervalMins) * slotIntervalMins)

  const totalMins = startWindowMins + slotIndex * slotIntervalMins
  const startH = Math.floor(totalMins / 60) % 24
  const startM = totalMins % 60
  const endMins = totalMins + slotIntervalMins
  const endH = Math.floor(endMins / 60) % 24
  const endM = endMins % 60
  return `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}-${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
}

// Place a new order
orders.post('/', async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Invalid request payload' }, 400)
    }
    const { userId, timeSlot, items, notes } = body
    if (!userId || !timeSlot || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'userId, timeSlot and items array are required' }, 400)
    }
    const validSlots = ['breakfast', 'lunch', 'dinner']
    if (!validSlots.includes(timeSlot)) {
      return c.json({ error: 'Invalid timeSlot. Must be breakfast, lunch, or dinner' }, 400)
    }

    const today = new Date().toISOString().split('T')[0]

    // Validate items and compute total
    let totalAmount = 0
    const resolvedItems: Array<{ id: number; qty: number; price: number; name: string; prepTime: number; remaining: number; prepared: number }> = []
    
const SQL_SELECT_ACTIVE_MENU_ITEM = 'SELECT id, name, price, preparation_time_minutes, daily_capacity FROM menu_items WHERE id = ? AND is_active = 1'

    for (const item of items) {
      const mi = await c.env.DB.prepare(SQL_SELECT_ACTIVE_MENU_ITEM).bind(item.menuItemId).first<any>()
      if (!mi) return c.json({ error: `Menu item #${item.menuItemId} not found or inactive` }, 400)

      const qty = Math.max(1, parseInt(item.quantity) || 1)

      // Retrieve or initialize daily availability
      let avail = await c.env.DB.prepare(
        'SELECT quantity_prepared, quantity_sold, quantity_remaining, status FROM menu_availability WHERE menu_item_id = ? AND date = ? AND time_slot = ?'
      ).bind(item.menuItemId, today, timeSlot).first<any>()

      if (!avail) {
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO menu_availability (menu_item_id, date, time_slot, quantity_prepared, quantity_sold, quantity_remaining, status)
          VALUES (?, ?, ?, ?, 0, ?, 'available')
        `).bind(item.menuItemId, today, timeSlot, mi.daily_capacity, mi.daily_capacity).run()
        avail = { quantity_prepared: mi.daily_capacity, quantity_sold: 0, quantity_remaining: mi.daily_capacity, status: 'available' }
      }

      if (avail.status === 'sold_out' || avail.quantity_remaining <= 0) {
        return c.json({ error: `Sorry, "${mi.name}" is sold out for ${timeSlot}` }, 400)
      }
      if (avail.quantity_remaining < qty) {
        return c.json({ error: `Only ${avail.quantity_remaining} portion(s) of "${mi.name}" remaining` }, 400)
      }

      totalAmount += mi.price * qty
      resolvedItems.push({
        id: mi.id,
        qty,
        price: mi.price,
        name: mi.name,
        prepTime: mi.preparation_time_minutes,
        remaining: avail.quantity_remaining,
        prepared: avail.quantity_prepared || mi.daily_capacity
      })
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

    // Insert order items & atomically update stock
    for (const item of resolvedItems) {
      await c.env.DB.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `).bind(orderId, item.id, item.qty, item.price, item.price * item.qty).run()

      const newRemaining = Math.max(0, item.remaining - item.qty)
      const newStatus = newRemaining <= 0 ? 'sold_out' : (newRemaining * 100.0 / Math.max(1, item.prepared) <= 20 ? 'running_low' : 'available')

      await c.env.DB.prepare(`
        UPDATE menu_availability SET
          quantity_sold = quantity_sold + ?,
          quantity_remaining = MAX(0, quantity_remaining - ?),
          status = ?
        WHERE menu_item_id = ? AND date = ? AND time_slot = ?
      `).bind(item.qty, item.qty, newStatus, item.id, today, timeSlot).run()

      // Trigger low stock surge alert if stock is critical
      if (newStatus === 'sold_out' || newStatus === 'running_low') {
        const existingStockAlert = await c.env.DB.prepare(
          "SELECT id FROM surge_alerts WHERE menu_item_id = ? AND time_slot = ? AND date = ? AND alert_type = 'low_stock' AND is_resolved = 0"
        ).bind(item.id, timeSlot, today).first()
        if (!existingStockAlert) {
          const alertMsg = newStatus === 'sold_out'
            ? `${item.name} is SOLD OUT for ${timeSlot}. Prep replenishment recommended.`
            : `${item.name} is RUNNING LOW (${newRemaining} remaining) for ${timeSlot}.`
          await c.env.DB.prepare(`
            INSERT INTO surge_alerts (time_slot, date, menu_item_id, alert_type, message, is_resolved)
            VALUES (?, ?, ?, 'low_stock', ?, 0)
          `).bind(timeSlot, today, item.id, alertMsg).run()
        }
      }
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

    // Dynamic high queue surge alert trigger
    if (queuePos + 1 >= 8) {
      const existingAlert = await c.env.DB.prepare(
        "SELECT id FROM surge_alerts WHERE time_slot = ? AND date = ? AND alert_type = 'high_queue' AND is_resolved = 0"
      ).bind(timeSlot, today).first()
      if (!existingAlert) {
        await c.env.DB.prepare(`
          INSERT INTO surge_alerts (time_slot, date, menu_item_id, alert_type, message, is_resolved)
          VALUES (?, ?, NULL, 'high_queue', ?, 0)
        `).bind(timeSlot, today, `Queue length reached ${queuePos + 1} orders for ${timeSlot}. Est. wait ~${estimatedWait} mins.`).run()
      }
    }

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
    if (isNaN(userId)) return c.json({ error: 'Invalid user ID' }, 400)
    const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') || '10') || 10))
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
    if (isNaN(id)) return c.json({ error: 'Invalid order ID' }, 400)
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
    if (isNaN(id)) return c.json({ error: 'Invalid order ID' }, 400)
    const { status } = await c.req.json()
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) return c.json({ error: 'Invalid status' }, 400)

    const existingOrder = await c.env.DB.prepare(
      'SELECT id, user_id, order_number, time_slot, pickup_slot, status, created_at FROM orders WHERE id = ?'
    ).bind(id).first<any>()

    if (!existingOrder) return c.json({ error: 'Order not found' }, 404)

    // If cancelling an active order, restore inventory
    if (status === 'cancelled' && existingOrder.status !== 'cancelled') {
      const orderDate = existingOrder.created_at ? existingOrder.created_at.split(' ')[0] : new Date().toISOString().split('T')[0]
      const { results: orderItems } = await c.env.DB.prepare(
        'SELECT menu_item_id, quantity FROM order_items WHERE order_id = ?'
      ).bind(id).all<any>()

      for (const item of orderItems) {
        await c.env.DB.prepare(`
          UPDATE menu_availability SET
            quantity_sold = MAX(0, quantity_sold - ?),
            quantity_remaining = quantity_remaining + ?,
            status = CASE 
              WHEN (quantity_remaining + ?) * 100.0 / NULLIF(quantity_prepared, 0) <= 20 THEN 'running_low'
              ELSE 'available'
            END
          WHERE menu_item_id = ? AND date = ? AND time_slot = ?
        `).bind(item.quantity, item.quantity, item.quantity, item.menu_item_id, orderDate, existingOrder.time_slot).run()
      }
    }

    // Calculate actual wait time if completed
    let actualWait: number | null = null
    if (status === 'completed' && existingOrder.created_at) {
      const createdTime = new Date(existingOrder.created_at.includes('T') ? existingOrder.created_at : existingOrder.created_at.replace(' ', 'T') + 'Z').getTime()
      if (!isNaN(createdTime)) {
        actualWait = Math.max(1, Math.round((Date.now() - createdTime) / 60000))
      }
    }

    if (actualWait !== null) {
      await c.env.DB.prepare(
        "UPDATE orders SET status = ?, actual_wait_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(status, actualWait, id).run()
    } else {
      await c.env.DB.prepare(
        "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(status, id).run()
    }

    // Update queue entry status and actual_ready_at
    const queueStatus = status === 'ready' ? 'ready' : status === 'completed' ? 'collected' : status === 'preparing' ? 'processing' : status === 'cancelled' ? 'cancelled' : 'waiting'
    if (status === 'ready' || status === 'completed') {
      await c.env.DB.prepare("UPDATE queue_entries SET status = ?, actual_ready_at = COALESCE(actual_ready_at, CURRENT_TIMESTAMP) WHERE order_id = ?").bind(queueStatus, id).run()
    } else {
      await c.env.DB.prepare("UPDATE queue_entries SET status = ? WHERE order_id = ?").bind(queueStatus, id).run()
    }

    // Notifications on state transition
    if (status === 'ready') {
      await c.env.DB.prepare(`
        INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, 'order_ready', '🍽️ Order Ready!', ?)
      `).bind(existingOrder.user_id, id, `Your order ${existingOrder.order_number} is ready for pickup! Slot: ${existingOrder.pickup_slot || 'Counter'}`).run()
    } else if (status === 'preparing') {
      await c.env.DB.prepare(`
        INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, 'order_delayed', '🍳 Cooking Started', ?)
      `).bind(existingOrder.user_id, id, `The kitchen is now preparing your order ${existingOrder.order_number}.`).run()
    } else if (status === 'completed') {
      await c.env.DB.prepare(`
        INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, 'order_ready', '✅ Order Completed', ?)
      `).bind(existingOrder.user_id, id, `Your order ${existingOrder.order_number} has been collected. Bon appétit!`).run()
    } else if (status === 'cancelled') {
      await c.env.DB.prepare(`
        INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, 'order_delayed', '❌ Order Cancelled', ?)
      `).bind(existingOrder.user_id, id, `Your order ${existingOrder.order_number} was cancelled. Any reserved stock has been refunded.`).run()
    }

    return c.json({ success: true, status, orderNumber: existingOrder.order_number })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get all active orders (kitchen/admin)
orders.get('/active/all', async (c) => {
  try {
    const today = c.req.query('date') || new Date().toISOString().split('T')[0]
    const rawSlot = c.req.query('slot') || 'lunch'
    const validSlots = ['breakfast', 'lunch', 'dinner']
    const timeSlot = validSlots.includes(rawSlot) ? rawSlot : 'lunch'
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
    return c.json({ orders: results, count: results.length, date: today, timeSlot })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get today's stats (admin)
orders.get('/stats/today', async (c) => {
  try {
    const today = c.req.query('date') || new Date().toISOString().split('T')[0]
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
        COALESCE(SUM(CASE WHEN status IN ('confirmed','preparing','pending') THEN 1 ELSE 0 END), 0) as active,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled,
        COALESCE(SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END), 0) as ready,
        COALESCE(ROUND(SUM(total_amount), 2), 0) as total_revenue,
        COALESCE(ROUND(AVG(estimated_wait_minutes), 1), 0) as avg_wait_minutes
      FROM orders WHERE DATE(created_at) = ?
    `).bind(today).first()

    const slotBreakdown = await c.env.DB.prepare(`
      SELECT time_slot, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
      FROM orders WHERE DATE(created_at) = ? GROUP BY time_slot
    `).bind(today).all()

    return c.json({ stats, slotBreakdown: slotBreakdown.results, date: today })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default orders
