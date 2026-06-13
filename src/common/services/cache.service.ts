import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  pattern?: string; // Cache key pattern for bulk operations
}

/**
 * Cache key patterns for different entities
 * Format: entity:id:action:page:limit
 */
export const CACHE_KEYS = {
  SERVICE: {
    LIST: (page?: number, limit?: number) => `service:list:${page || 1}:${limit || 10}`,
    ACTIVE: (page?: number, limit?: number) => `service:active:${page || 1}:${limit || 10}`,
    BY_ID: (id: number) => `service:${id}`,
    ALL: 'service:*',
  },
  PET: {
    LIST: (ownerId: number, page?: number, limit?: number) => `pet:owner:${ownerId}:${page || 1}:${limit || 10}`,
    BY_ID: (id: number) => `pet:${id}`,
    GALLERY: (petId: number, page?: number, limit?: number) => `pet:gallery:${petId}:${page || 1}:${limit || 10}`,
    GALLERY_ITEM: (petId: number, galleryId: number) => `pet:gallery:${petId}:${galleryId}`,
    ALL: 'pet:*',
  },
  BOOKING: {
    BY_USER: (userId: number, page?: number, limit?: number) => `booking:user:${userId}:${page || 1}:${limit || 10}`,
    BY_SITTER: (sitterId: number, page?: number, limit?: number) => `booking:sitter:${sitterId}:${page || 1}:${limit || 10}`,
    BY_ID: (id: number) => `booking:${id}`,
    UPLOADS: (bookingId: number, page?: number, limit?: number) => `booking:uploads:${bookingId}:${page || 1}:${limit || 10}`,
    ALL: 'booking:*',
  },
  USER: {
    ALL_USERS: (page?: number, limit?: number) => `user:list:${page || 1}:${limit || 10}`,
    ALL_SITTERS: (page?: number, limit?: number) => `user:sitters:${page || 1}:${limit || 10}`,
    BY_ID: (id: number) => `user:${id}`,
    PROFILE: (id: number) => `user:profile:${id}`,
    ALL: 'user:*',
  },
};

// Default TTL values (in seconds)
const DEFAULT_TTLS = {
  SHORT: 1, // 5 minutes
  MEDIUM: 1, // 15 minutes
  LONG: 1, // 1 hour
};

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: any) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get(key);
      return result !== undefined ? result : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTLS.MEDIUM): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl * 1000); // Convert to milliseconds
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple cache keys using pattern (requires Redis)
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      // Use Redis client directly for pattern deletion
      const store = this.cacheManager.store;
      if (store && store.client) {
        const client = store.client;
        // For ioredis client
        if (typeof client.keys === 'function') {
          const keys = await client.keys(pattern);
          if (keys && keys.length > 0) {
            await client.del(...keys);
          }
        }
      }
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.reset();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get or set cache (getter function pattern)
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl: number = DEFAULT_TTLS.MEDIUM): Promise<T> {
    let value = await this.get<T>(key);

    if (value === null || value === undefined) {
      value = await fn();
      await this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * Invalidate service-related caches
   */
  async invalidateService(serviceId?: number): Promise<void> {
    if (serviceId) {
      await this.delete(CACHE_KEYS.SERVICE.BY_ID(serviceId));
    }
    await this.deleteByPattern(CACHE_KEYS.SERVICE.ALL);
  }

  /**
   * Invalidate pet-related caches
   */
  async invalidatePet(petId?: number, ownerId?: number): Promise<void> {
    if (petId) {
      await this.delete(CACHE_KEYS.PET.BY_ID(petId));
      await this.deleteByPattern(CACHE_KEYS.PET.GALLERY(petId));
    }
    if (ownerId) {
      await this.deleteByPattern(`pet:owner:${ownerId}:*`);
    }
    await this.deleteByPattern(CACHE_KEYS.PET.ALL);
  }

  /**
   * Invalidate gallery-related caches
   */
  async invalidateGallery(petId: number, galleryId?: number): Promise<void> {
    if (galleryId) {
      await this.delete(CACHE_KEYS.PET.GALLERY_ITEM(petId, galleryId));
    }
    await this.deleteByPattern(CACHE_KEYS.PET.GALLERY(petId));
  }

  /**
   * Invalidate booking-related caches
   */
  async invalidateBooking(bookingId?: number, userId?: number, sitterId?: number): Promise<void> {
    if (bookingId) {
      await this.delete(CACHE_KEYS.BOOKING.BY_ID(bookingId));
      await this.deleteByPattern(CACHE_KEYS.BOOKING.UPLOADS(bookingId));
    }
    if (userId) {
      await this.deleteByPattern(`booking:user:${userId}:*`);
    }
    if (sitterId) {
      await this.deleteByPattern(`booking:sitter:${sitterId}:*`);
    }
    await this.deleteByPattern(CACHE_KEYS.BOOKING.ALL);
  }

  /**
   * Invalidate user-related caches
   */
  async invalidateUser(userId?: number): Promise<void> {
    if (userId) {
      await this.delete(CACHE_KEYS.USER.BY_ID(userId));
      await this.delete(CACHE_KEYS.USER.PROFILE(userId));
    }
    await this.deleteByPattern(CACHE_KEYS.USER.ALL);
  }

  /**
   * Get TTL configuration by cache type
   */
  getTTL(type: 'short' | 'medium' | 'long' = 'medium'): number {
    return DEFAULT_TTLS[type.toUpperCase() as keyof typeof DEFAULT_TTLS] || DEFAULT_TTLS.MEDIUM;
  }
}
