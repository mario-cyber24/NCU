/**
 * Simple client-side cache implementation to reduce Supabase queries
 * This helps minimize database costs in areas with limited connectivity
 */

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class LocalCache {
  private cache: Record<string, CacheItem<any>> = {};
  
  /**
   * Set data in cache with expiration
   * @param key Cache key
   * @param data Data to store
   * @param ttlMinutes Time to live in minutes
   */
  set<T>(key: string, data: T, ttlMinutes = 15): void {
    const expiresAt = Date.now() + (ttlMinutes * 60 * 1000);
    this.cache[key] = { data, expiresAt };
    
    // Also save to localStorage for persistence across page reloads
    try {
      localStorage.setItem(`ncu_cache_${key}`, JSON.stringify({
        data,
        expiresAt
      }));
    } catch (e) {
      console.warn('Failed to save cache to localStorage', e);
    }
  }
  
  /**
   * Get data from cache if not expired
   * @param key Cache key
   * @returns Data or null if expired/not found
   */
  get<T>(key: string): T | null {
    // First try memory cache
    const item = this.cache[key];
    
    if (item && item.expiresAt > Date.now()) {
      return item.data as T;
    }
    
    // Try localStorage if not in memory
    try {
      const stored = localStorage.getItem(`ncu_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheItem<T>;
        if (parsed.expiresAt > Date.now()) {
          // Restore to memory cache and return
          this.cache[key] = parsed;
          return parsed.data;
        } else {
          // Clear expired item
          localStorage.removeItem(`ncu_cache_${key}`);
        }
      }
    } catch (e) {
      console.warn('Failed to read cache from localStorage', e);
    }
    
    return null;
  }
  
  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    delete this.cache[key];
    try {
      localStorage.removeItem(`ncu_cache_${key}`);
    } catch (e) {
      console.warn('Failed to remove cache from localStorage', e);
    }
  }
  
  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.cache = {};
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('ncu_cache_'))
        .forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Failed to clear cache from localStorage', e);
    }
  }
}

// Export singleton instance
export const cache = new LocalCache();

/**
 * Helper function to retrieve cached data or fetch from API
 * @param cacheKey Key to store in cache
 * @param fetcher Function to fetch data if not in cache
 * @param ttlMinutes Time to live in cache (minutes)
 * @returns Cached or freshly fetched data
 */
export async function getCachedData<T>(
  cacheKey: string, 
  fetcher: () => Promise<T>,
  ttlMinutes = 15
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // If not in cache, fetch data
  const data = await fetcher();
  
  // Store in cache
  cache.set(cacheKey, data, ttlMinutes);
  
  return data;
}

/**
 * Helper to determine if device is offline
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}