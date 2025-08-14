// src/services/core/ApiErrorHandler.ts - PHASE 3: ENHANCED API ERROR HANDLER

import { AuthErrorHandler, type AuthError, AUTH_ERROR_CODES } from '../auth/AuthErrorHandler';
import type { ServerType } from './ApiConfig';
import type { FrontendApiResponse } from './HttpClient';

/**
 * Extended error context for all API operations
 */
export interface ApiErrorContext {
  operation: string;
  server: ServerType | 'unknown';
  endpoint: string;
  method: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

/**
 * Enhanced error types extending auth error types
 */
export type ApiErrorType = 
  | 'network' 
  | 'authentication' 
  | 'validation' 
  | 'server' 
  | 'oauth2' 
  | 'session'
  | 'business_logic'  // NEW: Business logic errors
  | 'rate_limit'      // NEW: Rate limiting errors
  | 'timeout'         // NEW: Timeout errors
  | 'circuit_breaker' // NEW: Circuit breaker errors
  | 'offline'         // NEW: Offline errors
  | 'unknown';        // NEW: Unknown errors

/**
 * Enhanced error with additional API context
 */
export interface ApiError extends AuthError {
  id: string;
  context: ApiErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  metadata: Record<string, any>;
}

/**
 * Error statistics for monitoring
 */
interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byServer: Record<string, number>;
  byEndpoint: Record<string, number>;
  lastOccurred: number;
  recentErrors: ApiError[];
}

/**
 * Enhanced API Error Handler that extends AuthErrorHandler
 */
export class ApiErrorHandler {
  private static instance: ApiErrorHandler;
  private authErrorHandler: AuthErrorHandler;
  private errorStats: ErrorStats;
  private errorHistory: ApiError[] = [];
  private maxHistorySize = 100;
  private errorId = 0;

  private constructor() {
    this.authErrorHandler = AuthErrorHandler.getInstance();
    this.errorStats = {
      total: 0,
      byType: {},
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byServer: {},
      byEndpoint: {},
      lastOccurred: 0,
      recentErrors: []
    };
    
    console.log('🛡️ ApiErrorHandler: Enhanced error processing initialized');
  }

  public static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler();
    }
    return ApiErrorHandler.instance;
  }

  /**
   * Process any API error through the enhanced handler
   */
  public processError(error: any, context: ApiErrorContext): ApiError {
    // First, process through the auth error handler for consistency
    const authError = this.authErrorHandler.processError(error, context.operation);
    
    // Enhance with additional API context
    const apiError = this.enhanceAuthError(authError, context);
    
    // Update statistics
    this.updateStats(apiError);
    
    // Add to history
    this.addToHistory(apiError);
    
    // Log the error
    this.logError(apiError);
    
    // Emit error event
    this.emitErrorEvent(apiError);
    
    return apiError;
  }

  /**
   * Enhance AuthError with API-specific context
   */
  private enhanceAuthError(authError: AuthError, context: ApiErrorContext): ApiError {
    const errorId = `api_err_${++this.errorId}_${Date.now()}`;
    
    // Determine severity based on error type and context
    const severity = this.determineSeverity(authError, context);
    
    // Extract additional metadata
    const metadata = this.extractMetadata(authError, context);
    
    return {
      ...authError,
      id: errorId,
      context,
      severity,
      retryCount: 0,
      metadata
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: AuthError, context: ApiErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors that break core functionality
    if (error.type === 'authentication' && context.operation === 'app_initialization') {
      return 'critical';
    }
    
    if (error.type === 'server' && context.server === 'auth' && context.operation.includes('login')) {
      return 'critical';
    }

    // High severity errors
    if (error.type === 'authentication' || error.type === 'session') {
      return 'high';
    }
    
    if (error.type === 'server' && error.code === AUTH_ERROR_CODES.SERVER_ERROR) {
      return 'high';
    }

    // Medium severity errors
    if (error.type === 'validation' || error.type === 'oauth2') {
      return 'medium';
    }
    
    if (error.type === 'network' && error.code === AUTH_ERROR_CODES.TIMEOUT) {
      return 'medium';
    }

    // Low severity errors
    return 'low';
  }

  /**
   * Extract metadata from error and context
   */
  private extractMetadata(error: AuthError, context: ApiErrorContext): Record<string, any> {
    return {
      timestamp: context.timestamp,
      server: context.server,
      endpoint: context.endpoint,
      method: context.method,
      operation: context.operation,
      userAgent: navigator.userAgent,
      isOnline: navigator.onLine,
      retryable: error.retryable,
      recoverable: error.recoverable,
      originalErrorCode: error.code,
      ...error.details
    };
  }

  /**
   * Update error statistics
   */
  private updateStats(error: ApiError): void {
    this.errorStats.total++;
    this.errorStats.lastOccurred = error.context.timestamp;
    
    // By type
    this.errorStats.byType[error.type] = (this.errorStats.byType[error.type] || 0) + 1;
    
    // By severity
    this.errorStats.bySeverity[error.severity]++;
    
    // By server
    this.errorStats.byServer[error.context.server] = (this.errorStats.byServer[error.context.server] || 0) + 1;
    
    // By endpoint
    this.errorStats.byEndpoint[error.context.endpoint] = (this.errorStats.byEndpoint[error.context.endpoint] || 0) + 1;
    
    // Recent errors (keep last 10)
    this.errorStats.recentErrors.push(error);
    if (this.errorStats.recentErrors.length > 10) {
      this.errorStats.recentErrors.shift();
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(error: ApiError): void {
    this.errorHistory.push(error);
    
    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: ApiError): void {
    const logMessage = `${error.severity.toUpperCase()} [${error.type}] ${error.id}: ${error.message}`;
    const logContext = {
      id: error.id,
      type: error.type,
      severity: error.severity,
      server: error.context.server,
      endpoint: error.context.endpoint,
      operation: error.context.operation,
      retryable: error.retryable,
      metadata: error.metadata
    };

    switch (error.severity) {
      case 'critical':
        console.error('🚨', logMessage, logContext);
        break;
      case 'high':
        console.error('🔴', logMessage, logContext);
        break;
      case 'medium':
        console.warn('🟡', logMessage, logContext);
        break;
      case 'low':
        console.log('🔵', logMessage, logContext);
        break;
    }
  }

  /**
   * Emit error event for other parts of the app
   */
  private emitErrorEvent(error: ApiError): void {
    const event = new CustomEvent('api-error', {
      detail: {
        id: error.id,
        type: error.type,
        severity: error.severity,
        server: error.context.server,
        endpoint: error.context.endpoint,
        operation: error.context.operation,
        message: error.message,
        userMessage: error.userMessage,
        retryable: error.retryable,
        recoverable: error.recoverable
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Process FrontendApiResponse errors specifically
   */
  public processApiResponse<T>(
    response: FrontendApiResponse<T>, 
    context: ApiErrorContext
  ): ApiError | null {
    if (response.success) {
      return null;
    }

    // Create a mock error object that AuthErrorHandler can process
    const mockError = {
      status: response.status,
      error: response.error,
      message: response.message,
      fieldErrors: response.fieldErrors
    };

    return this.processError(mockError, context);
  }

  /**
   * Check if operation should be retried
   */
  public shouldRetry(error: ApiError, operationId: string): boolean {
    // Use AuthErrorHandler's retry logic
    return this.authErrorHandler.shouldRetry(error, operationId);
  }

  /**
   * Increment retry count
   */
  public incrementRetryCount(error: ApiError, operationId: string): number {
    error.retryCount++;
    return this.authErrorHandler.incrementRetryCount(operationId);
  }

  /**
   * Reset retry count
   */
  public resetRetryCount(operationId: string): void {
    this.authErrorHandler.resetRetryCount(operationId);
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  /**
   * Get error history
   */
  public getErrorHistory(): ReadonlyArray<ApiError> {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorStats.recentErrors = [];
    console.log('🧹 ApiErrorHandler: Error history cleared');
  }

  /**
   * Get errors by server
   */
  public getErrorsByServer(server: ServerType): ApiError[] {
    return this.errorHistory.filter(error => error.context.server === server);
  }

  /**
   * Get errors by endpoint
   */
  public getErrorsByEndpoint(endpoint: string): ApiError[] {
    return this.errorHistory.filter(error => error.context.endpoint === endpoint);
  }

  /**
   * Get recent critical errors
   */
  public getCriticalErrors(): ApiError[] {
    return this.errorHistory.filter(error => error.severity === 'critical');
  }

  /**
   * Format error for logging (extends AuthErrorHandler)
   */
  public formatForLogging(error: ApiError): string {
    const baseFormat = this.authErrorHandler.formatForLogging(error);
    return `${error.id} ${baseFormat} [${error.context.server}:${error.context.endpoint}]`;
  }

  /**
   * Format error for user display (uses AuthErrorHandler)
   */
  public formatForUser(error: ApiError): string {
    return this.authErrorHandler.formatForUser(error);
  }

  /**
   * Handle circuit breaker errors
   */
  public handleCircuitBreakerError(server: ServerType, endpoint: string): ApiError {
    const context: ApiErrorContext = {
      operation: 'circuit_breaker_open',
      server,
      endpoint,
      method: 'ANY',
      timestamp: Date.now()
    };

    const mockError = {
      message: `Circuit breaker open for ${server} server`,
      status: 503
    };

    return this.processError(mockError, context);
  }

  /**
   * Handle offline errors
   */
  public handleOfflineError(operation: string, endpoint: string): ApiError {
    const context: ApiErrorContext = {
      operation,
      server: 'unknown',
      endpoint,
      method: 'ANY',
      timestamp: Date.now()
    };

    const mockError = {
      message: 'Application is offline',
      status: 0
    };

    return this.processError(mockError, context);
  }

  /**
   * Get error summary for debugging
   */
  public getErrorSummary(): {
    totalErrors: number;
    criticalErrors: number;
    recentErrors: number;
    topErrorTypes: Array<{ type: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const topErrorTypes = Object.entries(this.errorStats.byType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    const topEndpoints = Object.entries(this.errorStats.byEndpoint)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalErrors: this.errorStats.total,
      criticalErrors: this.errorStats.bySeverity.critical,
      recentErrors: this.errorStats.recentErrors.length,
      topErrorTypes,
      topEndpoints
    };
  }

  /**
   * Reset all statistics
   */
  public resetStats(): void {
    this.errorStats = {
      total: 0,
      byType: {},
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byServer: {},
      byEndpoint: {},
      lastOccurred: 0,
      recentErrors: []
    };
    
    this.clearErrorHistory();
    console.log('🔄 ApiErrorHandler: Statistics reset');
  }
}