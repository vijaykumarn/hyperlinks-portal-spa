// src/utils/retry.ts - Retry Logic with Exponential Backoff
// Implements intelligent retry strategies for failed requests

import { API_CONFIG } from '../config/constants';
import { ErrorUtils } from './errors';
import { logger } from './logger';
import type { AppError } from '../types/unified';

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: AppError) => boolean;
  onRetry?: (attempt: number, error: AppError) => void;
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = API_CONFIG.MAX_RETRY_ATTEMPTS,
    baseDelay = API_CONFIG.RETRY_BASE_DELAY,
    maxDelay = API_CONFIG.RETRY_MAX_DELAY,
    backoffFactor = 2,
    shouldRetry = ErrorUtils.shouldRetry,
    onRetry
  } = options;

  let lastError: AppError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logger.api.info('Operation succeeded after retry', { 
          attempt, 
          totalAttempts: attempt 
        });
      }
      
      return result;
    } catch (error) {
      lastError = error as AppError;
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        logger.api.error('Operation failed after all retries', { 
          attempt, 
          maxAttempts, 
          error: lastError 
        });
        break;
      }

      // Check if error should be retried
      if (!shouldRetry(lastError)) {
        logger.api.info('Error not retryable, aborting', { 
          error: lastError, 
          attempt 
        });
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      logger.api.warn('Operation failed, retrying', { 
        attempt, 
        maxAttempts, 
        delay, 
        error: lastError 
      });

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Retry specific to API requests
 */
export async function withApiRetry<T>(
  apiCall: () => Promise<{ success: boolean; data?: T; error?: AppError }>,
  options: Omit<RetryOptions, 'shouldRetry'> = {}
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  const retryOptions: RetryOptions = {
    ...options,
    shouldRetry: (error: AppError) => {
      // Retry network errors, timeouts, and server errors (5xx)
      if (error.type === 'NETWORK') return true;
      if (error.code === 'NETWORK_TIMEOUT') return true;
      if (error.details?.status && error.details.status >= 500) return true;
      if (error.type === 'RATE_LIMIT') return true;
      
      return false;
    }
  };

  try {
    return await withRetry(apiCall, retryOptions);
  } catch (error) {
    // If retry fails, return error response instead of throwing
    return {
      success: false,
      error: error as AppError
    };
  }
}

/**
 * Retry with custom condition
 */
export async function withConditionalRetry<T>(
  operation: () => Promise<T>,
  condition: (result: T, attempt: number) => boolean,
  options: Omit<RetryOptions, 'shouldRetry'> = {}
): Promise<T> {
  const {
    maxAttempts = API_CONFIG.MAX_RETRY_ATTEMPTS,
    baseDelay = API_CONFIG.RETRY_BASE_DELAY,
    maxDelay = API_CONFIG.RETRY_MAX_DELAY,
    backoffFactor = 2,
    onRetry
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await operation();
    
    // Check if result satisfies condition
    if (condition(result, attempt)) {
      if (attempt > 1) {
        logger.api.info('Operation satisfied condition after retry', { 
          attempt, 
          totalAttempts: attempt 
        });
      }
      return result;
    }

    // Don't retry on the last attempt
    if (attempt === maxAttempts) {
      logger.api.warn('Operation did not satisfy condition after all retries', { 
        attempt, 
        maxAttempts 
      });
      return result;
    }

    // Calculate delay
    const delay = Math.min(
      baseDelay * Math.pow(backoffFactor, attempt - 1),
      maxDelay
    );

    logger.api.info('Condition not met, retrying', { 
      attempt, 
      maxAttempts, 
      delay 
    });

    // Call retry callback if provided
    if (onRetry) {
      onRetry(attempt, null as any); // No error in this case
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Max retries exceeded without satisfying condition');
}