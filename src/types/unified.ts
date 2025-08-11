// src/types/unified.ts - Unified Type System
// This file consolidates all types to eliminate duplication and improve type safety

/**
 * Unified User Data - Single source of truth
 * Replaces multiple UserData interfaces across the codebase
 */
export interface AppUser {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly name: string; // Display name (derived from username or email)
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly organisation?: string;
  readonly createdAt: number;
  readonly lastLoginAt?: number;
}

/**
 * User roles with proper typing
 */
export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';

/**
 * Backend API Response format - matches OpenAPI spec exactly
 */
export interface BackendApiResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
}

/**
 * Standardized Error System - replaces all error types
 */
export interface AppError {
  readonly type: ErrorType;
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: number;
  readonly context?: string; // Component/service where error occurred
}

export type ErrorType = 
  | 'VALIDATION'
  | 'AUTHENTICATION' 
  | 'AUTHORIZATION'
  | 'NETWORK'
  | 'SERVER'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT';

/**
 * Auth State Union - discriminated union for type safety
 */
export type AuthState = 
  | { status: 'UNAUTHENTICATED' }
  | { status: 'AUTHENTICATING'; method: 'credentials' | 'oauth2' }
  | { status: 'AUTHENTICATED'; user: AppUser; sessionId: string }
  | { status: 'SESSION_EXPIRED'; lastUser: AppUser }
  | { status: 'VERIFICATION_REQUIRED'; email: string; userId: string };

/**
 * Loading State Union
 */
export type LoadingState = 
  | { type: 'IDLE' }
  | { type: 'LOADING'; operation: string; progress?: number }
  | { type: 'SUCCESS'; result?: unknown }
  | { type: 'ERROR'; error: AppError };

/**
 * Type Guards for Runtime Safety
 */
export const TypeGuards = {
  isAppUser: (obj: unknown): obj is AppUser => {
    return typeof obj === 'object' && obj !== null &&
           typeof (obj as any).id === 'string' &&
           typeof (obj as any).email === 'string' &&
           typeof (obj as any).username === 'string';
  },

  isBackendApiResponse: <T>(obj: unknown): obj is BackendApiResponse<T> => {
    return typeof obj === 'object' && obj !== null &&
           typeof (obj as any).success === 'boolean';
  },

  isAppError: (obj: unknown): obj is AppError => {
    return typeof obj === 'object' && obj !== null &&
           typeof (obj as any).type === 'string' &&
           typeof (obj as any).code === 'string' &&
           typeof (obj as any).message === 'string';
  }
} as const;

/**
 * Type Conversion Utilities
 */
export const TypeConverters = {
  /**
   * Convert auth service UserData to unified AppUser
   */
  authUserToAppUser: (authUser: any): AppUser => {
    return {
      id: String(authUser.id || authUser.userId),
      email: authUser.email,
      username: authUser.username || authUser.email.split('@')[0],
      name: authUser.name || authUser.username || authUser.email.split('@')[0],
      role: (authUser.role as UserRole) || 'USER',
      emailVerified: authUser.emailVerified ?? true,
      organisation: authUser.organisation,
      createdAt: authUser.createdAt || Date.now(),
      lastLoginAt: authUser.lastLoginAt
    };
  },

  /**
   * Convert backend login response to AppUser
   */
  loginResponseToAppUser: (response: any): AppUser => {
    const userData = response.user || response;
    return TypeConverters.authUserToAppUser(userData);
  }
} as const;