/**
 * High-Performance In-Process Server Cache with TTL and Tag-Based Invalidation.
 * 
 * Provides fast sub-millisecond memory lookups for Server Actions and API endpoints,
 * eliminating redundant database queries on repeated page loads and client prewarming.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

class ServerCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries: number;

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
  }

  /**
   * Generates a deterministic cache key from parameters
   */
  public generateKey(prefix: string, params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => `${k}=${typeof params[k] === 'object' ? JSON.stringify(params[k]) : params[k]}`)
      .join('&');
    return `${prefix}:${sorted}`;
  }

  /**
   * Retrieves an item from cache if present and unexpired
   */
  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Stores an item in cache with TTL (in milliseconds) and associated tags
   */
  public set<T>(key: string, value: T, ttlMs = 60_000, tags: string[] = []): void {
    // Evict oldest entries if capacity reached
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      tags,
    });
  }

  /**
   * Atomically gets from cache or computes and caches the result
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttlMs?: number; tags?: string[] } = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== undefined && fresh !== null) {
      this.set<T>(key, fresh, options.ttlMs || 60_000, options.tags || []);
    }
    return fresh;
  }

  /**
   * Invalidates all cache entries associated with any of the specified tags
   */
  public invalidateTags(tags: string[]): number {
    const tagSet = new Set(tags);
    let count = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.some((t) => tagSet.has(t))) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Deletes a specific key from the cache
   */
  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clears the entire cache store
   */
  public clear(): void {
    this.store.clear();
  }

  /**
   * Returns current cache statistics
   */
  public getStats() {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
    };
  }
}

// Global singleton in the Node.js server runtime
const globalForServerCache = globalThis as unknown as {
  __serverCacheInstance?: ServerCache;
};

export const serverCache =
  globalForServerCache.__serverCacheInstance || new ServerCache(150);

if (process.env.NODE_ENV !== 'production') {
  globalForServerCache.__serverCacheInstance = serverCache;
}
