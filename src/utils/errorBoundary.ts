// src/utils/errorBoundary.ts - Global Error Handling
// Provides application-wide error handling and recovery

import type { AppError } from '../types/unified';
import { ErrorFactory, ErrorUtils } from './errors';
import { logger } from './logger';

interface ErrorHandler {
  (error: AppError): void;
}

interface ErrorRecoveryStrategy {
  canRecover(error: AppError): boolean;
  recover(error: AppError): Promise<boolean>;
}

class ErrorBoundary {
  private static instance: ErrorBoundary;
  private errorHandlers: Set<ErrorHandler> = new Set();
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorQueue: AppError[] = [];
  private isProcessing = false;

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupDefaultRecoveryStrategies();
  }

  public static getInstance(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary();
    }
    return ErrorBoundary.instance;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      const error = ErrorFactory.fromError(event.error || new Error(event.message), 'global');
      this.handleError(error);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? ErrorFactory.fromError(event.reason, 'promise')
        : ErrorFactory.server('Unhandled promise rejection', 500, { reason: event.reason });
      
      this.handleError(error);
      event.preventDefault(); // Prevent console error
    });
  }

  /**
   * Setup default recovery strategies
   */
  private setupDefaultRecoveryStrategies(): void {
    // Network error recovery
    this.addRecoveryStrategy({
      canRecover: (error) => error.type === 'NETWORK',
      recover: async (error) => {
        logger.api.info('Attempting network error recovery');
        
        // Wait for connectivity
        await this.waitForConnectivity();
        
        // Try to refresh the page or retry the operation
        if (navigator.onLine) {
          logger.api.info('Network connectivity restored');
          return true;
        }
        
        return false;
      }
    });

    // Session expired recovery
    this.addRecoveryStrategy({
      canRecover: (error) => error.code === ERROR_CODES.SESSION_EXPIRED,
      recover: async () => {
        logger.auth.info('Attempting session recovery');
        
        // Redirect to login page
        window.location.href = '/';
        return true;
      }
    });
  }

  /**
   * Main error handling method
   */
  public handleError(error: AppError): void {
    logger.api.error('Error boundary caught error', { error });

    // Add to queue for processing
    this.errorQueue.push(error);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processErrorQueue();
    }

    // Notify registered handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        logger.api.error('Error handler threw error', { handlerError });
      }
    });
  }

  /**
   * Process error queue with recovery attempts
   */
  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.errorQueue.length > 0) {
        const error = this.errorQueue.shift()!;
        await this.processError(error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual error with recovery
   */
  private async processError(error: AppError): Promise<void> {
    logger.api.debug('Processing error', { error });

    // Try recovery strategies
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            logger.api.info('Error recovered successfully', { error });
            return;
          }
        } catch (recoveryError) {
          logger.api.error('Recovery strategy failed', { recoveryError });
        }
      }
    }

    // If no recovery possible, show user-friendly message
    this.showUserError(error);
  }

  /**
   * Show error to user
   */
  private showUserError(error: AppError): void {
    const message = ErrorUtils.getUserMessage(error);
    const isRecoverable = ErrorUtils.isRecoverable(error);

    // Create error notification
    this.createErrorNotification(message, isRecoverable, error);
  }

  /**
   * Create error notification in UI
   */
  private createErrorNotification(message: string, isRecoverable: boolean, error: AppError): void {
    // This will be enhanced to integrate with the UI notification system
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg z-50
      ${isRecoverable ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}
      border transform transition-transform duration-300 translate-x-full
    `;

    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${isRecoverable ? '⚠️' : '❌'}
        </div>
        <div class="ml-3 flex-1">
          <p class="${isRecoverable ? 'text-yellow-800' : 'text-red-800'} text-sm font-medium">
            ${message}
          </p>
          ${isRecoverable ? `
            <button class="mt-2 text-yellow-600 hover:text-yellow-500 text-sm underline" onclick="this.parentElement.parentElement.parentElement.remove()">
              Retry
            </button>
          ` : ''}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto-remove after delay
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, isRecoverable ? 8000 : 5000);
  }

  /**
   * Wait for network connectivity
   */
  private async waitForConnectivity(timeout = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnectivity = () => {
        if (navigator.onLine) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkConnectivity, 1000);
      };

      checkConnectivity();
    });
  }

  /**
   * Add error handler
   */
  public addErrorHandler(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Add recovery strategy
   */
  public addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Clear error queue
   */
  public clearErrors(): void {
    this.errorQueue = [];
  }
}

export const errorBoundary = ErrorBoundary.getInstance();