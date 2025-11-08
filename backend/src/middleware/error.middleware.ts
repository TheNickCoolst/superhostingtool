import { Request, Response, NextFunction } from 'express';
import { ApiError, isApiError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardized API Response for Errors
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    path: string;
    method: string;
  };
  stack?: string;
}

/**
 * Global Error Handler Middleware
 * Handles all errors in a standardized way
 */
export const errorHandler = (
  err: Error | AppError | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle ApiError (new standardized error)
  if (isApiError(err)) {
    logger.warn('API Error:', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      details: err.details
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      },
      ...(isDevelopment && { stack: err.stack })
    };

    return res.status(err.statusCode).json(response);
  }

  // Handle AppError (legacy error)
  if (err instanceof AppError) {
    logger.warn('App Error:', {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'APP_ERROR',
        message: err.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      },
      ...(isDevelopment && { stack: err.stack })
    };

    return res.status(err.statusCode).json(response);
  }

  // Handle Prisma Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error('Database Error:', {
      code: err.code,
      message: err.message,
      meta: err.meta,
      path: req.path,
      method: req.method
    });

    const statusCode = err.code === 'P2002' ? 409 : 500; // Unique constraint violation
    const message = err.code === 'P2002'
      ? 'A record with this value already exists'
      : 'Database operation failed';

    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCodes.DATABASE_ERROR,
        message,
        ...(isDevelopment && { details: { prismaCode: err.code, meta: err.meta } })
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      },
      ...(isDevelopment && { stack: err.stack })
    };

    return res.status(statusCode).json(response);
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    logger.warn('Validation Error:', {
      message: err.message,
      path: req.path,
      method: req.method
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: err.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      },
      ...(isDevelopment && { stack: err.stack })
    };

    return res.status(400).json(response);
  }

  // Handle unexpected errors
  logger.error('Unexpected Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Don't expose internal error details in production
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      ...(isDevelopment && { details: { name: err.name } })
    },
    meta: {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    },
    ...(isDevelopment && { stack: err.stack })
  };

  return res.status(500).json(response);
};

/**
 * Not Found Error Handler
 * Catches all unmatched routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new ApiError(
    ErrorCodes.NOT_FOUND,
    404,
    `Route ${req.method} ${req.path} not found`
  );
  next(error);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
