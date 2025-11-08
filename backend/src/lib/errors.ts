/**
 * Custom Error Classes for API Errors
 * Provides standardized error handling across the application
 */

export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard Error Codes
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REGISTRATION_DISABLED: 'REGISTRATION_DISABLED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource Errors
  NOT_FOUND: 'NOT_FOUND',
  SERVER_NOT_FOUND: 'SERVER_NOT_FOUND',
  HOST_NOT_FOUND: 'HOST_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  BACKUP_NOT_FOUND: 'BACKUP_NOT_FOUND',
  MOD_NOT_FOUND: 'MOD_NOT_FOUND',

  // Business Logic Errors
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',
  SERVER_LIMIT_REACHED: 'SERVER_LIMIT_REACHED',
  NO_AVAILABLE_HOSTS: 'NO_AVAILABLE_HOSTS',
  INVALID_SERVER_STATUS: 'INVALID_SERVER_STATUS',
  PORT_ALLOCATION_FAILED: 'PORT_ALLOCATION_FAILED',

  // Agent Errors
  AGENT_ERROR: 'AGENT_ERROR',
  AGENT_UNREACHABLE: 'AGENT_UNREACHABLE',
  AGENT_TIMEOUT: 'AGENT_TIMEOUT',
  DOCKER_ERROR: 'DOCKER_ERROR',

  // File System Errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  PATH_TRAVERSAL_DETECTED: 'PATH_TRAVERSAL_DETECTED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Pre-defined Error Factory Functions
 */
export class ErrorFactory {
  static unauthorized(message = 'Unauthorized access'): ApiError {
    return new ApiError(ErrorCodes.UNAUTHORIZED, 401, message);
  }

  static forbidden(message = 'Access forbidden'): ApiError {
    return new ApiError(ErrorCodes.FORBIDDEN, 403, message);
  }

  static notFound(resource: string, id?: string): ApiError {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    return new ApiError(ErrorCodes.NOT_FOUND, 404, message);
  }

  static serverNotFound(serverId: string): ApiError {
    return new ApiError(
      ErrorCodes.SERVER_NOT_FOUND,
      404,
      `Server with id '${serverId}' not found`
    );
  }

  static hostNotFound(hostId?: string): ApiError {
    return new ApiError(
      ErrorCodes.HOST_NOT_FOUND,
      404,
      hostId ? `Host with id '${hostId}' not found` : 'No available hosts found'
    );
  }

  static validation(message: string, details?: any): ApiError {
    return new ApiError(ErrorCodes.VALIDATION_ERROR, 400, message, details);
  }

  static invalidInput(field: string, reason?: string): ApiError {
    const message = reason
      ? `Invalid input for field '${field}': ${reason}`
      : `Invalid input for field '${field}'`;
    return new ApiError(ErrorCodes.INVALID_INPUT, 400, message);
  }

  static insufficientResources(resource: string, requested: number, available: number): ApiError {
    return new ApiError(
      ErrorCodes.INSUFFICIENT_RESOURCES,
      400,
      `Insufficient ${resource}. Requested: ${requested}, Available: ${available}`
    );
  }

  static serverLimitReached(limit: number): ApiError {
    return new ApiError(
      ErrorCodes.SERVER_LIMIT_REACHED,
      400,
      `Server limit reached. Maximum allowed: ${limit}`
    );
  }

  static agentError(message: string, details?: any): ApiError {
    return new ApiError(ErrorCodes.AGENT_ERROR, 500, message, details);
  }

  static agentUnreachable(hostName: string): ApiError {
    return new ApiError(
      ErrorCodes.AGENT_UNREACHABLE,
      503,
      `Host agent '${hostName}' is unreachable`
    );
  }

  static pathTraversal(path: string): ApiError {
    return new ApiError(
      ErrorCodes.PATH_TRAVERSAL_DETECTED,
      403,
      `Path traversal detected in: ${path}`
    );
  }

  static fileNotFound(path: string): ApiError {
    return new ApiError(
      ErrorCodes.FILE_NOT_FOUND,
      404,
      `File not found: ${path}`
    );
  }

  static invalidFileType(allowedTypes: string[]): ApiError {
    return new ApiError(
      ErrorCodes.INVALID_FILE_TYPE,
      400,
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    );
  }

  static fileTooLarge(maxSize: number): ApiError {
    return new ApiError(
      ErrorCodes.FILE_TOO_LARGE,
      400,
      `File too large. Maximum size: ${maxSize} MB`
    );
  }

  static rateLimitExceeded(retryAfter?: number): ApiError {
    const message = retryAfter
      ? `Rate limit exceeded. Try again in ${retryAfter} seconds`
      : 'Too many requests. Please slow down';
    return new ApiError(ErrorCodes.RATE_LIMIT_EXCEEDED, 429, message);
  }

  static internal(message = 'Internal server error', details?: any): ApiError {
    return new ApiError(ErrorCodes.INTERNAL_SERVER_ERROR, 500, message, details);
  }

  static database(message: string, details?: any): ApiError {
    return new ApiError(ErrorCodes.DATABASE_ERROR, 500, message, details);
  }

  static invalidServerStatus(currentStatus: string, requiredStatus: string | string[]): ApiError {
    const required = Array.isArray(requiredStatus)
      ? requiredStatus.join(' or ')
      : requiredStatus;
    return new ApiError(
      ErrorCodes.INVALID_SERVER_STATUS,
      400,
      `Server must be in ${required} status. Current status: ${currentStatus}`
    );
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}
