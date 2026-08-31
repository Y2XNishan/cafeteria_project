// ================================================
// Forecast Routes - Demand Prediction Engine
// ================================================
import { Hono } from 'hono'
import { forecastDemand, generateRecommendation } from '../lib/forecast'

type Bindings = { DB: D1Database }

const forecast = new Hono<{ Bindings: Bindings }>()

// Generate & return forecasts for a date + time slot
forecast.get('/predict', async (c) => {
  try {
    const timeSlot = c.req.query('slot') || 'lunch'
    const dateStr = c.req.query('date') || new Date().toISOString().split('T')[0]
    const targetDate = new Date(dateStr)

    // Get all active menu items
    const { results: menuItems } = await c.env.DB.prepare(
      'SELECT id, name, daily_capacity, preparation_time_minutes FROM menu_items WHERE is_active = 1'
    ).all<{ id: number; name: string; daily_capacity: number; preparation_time_minutes: number }>()

    const forecasts = []

    for (const item of menuItems) {
      // Get historical order counts (last 14 days) for this item + slot
      const { results: history } = await c.env.DB.prepare(`
        SELECT DATE(o.created_at) as order_date, COALESCE(SUM(oi.quantity), 0) as qty
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE oi.menu_item_id = ? AND o.time_slot = ?
          AND DATE(o.created_at) < ? AND DATE(o.created_at) >= DATE(?, '-14 days')
        GROUP BY DATE(o.created_at)
        ORDER BY order_date ASC
      `).bind(item.id, timeSlot, dateStr, dateStr).all<{ order_date: string; qty: number }>()

      const historyMap = new Map<string, number>()
      for (const h of history) {
        historyMap.set(h.order_date, h.qty)
      }

      // Build continuous chronological data points
      const paddedCounts: number[] = []
      for (let i = 14; i >= 1; i--) {
        const d = new Date(targetDate.getTime() - i * 24 * 3600 * 1000)
        const dStr = d.toISOString().split('T')[0]
        if (historyMap.has(dStr)) {
          paddedCounts.push(historyMap.get(dStr)!)
        }
      }

      const historicalCounts = paddedCounts.length > 0
        ? paddedCounts
        : (history.length > 0 ? history.map(h => h.qty) : [Math.round(item.daily_capacity * 0.6)])

      const { predicted, confidence, trend } = forecastDemand(
        historicalCounts, targetDate, timeSlot, item.daily_capacity
      )

      // Get today's actual data
      const actual = await c.env.DB.prepare(`
        SELECT ma.quantity_sold, ma.quantity_prepared, ma.quantity_remaining, ma.status
        FROM menu_availability ma
        WHERE ma.menu_item_id = ? AND ma.date = ? AND ma.time_slot = ?
      `).bind(item.id, dateStr, timeSlot).first<any>()

      const recommendation = generateRecommendation(
        predicted,
        actual?.quantity_prepared ?? predicted,
        actual?.quantity_sold ?? 0,
        trend,
        confidence
      )

      // Upsert forecast to DB
      await c.env.DB.prepare(`
        INSERT INTO demand_forecasts (menu_item_id, forecast_date, time_slot, predicted_quantity, confidence_score)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(menu_item_id, forecast_date, time_slot) DO UPDATE SET
          predicted_quantity = excluded.predicted_quantity,
          confidence_score = excluded.confidence_score
      `).bind(item.id, dateStr, timeSlot, predicted, confidence).run()

      forecasts.push({
        menuItemId: item.id,
        menuItemName: item.name,
        timeSlot,
        predictedQuantity: predicted,
        confidenceScore: confidence,
        confidencePct: Math.round(confidence * 100),
        trend,
        recommendation,
        actualSold: actual?.quantity_sold ?? null,
        actualStatus: actual?.status ?? 'not_tracked',
        accuracy: actual?.quantity_sold
          ? Math.round((1 - Math.abs(actual.quantity_sold - predicted) / predicted) * 100)
          : null
      })
    }

    // Sort by predicted quantity desc
    forecasts.sort((a, b) => b.predictedQuantity - a.predictedQuantity)

    return c.json({
      forecasts,
      date: dateStr,
      timeSlot,
      generatedAt: new Date().toISOString(),
      summary: {
        totalItems: forecasts.length,
        highDemand: forecasts.filter(f => f.predictedQuantity >= 60).length,
        avgConfidence: Math.round(forecasts.reduce((sum, f) => sum + f.confidencePct, 0) / forecasts.length)
      }
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Get stored forecasts for kitchen display
forecast.get('/stored', async (c) => {
  try {
    const timeSlot = c.req.query('slot') || 'lunch'
    const dateStr = c.req.query('date') || new Date().toISOString().split('T')[0]

    const { results } = await c.env.DB.prepare(`
      SELECT df.*, mi.name as item_name, mi.daily_capacity,
             ma.quantity_prepared, ma.quantity_sold, ma.quantity_remaining, ma.status as availability_status
      FROM demand_forecasts df
      JOIN menu_items mi ON mi.id = df.menu_item_id
      LEFT JOIN menu_availability ma ON ma.menu_item_id = df.menu_item_id 
        AND ma.date = df.forecast_date AND ma.time_slot = df.time_slot
      WHERE df.forecast_date = ? AND df.time_slot = ?
      ORDER BY df.predicted_quantity DESC
    `).bind(dateStr, timeSlot).all()

    return c.json({ forecasts: results, date: dateStr, timeSlot })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Weekly demand summary (admin analytics)
forecast.get('/weekly', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        mi.name as item_name,
        o.time_slot,
        SUM(oi.quantity) as total_sold,
        COUNT(DISTINCT DATE(o.created_at)) as days_active,
        ROUND(AVG(oi.quantity), 1) as avg_per_day
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.created_at >= DATE('now', '-7 days') AND o.status != 'cancelled'
      GROUP BY mi.id, o.time_slot
      ORDER BY total_sold DESC
    `).all()

    return c.json({ weekly: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Top items analytics
forecast.get('/top-items', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '5')
    const { results } = await c.env.DB.prepare(`
      SELECT mi.name, mi.price, SUM(oi.quantity) as total_sold,
             SUM(oi.subtotal) as total_revenue,
             COUNT(DISTINCT oi.order_id) as times_ordered
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled'
      GROUP BY mi.id
      ORDER BY total_sold DESC
      LIMIT ?
    `).bind(limit).all()
    return c.json({ topItems: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default forecast
