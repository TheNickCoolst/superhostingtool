import { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/audit-log.service';

export function auditLog(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(data: any) {
      // Log after response
      const userId = (req as any).user?.id;
      const organizationId = (req as any).organizationId;

      if (organizationId) {
        auditLogService.log({
          organizationId,
          userId,
          action,
          resource,
          resourceId: req.params.id || req.body.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            body: req.body,
          },
          severity: res.statusCode >= 400 ? 'WARNING' : 'INFO',
        }).catch(err => console.error('Audit log failed:', err));
      }

      return originalSend.call(this, data);
    };

    next();
  };
}
