// src/services/auth/AuthErrorHandler.ts - CENTRALIZED ERROR HANDLING

import type { ApiResponse } from '../../types/app';

/**
 * Standardized authentication error types
 */
export interface AuthError {
  type: 'network' | 'authentication' | 'validation' | 'server' | 'oauth2' | 'session';
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  details?: any;
}

/**
 * Authentication error codes
 */
export const AUTH_ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  OFFLINE: 'OFFLINE',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Validation errors
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  TERMS_NOT_ACCEPTED: 'TERMS_NOT_ACCEPTED',
  
  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // OAuth2 errors
  OAUTH2_CANCELLED: 'OAUTH2_CANCELLED',
  OAUTH2_INVALID_STATE: 'OAUTH2_INVALID_STATE',
  OAUTH2_SERVER_ERROR: 'OAUTH2_SERVER_ERROR',
  
  // Session errors
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_VALIDATION_FAILED: 'SESSION_VALIDATION_FAILED',
  CONCURRENT_SESSION: 'CONCURRENT_SESSION'
} as const;

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  action: 'retry' | 'redirect' | 'refresh' | 'login' | 'none';
  delay?: number;
  maxRetries?: number;
  redirectUrl?: string;
}

/**
 * Centralized authentication error handler
 */
export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private retryCounters: Map<string, number> = new Map();

  public static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * Process and standardize authentication errors
   */
  public processError(
    error: any,
    context: string = 'unknown'
  ): AuthError {
    console.log(`🔍 AuthErrorHandler: Processing error in context: ${context}`, error);

    // Handle different error sources
    if (this.isApiResponse(error)) {
      return this.processApiError(error, context);
    }

    if (this.isNetworkError(error)) {
      return this.processNetworkError(error, context);
    }

    if (this.isOAuth2Error(error)) {
      return this.processOAuth2Error(error, context);
    }

    // Default error processing
    return this.processGenericError(error, context);
  }

  /**
   * Process API response errors
   */
  private processApiError(response: ApiResponse<any> & { status?: number }, context: string): AuthError {
    const status = response.status || 0;
    const message = response.error || response.message || 'Unknown API error';

    // Map status codes to error types
    switch (status) {
      case 400:
        return this.createValidationError(message, context);
      case 401:
        return this.createAuthenticationError(message, context);
      case 403:
        return this.createAuthorizationError(message, context);
      case 429:
        return this.createRateLimitError(message, context);
      case 500:
      case 502:
      case 503:
      case 504:
        return this.createServerError(message, context, status);
      default:
        return this.createGenericServerError(message, context, status);
    }
  }

  /**
   * Process network errors
   */
  private processNetworkError(error: Error, context: string): AuthError {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        type: 'network',
        code: AUTH_ERROR_CODES.TIMEOUT,
        message: `Request timeout in ${context}`,
        userMessage: 'Request timed out. Please check your connection and try again.',
        recoverable: true,
        retryable: true,
        details: { context, originalError: error.message }
      };
    }

    if (!navigator.onLine) {
      return {
        type: 'network',
        code: AUTH_ERROR_CODES.OFFLINE,
        message: `Network offline during ${context}`,
        userMessage: 'You appear to be offline. Please check your internet connection.',
        recoverable: true,
        retryable: true,
        details: { context }
      };
    }

    return {
      type: 'network',
      code: AUTH_ERROR_CODES.NETWORK_ERROR,
      message: `Network error in ${context}: ${error.message}`,
      userMessage: 'Network error. Please check your connection and try again.',
      recoverable: true,
      retryable: true,
      details: { context, originalError: error.message }
    };
  }

  /**
   * Process OAuth2 specific errors
   */
  private processOAuth2Error(error: any, context: string): AuthError {
    const errorCode = error.error || error.code || 'unknown';
    const description = error.error_description || error.description || '';

    switch (errorCode) {
      case 'access_denied':
        return {
          type: 'oauth2',
          code: AUTH_ERROR_CODES.OAUTH2_CANCELLED,
          message: `OAuth2 access denied in ${context}`,
          userMessage: 'Login was cancelled. Please try again if you want to sign in.',
          recoverable: true,
          retryable: true,
          details: { context, errorCode, description }
        };

      case 'invalid_request':
      case 'invalid_client':
      case 'invalid_grant':
        return {
          type: 'oauth2',
          code: AUTH_ERROR_CODES.OAUTH2_SERVER_ERROR,
          message: `OAuth2 configuration error in ${context}: ${errorCode}`,
          userMessage: 'Authentication service error. Please try again or contact support.',
          recoverable: false,
          retryable: false,
          details: { context, errorCode, description }
        };

      default:
        return {
          type: 'oauth2',
          code: AUTH_ERROR_CODES.OAUTH2_SERVER_ERROR,
          message: `OAuth2 error in ${context}: ${errorCode}`,
          userMessage: 'Google login failed. Please try again.',
          recoverable: true,
          retryable: true,
          details: { context, errorCode, description }
        };
    }
  }

  /**
   * Create specific error types
   */
  private createValidationError(message: string, context: string): AuthError {
    // Map common validation messages to specific codes
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('email') && lowerMessage.includes('invalid')) {
      return {
        type: 'validation',
        code: AUTH_ERROR_CODES.INVALID_EMAIL,
        message: `Invalid email in ${context}`,
        userMessage: 'Please enter a valid email address.',
        recoverable: true,
        retryable: false,
        details: { context, originalMessage: message }
      };
    }

    if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('strong'))) {
      return {
        type: 'validation',
        code: AUTH_ERROR_CODES.WEAK_PASSWORD,
        message: `Weak password in ${context}`,
        userMessage: 'Password does not meet security requirements.',
        recoverable: true,
        retryable: false,
        details: { context, originalMessage: message }
      };
    }

    if (lowerMessage.includes('username') && lowerMessage.includes('taken')) {
      return {
        type: 'validation',
        code: AUTH_ERROR_CODES.USERNAME_TAKEN,
        message: `Username taken in ${context}`,
        userMessage: 'This username is already taken. Please choose another.',
        recoverable: true,
        retryable: false,
        details: { context, originalMessage: message }
      };
    }

    if (lowerMessage.includes('email') && lowerMessage.includes('taken')) {
      return {
        type: 'validation',
        code: AUTH_ERROR_CODES.EMAIL_TAKEN,
        message: `Email taken in ${context}`,
        userMessage: 'An account with this email already exists.',
        recoverable: true,
        retryable: false,
        details: { context, originalMessage: message }
      };
    }

    // Generic validation error
    return {
      type: 'validation',
      code: 'VALIDATION_ERROR',
      message: `Validation error in ${context}: ${message}`,
      userMessage: message,
      recoverable: true,
      retryable: false,
      details: { context, originalMessage: message }
    };
  }

  private createAuthenticationError(message: string, context: string): AuthError {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credentials') || lowerMessage.includes('password')) {
      return {
        type: 'authentication',
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: `Invalid credentials in ${context}`,
        userMessage: 'Invalid email or password. Please try again.',
        recoverable: true,
        retryable: true,
        details: { context, originalMessage: message }
      };
    }

    if (lowerMessage.includes('verify') || lowerMessage.includes('verification')) {
      return {
        type: 'authentication',
        code: AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED,
        message: `Account not verified in ${context}`,
        userMessage: 'Please verify your email address before logging in.',
        recoverable: true,
        retryable: false,
        details: { context, originalMessage: message }
      };
    }

    if (lowerMessage.includes('session') || lowerMessage.includes('expired')) {
      return {
        type: 'session',
        code: AUTH_ERROR_CODES.SESSION_EXPIRED,
        message: `Session expired in ${context}`,
        userMessage: 'Your session has expired. Please log in again.',
        recoverable: true,
        retryable: false,
        details: { context, originalMessage: message }
      };
    }

    return {
      type: 'authentication',
      code: AUTH_ERROR_CODES.UNAUTHORIZED,
      message: `Authentication failed in ${context}: ${message}`,
      userMessage: 'Authentication failed. Please try again.',
      recoverable: true,
      retryable: true,
      details: { context, originalMessage: message }
    };
  }

  private createAuthorizationError(message: string, context: string): AuthError {
    return {
      type: 'authentication',
      code: AUTH_ERROR_CODES.UNAUTHORIZED,
      message: `Access denied in ${context}: ${message}`,
      userMessage: 'Access denied. Please log in and try again.',
      recoverable: true,
      retryable: false,
      details: { context, originalMessage: message }
    };
  }

  private createRateLimitError(message: string, context: string): AuthError {
    return {
      type: 'server',
      code: AUTH_ERROR_CODES.RATE_LIMITED,
      message: `Rate limited in ${context}`,
      userMessage: 'Too many requests. Please wait a moment and try again.',
      recoverable: true,
      retryable: true,
      details: { context, originalMessage: message }
    };
  }

  private createServerError(message: string, context: string, status: number): AuthError {
    return {
      type: 'server',
      code: AUTH_ERROR_CODES.SERVER_ERROR,
      message: `Server error ${status} in ${context}: ${message}`,
      userMessage: 'Server error. Please try again later.',
      recoverable: true,
      retryable: true,
      details: { context, status, originalMessage: message }
    };
  }

  private createGenericServerError(message: string, context: string, status: number): AuthError {
    return {
      type: 'server',
      code: AUTH_ERROR_CODES.SERVER_ERROR,
      message: `HTTP ${status} in ${context}: ${message}`,
      userMessage: 'An error occurred. Please try again.',
      recoverable: true,
      retryable: true,
      details: { context, status, originalMessage: message }
    };
  }

  private processGenericError(error: any, context: string): AuthError {
    const message = error?.message || error?.toString() || 'Unknown error';
    
    return {
      type: 'server',
      code: 'UNKNOWN_ERROR',
      message: `Unknown error in ${context}: ${message}`,
      userMessage: 'An unexpected error occurred. Please try again.',
      recoverable: true,
      retryable: true,
      details: { context, originalError: error }
    };
  }

  /**
   * Get recovery strategy for an error
   */
  public getRecoveryStrategy(error: AuthError): ErrorRecoveryStrategy {
    switch (error.code) {
      case AUTH_ERROR_CODES.NETWORK_ERROR:
      case AUTH_ERROR_CODES.TIMEOUT:
        return { action: 'retry', delay: 2000, maxRetries: 3 };

      case AUTH_ERROR_CODES.RATE_LIMITED:
        return { action: 'retry', delay: 5000, maxRetries: 2 };

      case AUTH_ERROR_CODES.SESSION_EXPIRED:
      case AUTH_ERROR_CODES.UNAUTHORIZED:
        return { action: 'login', redirectUrl: '/' };

      case AUTH_ERROR_CODES.SERVER_ERROR:
        return { action: 'retry', delay: 3000, maxRetries: 2 };

      case AUTH_ERROR_CODES.OAUTH2_CANCELLED:
        return { action: 'none' };

      case AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED:
        return { action: 'redirect', redirectUrl: '/verify' };

      default:
        return error.retryable 
          ? { action: 'retry', delay: 1000, maxRetries: 1 }
          : { action: 'none' };
    }
  }

  /**
   * Check if should retry operation
   */
  public shouldRetry(error: AuthError, operationId: string): boolean {
    if (!error.retryable) return false;

    const retryCount = this.retryCounters.get(operationId) || 0;
    const strategy = this.getRecoveryStrategy(error);
    const maxRetries = strategy.maxRetries || 0;

    return retryCount < maxRetries;
  }

  /**
   * Increment retry counter
   */
  public incrementRetryCount(operationId: string): number {
    const current = this.retryCounters.get(operationId) || 0;
    const newCount = current + 1;
    this.retryCounters.set(operationId, newCount);
    return newCount;
  }

  /**
   * Reset retry counter
   */
  public resetRetryCount(operationId: string): void {
    this.retryCounters.delete(operationId);
  }

  /**
   * Type guards
   */
  private isApiResponse(error: any): error is ApiResponse<any> {
    return error && typeof error === 'object' && 
           'success' in error && typeof error.success === 'boolean';
  }

  private isNetworkError(error: any): error is Error {
    return error instanceof Error && 
           (error.name === 'NetworkError' || 
            error.name === 'AbortError' ||
            error.message.includes('fetch') ||
            error.message.includes('network'));
  }

  private isOAuth2Error(error: any): boolean {
    return error && typeof error === 'object' &&
           ('error' in error || 'error_description' in error);
  }

  /**
   * Format error for logging
   */
  public formatForLogging(error: AuthError): string {
    return `[${error.type.toUpperCase()}] ${error.code}: ${error.message}`;
  }

  /**
   * Format error for user display
   */
  public formatForUser(error: AuthError): string {
    return error.userMessage;
  }
}