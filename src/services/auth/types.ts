// src/services/auth/types.ts - COMPLETE TYPE DEFINITIONS WITH EXPORTS

/**
 * Registration request DTO matching backend
 */
import type { AppUser, AppError } from '../../types/unified';

export interface RegistrationRequest {
  username: string;
  email: string;
  password: string;
  organisation?: string;
  terms: boolean;
  marketing: boolean;
}

/**
 * Registration response from backend
 */
export interface RegistrationResponse {
  message: string;
  userId: string;
  id?: string; // Some backends return 'id' instead of 'userId'
  email: string;
  verificationRequired: boolean;
}

/**
 * Login request DTO
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export type UserData = AppUser;

/**
 * Login response from backend
 */
export interface LoginResponse {
  user?: UserData;
  userId?: string;
  username?: string;
  email?: string;
  role?: string;
  organisation?: string;
  lastLogin?: string;
  message: string;
}

/**
 * Password reset request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Password reset response
 */
export interface ForgotPasswordResponse {
  message: string;
  resetTokenRequired: boolean;
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Account confirmation request
 */
export interface ConfirmAccountRequest {
  token: string;
}

/**
 * Account confirmation response
 */
export interface ConfirmAccountResponse {
  message: string;
  user?: UserData;
}

/**
 * Resend verification request
 */
export interface ResendVerificationRequest {
  email: string;
}

/**
 * Session information
 */
export interface SessionInfo {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  ipAddress: string;
  userAgent: string;
  current: boolean;
}

/**
 * OAuth2 authorization URL response
 */
export interface OAuth2AuthUrlResponse {
  authorizationUrl: string;
  state: string;
}

/**
 * OAuth2 callback state
 */
export interface OAuth2State {
  state?: string;
  provider?: 'google';
  redirectUrl?: string;
}

/**
 * Registration validation errors
 */
export interface RegistrationValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  organisation?: string;
  terms?: string;
  general?: string;
}

/**
 * Registration step enum
 */
export type RegistrationStep = 
  | 'form'           // Filling out registration form
  | 'submitting'     // Form submission in progress
  | 'verification'   // Email verification required
  | 'complete';      // Registration complete

/**
 * Password strength validation result
 */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0 = very weak, 4 = very strong
  feedback: string[];
  isValid: boolean;
}

/**
 * Email verification status
 */
export interface EmailVerificationStatus {
  isRequired: boolean;
  email: string;
  canResend: boolean;
  nextResendAt?: number;
}

/**
 * Auth service events
 */
export type AuthEvent = 
  | 'registration:started'
  | 'registration:success'
  | 'registration:failed'
  | 'verification:required'
  | 'verification:success'
  | 'verification:failed'
  | 'login:success'
  | 'login:failed'
  | 'logout:success'
  | 'session:expired'
  | 'oauth2:started'
  | 'oauth2:success'
  | 'oauth2:failed';

/**
 * Auth service error types
 */
export type AuthError = AppError;

// Export the AuthModalMode type that was missing
export type AuthModalMode = 'login' | 'register' | 'verification' | 'closed';