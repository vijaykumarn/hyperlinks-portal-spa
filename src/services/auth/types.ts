// src/services/auth/types.ts

/**
 * Registration request DTO matching backend
 */
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

/**
 * User data structure
 */
export interface UserData {
  id: string;
  username: string;
  email: string;
  organisation?: string;
  emailVerified: boolean;
  role: string;
  createdAt: number;
  lastLoginAt?: number;
}

/**
 * Login response from backend
 */
export interface LoginResponse {
  user: UserData;
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
  state: string;
  provider: 'google';
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
 * Auth state for state management
 */
export interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  registrationStep: RegistrationStep;
  registrationData: Partial<RegistrationRequest> | null;
  oauth2State: OAuth2State | null;
  isLoading: boolean;
  error: string | null;
}

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
export interface AuthError {
  type: 'validation' | 'network' | 'server' | 'authentication' | 'verification';
  message: string;
  details?: any;
  field?: string; // For validation errors
}