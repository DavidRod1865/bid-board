/**
 * UserCache Service
 * 
 * Provides TTL-based caching for user data to reduce API calls.
 * Critical fix for performance issue where createProjectNote was calling
 * getUsers() for every note creation, causing 275K API calls/hour.
 */

import type { User } from '../types';
import { dbOperations } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

type UserCacheEntry = CacheEntry<User[]>;
type SingleUserCacheEntry = CacheEntry<User | null>;

class UserCacheService {
  private usersCache: UserCacheEntry | null = null;
  private userEmailCache: Map<string, SingleUserCacheEntry> = new Map();
  private userIdCache: Map<string, SingleUserCacheEntry> = new Map();
  
  // Cache TTL settings
  private readonly USERS_TTL = 5 * 60 * 1000; // 5 minutes for all users
  private readonly SINGLE_USER_TTL = 10 * 60 * 1000; // 10 minutes for individual users
  private readonly CLEANUP_INTERVAL = 60 * 1000; // Cleanup every minute
  
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Start cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    // Clean all users cache
    if (this.usersCache && this.isExpired(this.usersCache)) {
      this.usersCache = null;
    }

    // Clean email cache
    for (const [email, entry] of this.userEmailCache.entries()) {
      if (this.isExpired(entry)) {
        this.userEmailCache.delete(email);
      }
    }

    // Clean ID cache  
    for (const [id, entry] of this.userIdCache.entries()) {
      if (this.isExpired(entry)) {
        this.userIdCache.delete(id);
      }
    }
  }

  /**
   * Get all users with caching
   * This replaces direct calls to dbOperations.getUsers()
   */
  async getUsers(): Promise<User[]> {
    // Check if cache is valid
    if (this.usersCache && !this.isExpired(this.usersCache)) {
      return this.usersCache.data;
    }

    try {
      // Fetch fresh data
      const users = await dbOperations.getUsers();
      
      // Cache the result
      this.usersCache = {
        data: users,
        timestamp: Date.now(),
        ttl: this.USERS_TTL
      };

      // Also populate individual user caches
      users.forEach(user => {
        if (user.email) {
          this.userEmailCache.set(user.email, {
            data: user,
            timestamp: Date.now(),
            ttl: this.SINGLE_USER_TTL
          });
        }
        
        this.userIdCache.set(user.id, {
          data: user,
          timestamp: Date.now(),
          ttl: this.SINGLE_USER_TTL
        });
      });

      return users;
    } catch (error) {
      console.error('UserCache: Failed to fetch users:', error);
      
      // Return stale cache if available, otherwise throw
      if (this.usersCache) {
        console.warn('UserCache: Using stale cache due to fetch error');
        return this.usersCache.data;
      }
      
      throw error;
    }
  }

  /**
   * Get user by email - optimized for single user lookups
   * This is the critical function that fixes the createProjectNote performance issue
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;

    // Check email cache first
    const cachedUser = this.userEmailCache.get(email);
    if (cachedUser && !this.isExpired(cachedUser)) {
      return cachedUser.data;
    }

    try {
      // Try to fetch single user by email directly
      const user = await dbOperations.getUserByEmail(email);
      
      // Cache the result
      this.userEmailCache.set(email, {
        data: user,
        timestamp: Date.now(),
        ttl: this.SINGLE_USER_TTL
      });

      if (user) {
        this.userIdCache.set(user.id, {
          data: user,
          timestamp: Date.now(),
          ttl: this.SINGLE_USER_TTL
        });
      }

      return user;
    } catch (error) {
      console.error(`UserCache: Failed to fetch user by email ${email}:`, error);
      
      // Fallback: Try to find user in all users cache
      if (this.usersCache && !this.isExpired(this.usersCache)) {
        const user = this.usersCache.data.find(u => u.email === email) || null;
        
        // Cache the result (even if null)
        this.userEmailCache.set(email, {
          data: user,
          timestamp: Date.now(),
          ttl: this.SINGLE_USER_TTL
        });
        
        return user;
      }

      // Last resort: Fetch all users and find the one we need
      try {
        const users = await this.getUsers();
        const user = users.find(u => u.email === email) || null;
        
        // Cache the result
        this.userEmailCache.set(email, {
          data: user,
          timestamp: Date.now(),
          ttl: this.SINGLE_USER_TTL
        });
        
        return user;
      } catch (fallbackError) {
        console.error('UserCache: All fallback methods failed:', fallbackError);
        
        // Return stale cache if available
        if (cachedUser) {
          console.warn('UserCache: Using stale cached user due to fetch error');
          return cachedUser.data;
        }
        
        return null;
      }
    }
  }

  /**
   * Get user by ID with caching
   */
  async getUserById(id: string): Promise<User | null> {
    if (!id) return null;

    // Check ID cache first
    const cachedUser = this.userIdCache.get(id);
    if (cachedUser && !this.isExpired(cachedUser)) {
      return cachedUser.data;
    }

    try {
      // Try all users cache first
      if (this.usersCache && !this.isExpired(this.usersCache)) {
        const user = this.usersCache.data.find(u => u.id === id) || null;
        
        if (user) {
          this.userIdCache.set(id, {
            data: user,
            timestamp: Date.now(),
            ttl: this.SINGLE_USER_TTL
          });
        }
        
        return user;
      }

      // Fallback: Fetch all users
      const users = await this.getUsers();
      const user = users.find(u => u.id === id) || null;
      
      // Cache the result
      this.userIdCache.set(id, {
        data: user,
        timestamp: Date.now(),
        ttl: this.SINGLE_USER_TTL
      });
      
      return user;
    } catch (error) {
      console.error(`UserCache: Failed to fetch user by ID ${id}:`, error);
      
      // Return stale cache if available
      if (cachedUser) {
        console.warn('UserCache: Using stale cached user due to fetch error');
        return cachedUser.data;
      }
      
      return null;
    }
  }

  /**
   * Invalidate cache - call when user data changes
   */
  invalidateCache(): void {
    this.usersCache = null;
    this.userEmailCache.clear();
    this.userIdCache.clear();
  }

  /**
   * Invalidate specific user cache
   */
  invalidateUser(userId: string, email?: string): void {
    this.userIdCache.delete(userId);
    if (email) {
      this.userEmailCache.delete(email);
    }
    
    // Invalidate all users cache since it contains this user
    this.usersCache = null;
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      allUsersCache: this.usersCache ? {
        size: this.usersCache.data.length,
        age: Date.now() - this.usersCache.timestamp,
        expired: this.isExpired(this.usersCache)
      } : null,
      emailCacheSize: this.userEmailCache.size,
      idCacheSize: this.userIdCache.size
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.invalidateCache();
  }
}

// Create singleton instance
export const userCache = new UserCacheService();

// Export the instance as default
export default userCache;