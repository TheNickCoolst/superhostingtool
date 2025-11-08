/**
 * Standardized API Response Format
 * Provides consistent response structure across all endpoints
 */

import { Response } from 'express';

/**
 * Success Response Structure
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: any;
  };
}

/**
 * Paginated Response Structure
 */
export interface ApiPaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: any;
  };
}

/**
 * API Response Helper Class
 */
export class ApiResponse {
  /**
   * Send success response
   */
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(res: Response, data: T, message: string = 'Resource created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    message?: string
  ): Response {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const hasMore = pagination.page < totalPages;

    const response: ApiPaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        ...pagination,
        totalPages,
        hasMore
      },
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    };

    return res.status(200).json(response);
  }

  /**
   * Send list response with total count
   */
  static list<T>(
    res: Response,
    data: T[],
    total?: number,
    message?: string
  ): Response {
    const response: ApiSuccessResponse<T[]> = {
      success: true,
      data,
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        ...(total !== undefined && { total })
      }
    };

    return res.status(200).json(response);
  }
}

/**
 * Pagination Helper
 */
export class PaginationHelper {
  /**
   * Parse pagination parameters from request query
   */
  static parsePaginationParams(query: any): { page: number; limit: number; skip: number } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Parse sorting parameters
   */
  static parseSortParams(query: any, allowedFields: string[]): { field: string; order: 'asc' | 'desc' } {
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Validate field
    const field = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

    return { field, order: sortOrder };
  }

  /**
   * Parse filter parameters
   */
  static parseFilterParams(query: any, allowedFilters: string[]): Record<string, any> {
    const filters: Record<string, any> = {};

    for (const key of allowedFilters) {
      if (query[key] !== undefined && query[key] !== '') {
        filters[key] = query[key];
      }
    }

    return filters;
  }
}
