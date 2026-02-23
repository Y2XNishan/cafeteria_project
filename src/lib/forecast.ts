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
  if (historicalValues.length < 2) return 'stable'
  const recent = historicalValues.slice(-3)
  const older = historicalValues.slice(0, -3)
  if (!older.length) return 'stable'
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  if (olderAvg === 0) return 'stable'
  const changePct = (recentAvg - olderAvg) / olderAvg
  if (changePct > 0.1) return 'rising'
  if (changePct < -0.1) return 'falling'
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
  const remaining = prepared - sold
  const soldPct = prepared > 0 ? (sold / prepared) * 100 : 0
  
  if (soldPct >= 90) return `⚠️ Critically low stock! Prepare ${Math.round(predicted * 0.5)} more units immediately.`
  if (soldPct >= 70 && trend === 'rising') return `📈 High demand & rising trend. Recommend preparing ${Math.round(predicted * 0.4)} extra units.`
  if (trend === 'falling') return `📉 Demand falling. Reduce tomorrow's prep by ~15% to minimize waste.`
  if (remaining > predicted * 0.5) return `✅ Well-stocked. Consider reducing tomorrow's prep by ~10%.`
  return `✅ On track. Maintain current preparation of ~${predicted} units.`
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
  const estimatedWaitMinutes = Math.round(queueLength * (avgPrepTimeMinutes / 3))
  const isSurge = queueLength > maxOrdersPerSlot * 2

  // Generate available slots for the next 2 hours
  const slots: PickupSlot[] = []
  const startMinutes = Math.ceil((currentTime.getMinutes() + 5) / slotIntervalMinutes) * slotIntervalMinutes
  let slotStart = new Date(currentTime)
  slotStart.setMinutes(startMinutes, 0, 0)

  for (let i = 0; i < 8; i++) {
    const slotEnd = new Date(slotStart.getTime() + slotIntervalMinutes * 60 * 1000)
    const slotLabel = `${pad(slotStart.getHours())}:${pad(slotStart.getMinutes())}-${pad(slotEnd.getHours())}:${pad(slotEnd.getMinutes())}`
    const orderCount = i < Math.ceil(queueLength / maxOrdersPerSlot) ? maxOrdersPerSlot : 0
    const estimatedWait = i * slotIntervalMinutes + avgPrepTimeMinutes
    slots.push({
      slot: slotLabel,
      available: orderCount < maxOrdersPerSlot,
      orderCount: Math.min(orderCount, maxOrdersPerSlot),
      maxCapacity: maxOrdersPerSlot,
      estimatedWaitMinutes: estimatedWait,
    })
    slotStart = slotEnd
  }

  const nextAvailableSlot = slots.find(s => s.available)?.slot ?? 'No slots available'

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
