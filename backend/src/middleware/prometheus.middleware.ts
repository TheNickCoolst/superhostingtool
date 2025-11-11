import { Request, Response, NextFunction } from 'express';
import { prometheusService } from '../services/prometheus.service';

export function prometheusMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    // Increment request counter
    prometheusService.incrementApiRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode
    );

    // Record duration
    prometheusService.recordApiRequestDuration(
      req.method,
      req.route?.path || req.path,
      duration
    );
  });

  next();
}
