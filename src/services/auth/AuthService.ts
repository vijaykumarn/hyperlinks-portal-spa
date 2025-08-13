// src/services/auth/AuthService.ts - REFACTORED WITH IMPROVEMENTS

import { StateManager } from '../../core/state/StateManager';
import { AuthApiClient } from './AuthApiClient';
import { OAuth2Service } from './OAuth2Service';
import { AuthErrorHandler, type AuthError } from './AuthErrorHandler';
import { SessionService } from '../SessionService';
import type {
  User,
  LoginCredentials,
  RegistrationData,
  AuthResult,
  RegistrationResult,
  SessionValidationResult
} from '../../types/user';
import type { PasswordStrength } from './types';

/**
 * Authentication events
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
 * Main Authentication Service - Refactored and Improved
 */
export class AuthService {
  private static instance: AuthService;
  private stateManager: StateManager;
  private authApiClient: AuthApiClient;
  private oauth2Service: OAuth2Service;
  private sessionService: SessionService;
  private errorHandler: AuthErrorHandler;
  private eventListeners: Map<AuthEvent, Array<(data?: any) => void>> = new Map();

  private constructor() {
    this.stateManager = StateManager.getInstance();
    this.authApiClient = new AuthApiClient();
    this.oauth2Service = OAuth2Service.getInstance();
    this.sessionService = SessionService.getInstance();
    this.errorHandler = AuthErrorHandler.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // =====================================
  // REGISTRATION METHODS
  // =====================================

  /**
   * Register new user with improved error handling
   */
  async register(registrationData: RegistrationData): Promise<RegistrationResult> {
    
    try {
      console.log('🔐 AuthService: Starting registration for:', registrationData.email);

      // Validate registration data
      const validation = this.validateRegistrationData(registrationData);
      if (!validation.isValid) {
        const errorMessage = Object.values(validation.errors).join(', ');
        this.emitEvent('registration:failed', { error: errorMessage });
        return { success: false, error: errorMessage };
      }

      // Set loading state
      this.setAuthLoading(true);
      this.emitEvent('registration:started', { email: registrationData.email });

      // Call API
      const response = await this.authApiClient.register(registrationData);

      if (!response.success || !response.data) {
        const authError = this.errorHandler.processError(response, 'registration');
        console.error('❌ AuthService: Registration failed:', authError.message);

        this.setAuthError(authError);
        this.emitEvent('registration:failed', { error: authError.userMessage });

        return { success: false, error: authError.userMessage };
      }

      // Process successful registration
      const { userId, email } = response.data;

      console.log('✅ AuthService: Registration successful:', { userId, email });
      this.emitEvent('registration:success', { userId, email });
      this.emitEvent('verification:required', { email, userId });

      return {
        success: true,
        userId: String(userId),
        requiresVerification: true
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'resend_verification');
      return { success: false, error: authError.userMessage };
    }
  }

  /**
   * Confirm user account with email verification token
   */
  async confirmAccount(token: string): Promise<AuthResult> {
    const operationId = `confirm_account_${Date.now()}`;

    try {
      console.log('✅ AuthService: Confirming account with token...');

      if (!token || token.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid verification token. Please check your email link.'
        };
      }

      this.setAuthLoading(true);

      const response = await this.authApiClient.confirmAccount(token);

      if (!response.success || !response.data) {
        const authError = this.errorHandler.processError(response, 'account_confirmation');
        console.error('❌ AuthService: Account confirmation failed:', authError.message);

        this.setAuthError(authError);
        this.emitEvent('verification:failed', { error: authError.userMessage });

        return { success: false, error: authError.userMessage };
      }

      console.log('✅ AuthService: Account confirmed successfully');

      // Check if user data is returned (auto-login after confirmation)
      if (response.data.user) {
        const { UserDataTransformer } = await import('../../types/user');
        const user = UserDataTransformer.fromAuthResponse(response.data.user);

        // Set user as authenticated
        this.setAuthenticatedUser(user, 'password');

        // Emit success events
        this.emitEvent('verification:success', { user });
        this.emitEvent('login:success', { user });

        // Update registration step to complete
        this.stateManager.dispatch({
          type: 'AUTH_SET_REGISTRATION_STEP',
          payload: 'complete'
        });

        console.log('✅ AuthService: User auto-logged in after confirmation:', user.email);

        return { success: true, user };
      } else {
        // Account confirmed but no auto-login
        this.emitEvent('verification:success', {});

        // Update registration step to complete
        this.stateManager.dispatch({
          type: 'AUTH_SET_REGISTRATION_STEP',
          payload: 'complete'
        });

        console.log('✅ AuthService: Account confirmed, user needs to login manually');

        return {
          success: true
        };
      }

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'account_confirmation');
      console.error('❌ AuthService: Account confirmation error:', authError.message);

      this.setAuthError(authError);
      this.emitEvent('verification:failed', { error: authError.userMessage });

      // Check if should retry
      if (this.errorHandler.shouldRetry(authError, operationId)) {
        console.log('🔄 AuthService: Will retry account confirmation...');
        this.errorHandler.incrementRetryCount(operationId);
      }

      return { success: false, error: authError.userMessage };
    } finally {
      this.setAuthLoading(false);
      this.errorHandler.resetRetryCount(operationId);
    }
  }

  /**
   * Resend verification email with improved error handling and rate limiting
   */
  async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    error?: string;
    nextResendAt?: number;
    message?: string;
  }> {
    const operationId = `resend_verification_${Date.now()}`;

    try {
      console.log('📧 AuthService: Resending verification email to:', email);

      // Validate email format
      if (!email || !AuthService.validateEmail(email)) {
        return {
          success: false,
          error: 'Please provide a valid email address.'
        };
      }

      this.setAuthLoading(true);

      const response = await this.authApiClient.resendVerification(email);

      if (!response.success) {
        const authError = this.errorHandler.processError(response, 'resend_verification');
        console.error('❌ AuthService: Resend verification failed:', authError.message);

        this.setAuthError(authError);

        // Handle specific error cases
        if (authError.code === 'RATE_LIMITED') {
          return {
            success: false,
            error: authError.userMessage,
            nextResendAt: Date.now() + (5 * 60 * 1000) // 5 minutes for rate limit
          };
        }

        if (authError.code === 'EMAIL_TAKEN' || authError.message.toLowerCase().includes('already verified')) {
          return {
            success: false,
            error: 'This email is already verified. You can log in directly.',
          };
        }

        return { success: false, error: authError.userMessage };
      }

      console.log('✅ AuthService: Verification email resent successfully');

      // Set verification cooldown state
      const nextResendAt = Date.now() + (60 * 1000); // 1 minute standard cooldown

      this.stateManager.dispatch({
        type: 'AUTH_SET_VERIFICATION_COOLDOWN',
        payload: 60 // seconds
      });

      return {
        success: true,
        message: response.data?.message || 'Verification email sent successfully. Please check your inbox.',
        nextResendAt
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'resend_verification');
      console.error('❌ AuthService: Resend verification error:', authError.message);

      this.setAuthError(authError);

      // Check if should retry
      if (this.errorHandler.shouldRetry(authError, operationId)) {
        console.log('🔄 AuthService: Will retry resend verification...');
        this.errorHandler.incrementRetryCount(operationId);
      }

      return { success: false, error: authError.userMessage };
    } finally {
      this.setAuthLoading(false);
      this.errorHandler.resetRetryCount(operationId);
    }
  }

  /**
   * Check verification status for an email
   */
  async checkVerificationStatus(email: string): Promise<{
    success: boolean;
    isVerified?: boolean;
    canResend?: boolean;
    error?: string;
  }> {
    try {
      console.log('🔍 AuthService: Checking verification status for:', email);

      if (!email || !AuthService.validateEmail(email)) {
        return {
          success: false,
          error: 'Please provide a valid email address.'
        };
      }

      // This would typically be a separate API endpoint
      // For now, we'll infer from login attempt
      const loginResponse = await this.authApiClient.login({
        email,
        password: 'dummy_password_for_verification_check', // This will fail but give us verification status
        rememberMe: false
      });

      // If error mentions verification, account exists but isn't verified
      if (loginResponse.error?.toLowerCase().includes('verify') ||
        loginResponse.error?.toLowerCase().includes('verification')) {
        return {
          success: true,
          isVerified: false,
          canResend: true
        };
      }

      // If error is about credentials, account is verified
      if (loginResponse.error?.toLowerCase().includes('credentials') ||
        loginResponse.error?.toLowerCase().includes('password')) {
        return {
          success: true,
          isVerified: true,
          canResend: false
        };
      }

      // If no error (shouldn't happen with dummy password), account is verified
      if (loginResponse.success) {
        return {
          success: true,
          isVerified: true,
          canResend: false
        };
      }

      // Default case - assume can resend
      return {
        success: true,
        isVerified: false,
        canResend: true
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'verification_status_check');
      console.error('❌ AuthService: Verification status check error:', authError.message);

      return {
        success: false,
        error: 'Unable to check verification status. Please try again.'
      };
    }
  }

  /**
   * Get verification status and cooldown info for UI
   */
  getVerificationUIState(): {
    emailForVerification: string | null;
    isResendCooldownActive: boolean;
    resendCooldownSeconds: number;
    canResend: boolean;
  } {
    const authState = this.stateManager.getAuthState();

    return {
      emailForVerification: authState.emailForVerification,
      isResendCooldownActive: (authState.verificationResendCooldown || 0) > 0,
      resendCooldownSeconds: authState.verificationResendCooldown || 0,
      canResend: !authState.isLoading && (authState.verificationResendCooldown || 0) === 0
    };
  }

  // =====================================
  // LOGIN METHODS
  // =====================================

  /**
   * Login with email/password - improved with unified types
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const operationId = `login_${Date.now()}`;

    try {
      console.log('🔑 AuthService: Logging in user:', credentials.email);

      this.setAuthLoading(true);

      const response = await this.authApiClient.login({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      });

      if (!response.success || !response.data) {
        const authError = this.errorHandler.processError(response, 'login');
        console.error('❌ AuthService: Login failed:', authError.message);

        // Check for specific error conditions
        if (authError.code === 'ACCOUNT_NOT_VERIFIED') {
          this.emitEvent('verification:required', { email: credentials.email });
          return {
            success: false,
            error: authError.userMessage,
            requiresVerification: true
          };
        }

        this.setAuthError(authError);
        this.emitEvent('login:failed', { error: authError.userMessage });

        // Check if should retry
        if (this.errorHandler.shouldRetry(authError, operationId)) {
          this.errorHandler.incrementRetryCount(operationId);
        }

        return { success: false, error: authError.userMessage };
      }

      // Process successful login
      const { UserDataTransformer } = await import('../../types/user');
      const user = UserDataTransformer.fromAuthResponse(response.data);

      console.log('✅ AuthService: Login successful for user:', user.email);

      this.setAuthenticatedUser(user, 'password');
      this.emitEvent('login:success', { user });

      return { success: true, user };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'login');
      console.error('❌ AuthService: Login error:', authError.message);

      this.setAuthError(authError);
      this.emitEvent('login:failed', { error: authError.userMessage });

      return { success: false, error: authError.userMessage };
    } finally {
      this.setAuthLoading(false);
      this.errorHandler.resetRetryCount(operationId);
    }
  }

  /**
   * Login with Google OAuth2
   */
  async loginWithGoogle(redirectUrl?: string): Promise<{
    success: boolean;
    authUrl?: string;
    error?: string;
  }> {
    try {
      console.log('🔗 AuthService: Initiating Google login...');

      this.emitEvent('oauth2:started', { provider: 'google' });

      const result = await this.oauth2Service.initiateGoogleLogin(redirectUrl);

      if (!result.success) {
        const authError = this.errorHandler.processError(
          { error: result.error, provider: 'google' },
          'oauth2_initiation'
        );
        this.emitEvent('oauth2:failed', { error: authError.userMessage });
        return { success: false, error: authError.userMessage };
      }

      return result;

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'oauth2_initiation');
      this.emitEvent('oauth2:failed', { error: authError.userMessage });
      return { success: false, error: authError.userMessage };
    }
  }

  /**
   * Handle OAuth2 callback with improved error handling
   */
  async handleOAuth2Callback(callbackUrl: string): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    redirectTo?: string;
  }> {
    try {
      console.log('🔄 AuthService: Handling OAuth2 callback...');

      const result = await this.oauth2Service.handleCallback(callbackUrl);

      if (!result.success) {
        const authError = this.errorHandler.processError(
          { error: result.error, provider: 'google' },
          'oauth2_callback'
        );
        this.emitEvent('oauth2:failed', { error: authError.userMessage });
        return { success: false, error: authError.userMessage };
      }

      // Establish session if user data is available
      if (result.user) {
        this.setAuthenticatedUser(result.user, 'oauth2');
        this.emitEvent('oauth2:success', { user: result.user });
        this.emitEvent('login:success', { user: result.user });

        return {
          success: true,
          user: result.user,
          redirectTo: result.redirectTo || '/dashboard'
        };
      }

      // No user data - try session validation
      const sessionValidation = await this.validateSessionInternal();

      if (sessionValidation.valid && sessionValidation.user) {
        this.emitEvent('oauth2:success', { user: sessionValidation.user });
        this.emitEvent('login:success', { user: sessionValidation.user });

        return {
          success: true,
          user: sessionValidation.user,
          redirectTo: result.redirectTo || '/dashboard'
        };
      }

      // OAuth2 succeeded but no session
      console.warn('⚠️ AuthService: OAuth2 callback succeeded but no session established');
      return {
        success: true,
        redirectTo: result.redirectTo || '/dashboard'
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'oauth2_callback');
      this.emitEvent('oauth2:failed', { error: authError.userMessage });
      return { success: false, error: authError.userMessage };
    }
  }

  // =====================================
  // SESSION METHODS
  // =====================================

  /**
   * Validate current session with race condition prevention
   */
  async validateSession(): Promise<SessionValidationResult> {
    return this.sessionService.validateSessionDebounced(
      () => this.validateSessionInternal(),
      false // not forced
    );
  }

  /**
   * Auto-validate session on app startup
   */
  async autoValidateSession(): Promise<{
    isValid: boolean;
    user?: User;
    shouldRedirect?: string;
  }> {
    try {
      console.log('🔍 AuthService: Auto-validating session on startup...');

      const hasStoredSession = this.sessionService.loadPersistedSession();

      if (!hasStoredSession) {
        console.log('ℹ️ AuthService: No stored session found');
        return { isValid: false };
      }

      const validation = await this.validateSession();

      if (validation.valid && validation.user) {
        console.log('✅ AuthService: Auto-validation successful for user:', validation.user.email);

        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '/home') {
          return {
            isValid: true,
            user: validation.user,
            shouldRedirect: '/dashboard'
          };
        }

        return { isValid: true, user: validation.user };
      } else {
        console.log('⚠️ AuthService: Auto-validation failed, clearing stored session');
        this.sessionService.clearSession();
        return { isValid: false };
      }

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'auto_validation');
      console.error('❌ AuthService: Auto-validation error:', authError.message);
      this.sessionService.clearSession();
      return { isValid: false };
    }
  }

  /**
   * Internal session validation method
   */
  private async validateSessionInternal(): Promise<SessionValidationResult> {
    try {
      console.log('🔍 AuthService: Validating session...');

      const response = await this.authApiClient.validateSession();

      if (!response.success || !response.data) {
        console.warn('⚠️ AuthService: Session validation failed:', response.error);

        if (this.isAuthenticated()) {
          this.handleSessionExpired();
        }

        return { valid: false, error: response.error };
      }

      const { authenticated, valid } = response.data;

      if (authenticated && valid) {
        const { UserDataTransformer } = await import('../../types/user');
        const user = UserDataTransformer.fromSessionResponse(response.data);

        if (user) {
          const currentUser = this.getCurrentUser();
          if (!currentUser || currentUser.id !== user.id || currentUser.email !== user.email) {
            console.log('🔄 AuthService: Updating user data from session validation');
            this.setAuthenticatedUser(user, 'session-restore');
          }

          return { valid: true, user };
        } else {
          console.warn('⚠️ AuthService: Session valid but failed to construct user data');
          return { valid: false, error: 'Failed to construct user data from session' };
        }
      } else {
        console.warn('⚠️ AuthService: Session invalid or user not authenticated');

        if (this.isAuthenticated()) {
          this.handleSessionExpired();
        }

        return { valid: false };
      }

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'session_validation');
      console.error('❌ AuthService: Session validation error:', authError.message);

      if (this.isAuthenticated()) {
        this.handleSessionExpired();
      }

      return { valid: false, error: authError.userMessage };
    }
  }

  // =====================================
  // LOGOUT METHODS
  // =====================================

  /**
   * Logout user with improved cleanup
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚪 AuthService: Logging out user...');

      // Call API to invalidate session
      const response = await this.authApiClient.logout();

      // Clear local state regardless of API response
      this.clearAuthState();
      this.emitEvent('logout:success', {});

      if (!response.success) {
        console.warn('⚠️ AuthService: Logout API call failed, but local state cleared:', response.error);
      }

      return { success: true };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'logout');
      console.error('❌ AuthService: Logout error:', authError.message);

      // Still clear local state even if API call fails
      this.clearAuthState();
      this.emitEvent('logout:success', {});

      return { success: true };
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Validate registration data with comprehensive checks
   */
  private validateRegistrationData(data: RegistrationData): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    // Username validation
    if (!data.username) {
      errors.username = 'Username is required';
    } else if (data.username.length < 3 || data.username.length > 20) {
      errors.username = 'Username must be between 3 and 20 characters';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(data.username)) {
      errors.username = 'Username can only contain letters, numbers, dots, underscores and hyphens';
    }

    // Email validation
    if (!data.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please provide a valid email address';
    } else if (data.email.length > 255) {
      errors.email = 'Email cannot exceed 255 characters';
    }

    // Password validation
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.feedback[0] || 'Password is invalid';
    }

    // Organisation validation (optional)
    if (data.organisation && data.organisation.length > 100) {
      errors.organisation = 'Organisation name cannot exceed 100 characters';
    }

    // Terms validation
    if (!data.terms) {
      errors.terms = 'You must accept the terms and conditions';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    if (!password) {
      return {
        score: 0,
        feedback: ['Password is required'],
        isValid: false
      };
    }

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score++;
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score++;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score++;
    }

    if (!/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else {
      score++;
    }

    if (!/[@$!%*?&]/.test(password)) {
      feedback.push('Password must contain at least one special character (@$!%*?&)');
    } else {
      score++;
    }

    const isValid = feedback.length === 0;

    if (isValid && password.length >= 12) {
      score = Math.min(score + 1, 4);
    }

    if (isValid) {
      feedback.push('Password strength: ' + ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score]);
    }

    return {
      score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4,
      feedback,
      isValid
    };
  }

  // =====================================
  // STATE MANAGEMENT
  // =====================================

  /**
   * Set authenticated user with source tracking
   */
  private setAuthenticatedUser(user: User, source: 'password' | 'oauth2' | 'session-restore'): void {
    console.log(`👤 AuthService: Setting authenticated user: ${user.email} (source: ${source})`);

    this.sessionService.setSession(user, source);
    this.clearAuthError();
    this.setAuthLoading(false);
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.sessionService.clearSession();
    this.stateManager.dispatch({ type: 'AUTH_CLEAR_STATE' });
    this.clearAuthError();
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired(): void {
    console.log('⏰ AuthService: Session expired');

    const wasAuthenticated = this.isAuthenticated();
    this.clearAuthState();

    if (wasAuthenticated) {
      this.emitEvent('session:expired', {});
    }
  }

  /**
   * Set loading state
   */
  private setAuthLoading(loading: boolean): void {
    this.stateManager.dispatch({
      type: 'AUTH_SET_LOADING',
      payload: loading
    });
  }

  /**
   * Set auth error
   */
  private setAuthError(error: AuthError): void {
    this.stateManager.dispatch({
      type: 'AUTH_SET_ERROR',
      payload: error.userMessage
    });
  }

  /**
   * Clear auth error
   */
  private clearAuthError(): void {
    this.stateManager.dispatch({
      type: 'AUTH_SET_ERROR',
      payload: null
    });
  }

  // =====================================
  // EVENT SYSTEM
  // =====================================

  /**
   * Add event listener
   */
  addEventListener(event: AuthEvent, callback: (data?: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }

    this.eventListeners.get(event)!.push(callback);

    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit event
   */
  private emitEvent(event: AuthEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ AuthService: Event listener error for ${event}:`, error);
        }
      });
    }
  }

  // =====================================
  // PUBLIC GETTERS
  // =====================================

  public isAuthenticated(): boolean {
    return this.sessionService.isAuthenticated();
  }

  public getCurrentUser(): User | null {
    return this.sessionService.getCurrentUser();
  }

  public isGoogleOAuth2Available(): boolean {
    return this.oauth2Service.isGoogleOAuth2Configured();
  }

  public isOAuth2Callback(url?: string): boolean {
    return this.oauth2Service.isOAuth2Callback(url);
  }

  /**
   * Get auth state for debugging
   */
  public getAuthState() {
    const sessionState = this.sessionService.getSessionInfo();
    const authState = this.stateManager.getAuthState();

    return {
      isAuthenticated: sessionState.isAuthenticated,
      user: sessionState.user,
      sessionSource: sessionState.source,
      sessionAge: sessionState.ageMinutes,
      isLoading: authState.isLoading,
      error: authState.error
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await this.authApiClient.healthCheck();

      if (!response.success) {
        return { success: false, error: response.error || 'Health check failed' };
      }

      return { success: true, status: response.data?.status || 'OK' };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'health_check');
      return { success: false, error: authError.userMessage };
    }
  }

  // =====================================
  // PASSWORD RESET METHODS
  // =====================================

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      console.log('🔑 AuthService: Requesting password reset for:', email);

      const response = await this.authApiClient.forgotPassword(email);

      if (!response.success) {
        const authError = this.errorHandler.processError(response, 'password_reset_request');
        console.error('❌ AuthService: Password reset request failed:', authError.message);
        return { success: false, error: authError.userMessage };
      }

      console.log('✅ AuthService: Password reset email sent successfully');
      return {
        success: true,
        message: response.data?.message || 'Password reset email sent'
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'password_reset_request');
      return { success: false, error: authError.userMessage };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      console.log('🔐 AuthService: Resetting password with token...');

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.feedback.join(', ')
        };
      }

      const response = await this.authApiClient.resetPassword({
        token,
        newPassword
      });

      if (!response.success) {
        const authError = this.errorHandler.processError(response, 'password_reset');
        console.error('❌ AuthService: Password reset failed:', authError.message);
        return { success: false, error: authError.userMessage };
      }

      console.log('✅ AuthService: Password reset successful');
      return {
        success: true,
        message: response.data?.message || 'Password reset successful'
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'password_reset');
      return { success: false, error: authError.userMessage };
    }
  }

  /**
   * Confirm password reset token validity
   */
  async confirmPasswordToken(token: string): Promise<{
    valid: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      console.log('🔍 AuthService: Confirming password reset token...');

      const response = await this.authApiClient.confirmPasswordToken(token);

      if (!response.success) {
        const authError = this.errorHandler.processError(response, 'password_token_confirmation');
        console.error('❌ AuthService: Token confirmation failed:', authError.message);
        return { valid: false, error: authError.userMessage };
      }

      return {
        valid: response.data?.valid || false,
        message: response.data?.message
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'password_token_confirmation');
      return { valid: false, error: authError.userMessage };
    }
  }

  // =====================================
  // SESSION MANAGEMENT METHODS
  // =====================================

  /**
   * Get all user sessions
   */
  async getAllSessions(): Promise<{
    success: boolean;
    sessions?: any[];
    error?: string;
  }> {
    try {
      console.log('📋 AuthService: Getting all sessions...');

      const response = await this.authApiClient.getAllSessions();

      if (!response.success) {
        const authError = this.errorHandler.processError(response, 'get_sessions');
        console.error('❌ AuthService: Failed to get sessions:', authError.message);
        return { success: false, error: authError.userMessage };
      }

      return {
        success: true,
        sessions: response.data || []
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'get_sessions');
      return { success: false, error: authError.userMessage };
    }
  }

  /**
   * Invalidate all sessions
   */
  async invalidateAllSessions(): Promise<{
    success: boolean;
    invalidatedCount?: number;
    error?: string;
  }> {
    try {
      console.log('🗑️ AuthService: Invalidating all sessions...');

      const response = await this.authApiClient.invalidateAllSessions();

      if (!response.success) {
        const authError = this.errorHandler.processError(response, 'invalidate_sessions');
        console.error('❌ AuthService: Failed to invalidate sessions:', authError.message);
        return { success: false, error: authError.userMessage };
      }

      // Clear local session as well
      this.clearAuthState();

      return {
        success: true,
        invalidatedCount: response.data?.invalidatedCount || 0
      };

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'invalidate_sessions');
      return { success: false, error: authError.userMessage };
    }
  }

  /**
   * Force session refresh
   */
  async refreshSession(): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      console.log('🔄 AuthService: Forcing session refresh...');

      const validation = await this.sessionService.validateSessionDebounced(
        () => this.validateSessionInternal(),
        true // force validation
      );

      if (validation.valid && validation.user) {
        return {
          success: true,
          user: validation.user
        };
      } else {
        return {
          success: false,
          error: !validation.valid ? 'Session refresh failed' : undefined
        };
      }

    } catch (error) {
      const authError = this.errorHandler.processError(error, 'session_refresh');
      return { success: false, error: authError.userMessage };
    }
  }

  // =====================================
  // ADDITIONAL UTILITY METHODS
  // =====================================

  /**
   * Check if user has specific role
   */
  public hasRole(role: User['role']): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user is admin
   */
  public isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  /**
   * Check if user is moderator or admin
   */
  public isModerator(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'MODERATOR' || user?.role === 'ADMIN';
  }

  /**
   * Get user permissions based on role
   */
  public getUserPermissions(): string[] {
    const user = this.getCurrentUser();
    if (!user) return [];

    const basePermissions = ['view_profile', 'edit_profile', 'create_urls', 'view_urls'];

    switch (user.role) {
      case 'ADMIN':
        return [
          ...basePermissions,
          'manage_users',
          'manage_system',
          'view_analytics',
          'manage_settings',
          'delete_any_url',
          'moderate_content'
        ];
      case 'MODERATOR':
        return [
          ...basePermissions,
          'moderate_content',
          'view_analytics',
          'delete_flagged_urls'
        ];
      case 'USER':
      default:
        return [...basePermissions, 'delete_own_urls'];
    }
  }

  /**
   * Check if user has specific permission
   */
  public hasPermission(permission: string): boolean {
    return this.getUserPermissions().includes(permission);
  }

  /**
   * Get session age in minutes
   */
  public getSessionAge(): number | null {
    const sessionInfo = this.sessionService.getSessionInfo();
    return sessionInfo.ageMinutes || null;
  }

  /**
   * Check if session is stale
   */
  public isSessionStale(maxAgeMinutes: number = 30): boolean {
    return this.sessionService.isSessionStale(maxAgeMinutes);
  }

  /**
   * Get authentication state summary
   */
  public getAuthSummary(): {
    isAuthenticated: boolean;
    user: Pick<User, 'id' | 'email' | 'name' | 'role'> | null;
    sessionSource?: string;
    sessionAge?: string;
    permissions: string[];
    isLoading: boolean;
    hasError: boolean;
  } {
    const sessionInfo = this.sessionService.getSessionInfo();
    const authState = this.stateManager.getAuthState();
    const user = sessionInfo.user;

    return {
      isAuthenticated: sessionInfo.isAuthenticated,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      } : null,
      sessionSource: sessionInfo.source,
      sessionAge: sessionInfo.ageMinutes ? `${Math.round(sessionInfo.ageMinutes)}m` : undefined,
      permissions: this.getUserPermissions(),
      isLoading: authState.isLoading,
      hasError: !!authState.error
    };
  }

  /**
   * Subscribe to authentication state changes
   */
  public subscribeToAuthState(callback: (summary: ReturnType<typeof this.getAuthSummary>) => void): () => void {
    return this.sessionService.subscribeToSession(() => {
      callback(this.getAuthSummary());
    });
  }

  /**
   * Validate email format
   */
  public static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Validate username format
   */
  public static validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username) {
      return { isValid: false, error: 'Username is required' };
    }

    if (username.length < 3 || username.length > 20) {
      return { isValid: false, error: 'Username must be between 3 and 20 characters' };
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, dots, underscores and hyphens' };
    }

    return { isValid: true };
  }

  /**
   * Generate strong password suggestion
   */
  public static generatePasswordSuggestion(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';

    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill remaining characters (8-12 total length)
    const targetLength = 12;
    for (let i = password.length; i < targetLength; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Debug method to get detailed auth state
   */
  public getDetailedAuthState() {
    return {
      authentication: this.getAuthSummary(),
      session: this.sessionService.getSessionInfo(),
      oauth2: this.oauth2Service.getOAuth2StateInfo(),
      errors: {
        hasActiveError: !!this.stateManager.getAuthState().error,
        lastError: this.stateManager.getAuthState().error || undefined
      },
      performance: {
        lastValidationTime: this.sessionService.getSessionInfo().lastValidated,
      }
    };
  }

  /**
   * Emergency cleanup method for critical errors
   */
  public emergencyCleanup(): void {
    console.warn('🚨 AuthService: Performing emergency cleanup...');

    try {
      // Clear all state
      this.clearAuthState();

      // Clear OAuth2 state
      this.oauth2Service.clearOAuth2State();

      // Clear any stored data
      try {
        sessionStorage.clear();
        localStorage.removeItem('session_cleared');
        localStorage.removeItem('oauth2_session_established');
      } catch (error) {
        console.warn('Failed to clear storage:', error);
      }

      // Reset error handler counters
      this.errorHandler = AuthErrorHandler.getInstance();

      console.log('✅ AuthService: Emergency cleanup completed');

    } catch (error) {
      console.error('❌ AuthService: Emergency cleanup failed:', error);
    }
  }

  /**
   * Cleanup resources and destroy service instance
   */
  public destroy(): void {
    console.log('🧹 AuthService: Destroying service...');

    try {
      // Cleanup session service
      this.sessionService.destroy();

      // Clear OAuth2 state
      this.oauth2Service.clearOAuth2State();

      // Clear event listeners
      this.eventListeners.clear();

      // Clear any timers or intervals
      // (Add any additional cleanup here if needed)

      console.log('✅ AuthService: Service destroyed successfully');

    } catch (error) {
      console.error('❌ AuthService: Error during destruction:', error);
    }
  }
}