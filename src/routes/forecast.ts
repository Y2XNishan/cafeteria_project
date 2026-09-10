// ================================================
// Forecast Routes - Demand Prediction Engine
// ================================================
import { Hono } from 'hono'
import { forecastDemand, generateRecommendation } from '../lib/forecast'

type Bindings = { DB: D1Database }

export interface ForecastPredictionResponse {
  menuItemId: number
  menuItemName: string
  predictedQuantity: number
  confidencePct: number
  trend: string
  recommendation: string
}

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

    // Get all historical order counts (last 14 days) in a single query
    const { results: allHistory } = await c.env.DB.prepare(`
      SELECT oi.menu_item_id, DATE(o.created_at) as order_date, COALESCE(SUM(oi.quantity), 0) as qty
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.time_slot = ?
        AND DATE(o.created_at) < ? AND DATE(o.created_at) >= DATE(?, '-14 days')
      GROUP BY oi.menu_item_id, DATE(o.created_at)
      ORDER BY order_date ASC
    `).bind(timeSlot, dateStr, dateStr).all<{ menu_item_id: number; order_date: string; qty: number }>()

    // Index history by menu_item_id -> date -> qty
    const itemHistoryMap = new Map<number, Map<string, number>>()
    for (const h of allHistory) {
      if (!itemHistoryMap.has(h.menu_item_id)) {
        itemHistoryMap.set(h.menu_item_id, new Map<string, number>())
      }
      itemHistoryMap.get(h.menu_item_id)!.set(h.order_date, h.qty)
    }

    // Get today's actual data for all items in a single query
    const { results: allActual } = await c.env.DB.prepare(`
      SELECT ma.menu_item_id, ma.quantity_sold, ma.quantity_prepared, ma.quantity_remaining, ma.status
      FROM menu_availability ma
      WHERE ma.date = ? AND ma.time_slot = ?
    `).bind(dateStr, timeSlot).all<{ menu_item_id: number; quantity_sold: number; quantity_prepared: number; quantity_remaining: number; status: string }>()

    const actualMap = new Map<number, typeof allActual[0]>()
    for (const act of allActual) {
      actualMap.set(act.menu_item_id, act)
    }

    const forecasts = []
    const upsertStatements = []

    for (const item of menuItems) {
      const historyMap = itemHistoryMap.get(item.id) || new Map<string, number>()

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
        : (historyMap.size > 0 ? Array.from(historyMap.values()) : [Math.round(item.daily_capacity * 0.6)])

      const { predicted, confidence, trend } = forecastDemand(
        historicalCounts, targetDate, timeSlot, item.daily_capacity
      )

      const actual = actualMap.get(item.id)

      const recommendation = generateRecommendation(
        predicted,
        actual?.quantity_prepared ?? predicted,
        actual?.quantity_sold ?? 0,
        trend,
        confidence
      )

      // Queue upsert statement for batch execution
      upsertStatements.push(
        c.env.DB.prepare(`
          INSERT INTO demand_forecasts (menu_item_id, forecast_date, time_slot, predicted_quantity, confidence_score)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(menu_item_id, forecast_date, time_slot) DO UPDATE SET
            predicted_quantity = excluded.predicted_quantity,
            confidence_score = excluded.confidence_score
        `).bind(item.id, dateStr, timeSlot, predicted, confidence)
      )

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
        accuracy: (actual?.quantity_sold !== undefined && actual?.quantity_sold !== null)
          ? Math.max(0, Math.min(100, Math.round((1 - Math.abs(actual.quantity_sold - predicted) / Math.max(predicted, actual.quantity_sold, 1)) * 100)))
          : null
      })
    }

    // Execute all upserts in a single batch call
    if (upsertStatements.length > 0) {
      await c.env.DB.batch(upsertStatements)
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
        ROUND(SUM(oi.quantity) * 1.0 / MAX(1, COUNT(DISTINCT DATE(o.created_at))), 1) as avg_per_day
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
      SELECT mi.name, mi.price,
             COALESCE(SUM(oi.quantity), 0) as total_sold,
             COALESCE(ROUND(SUM(oi.subtotal), 2), 0) as total_revenue,
             COUNT(DISTINCT oi.order_id) as times_ordered
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled'
      GROUP BY mi.id, mi.name, mi.price
      ORDER BY total_sold DESC
      LIMIT ?
    `).bind(limit).all()
    return c.json({ topItems: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default forecast
