// ================================================
// Order State Machine Validator
// ================================================

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export const VALID_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
]

// Allowed state transitions
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed'], // once ready for pickup, cannot be cancelled directly without staff override
  completed: [], // terminal state
  cancelled: []  // terminal state
}

/**
 * Validates whether transitioning from currentStatus to newStatus is permissible.
 */
export function isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  if (currentStatus === newStatus) return true
  const allowed = ALLOWED_TRANSITIONS[currentStatus]
  return allowed ? allowed.includes(newStatus) : false
}

/**
 * Returns human-readable error message when transition is rejected.
 */
export function getTransitionErrorMessage(currentStatus: OrderStatus, newStatus: OrderStatus): string {
  return `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${(ALLOWED_TRANSITIONS[currentStatus] || []).join(', ')}]`
}
