import { describe, it, expect } from 'vitest'

describe('Menu Validation and Clamping Logic', () => {
  it('clamps preparation time between 1 and 180 minutes', () => {
    const clampPrep = (val: any) => {
      const raw = parseInt(val)
      return isNaN(raw) ? 5 : Math.min(180, Math.max(1, raw))
    }

    expect(clampPrep('0')).toBe(1)
    expect(clampPrep('-10')).toBe(1)
    expect(clampPrep('500')).toBe(180)
    expect(clampPrep('15')).toBe(15)
    expect(clampPrep('invalid')).toBe(5)
  })

  it('clamps daily capacity between 5 and 1000 units', () => {
    const clampCap = (val: any) => {
      const raw = parseInt(val)
      return isNaN(raw) ? 50 : Math.min(1000, Math.max(5, raw))
    }

    expect(clampCap('0')).toBe(5)
    expect(clampCap('3')).toBe(5)
    expect(clampCap('5000')).toBe(1000)
    expect(clampCap('150')).toBe(150)
    expect(clampCap('undefined')).toBe(50)
  })

  it('validates and clamps menu item prices strictly between ₹1 and ₹5000', () => {
    const validatePrice = (val: any) => {
      const raw = parseFloat(val)
      if (isNaN(raw) || raw < 1 || raw > 5000) {
        return { valid: false, error: 'Price must be between ₹1.00 and ₹5,000.00' }
      }
      return { valid: true, price: Math.round(raw * 100) / 100 }
    }

    expect(validatePrice('0').valid).toBe(false)
    expect(validatePrice('-5.5').valid).toBe(false)
    expect(validatePrice('5001').valid).toBe(false)
    expect(validatePrice('abc').valid).toBe(false)
    expect(validatePrice('45.505')).toEqual({ valid: true, price: 45.51 })
    expect(validatePrice('120')).toEqual({ valid: true, price: 120 })
  })

  it('sanitizes item names and descriptions by stripping HTML tags', () => {
    const sanitizeText = (text: string, maxLen: number) => {
      return text.trim().slice(0, maxLen).replace(/<[^>]*>?/gm, '')
    }

    const dirtyName = '<script>alert("hack")</script>Delicious Thali'
    expect(sanitizeText(dirtyName, 100)).toBe('alert("hack")Delicious Thali')
    expect(sanitizeText('<b>Spicy</b> Paneer', 100)).toBe('Spicy Paneer')
  })
})
