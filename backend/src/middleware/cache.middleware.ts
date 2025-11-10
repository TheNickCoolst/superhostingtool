import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';

export function cacheMiddleware(ttl: number = 300, keyGenerator?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET' || !cacheService.isEnabled()) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.method}:${req.originalUrl}`;

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // Store original send function
    const originalSend = res.send;

    // Override send to cache response
    res.send = function(data: any) {
      // Cache the response
      try {
        const parsed = JSON.parse(data);
        cacheService.set(cacheKey, parsed, ttl).catch(err =>
          console.error('Cache set failed:', err)
        );
      } catch (err) {
        // Not JSON, skip caching
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

export function invalidateCache(pattern: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Invalidate after response
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.invalidateByPattern(pattern).catch(err =>
          console.error('Cache invalidation failed:', err)
        );
      }
    });

    next();
  };
}
