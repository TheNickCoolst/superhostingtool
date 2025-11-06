import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware for agent API
 * Verifies the Bearer token against the configured AGENT_API_KEY
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.AGENT_API_KEY;

  if (!expectedToken) {
    console.error('AGENT_API_KEY is not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  if (token !== expectedToken) {
    res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    return;
  }

  next();
};
