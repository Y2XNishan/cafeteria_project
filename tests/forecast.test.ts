import {
  weightedMovingAverage,
  calculateConfidence,
  detectTrend,
  forecastDemand,
  getAvailabilityStatus,
} from '../src/lib/forecast'

describe('Demand Forecast Engine', () => {
  describe('weightedMovingAverage', () => {
    it('returns 0 for empty historical values', () => {
      expect(weightedMovingAverage([])).toBe(0)
    })

    it('calculates weighted average correctly giving higher weight to recent data', () => {
      const historical = [10, 20, 30]
      // Weights: 1, 2, 3 -> (10*1 + 20*2 + 30*3) / (1+2+3) = 140 / 6 = 23.33 -> 23
      expect(weightedMovingAverage(historical)).toBe(23)
    })
  })

  describe('calculateConfidence', () => {
    it('returns baseline confidence for short arrays', () => {
      expect(calculateConfidence([10])).toBe(0.75)
    })

    it('returns higher confidence score for low variance data', () => {
      const score = calculateConfidence([20, 20, 20, 20])
      expect(score).toBeGreaterThan(0.9)
    })
  })

  describe('detectTrend', () => {
    it('detects rising trend when recent values are higher', () => {
      expect(detectTrend([10, 12, 25, 30])).toBe('rising')
    })

    it('detects falling trend when recent values are lower', () => {
      expect(detectTrend([30, 28, 12, 10])).toBe('falling')
    })

    it('detects stable trend when values fluctuate moderately', () => {
      expect(detectTrend([20, 21, 19, 20])).toBe('stable')
    })
  })

  describe('forecastDemand', () => {
    it('clamps forecast to daily capacity', () => {
      const result = forecastDemand([100, 150, 200], new Date('2026-09-02'), 'lunch', 50)
      expect(result.predicted).toBeLessThanOrEqual(50)
    })
  })

  describe('getAvailabilityStatus', () => {
    it('returns sold_out when remaining is 0', () => {
      expect(getAvailabilityStatus(0, 50)).toBe('sold_out')
    })

    it('returns running_low when remaining <= 20% of prepared', () => {
      expect(getAvailabilityStatus(5, 50)).toBe('running_low')
    })

    it('returns available when stock is plentiful', () => {
      expect(getAvailabilityStatus(40, 50)).toBe('available')
    })
  })
})
