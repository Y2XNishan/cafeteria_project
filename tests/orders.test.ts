import { assignPickupSlot } from '../src/routes/orders'

describe('Orders Utility Functions', () => {
  describe('assignPickupSlot', () => {
    it('calculates pickup slot formatted as HH:MM-HH:MM', () => {
      const slot = assignPickupSlot(0, 'lunch', 15, 20)
      expect(slot).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
    })

    it('assigns later time slot when queue position exceeds maxPerSlot', () => {
      const slot0 = assignPickupSlot(0, 'lunch', 15, 20)
      const slot25 = assignPickupSlot(25, 'lunch', 15, 20)
      expect(slot0).not.toBe(slot25)
    })
  })
})
