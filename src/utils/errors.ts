// src/utils/errors.ts - Standardized Error Factory
// Creates consistent errors across the entire application

import type { AppError, ErrorType } from '../types/unified';
import { ERROR_CODES } from '../config/constants';
import { logger } from './logger';

/**
 * Error Factory - Creates standardized AppError objects
 */
export class ErrorFactory {
  /**
   * Create authentication errors
   */
  static authentication(code: string, message: string, details?: Record<string, unknown>): AppError {
    return this.createError('AUTHENTICATION', code, message, details);
  }

  /**
   * Create validation errors
   */
  static validation(field: string, message: string, value?: unknown): AppError {
    return this.createError('VALIDATION', ERROR_CODES.INVALID_EMAIL, message, {
      field,
      value: value !== undefined ? String(value).substring(0, 50) : undefined // Truncate for security
    });
  }

  /**
   * Create network errors
   */
  static network(message: string, status?: number, url?: string): AppError {
    return this.createError('NETWORK', ERROR_CODES.NETWORK_ERROR, message, {
      status,
      url
    });
  }

  /**
   * Create server errors
   */
  static server(message: string, status: number, details?: Record<string, unknown>): AppError {
    return this.createError('SERVER', ERROR_CODES.SERVER_ERROR, message, {
      status,
      ...details
    });
  }

  /**
   * Create authorization errors
   */
  static authorization(message: string = 'Access denied'): AppError {
    return this.createError('AUTHORIZATION', 'AUTH_ACCESS_DENIED', message);
  }

  /**
   * Create not found errors
   */
  static notFound(resource: string): AppError {
    return this.createError('NOT_FOUND', 'RESOURCE_NOT_FOUND', `${resource} not found`, {
      resource
    });
  }

  /**
   * Create rate limit errors
   */
  static rateLimit(retryAfter?: number): AppError {
    return this.createError('RATE_LIMIT', 'RATE_LIMIT_EXCEEDED', 'Too many requests', {
      retryAfter
    });
  }

  /**
   * Convert backend API error to AppError
   */
  static fromApiResponse(response: { success: boolean; error?: string; message?: string; status?: number }): AppError {
    const message = response.error || response.message || 'Unknown server error';
    const status = response.status || 500;
    
    // Determine error type based on status code
    let type: ErrorType;
    let code: string;

    if (status === 401) {
      type = 'AUTHENTICATION';
      code = ERROR_CODES.INVALID_CREDENTIALS;
    } else if (status === 403) {
      type = 'AUTHORIZATION';
      code = 'AUTH_ACCESS_DENIED';
    } else if (status === 404) {
      type = 'NOT_FOUND';
      code = 'RESOURCE_NOT_FOUND';
    } else if (status === 429) {
      type = 'RATE_LIMIT';
      code = 'RATE_LIMIT_EXCEEDED';
    } else if (status >= 400 && status < 500) {
      type = 'VALIDATION';
      code = 'VALIDATION_ERROR';
    } else {
      type = 'SERVER';
      code = ERROR_CODES.SERVER_ERROR;
    }

    return this.createError(type, code, message, { status });
  }

  /**
   * Convert JavaScript Error to AppError
   */
  static fromError(error: Error, context?: string): AppError {
    // Check for specific error types
    if (error.name === 'TypeError') {
      return this.createError('VALIDATION', 'TYPE_ERROR', error.message, { context });
    }
    
    if (error.message.includes('fetch')) {
      return this.createError('NETWORK', ERROR_CODES.NETWORK_ERROR, 'Network request failed', { 
        originalMessage: error.message,
        context 
      });
    }

    // Default to server error
    return this.createError('SERVER', 'UNKNOWN_ERROR', error.message, { 
      name: error.name,
      context 
    });
  }

  /**
   * Core error creation method
   */
  private static createError(
    type: ErrorType, 
    code: string, 
    message: string, 
    details?: Record<string, unknown>
  ): AppError {
    const error: AppError = {
      type,
      code,
      message,
      details,
      timestamp: Date.now(),
      context: this.getCallerContext()
    };

    // Log error creation in development
    logger.api.debug('Error created', { error });

    return error;
  }

  /**
   * Get caller context for debugging
   */
  private static getCallerContext(): string {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Get the 4th line (caller of the factory method)
        const callerLine = lines[4];
        const match = callerLine?.match(/at\s+(.+)\s+\(/);
        return match?.[1] || 'unknown';
      }
    } catch {
      // Ignore stack trace errors
    }
    return 'unknown';
  }
}

/**
 * Error Utilities
 */
export class ErrorUtils {
  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: AppError): boolean {
    const recoverableTypes: ErrorType[] = ['NETWORK', 'RATE_LIMIT'];
    return recoverableTypes.includes(error.type);
  }

  /**
   * Check if error should trigger retry
   */
  static shouldRetry(error: AppError): boolean {
    if (error.type === 'NETWORK') return true;
    if (error.type === 'SERVER' && error.details?.status === 503) return true;
    if (error.type === 'RATE_LIMIT') return true;
    return false;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: AppError): string {
    const userMessages: Record<string, string> = {
      [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
      [ERROR_CODES.ACCOUNT_NOT_VERIFIED]: 'Please verify your email address before logging in.',
      [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
      [ERROR_CODES.NETWORK_ERROR]: 'Connection error. Please check your internet connection.',
      [ERROR_CODES.SERVER_ERROR]: 'Server error. Please try again later.',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment before trying again.',
      'AUTH_ACCESS_DENIED': 'You do not have permission to access this resource.',
    };

    return userMessages[error.code] || error.message || 'An unexpected error occurred.';
  }

  /**
   * Get retry delay for recoverable errors
   */
  static getRetryDelay(error: AppError, attempt: number): number {
    if (error.type === 'RATE_LIMIT' && error.details?.retryAfter) {
      return (error.details.retryAfter as number) * 1000;
    }
    
    if (error.type === 'NETWORK') {
      // Exponential backoff: 1s, 2s, 4s, 8s
      return Math.min(1000 * Math.pow(2, attempt), 8000);
    }
    
    return 1000; // Default 1 second
  }
}