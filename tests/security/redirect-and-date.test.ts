import { describe, it, expect } from 'vitest'
import { daysUntilDate, safeRedirectPath } from '@/lib/utils'

describe('Security & Date Utilities', () => {
  it('safeRedirectPath allows safe relative paths and rejects open redirects', () => {
    expect(safeRedirectPath('/home', '/')).toBe('/home')
    expect(safeRedirectPath('/invite/abc123?ref=mail#top', '/')).toBe('/invite/abc123?ref=mail#top')

    expect(safeRedirectPath('https://evil.com/phish', '/home')).toBe('/home')
    expect(safeRedirectPath('//evil.com/phish', '/home')).toBe('/home')
    expect(safeRedirectPath('/\\evil.com', '/home')).toBe('/home')
    expect(safeRedirectPath('/ok\\next', '/home')).toBe('/home')
    expect(safeRedirectPath('/ok\r\nSet-Cookie: a=1', '/home')).toBe('/home')
    expect(safeRedirectPath('', '/home')).toBe('/home')
    expect(safeRedirectPath(null, '/home')).toBe('/home')
  })

  it('daysUntilDate computes non-negative countdowns and annual wrap-around', () => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')

    expect(daysUntilDate(`${yyyy}-${mm}-${dd}`, false)).toBe(0)
    expect(daysUntilDate('invalid-date', false)).toBe(0)

    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const tStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    expect(daysUntilDate(tStr, false)).toBe(1)
    expect(daysUntilDate(tStr, true)).toBe(1)

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yStr = `${yesterday.getFullYear() - 2}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    expect(daysUntilDate(yStr, false)).toBe(0)
    expect(daysUntilDate(yStr, true)).toBeGreaterThanOrEqual(364)
  })
})

