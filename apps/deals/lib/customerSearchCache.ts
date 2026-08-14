import { CustomerLookupResult } from '@my-app/types';

/**
 * Dual-tier persistent search cache:
 * 1. Global in-memory Map: Instant sub-millisecond lookup in current JavaScript runtime.
 * 2. sessionStorage: Persists across modal open/close and page transitions within the tab session.
 */

const memoryCache = new Map<string, { data: CustomerLookupResult[]; timestamp: number }>();
const SESSION_CACHE_KEY_PREFIX = 'icecream_search_cache_';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

function normalizeKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCachedSearchResults(query: string): CustomerLookupResult[] | null {
  const key = normalizeKey(query);
  if (!key || key.length < 2) return null;

  const now = Date.now();

  // Tier 1: Check Memory Map
  const memHit = memoryCache.get(key);
  if (memHit) {
    if (now - memHit.timestamp < CACHE_TTL_MS) {
      return memHit.data;
    }
    memoryCache.delete(key);
  }

  // Tier 2: Check sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(`${SESSION_CACHE_KEY_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.data) && now - parsed.timestamp < CACHE_TTL_MS) {
          // Promote back into memory cache for fast sub-ms access
          memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
          return parsed.data;
        }
        sessionStorage.removeItem(`${SESSION_CACHE_KEY_PREFIX}${key}`);
      }
    } catch {
      // Ignore sessionStorage parsing or quota errors
    }
  }

  return null;
}

export function setCachedSearchResults(query: string, results: CustomerLookupResult[]): void {
  const key = normalizeKey(query);
  if (!key || key.length < 2) return;

  const entry = { data: results, timestamp: Date.now() };

  // Save to Memory
  memoryCache.set(key, entry);

  // Save to sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.setItem(`${SESSION_CACHE_KEY_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Ignore storage limit errors
    }
  }
}

export function clearCustomerSearchCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_CACHE_KEY_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}
