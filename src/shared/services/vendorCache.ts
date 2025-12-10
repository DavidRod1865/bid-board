/**
 * VendorCache Service
 * 
 * Provides localStorage-based caching for vendor data to reduce API calls.
 * Vendors change less frequently than project data, making them ideal for
 * longer-term caching with localStorage persistence.
 */

import type { Vendor, VendorContact } from '../types';
import { dbOperations } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string; // For cache invalidation when data structure changes
}

interface VendorCacheData {
  vendors: Vendor[];
  contacts: VendorContact[];
}

class VendorCacheService {
  private readonly CACHE_KEY = 'bid_board_vendors_cache';
  private readonly CACHE_VERSION = '1.0'; // Increment to invalidate all caches
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly PRIORITY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for priority vendors

  // In-memory cache for current session (faster access)
  private memoryCache: CacheEntry<VendorCacheData> | null = null;
  private vendorContactsMap: Map<number, VendorContact[]> = new Map();

  /**
   * Get all vendors with caching
   */
  async getVendors(): Promise<Vendor[]> {
    const cached = this.getCachedData();
    
    if (cached) {
      // Update memory cache for faster access
      this.memoryCache = cached;
      this.buildContactsMap(cached.data.contacts);
      return cached.data.vendors;
    }

    try {
      // Fetch fresh data
      const vendors = await dbOperations.getVendors();
      const contacts = await dbOperations.getAllVendorContacts();

      const cacheData: VendorCacheData = { vendors, contacts };
      
      // Cache the result
      this.setCachedData(cacheData);
      
      // Update memory cache
      this.memoryCache = {
        data: cacheData,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      
      this.buildContactsMap(contacts);
      
      return vendors;
    } catch (error) {
      console.error('VendorCache: Failed to fetch vendors:', error);
      
      // Re-check cache as fallback (avoid TypeScript flow analysis issue)
      const fallbackCache = this.getCachedData();
      if (fallbackCache) {
        console.warn('VendorCache: Using stale cache due to fetch error');
        return fallbackCache.data.vendors;
      }
      
      throw error;
    }
  }

  /**
   * Get vendor by ID with caching
   */
  async getVendorById(vendorId: number): Promise<Vendor | null> {
    const vendors = await this.getVendors();
    return vendors.find(v => v.id === vendorId) || null;
  }

  /**
   * Get vendors by company name search with caching
   */
  async searchVendorsByName(searchTerm: string): Promise<Vendor[]> {
    const vendors = await this.getVendors();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return vendors.filter(vendor => 
      vendor.company_name.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Get priority vendors with caching
   */
  async getPriorityVendors(): Promise<Vendor[]> {
    const vendors = await this.getVendors();
    return vendors.filter(vendor => vendor.is_priority === true);
  }

  /**
   * Get vendors by type with caching
   */
  async getVendorsByType(vendorType: string): Promise<Vendor[]> {
    const vendors = await this.getVendors();
    return vendors.filter(vendor => vendor.vendor_type === vendorType);
  }

  /**
   * Get vendor contacts for a specific vendor
   */
  async getVendorContacts(vendorId: number): Promise<VendorContact[]> {
    // Check memory cache first
    if (this.vendorContactsMap.has(vendorId)) {
      return this.vendorContactsMap.get(vendorId) || [];
    }

    // Ensure vendors are loaded (which loads contacts too)
    await this.getVendors();
    
    return this.vendorContactsMap.get(vendorId) || [];
  }

  /**
   * Get all vendor contacts with caching
   */
  async getAllVendorContacts(): Promise<VendorContact[]> {
    const cached = this.getCachedData();
    
    if (cached) {
      return cached.data.contacts;
    }

    // This will load both vendors and contacts
    await this.getVendors();
    
    const cachedAfterLoad = this.getCachedData();
    return cachedAfterLoad?.data.contacts || [];
  }

  /**
   * Build contacts map for fast lookup
   */
  private buildContactsMap(contacts: VendorContact[]): void {
    this.vendorContactsMap.clear();
    
    contacts.forEach(contact => {
      if (!this.vendorContactsMap.has(contact.vendor_id)) {
        this.vendorContactsMap.set(contact.vendor_id, []);
      }
      this.vendorContactsMap.get(contact.vendor_id)!.push(contact);
    });
  }

  /**
   * Get cached data from localStorage
   */
  private getCachedData(): CacheEntry<VendorCacheData> | null {
    try {
      // Check memory cache first (fastest)
      if (this.memoryCache && this.isValidCache(this.memoryCache)) {
        return this.memoryCache;
      }

      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const parsed: CacheEntry<VendorCacheData> = JSON.parse(cached);
      
      // Validate cache
      if (!this.isValidCache(parsed)) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('VendorCache: Error reading cache:', error);
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    }
  }

  /**
   * Set cached data in localStorage
   */
  private setCachedData(data: VendorCacheData): void {
    try {
      const cacheEntry: CacheEntry<VendorCacheData> = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('VendorCache: Error writing cache:', error);
      // localStorage might be full or unavailable
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValidCache(entry: CacheEntry<VendorCacheData>): boolean {
    // Check version compatibility
    if (entry.version !== this.CACHE_VERSION) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Use shorter cache for priority vendors or if data seems stale
    const maxAge = this.hasPriorityVendors(entry.data.vendors) 
      ? this.PRIORITY_CACHE_DURATION 
      : this.CACHE_DURATION;

    return age < maxAge;
  }

  /**
   * Check if vendors list contains priority vendors
   */
  private hasPriorityVendors(vendors: Vendor[]): boolean {
    return vendors.some(vendor => vendor.is_priority === true);
  }

  /**
   * Invalidate all caches - call when vendor data changes
   */
  invalidateCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    this.memoryCache = null;
    this.vendorContactsMap.clear();
  }

  /**
   * Invalidate cache for specific vendor - call when vendor data changes
   */
  invalidateVendor(_vendorId: number): void {
    // For now, invalidate entire cache since vendors are interrelated
    this.invalidateCache();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    hasMemoryCache: boolean;
    hasLocalStorageCache: boolean;
    cacheAge: number | null;
    vendorsCount: number;
    contactsCount: number;
    cacheSize: number; // in bytes
  } {
    const cached = this.getCachedData();
    const cacheString = localStorage.getItem(this.CACHE_KEY);
    
    return {
      hasMemoryCache: this.memoryCache !== null,
      hasLocalStorageCache: cached !== null,
      cacheAge: cached ? Date.now() - cached.timestamp : null,
      vendorsCount: cached?.data.vendors.length || 0,
      contactsCount: cached?.data.contacts.length || 0,
      cacheSize: cacheString ? new Blob([cacheString]).size : 0
    };
  }

  /**
   * Prefetch vendor data for better user experience
   * Call this on app startup or when user navigates to vendor-heavy pages
   */
  async prefetchVendors(): Promise<void> {
    try {
      await this.getVendors();
    } catch (error) {
      // Prefetch failures shouldn't break the app
      console.warn('VendorCache: Prefetch failed:', error);
    }
  }

  /**
   * Force refresh cache - useful for admin operations
   */
  async refreshCache(): Promise<Vendor[]> {
    this.invalidateCache();
    return this.getVendors();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.invalidateCache();
  }
}

// Create singleton instance
export const vendorCache = new VendorCacheService();

// Export the instance as default
export default vendorCache;