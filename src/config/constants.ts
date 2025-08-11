// src/config/constants.ts - Centralized Configuration
// All magic numbers and configuration values in one place

/**
 * API Configuration Constants
 */
export const API_CONFIG = {
  // Timeouts
  REQUEST_TIMEOUT: 10_000, // 10 seconds
  OAUTH2_TIMEOUT: 15_000,  // 15 seconds for OAuth2 flows
  SESSION_TIMEOUT: 30_000, // 30 seconds for session operations
  
  // Retry Configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1_000, // 1 second base delay for exponential backoff
  RETRY_MAX_DELAY: 10_000, // Maximum 10 seconds between retries
  
  // Session Management
  SESSION_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  SESSION_WARNING_THRESHOLD: 10 * 60 * 1000, // Warn when 10 minutes left
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours max age
  
  // OAuth2 Configuration
  OAUTH2_STATE_MAX_AGE: 15 * 60 * 1000, // 15 minutes for OAuth2 state
  OAUTH2_CALLBACK_TIMEOUT: 30 * 1000, // 30 seconds for callback processing
  
  // UI Timeouts
  NOTIFICATION_DURATION: 5_000, // 5 seconds
  LOADING_DELAY: 300, // Show loading after 300ms
  DEBOUNCE_DELAY: 300, // Input debouncing
  
  // Cache Configuration
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes default TTL
  CACHE_MAX_SIZE: 100, // Maximum cached items
} as const;

/**
 * Validation Constants
 */
export const VALIDATION = {
  // Password Requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,
  PASSWORD_REQUIRED_PATTERNS: {
    LOWERCASE: /[a-z]/,
    UPPERCASE: /[A-Z]/,
    DIGIT: /\d/,
    SPECIAL: /[@$!%*?&]/,
  },
  
  // Username Requirements
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  USERNAME_PATTERN: /^[a-zA-Z0-9._-]+$/,
  
  // Email Requirements
  EMAIL_MAX_LENGTH: 255,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Organisation
  ORGANISATION_MAX_LENGTH: 100,
} as const;

/**
 * Route Constants
 */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  URLS: '/dashboard/urls',
  ANALYTICS: '/dashboard/analytics', 
  SETTINGS: '/dashboard/settings',
  AUTH_CALLBACK: '/auth/callback',
  NOT_FOUND: '/404',
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  SESSION: 'session',
  OAUTH2_STATE: 'oauth2_state',
  OAUTH2_PROCESSED: 'oauth2_processed',
  USER_PREFERENCES: 'user_preferences',
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  ACCOUNT_NOT_VERIFIED: 'AUTH_ACCOUNT_NOT_VERIFIED',
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // Validation
  INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
  WEAK_PASSWORD: 'VALIDATION_WEAK_PASSWORD',
  USERNAME_TAKEN: 'VALIDATION_USERNAME_TAKEN',
  
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'NETWORK_TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // OAuth2
  OAUTH2_CANCELLED: 'OAUTH2_CANCELLED',
  OAUTH2_INVALID_STATE: 'OAUTH2_INVALID_STATE',
} as const;

/**
 * Environment-based Configuration
 */
export const ENV_CONFIG = {
  IS_DEVELOPMENT: import.meta.env.MODE === 'development',
  IS_PRODUCTION: import.meta.env.MODE === 'production',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
} as const;