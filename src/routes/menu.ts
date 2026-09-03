// ================================================
// Menu Routes
// ================================================
import { Hono } from 'hono'
import { getAvailabilityStatus } from '../lib/forecast'

type Bindings = { DB: D1Database }

export interface MenuItemCreatePayload {
  categoryId: number
  name: string
  description?: string
  price: number
  preparationTime?: number
  dailyCapacity?: number
}

const menu = new Hono<{ Bindings: Bindings }>()

const SQL_INSERT_MENU_AVAILABILITY = `
  INSERT OR IGNORE INTO menu_availability (menu_item_id, date, time_slot, quantity_prepared, quantity_sold, quantity_remaining, status)
  SELECT id, ?, ?, daily_capacity, 0, daily_capacity, 'available'
  FROM menu_items
  WHERE is_active = 1
`

// Helper to ensure daily availability rows exist for active menu items
export async function ensureDailyAvailability(db: D1Database, date: string, timeSlot: string) {
  try {
    await db.prepare(SQL_INSERT_MENU_AVAILABILITY).bind(date, timeSlot).run()
  } catch (e) {
    console.error('Error auto-initializing menu availability:', e)
  }
}

// Get full menu with today's availability
menu.get('/', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const timeSlot = c.req.query('slot') || 'lunch'

    // Auto-initialize today's stock if missing
    await ensureDailyAvailability(c.env.DB, today, timeSlot)

    const { results: items } = await c.env.DB.prepare(`
      SELECT mi.id, mi.name, mi.description, mi.price, mi.preparation_time_minutes,
             mi.daily_capacity, mi.image_url, mi.is_active,
             c.name as category_name, c.id as category_id,
             COALESCE(ma.quantity_prepared, mi.daily_capacity) as quantity_prepared,
             COALESCE(ma.quantity_sold, 0) as quantity_sold,
             COALESCE(ma.quantity_remaining, mi.daily_capacity) as quantity_remaining,
             COALESCE(ma.status, 'available') as status
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      LEFT JOIN menu_availability ma ON ma.menu_item_id = mi.id 
        AND ma.date = ? AND ma.time_slot = ?
      WHERE mi.is_active = 1
      ORDER BY c.display_order, mi.name
    `).bind(today, timeSlot).all()

    // Group by category
    const grouped: Record<string, any> = {}
    for (const item of items as any[]) {
      if (!grouped[item.category_name]) {
        grouped[item.category_name] = { id: item.category_id, name: item.category_name, items: [] }
      }
      grouped[item.category_name].items.push({
        ...item,
        availability_badge: item.status === 'sold_out' ? 'Sold Out' 
          : item.status === 'running_low' ? 'Running Low' : 'Available',
        badge_color: item.status === 'sold_out' ? 'red' 
          : item.status === 'running_low' ? 'yellow' : 'green',
      })
    }

    return c.json({ categories: Object.values(grouped), date: today, timeSlot })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get single item detail
menu.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ error: 'Invalid item ID' }, 400)
    const today = new Date().toISOString().split('T')[0]
    const slot = c.req.query('slot') || 'lunch'

    const item = await c.env.DB.prepare(`
      SELECT mi.*, c.name as category_name,
             COALESCE(ma.quantity_prepared, mi.daily_capacity) as quantity_prepared,
             COALESCE(ma.quantity_sold, 0) as quantity_sold,
             COALESCE(ma.quantity_remaining, mi.daily_capacity) as quantity_remaining,
             COALESCE(ma.status, 'available') as status,
             df.predicted_quantity, df.confidence_score
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      LEFT JOIN menu_availability ma ON ma.menu_item_id = mi.id AND ma.date = ? AND ma.time_slot = ?
      LEFT JOIN demand_forecasts df ON df.menu_item_id = mi.id AND df.forecast_date = ? AND df.time_slot = ?
      WHERE mi.id = ?
    `).bind(today, slot, today, slot, id).first()
    if (!item) return c.json({ error: 'Item not found' }, 404)
    return c.json({ item })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Update availability (kitchen staff)
menu.put('/:id/availability', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const { date, timeSlot, quantitySold, quantityPrepared } = await c.req.json()
    const today = date || new Date().toISOString().split('T')[0]
    const slot = timeSlot || 'lunch'

    // Get existing record
    const existing = await c.env.DB.prepare(
      'SELECT * FROM menu_availability WHERE menu_item_id = ? AND date = ? AND time_slot = ?'
    ).bind(id, today, slot).first<any>()

    const newSold = quantitySold ?? existing?.quantity_sold ?? 0
    const newPrepared = quantityPrepared ?? existing?.quantity_prepared ?? 0
    const remaining = Math.max(0, newPrepared - newSold)

    const item = await c.env.DB.prepare('SELECT daily_capacity FROM menu_items WHERE id = ?').bind(id).first<any>()
    const status = getAvailabilityStatus(remaining, newPrepared || item?.daily_capacity || 50)

    await c.env.DB.prepare(`
      INSERT INTO menu_availability (menu_item_id, date, time_slot, quantity_prepared, quantity_sold, quantity_remaining, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(menu_item_id, date, time_slot) DO UPDATE SET
        quantity_prepared = excluded.quantity_prepared,
        quantity_sold = excluded.quantity_sold,
        quantity_remaining = excluded.quantity_remaining,
        status = excluded.status
    `).bind(id, today, slot, newPrepared, newSold, remaining, status).run()

    return c.json({ success: true, status, remaining })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Add menu item (admin)
menu.post('/', async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Invalid request payload' }, 400)
    }
    const { categoryId, name, description, price, preparationTime, dailyCapacity } = body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return c.json({ error: 'Item name is required' }, 400)
    }
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 10000) {
      return c.json({ error: 'Price must be between ₹0.01 and ₹10,000' }, 400)
    }
    const parsedCatId = parseInt(categoryId)
    if (isNaN(parsedCatId) || parsedCatId <= 0) {
      return c.json({ error: 'Valid category is required' }, 400)
    }
    const prepMins = Math.min(120, Math.max(1, parseInt(preparationTime) || 5))
    const cap = Math.min(1000, Math.max(1, parseInt(dailyCapacity) || 50))

    const result = await c.env.DB.prepare(`
      INSERT INTO menu_items (category_id, name, description, price, preparation_time_minutes, daily_capacity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(parsedCatId, name.trim(), (description || '').trim(), parsedPrice, prepMins, cap).run()

    const newId = result.meta.last_row_id || (result.meta as any).lastRowId

    return c.json({
      success: true,
      id: newId,
      message: 'Menu item created successfully'
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Toggle item active status (admin)
menu.patch('/:id/toggle', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ error: 'Invalid item ID' }, 400)

    const existing = await c.env.DB.prepare('SELECT id, name, is_active FROM menu_items WHERE id = ?').bind(id).first<any>()
    if (!existing) return c.json({ error: 'Menu item not found' }, 404)

    const newStatus = existing.is_active === 1 ? 0 : 1
    await c.env.DB.prepare('UPDATE menu_items SET is_active = ? WHERE id = ?').bind(newStatus, id).run()

    return c.json({
      success: true,
      item: { id, name: existing.name, is_active: newStatus },
      message: `Item "${existing.name}" is now ${newStatus === 1 ? 'active' : 'inactive'}`
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get categories
menu.get('/categories/all', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order').all()
    return c.json({ categories: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Add category (admin)
menu.post('/categories', async (c) => {
  try {
    const { name, description, displayOrder } = await c.req.json()
    if (!name || typeof name !== 'string') return c.json({ error: 'Category name is required' }, 400)
    const result = await c.env.DB.prepare(
      'INSERT INTO categories (name, description, display_order, is_active) VALUES (?, ?, ?, 1)'
    ).bind(name.trim(), description || '', displayOrder || 0).run()
    const newId = result.meta.last_row_id || (result.meta as any).lastRowId
    return c.json({ success: true, id: newId, message: 'Category created' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default menu
