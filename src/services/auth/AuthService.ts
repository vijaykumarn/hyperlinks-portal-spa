// src/services/auth/AuthService.ts

import { StateManager } from '../../core/state/StateManager';
import { AuthApiClient } from './AuthApiClient';
import { OAuth2Service } from './OAuth2Service';
import type {
  RegistrationRequest,
  LoginRequest,
  UserData,
  RegistrationStep,
  AuthError,
  AuthEvent,
  EmailVerificationStatus,
  PasswordStrength
} from './types';
import type { ApiResponse } from '../core/HttpClient';

/**
 * Main Authentication Service
 * Orchestrates all auth operations and manages auth state
 */
export class AuthService {
  private static instance: AuthService;
  private stateManager: StateManager;
  private authApiClient: AuthApiClient;
  private oauth2Service: OAuth2Service;
  private eventListeners: Map<AuthEvent, Array<(data?: any) => void>> = new Map();

  private constructor() {
    this.stateManager = StateManager.getInstance();
    this.authApiClient = new AuthApiClient();
    this.oauth2Service = OAuth2Service.getInstance();
    
    this.setupAuthStateListener();
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
   * Register new user with email/password
   */
  async register(registrationData: RegistrationRequest): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
    verificationRequired?: boolean;
  }> {
    try {
      console.log('🔐 AuthService: Starting registration for:', registrationData.email);

      // Validate registration data
      const validation = this.validateRegistrationData(registrationData);
      if (!validation.isValid) {
        this.emitEvent('registration:failed', { error: validation.errors });
        return {
          success: false,
          error: Object.values(validation.errors).join(', ')
        };
      }

      // Update state to show registration in progress
      this.updateRegistrationStep('submitting');
      this.emitEvent('registration:started', { email: registrationData.email });

      // Call API
      const response = await this.authApiClient.register(registrationData);

      if (!response.success || !response.data) {
        console.error('❌ AuthService: Registration failed:', response.error);
        this.updateRegistrationStep('form');
        this.setAuthError({
          type: 'server',
          message: response.error || 'Registration failed'
        });
        this.emitEvent('registration:failed', { error: response.error });
        
        return {
          success: false,
          error: response.error || 'Registration failed'
        };
      }

      // FIXED: Handle backend response format
      const { id, email } = response.data;
      const userId = id ? id.toString() : 'unknown';

      console.log('✅ AuthService: Registration successful:', { userId, email });

      // Always require verification for new registrations
      this.updateRegistrationStep('verification');
      this.emitEvent('verification:required', { 
        email: registrationData.email,
        userId 
      });

      return {
        success: true,
        userId,
        verificationRequired: true
      };

    } catch (error) {
      console.error('❌ AuthService: Registration error:', error);
      this.updateRegistrationStep('form');
      this.setAuthError({
        type: 'network',
        message: error instanceof Error ? error.message : 'Network error'
      });
      this.emitEvent('registration:failed', { error: error instanceof Error ? error.message : 'Unknown error' });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Confirm user account with verification token
   */
  async confirmAccount(token: string): Promise<{
    success: boolean;
    user?: UserData;
    error?: string;
  }> {
    try {
      console.log('✅ AuthService: Confirming account...');

      const response = await this.authApiClient.confirmAccount(token);

      if (!response.success || !response.data) {
        console.error('❌ AuthService: Account confirmation failed:', response.error);
        this.emitEvent('verification:failed', { error: response.error });
        
        return {
          success: false,
          error: response.error || 'Account confirmation failed'
        };
      }

      console.log('✅ AuthService: Account confirmed successfully');

      // If user data is returned, they're now logged in
      if (response.data.user) {
        this.setAuthenticatedUser(response.data.user);
        this.emitEvent('verification:success', { user: response.data.user });
        this.emitEvent('login:success', { user: response.data.user });
      } else {
        this.emitEvent('verification:success', {});
      }

      this.updateRegistrationStep('complete');

      return {
        success: true,
        user: response.data.user
      };

    } catch (error) {
      console.error('❌ AuthService: Account confirmation error:', error);
      this.emitEvent('verification:failed', { error: error instanceof Error ? error.message : 'Unknown error' });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account confirmation failed'
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    error?: string;
    nextResendAt?: number;
  }> {
    try {
      console.log('📧 AuthService: Resending verification email to:', email);

      const response = await this.authApiClient.resendVerification(email);

      if (!response.success) {
        console.error('❌ AuthService: Resend verification failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to resend verification email'
        };
      }

      console.log('✅ AuthService: Verification email resent successfully');

      // Set next resend time (usually 1 minute)
      const nextResendAt = Date.now() + (60 * 1000);

      return {
        success: true,
        nextResendAt
      };

    } catch (error) {
      console.error('❌ AuthService: Resend verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend verification email'
      };
    }
  }

  // =====================================
  // LOGIN METHODS
  // =====================================

  /**
   * Login with email/password
   */
  async login(credentials: LoginRequest): Promise<{
    success: boolean;
    user?: UserData;
    error?: string;
    requiresVerification?: boolean;
  }> {
    try {
      console.log('🔑 AuthService: Logging in user:', credentials.email);

      // Set loading state
      this.setAuthLoading(true);

      const response = await this.authApiClient.login(credentials);

      if (!response.success || !response.data) {
        console.error('❌ AuthService: Login failed:', response.error);
        this.setAuthLoading(false);
        
        // Check if error is due to unverified account
        const requiresVerification = response.error?.includes('ACCOUNT_NOT_VERIFIED') || 
                                   response.error?.includes('verify') ||
                                   response.error?.includes('verification');
        
        if (requiresVerification) {
          this.emitEvent('verification:required', { email: credentials.email });
          return {
            success: false,
            error: 'Please verify your email address before logging in',
            requiresVerification: true
          };
        }

        this.setAuthError({
          type: 'authentication',
          message: response.error || 'Login failed'
        });
        this.emitEvent('login:failed', { error: response.error });

        return {
          success: false,
          error: response.error || 'Login failed'
        };
      }

      // FIXED: Extract user data from backend response format
      const authData = response.data;
      const user: UserData = {
        id: authData.userId?.toString() || '',
        username: authData.username || '',
        email: authData.email || '',
        organisation: authData.organisation,
        emailVerified: true, // If login succeeded, email is verified
        role: authData.role || 'USER',
        createdAt: Date.now(),
        lastLoginAt: authData.lastLogin ? new Date(authData.lastLogin).getTime() : Date.now()
      };

      console.log('✅ AuthService: Login successful for user:', user.email);

      // Set authenticated state
      this.setAuthenticatedUser(user);
      this.setAuthLoading(false);
      this.emitEvent('login:success', { user });

      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('❌ AuthService: Login error:', error);
      this.setAuthLoading(false);
      this.setAuthError({
        type: 'network',
        message: error instanceof Error ? error.message : 'Network error'
      });
      this.emitEvent('login:failed', { error: error instanceof Error ? error.message : 'Unknown error' });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
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
        this.emitEvent('oauth2:failed', { error: result.error });
        return result;
      }

      return result;

    } catch (error) {
      console.error('❌ AuthService: Google login error:', error);
      this.emitEvent('oauth2:failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Google login'
      };
    }
  }

  /**
   * Handle OAuth2 callback
   */
  async handleOAuth2Callback(callbackUrl: string): Promise<{
    success: boolean;
    user?: UserData;
    error?: string;
    redirectTo?: string;
  }> {
    try {
      console.log('🔄 AuthService: Handling OAuth2 callback...');

      const result = await this.oauth2Service.handleCallback(callbackUrl);

      if (!result.success) {
        this.emitEvent('oauth2:failed', { error: result.error });
        return {
          success: false,
          error: result.error
        };
      }

      // Set authenticated user if login was successful
      if (result.user) {
        this.setAuthenticatedUser(result.user);
        this.emitEvent('oauth2:success', { user: result.user });
        this.emitEvent('login:success', { user: result.user });
      }

      return {
        success: true,
        user: result.user,
        redirectTo: result.requiresRedirect || '/dashboard'
      };

    } catch (error) {
      console.error('❌ AuthService: OAuth2 callback error:', error);
      this.emitEvent('oauth2:failed', { error: error instanceof Error ? error.message : 'Unknown error' });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle OAuth2 callback'
      };
    }
  }

  // =====================================
  // LOGOUT METHODS
  // =====================================

  /**
   * Logout user
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
      console.error('❌ AuthService: Logout error:', error);
      
      // Still clear local state even if API call fails
      this.clearAuthState();
      this.emitEvent('logout:success', {});

      return { success: true };
    }
  }

  // =====================================
  // SESSION METHODS
  // =====================================

  /**
   * Validate current session
   */
  async validateSession(): Promise<{ 
    valid: boolean; 
    user?: UserData; 
    error?: string; 
  }> {
    try {
      console.log('🔍 AuthService: Validating session...');

      const response = await this.authApiClient.validateSession();

      if (!response.success || !response.data) {
        console.warn('⚠️ AuthService: Session validation failed:', response.error);
        this.handleSessionExpired();
        
        return {
          valid: false,
          error: response.error || 'Session validation failed'
        };
      }

      const { valid, user } = response.data;

      if (valid && user) {
        // Update user data if session is valid
        this.setAuthenticatedUser(user);
        return {
          valid: true,
          user
        };
      } else {
        console.warn('⚠️ AuthService: Session invalid');
        this.handleSessionExpired();
        return { valid: false };
      }

    } catch (error) {
      console.error('❌ AuthService: Session validation error:', error);
      this.handleSessionExpired();
      
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Session validation error'
      };
    }
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired(): void {
    console.log('⏰ AuthService: Session expired');
    this.clearAuthState();
    this.emitEvent('session:expired', {});
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: RegistrationRequest): {
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
    let score: 0 | 1 | 2 | 3 | 4 = 0;

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

    if (isValid) {
      if (password.length >= 12) score = Math.min(score + 1, 4);
      feedback.push('Password strength: ' + ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score]);
    }

    return {
      score: score as 0 | 1 | 2 | 3 | 4,
      feedback,
      isValid
    };
  }

  // =====================================
  // STATE MANAGEMENT
  // =====================================

  /**
   * Set authenticated user
   */
  private setAuthenticatedUser(user: UserData): void {
    this.stateManager.dispatch({
      type: 'SESSION_SET',
      payload: { user, isAuthenticated: true }
    });
    this.clearAuthError();
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.stateManager.dispatch({ type: 'SESSION_CLEAR' });
    this.clearAuthError();
    this.updateRegistrationStep('form');
  }

  /**
   * Update registration step
   */
  private updateRegistrationStep(step: RegistrationStep): void {
    // Note: This would need to be added to the state manager
    // For now, we'll handle it through events
  }

  /**
   * Set loading state
   */
  private setAuthLoading(loading: boolean): void {
    this.stateManager.dispatch({
      type: 'UI_SET_LOADING',
      payload: loading
    });
  }

  /**
   * Set auth error
   */
  private setAuthError(error: AuthError): void {
    this.stateManager.dispatch({
      type: 'UI_SET_ERROR',
      payload: error.message
    });
  }

  /**
   * Clear auth error
   */
  private clearAuthError(): void {
    this.stateManager.dispatch({
      type: 'UI_SET_ERROR',
      payload: null
    });
  }

  /**
   * Setup auth state listener
   */
  private setupAuthStateListener(): void {
    // Listen for session changes and emit events
    this.stateManager.subscribe(
      (state) => state.session,
      (session, previousSession) => {
        if (!previousSession?.isAuthenticated && session.isAuthenticated) {
          console.log('👤 AuthService: User authenticated');
        } else if (previousSession?.isAuthenticated && !session.isAuthenticated) {
          console.log('👤 AuthService: User logged out');
        }
      }
    );
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

    // Return unsubscribe function
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

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.stateManager.isAuthenticated();
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserData | null {
    return this.stateManager.getCurrentUser();
  }

  /**
   * Check if Google OAuth2 is available
   */
  isGoogleOAuth2Available(): boolean {
    return this.oauth2Service.isGoogleOAuth2Configured();
  }

  /**
   * Check if current URL is OAuth2 callback
   */
  isOAuth2Callback(url?: string): boolean {
    return this.oauth2Service.isOAuth2Callback(url);
  }
}