// src/types/user.ts - UNIFIED USER TYPE SYSTEM

/**
 * Core user data structure - single source of truth
 */
export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  organisation?: string;
  emailVerified: boolean;
  createdAt: number;
  lastLoginAt?: number;
  avatar?: string;
}

/**
 * Authentication state for session management
 */
export interface AuthenticationState {
  isAuthenticated: boolean;
  user: User | null;
  sessionValidatedAt: number;
  sessionSource: 'password' | 'oauth2' | 'session-restore';
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  sessionId?: string;
  expiresAt?: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Complete session state
 */
export interface SessionState extends AuthenticationState {
  metadata: SessionMetadata;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Registration data
 */
export interface RegistrationData {
  username: string;
  email: string;
  password: string;
  organisation?: string;
  terms: boolean;
  marketing: boolean;
}

/**
 * OAuth2 user data from providers
 */
export interface OAuth2UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'github' | 'microsoft';
  providerUserId: string;
}

/**
 * Authentication result types
 */
export type AuthResult = 
  | { success: true; user: User; requiresVerification?: false }
  | { success: true; requiresVerification?: false }
  | { success: false; error: string; requiresVerification?: boolean };

export type RegistrationResult = 
  | { success: true; userId: string; requiresVerification: boolean }
  | { success: false; error: string };

export type SessionValidationResult = 
  | { valid: true; user: User }
  | { valid: false; error?: string };

/**
 * Type guards for user data
 */
export function isValidUser(user: any): user is User {
  return user && 
         typeof user.id === 'string' && 
         typeof user.email === 'string' && 
         typeof user.name === 'string' && 
         typeof user.role === 'string' &&
         typeof user.emailVerified === 'boolean' &&
         typeof user.createdAt === 'number';
}

export function isAuthenticatedState(state: any): state is AuthenticationState {
  return state && 
         typeof state.isAuthenticated === 'boolean' &&
         (state.user === null || isValidUser(state.user)) &&
         typeof state.sessionValidatedAt === 'number';
}

/**
 * User data transformers for API compatibility
 */
export class UserDataTransformer {
  /**
   * Transform backend auth response to User
   */
  static fromAuthResponse(response: any): User {
    return {
      id: String(response.userId || response.id || ''),
      email: response.email || '',
      name: response.username || response.name || response.email?.split('@')[0] || 'User',
      username: response.username,
      role: (response.role || 'USER') as User['role'],
      organisation: response.organisation,
      emailVerified: response.emailVerified ?? response.verified ?? true,
      createdAt: response.createdAt || Date.now(),
      lastLoginAt: response.lastLoginAt,
      avatar: response.avatar || response.picture
    };
  }

  /**
   * Transform OAuth2 data to User
   */
  static fromOAuth2Data(oauth2Data: OAuth2UserData): User {
    return {
      id: oauth2Data.id,
      email: oauth2Data.email,
      name: oauth2Data.name,
      username: oauth2Data.email.split('@')[0],
      role: 'USER',
      emailVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      avatar: oauth2Data.avatar
    };
  }

  /**
   * Transform session validation response to User
   */
  static fromSessionResponse(response: any): User | null {
    if (!response || (!response.authenticated && !response.valid)) {
      return null;
    }

    const userData = response.user || {
      id: response.userId,
      email: response.email,
      username: response.username,
      role: response.role
    };

    if (!userData || !userData.id || !userData.email) {
      return null;
    }

    return this.fromAuthResponse(userData);
  }

  /**
   * Validate and sanitize user data
   */
  static sanitize(user: Partial<User>): User | null {
    if (!user.id || !user.email) {
      return null;
    }

    return {
      id: String(user.id),
      email: user.email,
      name: user.name || user.email.split('@')[0],
      username: user.username,
      role: (user.role || 'USER') as User['role'],
      organisation: user.organisation,
      emailVerified: user.emailVerified ?? false,
      createdAt: user.createdAt || Date.now(),
      lastLoginAt: user.lastLoginAt,
      avatar: user.avatar
    };
  }
}