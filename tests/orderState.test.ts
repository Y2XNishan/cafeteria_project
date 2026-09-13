import { isValidStatusTransition, getTransitionErrorMessage, VALID_STATUSES, OrderStatus } from '../src/lib/orderState'

describe('Order State Machine', () => {
  it('allows valid forward transitions in normal order workflow', () => {
    expect(isValidStatusTransition('pending', 'confirmed')).toBe(true)
    expect(isValidStatusTransition('confirmed', 'preparing')).toBe(true)
    expect(isValidStatusTransition('preparing', 'ready')).toBe(true)
    expect(isValidStatusTransition('ready', 'completed')).toBe(true)
  })

  it('allows cancellation from pending, confirmed, and preparing states', () => {
    expect(isValidStatusTransition('pending', 'cancelled')).toBe(true)
    expect(isValidStatusTransition('confirmed', 'cancelled')).toBe(true)
    expect(isValidStatusTransition('preparing', 'cancelled')).toBe(true)
  })

  it('rejects invalid backward transitions and terminal state transitions', () => {
    expect(isValidStatusTransition('completed', 'pending')).toBe(false)
    expect(isValidStatusTransition('completed', 'ready')).toBe(false)
    expect(isValidStatusTransition('cancelled', 'confirmed')).toBe(false)
    expect(isValidStatusTransition('ready', 'preparing')).toBe(false)
    expect(isValidStatusTransition('ready', 'cancelled')).toBe(false)
  })

  it('returns true for idempotent transition to identical status', () => {
    expect(isValidStatusTransition('confirmed', 'confirmed')).toBe(true)
    expect(isValidStatusTransition('preparing', 'preparing')).toBe(true)
  })

  it('generates descriptive error messages for rejected transitions', () => {
    const errorMsg = getTransitionErrorMessage('completed', 'pending')
    expect(errorMsg).toContain("Invalid status transition from 'completed' to 'pending'")
  })

  it('defines all standard valid statuses', () => {
    expect(VALID_STATUSES).toEqual(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
  })
})
