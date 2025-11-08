import rateLimit from 'express-rate-limit';
import { ErrorFactory } from '../lib/errors';

/**
 * General API Rate Limiter
 * Applied to most API endpoints
 */
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const error = ErrorFactory.rateLimitExceeded(Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000')) / 1000));
    res.status(429).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }
});

/**
 * Strict Rate Limiter for Sensitive Operations
 * Applied to login, registration, password reset
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,
  message: 'Too many attempts, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const error = ErrorFactory.rateLimitExceeded(60);
    res.status(429).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }
});

/**
 * Login Rate Limiter
 * Prevents brute-force attacks on login endpoint
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Too many login attempts. Please try again in 15 minutes.'
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        retryAfter: 900 // 15 minutes in seconds
      }
    });
  }
});

/**
 * File Upload Rate Limiter
 * Prevents abuse of file upload endpoints
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Too many file uploads. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_UPLOADS',
        message: 'Too many file uploads. Please try again in an hour.'
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        retryAfter: 3600 // 1 hour in seconds
      }
    });
  }
});

/**
 * Server Creation Rate Limiter
 * Prevents rapid server creation spam
 */
export const serverCreationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 servers per minute
  message: 'Too many server creation requests. Please wait before creating another server.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_SERVER_CREATIONS',
        message: 'Too many server creation requests. Please wait a minute before creating another server.'
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        retryAfter: 60
      }
    });
  }
});
