import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 */

// Store for CSRF tokens (in production, use Redis or session store)
const tokenStore = new Map<string, { token: string; expires: number }>();

// Cleanup expired tokens every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expires < now) {
      tokenStore.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * Generate CSRF token for a user
 */
export const generateCsrfToken = (userId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + (1 * 60 * 60 * 1000); // 1 hour

  tokenStore.set(userId, { token, expires });

  return token;
};

/**
 * Middleware to validate CSRF token
 * Should be used on state-changing operations (POST, PUT, PATCH, DELETE)
 */
export const validateCsrfToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip CSRF validation for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Extract user ID from request (assuming authentication middleware ran first)
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Get token from header or body
  const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;

  if (!csrfToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Validate token
  const storedToken = tokenStore.get(userId);

  if (!storedToken) {
    return res.status(403).json({ error: 'CSRF token expired or invalid' });
  }

  if (storedToken.expires < Date.now()) {
    tokenStore.delete(userId);
    return res.status(403).json({ error: 'CSRF token expired' });
  }

  if (storedToken.token !== csrfToken) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  next();
};

/**
 * Endpoint to get CSRF token (add this to your auth routes)
 */
export const getCsrfToken = (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = generateCsrfToken(userId);

  res.json({ csrfToken: token });
};
