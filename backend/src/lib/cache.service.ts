import { logger } from './logger';

/**
 * Redis Cache Service (Memory-based fallback)
 * Provides caching for expensive operations
 *
 * In production, replace with actual Redis client:
 * import { createClient } from 'redis';
 */

interface CacheEntry {
  value: any;
  expires: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Redis client placeholder (uncomment for production)
  // private redisClient: any;

  private constructor() {
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // In production, initialize Redis:
    // this.redisClient = createClient({ url: process.env.REDIS_URL });
    // this.redisClient.connect();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // In production with Redis:
    // const value = await this.redisClient.get(key);
    // return value ? JSON.parse(value) : null;

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.value;
  }

  /**
   * Set value in cache with TTL (time to live in seconds)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    // In production with Redis:
    // await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));

    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expires });
    logger.debug('Cache set', { key, ttlSeconds });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    // In production with Redis:
    // await this.redisClient.del(key);

    this.cache.delete(key);
    logger.debug('Cache deleted', { key });
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    // In production with Redis:
    // const keys = await this.redisClient.keys(pattern);
    // if (keys.length > 0) {
    //   await this.redisClient.del(keys);
    // }

    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.debug('Cache pattern deleted', { pattern, count: keysToDelete.length });
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    // In production with Redis:
    // return await this.redisClient.exists(key) === 1;

    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get or set pattern: Get from cache, or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    logger.debug('Cache miss, executing function', { key });
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    // In production with Redis:
    // await this.redisClient.flushDb();

    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries (memory-based only)
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup', { cleaned });
    }
  }

  /**
   * Shutdown cache service
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // In production with Redis:
    // await this.redisClient.quit();

    logger.info('Cache service shut down');
  }
}

/**
 * Cache key builders for consistent naming
 */
export const CacheKeys = {
  // Server stats
  serverStats: (serverId: string) => `server:${serverId}:stats`,
  serverList: (userId: string) => `user:${userId}:servers`,

  // Minecraft versions
  minecraftVersions: () => 'minecraft:versions',
  minecraftVersion: (version: string) => `minecraft:version:${version}`,

  // User data
  user: (userId: string) => `user:${userId}`,
  userServers: (userId: string) => `user:${userId}:servers`,

  // Host data
  host: (hostId: string) => `host:${hostId}`,
  hostStats: (hostId: string) => `host:${hostId}:stats`,

  // Analytics
  analytics: (serverId: string, period: string) => `analytics:${serverId}:${period}`,

  // Health checks
  health: (serverId: string) => `health:${serverId}`,
};

export default CacheService.getInstance();
