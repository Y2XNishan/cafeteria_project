import { describe, it, expect } from 'vitest'
import { getOperatingHoursInfo, optimizeQueue, getAvailabilityStatus } from '../src/lib/forecast'

describe('Queue Optimization & Operating Hours', () => {
  it('identifies active breakfast operating hours', () => {
    const d = new Date('2026-09-15T08:30:00')
    const info = getOperatingHoursInfo(d)
    expect(info.isOpen).toBe(true)
    expect(info.currentSlot).toBe('breakfast')
  })

  it('identifies active lunch operating hours', () => {
    const d = new Date('2026-09-15T12:30:00')
    const info = getOperatingHoursInfo(d)
    expect(info.isOpen).toBe(true)
    expect(info.currentSlot).toBe('lunch')
  })

  it('identifies active evening snacks operating hours', () => {
    const d = new Date('2026-09-15T17:15:00')
    const info = getOperatingHoursInfo(d)
    expect(info.isOpen).toBe(true)
    expect(info.currentSlot).toBe('snacks')
  })

  it('identifies active dinner operating hours', () => {
    const d = new Date('2026-09-15T20:00:00')
    const info = getOperatingHoursInfo(d)
    expect(info.isOpen).toBe(true)
    expect(info.currentSlot).toBe('dinner')
  })

  it('identifies closed cafeteria hours and predicts next service', () => {
    const d = new Date('2026-09-15T02:00:00')
    const info = getOperatingHoursInfo(d)
    expect(info.isOpen).toBe(false)
    expect(info.currentSlot).toBe('closed')
    expect(info.nextOpenSlot).toBe('Breakfast (07:30)')
  })

  it('calculates queue wait times and flags surge when load exceeds capacity', () => {
    const normalQueue = optimizeQueue(5, 6, 15, 20, new Date('2026-09-15T12:00:00'))
    expect(normalQueue.isSurge).toBe(false)
    expect(normalQueue.currentQueueLength).toBe(5)
    expect(normalQueue.estimatedWaitMinutes).toBeGreaterThan(5)

    const surgeQueue = optimizeQueue(35, 6, 15, 20, new Date('2026-09-15T12:00:00'))
    expect(surgeQueue.isSurge).toBe(true)
  })

  it('determines stock availability status correctly', () => {
    expect(getAvailabilityStatus(0, 50)).toBe('sold_out')
    expect(getAvailabilityStatus(-5, 50)).toBe('sold_out')
    expect(getAvailabilityStatus(5, 50, 20)).toBe('running_low')
    expect(getAvailabilityStatus(35, 50, 20)).toBe('available')
  })
})
