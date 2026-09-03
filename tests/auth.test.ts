import { hashPassword, verifyPassword } from '../src/routes/auth'

describe('Auth Password Hashing and Verification', () => {
  it('hashes passwords deterministically using SHA-256', async () => {
    const hash1 = await hashPassword('mysecretpassword')
    const hash2 = await hashPassword('mysecretpassword')
    expect(hash1).toBe(hash2)
    expect(hash1.length).toBe(64) // hex string of SHA-256 is 64 chars
  })

  it('correctly verifies matching password against generated hash', async () => {
    const password = 'securePassword123!'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('rejects incorrect password against generated hash', async () => {
    const password = 'correctPassword'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword('wrongPassword', hash)
    expect(isValid).toBe(false)
  })

  it('returns false for empty input or hash', async () => {
    expect(await verifyPassword('', 'somehash')).toBe(false)
    expect(await verifyPassword('password', '')).toBe(false)
  })
})
