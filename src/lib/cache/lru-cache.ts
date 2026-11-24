/**
 * High-performance In-Memory LRU Cache with TTL support.
 * Used for caching static data, curriculum degrees, editorial categories,
 * and high-frequency Supabase query results without redundant network hops.
 */

interface CacheEntry<V> {
  value: V
  expiresAt: number | null
}

export class LRUCache<K = string, V = unknown> {
  private cache = new Map<K, CacheEntry<V>>()
  private readonly maxSize: number
  private readonly defaultTtlMs: number | null

  constructor(options: { maxSize?: number; defaultTtlMs?: number } = {}) {
    this.maxSize = Math.max(1, options.maxSize ?? 500)
    this.defaultTtlMs = options.defaultTtlMs !== undefined ? options.defaultTtlMs : 5 * 60 * 1000 // 5 minutes default
  }

  get size(): number {
    return this.cache.size
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check expiration
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    // Refresh LRU order (delete & re-insert)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  set(key: K, value: V, ttlMs?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first item in Map)
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs
    const expiresAt = effectiveTtl !== null ? Date.now() + effectiveTtl : null

    this.cache.set(key, { value, expiresAt })
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  /**
   * Helper to retrieve from cache or execute producer if missing/expired.
   */
  async getOrSet(key: K, producer: () => Promise<V>, ttlMs?: number): Promise<V> {
    const cached = this.get(key)
    if (cached !== undefined) {
      return cached
    }
    const fresh = await producer()
    this.set(key, fresh, ttlMs)
    return fresh
  }
}

// Global singletons for static data categories & curricula
export const staticCategoryCache = new LRUCache<string, any>({ maxSize: 100, defaultTtlMs: 15 * 60 * 1000 })
export const staticCurriculumCache = new LRUCache<string, any>({ maxSize: 100, defaultTtlMs: 30 * 60 * 1000 })
export const articleQueryCache = new LRUCache<string, any>({ maxSize: 200, defaultTtlMs: 60 * 1000 })
