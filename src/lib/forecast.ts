// ================================================
// Demand Forecasting Engine
// Uses weighted moving average + day-of-week factor
// ================================================

export interface ForecastResult {
  menuItemId: number
  menuItemName: string
  timeSlot: string
  predictedQuantity: number
  confidenceScore: number
  trend: 'rising' | 'stable' | 'falling'
  recommendation: string
}

export interface QueueOptimizationResult {
  currentQueueLength: number
  estimatedWaitMinutes: number
  availableSlots: PickupSlot[]
  nextAvailableSlot: string
  isSurge: boolean
}

export interface PickupSlot {
  slot: string
  available: boolean
  orderCount: number
  maxCapacity: number
  estimatedWaitMinutes: number
}

// Day-of-week demand multipliers (0=Sun, 1=Mon, ..., 6=Sat)
const DAY_MULTIPLIERS: Record<number, number> = {
  0: 0.6,  // Sunday - low
  1: 1.1,  // Monday - above average
  2: 1.2,  // Tuesday - peak
  3: 1.15, // Wednesday
  4: 1.2,  // Thursday - peak
  5: 1.0,  // Friday - average
  6: 0.5,  // Saturday - very low
}

// Time slot base demand multipliers
const SLOT_MULTIPLIERS: Record<string, number> = {
  breakfast: 0.7,
  lunch: 1.0,
  dinner: 0.8,
}

/**
 * Weighted moving average forecast from historical order counts
 * Recent data gets higher weight
 */
export function weightedMovingAverage(historicalValues: number[], weights?: number[]): number {
  if (!historicalValues.length) return 0
  const n = historicalValues.length
  const w = weights || historicalValues.map((_, i) => i + 1) // linear weights
  const totalWeight = w.reduce((sum, wi) => sum + wi, 0)
  const weightedSum = historicalValues.reduce((sum, val, i) => sum + val * w[i], 0)
  return Math.round(weightedSum / totalWeight)
}

/**
 * Calculate confidence score based on variance in historical data
 */
export function calculateConfidence(historicalValues: number[]): number {
  if (historicalValues.length < 2) return 0.75
  const avg = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length
  if (avg === 0) return 0.75
  const variance = historicalValues.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / historicalValues.length
  const cv = Math.sqrt(variance) / avg // coefficient of variation
  // Lower CV = higher confidence
  const confidence = Math.max(0.5, Math.min(0.99, 1 - cv * 0.5))
  return Math.round(confidence * 100) / 100
}

/**
 * Detect demand trend from historical data
 */
export function detectTrend(historicalValues: number[]): 'rising' | 'stable' | 'falling' {
  if (!historicalValues || historicalValues.length < 2) return 'stable'
  const valid = historicalValues.filter(v => typeof v === 'number' && !isNaN(v))
  if (valid.length < 2) return 'stable'

  const half = Math.floor(valid.length / 2)
  const firstHalf = valid.slice(0, half)
  const secondHalf = valid.slice(half)

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  if (firstAvg === 0 && secondAvg === 0) return 'stable'
  if (firstAvg === 0 && secondAvg > 0) return 'rising'

  const changePct = (secondAvg - firstAvg) / Math.max(1, firstAvg)
  if (changePct > 0.12) return 'rising'
  if (changePct < -0.12) return 'falling'
  return 'stable'
}

/**
 * Main forecast function: generate predicted quantity for a menu item
 */
export function forecastDemand(
  historicalCounts: number[],
  targetDate: Date,
  timeSlot: string,
  dailyCapacity: number
): { predicted: number; confidence: number; trend: 'rising' | 'stable' | 'falling' } {
  const dayMultiplier = DAY_MULTIPLIERS[targetDate.getDay()] ?? 1.0
  const slotMultiplier = SLOT_MULTIPLIERS[timeSlot] ?? 1.0
  const basePredict = weightedMovingAverage(historicalCounts)
  const adjusted = Math.round(basePredict * dayMultiplier * slotMultiplier)
  const predicted = Math.min(Math.max(adjusted, 1), dailyCapacity)
  const confidence = calculateConfidence(historicalCounts)
  const trend = detectTrend(historicalCounts)
  return { predicted, confidence, trend }
}

/**
 * Generate preparation recommendation text
 */
export function generateRecommendation(
  predicted: number,
  prepared: number,
  sold: number,
  trend: 'rising' | 'stable' | 'falling',
  confidence: number
): string {
  const remaining = Math.max(0, prepared - sold)
  const soldPct = prepared > 0 ? (sold / prepared) * 100 : 0
  const prepDeficit = predicted - prepared

  if (soldPct >= 95 || remaining <= 2) {
    const replenish = Math.max(5, Math.round(predicted * 0.4))
    return `⚠️ Sold out or critical (<2 left). Prepare +${replenish} units immediately for upcoming rush.`
  }
  if (soldPct >= 75 && trend === 'rising') {
    const extra = Math.max(4, Math.round(predicted * 0.3))
    return `📈 High demand surge & rising trend (${soldPct.toFixed(0)}% sold). Recommend +${extra} extra units.`
  }
  if (prepDeficit > 10 && remaining < 15) {
    return `⚡ Forecast is ${predicted} units, but only ${prepared} prepared. Prep +${prepDeficit} more to meet target.`
  }
  if (trend === 'falling' && remaining > predicted * 0.4) {
    return `📉 Demand trending down. Reduce next cycle prep by ~15% to minimize food waste.`
  }
  if (remaining > predicted * 0.7 && soldPct < 30) {
    return `✅ Well-stocked (${remaining} remaining). Hold further batch cooking for this slot.`
  }
  if (confidence >= 0.85) {
    return `✅ High forecast confidence (${Math.round(confidence * 100)}%). Maintain preparation target at ~${predicted} units.`
  }
  return `✅ On track. Maintain steady preparation of ~${predicted} units.`
}

/**
 * Queue optimization: calculate wait times and assign pickup slots
 */
export function optimizeQueue(
  queueLength: number,
  avgPrepTimeMinutes: number,
  slotIntervalMinutes: number,
  maxOrdersPerSlot: number,
  currentTime: Date
): QueueOptimizationResult {
  const avgPrep = Math.max(2, Math.round(avgPrepTimeMinutes || 5))
  const estimatedWaitMinutes = queueLength === 0 ? avgPrep : Math.round(queueLength * (avgPrep / 2) + avgPrep)
  const isSurge = queueLength >= maxOrdersPerSlot * 1.5

  // Generate available slots for the next 2 hours
  const slots: PickupSlot[] = []
  const currentMs = currentTime.getTime()
  const intervalMs = slotIntervalMinutes * 60 * 1000
  // Round up to next slot interval with a 5-minute prep buffer
  const startMs = Math.ceil((currentMs + 5 * 60 * 1000) / intervalMs) * intervalMs

  let slotStart = new Date(startMs)

  for (let i = 0; i < 8; i++) {
    const slotEnd = new Date(slotStart.getTime() + intervalMs)
    const slotLabel = `${pad(slotStart.getHours())}:${pad(slotStart.getMinutes())}-${pad(slotEnd.getHours())}:${pad(slotEnd.getMinutes())}`
    const orderCount = i < Math.floor(queueLength / maxOrdersPerSlot)
      ? maxOrdersPerSlot
      : (i === Math.floor(queueLength / maxOrdersPerSlot) ? queueLength % maxOrdersPerSlot : 0)
    const estimatedWait = i * slotIntervalMinutes + avgPrep
    slots.push({
      slot: slotLabel,
      available: orderCount < maxOrdersPerSlot,
      orderCount: Math.min(orderCount, maxOrdersPerSlot),
      maxCapacity: maxOrdersPerSlot,
      estimatedWaitMinutes: estimatedWait,
    })
    slotStart = slotEnd
  }

  const nextAvailableSlot = slots.find(s => s.available)?.slot ?? slots[0]?.slot ?? 'No slots available'

  return {
    currentQueueLength: queueLength,
    estimatedWaitMinutes,
    availableSlots: slots,
    nextAvailableSlot,
    isSurge,
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Determine availability status based on remaining stock
 */
export function getAvailabilityStatus(
  remaining: number,
  prepared: number,
  lowStockThresholdPct: number = 20
): 'available' | 'running_low' | 'sold_out' {
  if (remaining <= 0) return 'sold_out'
  const remainingPct = (remaining / prepared) * 100
  if (remainingPct <= lowStockThresholdPct) return 'running_low'
  return 'available'
}
