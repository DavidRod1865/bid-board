// Cache manager for storing frequently accessed data

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
}

// Default cache configurations for different data types
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  bids: { ttl: 5 * 60 * 1000, maxSize: 10 }, // 5 minutes, 10 pages
  vendors: { ttl: 30 * 60 * 1000, maxSize: 5 }, // 30 minutes, 5 entries
  users: { ttl: 60 * 60 * 1000, maxSize: 5 }, // 1 hour, 5 entries
  notes: { ttl: 2 * 60 * 1000, maxSize: 20 }, // 2 minutes, 20 entries
};

// Cache manager class

class CacheManager {
  private caches = new Map<string, Map<string, CacheEntry<any>>>();
  
  constructor() {
    // Initialize caches for different data types
    Object.keys(CACHE_CONFIGS).forEach(type => {
      this.caches.set(type, new Map());
    });
    
    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  /**
   * Generate cache key for paginated data
   */
  private generateCacheKey(type: string, options: Record<string, any> = {}): string {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((acc, key) => {
        acc[key] = options[key];
        return acc;
      }, {} as Record<string, any>);
    
    return `${type}_${JSON.stringify(sortedOptions)}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry<any>, config: CacheConfig): boolean {
    return Date.now() - entry.timestamp < config.ttl;
  }

  /**
   * Get data from cache
   */
  get<T>(type: keyof typeof CACHE_CONFIGS, options: Record<string, any> = {}): T | null {
    const cache = this.caches.get(type);
    const config = CACHE_CONFIGS[type];
    
    if (!cache || !config) return null;
    
    const key = this.generateCacheKey(type, options);
    const entry = cache.get(key);
    
    if (!entry || !this.isValid(entry, config)) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set data in cache
   */
  set<T>(type: keyof typeof CACHE_CONFIGS, options: Record<string, any>, data: T, etag?: string): void {
    const cache = this.caches.get(type);
    const config = CACHE_CONFIGS[type];
    
    if (!cache || !config) return;
    
    const key = this.generateCacheKey(type, options);
    
    // Remove oldest entries if cache is full
    if (cache.size >= config.maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
    
    cache.set(key, {
      data,
      timestamp: Date.now(),
      etag
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(type: keyof typeof CACHE_CONFIGS, options: Record<string, any> = {}): void {
    const cache = this.caches.get(type);
    if (!cache) return;
    
    const key = this.generateCacheKey(type, options);
    cache.delete(key);
  }

  /**
   * Invalidate all entries for a data type
   */
  invalidateAll(type: keyof typeof CACHE_CONFIGS): void {
    const cache = this.caches.get(type);
    if (!cache) return;
    
    cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    let totalCleaned = 0;
    
    this.caches.forEach((cache, type) => {
      const config = CACHE_CONFIGS[type];
      if (!config) return;
      
      const keysToDelete: string[] = [];
      
      cache.forEach((entry, key) => {
        if (!this.isValid(entry, config)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => cache.delete(key));
      totalCleaned += keysToDelete.length;
    });
    
    // Cleanup completed silently
  }

  /**
   * Get cache statistics
   */
  getStats(): Record<string, { size: number; maxSize: number; hitRate?: number }> {
    const stats: Record<string, any> = {};
    
    this.caches.forEach((cache, type) => {
      const config = CACHE_CONFIGS[type];
      stats[type] = {
        size: cache.size,
        maxSize: config?.maxSize || 0
      };
    });
    
    return stats;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.forEach((cache) => cache.clear());
  }

  /**
   * Smart cache invalidation for related data
   * When bids change, invalidate related caches
   */
  invalidateRelated(types: (keyof typeof CACHE_CONFIGS)[], bidId?: number): void {
    types.forEach(type => {
      switch (type) {
        case 'bids':
          // When bids change, invalidate bid-related caches
          this.invalidateAll('bids');
          if (bidId) {
            // Invalidate specific bid vendor and notes caches
            this.invalidate('notes', { bidId });
          }
          break;
        case 'vendors':
          // When vendors change, invalidate all bids cache since they include vendor data
          this.invalidateAll('bids');
          this.invalidateAll('vendors');
          break;
        case 'notes':
          this.invalidateAll('notes');
          break;
        default:
          this.invalidate(type);
      }
    });
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Export for testing
export { CacheManager };