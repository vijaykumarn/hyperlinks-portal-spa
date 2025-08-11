// src/utils/logger.ts - Centralized Logging System
// Environment-based filtering with proper security

import { ENV_CONFIG } from '../config/constants';
import { sanitizeForLogging } from './security';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'auth' | 'api' | 'router' | 'state' | 'component' | 'oauth2' | 'session';

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
  timestamp: number;
  context?: string;
}

class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;
  private enabledCategories: Set<LogCategory>;

  private constructor() {
    this.currentLevel = this.parseLogLevel(ENV_CONFIG.LOG_LEVEL);
    this.enabledCategories = this.parseEnabledCategories();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return validLevels.includes(level as LogLevel) ? (level as LogLevel) : 'info';
  }

  private parseEnabledCategories(): Set<LogCategory> {
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      return new Set(['auth', 'api', 'router', 'state', 'component', 'oauth2', 'session']);
    }
    return new Set(['error', 'warn']); // Production: only errors and warnings
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentPriority = levelPriority[this.currentLevel];
    const requestedPriority = levelPriority[level];

    return requestedPriority >= currentPriority && this.enabledCategories.has(category);
  }

  private formatMessage(category: LogCategory, message: string): string {
    const icons = {
      auth: '🔐',
      api: '📡',
      router: '🚀',
      state: '🔄',
      component: '🎨',
      oauth2: '🔗',
      session: '👤'
    };
    
    const timestamp = new Date().toISOString().substr(11, 12); // HH:mm:ss.SSS
    return `${icons[category]} [${category.toUpperCase()}] ${timestamp} ${message}`;
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(level, category)) return;

    const formattedMessage = this.formatMessage(category, message);
    const sanitizedData = data ? sanitizeForLogging(data) : undefined;

    const logEntry: LogEntry = {
      level,
      category,
      message,
      data: sanitizedData,
      timestamp: Date.now(),
      context
    };

    // Console output based on level
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, sanitizedData);
        break;
      case 'info':
        console.info(formattedMessage, sanitizedData);
        break;
      case 'warn':
        console.warn(formattedMessage, sanitizedData);
        break;
      case 'error':
        console.error(formattedMessage, sanitizedData);
        break;
    }

    // In development, also store for debugging
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      this.storeLogEntry(logEntry);
    }
  }

  private storeLogEntry(entry: LogEntry): void {
    try {
      const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      logs.push(entry);
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      sessionStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      // Ignore storage errors
    }
  }

  // Public API methods
  public auth = {
    debug: (message: string, data?: unknown, context?: string) => 
      this.log('debug', 'auth', message, data, context),
    info: (message: string, data?: unknown, context?: string) => 
      this.log('info', 'auth', message, data, context),
    warn: (message: string, data?: unknown, context?: string) => 
      this.log('warn', 'auth', message, data, context),
    error: (message: string, data?: unknown, context?: string) => 
      this.log('error', 'auth', message, data, context),
  };

  public api = {
    debug: (message: string, data?: unknown, context?: string) => 
      this.log('debug', 'api', message, data, context),
    info: (message: string, data?: unknown, context?: string) => 
      this.log('info', 'api', message, data, context),
    warn: (message: string, data?: unknown, context?: string) => 
      this.log('warn', 'api', message, data, context),
    error: (message: string, data?: unknown, context?: string) => 
      this.log('error', 'api', message, data, context),
  };

  public router = {
    debug: (message: string, data?: unknown, context?: string) => 
      this.log('debug', 'router', message, data, context),
    info: (message: string, data?: unknown, context?: string) => 
      this.log('info', 'router', message, data, context),
    warn: (message: string, data?: unknown, context?: string) => 
      this.log('warn', 'router', message, data, context),
    error: (message: string, data?: unknown, context?: string) => 
      this.log('error', 'router', message, data, context),
  };

  public state = {
    debug: (message: string, data?: unknown, context?: string) => 
      this.log('debug', 'state', message, data, context),
    info: (message: string, data?: unknown, context?: string) => 
      this.log('info', 'state', message, data, context),
    warn: (message: string, data?: unknown, context?: string) => 
      this.log('warn', 'state', message, data, context),
    error: (message: string, data?: unknown, context?: string) => 
      this.log('error', 'state', message, data, context),
  };

  public component = {
    debug: (message: string, data?: unknown, context?: string) => 
      this.log('debug', 'component', message, data, context),
    info: (message: string, data?: unknown, context?: string) => 
      this.log('info', 'component', message, data, context),
    warn: (message: string, data?: unknown, context?: string) => 
      this.log('warn', 'component', message, data, context),
    error: (message: string, data?: unknown, context?: string) => 
      this.log('error', 'component', message, data, context),
  };

  public oauth2 = {
    debug: (message: string, data?: unknown, context?: string) => 
      this.log('debug', 'oauth2', message, data, context),
    info: (message: string, data?: unknown, context?: string) => 
      this.log('info', 'oauth2', message, data, context),
    warn: (message: string, data?: unknown, context?: string) => 
      this.log('warn', 'oauth2', message, data, context),
    error: (message: string, data?: unknown, context?: string) => 
      this.log('error', 'oauth2', message, data, context),
  };

  public session = {
    debug: (message: string, data?: unknown, context?: string) => 
      this.log('debug', 'session', message, data, context),
    info: (message: string, data?: unknown, context?: string) => 
      this.log('info', 'session', message, data, context),
    warn: (message: string, data?: unknown, context?: string) => 
      this.log('warn', 'session', message, data, context),
    error: (message: string, data?: unknown, context?: string) => 
      this.log('error', 'session', message, data, context),
  };

  // Utility methods
  public getLogs(): LogEntry[] {
    try {
      return JSON.parse(sessionStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }

  public clearLogs(): void {
    try {
      sessionStorage.removeItem('app_logs');
    } catch {
      // Ignore errors
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();