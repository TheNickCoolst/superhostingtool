import Redis from 'ioredis';
import { logger } from '../lib/logger';

class CacheService {
  private redis: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      await this.redis.connect();
      this.enabled = true;
      logger.info('Redis cache connected successfully');
    } catch (error) {
      logger.warn('Redis not available, caching disabled', { error });
      this.enabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) return null;

    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      // Track cache hits
      await this.redis.hincrby('cache:stats', 'hits', 1);

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      await this.redis.hincrby('cache:stats', 'sets', 1);
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      if (Array.isArray(key)) {
        await this.redis.del(...key);
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      logger.error('Cache del error', { key, error });
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache invalidate pattern error', { pattern, error });
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          await this.redis.del(`tag:${tag}`);
        }
      }
    } catch (error) {
      logger.error('Cache invalidate tags error', { tags, error });
    }
  }

  async setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      await this.set(key, value, ttl);

      // Store key in tag sets
      for (const tag of tags) {
        await this.redis.sadd(`tag:${tag}`, key);
        if (ttl) {
          await this.redis.expire(`tag:${tag}`, ttl);
        }
      }
    } catch (error) {
      logger.error('Cache setWithTags error', { key, tags, error });
    }
  }

  async getStats(): Promise<Record<string, number>> {
    if (!this.enabled || !this.redis) return {};

    try {
      const stats = await this.redis.hgetall('cache:stats');
      return {
        hits: parseInt(stats.hits || '0'),
        sets: parseInt(stats.sets || '0'),
        hitRate: stats.hits && stats.sets
          ? (parseInt(stats.hits) / (parseInt(stats.hits) + parseInt(stats.sets))) * 100
          : 0
      };
    } catch (error) {
      logger.error('Cache getStats error', { error });
      return {};
    }
  }

  async flush(): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      await this.redis.flushdb();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error', { error });
    }
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.enabled || !this.redis) return { allowed: true, remaining: limit };

    try {
      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, window);
      }

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current)
      };
    } catch (error) {
      logger.error('Rate limit check error', { key, error });
      return { allowed: true, remaining: limit };
    }
  }

  // Distributed locks
  async acquireLock(key: string, ttl: number = 10): Promise<boolean> {
    if (!this.enabled || !this.redis) return true;

    try {
      const result = await this.redis.set(`lock:${key}`, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error('Acquire lock error', { key, error });
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      await this.redis.del(`lock:${key}`);
    } catch (error) {
      logger.error('Release lock error', { key, error });
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const cacheService = new CacheService();
