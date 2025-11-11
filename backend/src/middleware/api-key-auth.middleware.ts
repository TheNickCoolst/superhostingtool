import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key.service';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const result = await apiKeyService.validateApiKey(apiKey);

  if (!result.valid) {
    return res.status(401).json({ error: result.error || 'Invalid API key' });
  }

  // Attach API key info to request
  (req as any).apiKey = result.apiKey;
  (req as any).organizationId = result.apiKey.organizationId;

  next();
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!apiKeyService.hasPermission(apiKey, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
