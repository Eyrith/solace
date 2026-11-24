import { describe, expect, it } from 'vitest'
import { LRUCache } from '@/lib/cache/lru-cache'

describe('In-Memory LRU Cache with TTL', () => {
  it('stores and retrieves cached values', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 })
    cache.set('a', 1)
    cache.set('b', 2)

    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBeUndefined()
  })

  it('evicts least recently used items when maxSize is reached', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 })
    cache.set('k1', 'val1')
    cache.set('k2', 'val2')
    cache.set('k3', 'val3')

    // Access k1 so k2 becomes the least recently used
    expect(cache.get('k1')).toBe('val1')

    // Add k4; k2 should be evicted
    cache.set('k4', 'val4')

    expect(cache.get('k1')).toBe('val1')
    expect(cache.get('k2')).toBeUndefined()
    expect(cache.get('k3')).toBe('val3')
    expect(cache.get('k4')).toBe('val4')
  })

  it('expires entries after TTL', async () => {
    const cache = new LRUCache<string, string>({ maxSize: 5, defaultTtlMs: 25 })
    cache.set('fast', 'expire-me')
    expect(cache.get('fast')).toBe('expire-me')

    await new Promise((r) => setTimeout(r, 35))
    expect(cache.get('fast')).toBeUndefined()
  })

  it('supports getOrSet with async producer', async () => {
    const cache = new LRUCache<string, { id: number }>({ maxSize: 5 })
    let callCount = 0

    const fetcher = async () => {
      callCount++
      return { id: 42 }
    }

    const res1 = await cache.getOrSet('test-id', fetcher)
    const res2 = await cache.getOrSet('test-id', fetcher)

    expect(res1).toEqual({ id: 42 })
    expect(res2).toEqual({ id: 42 })
    expect(callCount).toBe(1) // Only fetched once!
  })
})
