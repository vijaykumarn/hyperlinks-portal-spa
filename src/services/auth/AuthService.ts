// src/services/auth/AuthService.ts - FIXED UNUSED IMPORT

import { StateManager } from '../../core/state/StateManager';
import { AuthApiClient } from './AuthApiClient';
import { OAuth2Service } from './OAuth2Service';
import type {
  RegistrationRequest,
  LoginRequest,
  UserData as AuthUserData,
  RegistrationStep,
  AuthError,
  AuthEvent,
  PasswordStrength
} from './types';
import type { UserData } from '../../types/app'; // App's UserData type
import { SessionService } from '../SessionService';

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
  private sessionService: SessionService;

  private constructor() {
    this.stateManager = StateManager.getInstance();
    this.authApiClient = new AuthApiClient();
    this.oauth2Service = OAuth2Service.getInstance();
    this.sessionService = SessionService.getInstance(); 
    
    this.setupAuthStateListener();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // =====================================
  // USER DATA MAPPING FUNCTIONS
  // =====================================

  /**
   * Convert auth service UserData to app UserData
   * FIXED: Proper mapping between different UserData types
   */
  private mapAuthUserToAppUser(authUser: AuthUserData): UserData {
    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.username || authUser.email.split('@')[0], // Use username or fallback to email prefix
      role: authUser.role,
      createdAt: authUser.createdAt
    };
  }

  /**
   * Convert login response to proper user data
   * FIXED: Handle backend response format correctly
   */
  private mapLoginResponseToUser(loginData: any): UserData {
    // Extract user data from the complex backend response
    const userData = loginData.user || loginData;
    
    return {
      id: (userData.userId || userData.id || '').toString(),
      email: userData.email || '',
      name: userData.username || userData.name || userData.email?.split('@')[0] || 'User',
      role: userData.role || 'USER',
      createdAt: userData.createdAt || Date.now()
    };
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

      // FIXED: Handle backend response format correctly
      const responseData = response.data;
      const userId = (responseData.userId || responseData.id || 'unknown').toString();
      const email = responseData.email || registrationData.email;

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
        const appUser = this.mapAuthUserToAppUser(response.data.user);
        this.setAuthenticatedUser(appUser);
        this.emitEvent('verification:success', { user: appUser });
        this.emitEvent('login:success', { user: appUser });
      } else {
        this.emitEvent('verification:success', {});
      }

      this.updateRegistrationStep('complete');

      return {
        success: true,
        user: response.data.user ? this.mapAuthUserToAppUser(response.data.user) : undefined
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
   * FIXED: Proper user data mapping and error handling
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

      // FIXED: Map backend response to app user format
      const user = this.mapLoginResponseToUser(response.data);

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
   * Handle OAuth2 callback - ENHANCED VERSION
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

      // ENHANCED: Properly establish session if user data is available
      if (result.user) {
        const appUser = this.mapAuthUserToAppUser(result.user);
        this.setAuthenticatedUser(appUser);
        this.emitEvent('oauth2:success', { user: appUser });
        this.emitEvent('login:success', { user: appUser });

        console.log('✅ AuthService: OAuth2 successful and session established for:', appUser.email);

        return {
          success: true,
          user: appUser,
          redirectTo: result.requiresRedirect || '/dashboard'
        };
      }

      // If no user data but success, try to validate session
      console.log('🔍 AuthService: No user data in OAuth2 result, validating session...');
      
      const sessionValidation = await this.validateSession();
      
      if (sessionValidation.valid && sessionValidation.user) {
        console.log('✅ AuthService: Session validation successful after OAuth2 callback');
        this.emitEvent('oauth2:success', { user: sessionValidation.user });
        this.emitEvent('login:success', { user: sessionValidation.user });
        
        return {
          success: true,
          user: sessionValidation.user,
          redirectTo: result.requiresRedirect || '/dashboard'
        };
      }

      // If we reach here, OAuth2 succeeded but no session was established
      console.warn('⚠️ AuthService: OAuth2 callback succeeded but no session established');
      
      return {
        success: true,
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
        console.error('❌ AuthService: Password reset request failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to request password reset'
        };
      }

      console.log('✅ AuthService: Password reset email sent successfully');

      return {
        success: true,
        message: response.data?.message || 'Password reset email sent'
      };

    } catch (error) {
      console.error('❌ AuthService: Password reset request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request password reset'
      };
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
        console.error('❌ AuthService: Password reset failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to reset password'
        };
      }

      console.log('✅ AuthService: Password reset successful');

      return {
        success: true,
        message: response.data?.message || 'Password reset successful'
      };

    } catch (error) {
      console.error('❌ AuthService: Password reset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset password'
      };
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
        console.error('❌ AuthService: Token confirmation failed:', response.error);
        return {
          valid: false,
          error: response.error || 'Invalid or expired token'
        };
      }

      return {
        valid: response.data?.valid || false,
        message: response.data?.message
      };

    } catch (error) {
      console.error('❌ AuthService: Token confirmation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to confirm token'
      };
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
      
      // Only clear session if we currently think we're authenticated
      if (this.isAuthenticated()) {
        this.handleSessionExpired();
      }
      
      return {
        valid: false,
        error: response.error || 'Session validation failed'
      };
    }

    // FIXED: Handle new backend response format with proper type conversion
    const { authenticated, valid, userId, email, user } = response.data;

    console.log('🔍 AuthService: Session validation response:', { authenticated, valid, userId, email, hasUser: !!user });

    // FIXED: Check for authenticated AND valid flags
    if (authenticated && valid) {
      let appUser: UserData | undefined;

      // Try to get user from response, fallback to constructing from basic fields
      if (user) {
        // Full user object returned
        appUser = this.mapAuthUserToAppUser(user);
      } else if (userId && email) {
        // FIXED: Convert userId to string and construct user object
        appUser = {
          id: String(userId), // Convert number to string
          email: email,
          name: email.split('@')[0], // Fallback name
          role: 'USER', // Default role
          createdAt: Date.now() // Fallback timestamp
        };
        console.log('🔄 AuthService: Constructed user from basic fields:', appUser.email);
      }

      if (appUser) {
        // Only update if we don't already have this user or user data changed
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.id !== appUser.id || currentUser.email !== appUser.email) {
          console.log('🔄 AuthService: Updating user data from session validation');
          this.setAuthenticatedUser(appUser);
        }
        
        return {
          valid: true,
          user: appUser
        };
      } else {
        console.warn('⚠️ AuthService: Session valid but failed to construct user data');
        console.warn('⚠️ AuthService: Raw data:', { userId, email, user });
        return {
          valid: false,
          error: 'Failed to construct user data from session'
        };
      }
    } else {
      console.warn('⚠️ AuthService: Session invalid or user not authenticated');
      console.warn('⚠️ AuthService: Flags:', { authenticated, valid });
      
      // Only clear session if we currently think we're authenticated
      if (this.isAuthenticated()) {
        this.handleSessionExpired();
      }
      
      return { valid: false };
    }

  } catch (error) {
    console.error('❌ AuthService: Session validation error:', error);
    
    // Only clear session if we currently think we're authenticated
    if (this.isAuthenticated()) {
      this.handleSessionExpired();
    }
    
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Session validation error'
    };
  }
}

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
        console.error('❌ AuthService: Failed to get sessions:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to retrieve sessions'
        };
      }

      return {
        success: true,
        sessions: response.data || []
      };

    } catch (error) {
      console.error('❌ AuthService: Get sessions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve sessions'
      };
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
        console.error('❌ AuthService: Failed to invalidate sessions:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to invalidate sessions'
        };
      }

      // Clear local session as well
      this.clearAuthState();

      return {
        success: true,
        invalidatedCount: response.data?.invalidatedCount || 0
      };

    } catch (error) {
      console.error('❌ AuthService: Invalidate sessions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invalidate sessions'
      };
    }
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired(): void {
    console.log('⏰ AuthService: Session expired');
    
    const wasAuthenticated = this.isAuthenticated();
    this.clearAuthState();
    
    // Only emit session expired event if user was previously authenticated
    if (wasAuthenticated) {
      this.emitEvent('session:expired', {});
    }
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
   * Validate password strength - FIXED TYPE ISSUES
   */
  validatePassword(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0; // Start as number

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

    // FIXED: Proper score handling for longer passwords
    if (isValid && password.length >= 12) {
      score = Math.min(score + 1, 4);
    }

    if (isValid) {
      feedback.push('Password strength: ' + ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score]);
    }

    return {
      score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4, // Explicit cast to union type
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
/**
   * Enhanced session establishment for OAuth2 flows
   */
  private setAuthenticatedUser(user: UserData): void {
    console.log('👤 AuthService: Setting authenticated user:', user.email);
    
    this.stateManager.dispatch({
      type: 'SESSION_SET',
      payload: { user, isAuthenticated: true }
    });
    
    this.clearAuthError();
    this.setAuthLoading(false);
    
    // Update registration step to complete if we were in a registration flow
    const authState = this.stateManager.getAuthState();
    if (authState.registrationStep !== 'complete') {
      this.updateRegistrationStep('complete');
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.stateManager.dispatch({ type: 'SESSION_CLEAR' });
    this.stateManager.dispatch({ type: 'AUTH_CLEAR_STATE' });
    this.clearAuthError();
    this.updateRegistrationStep('form');
  }

  /**
   * Update registration step
   */
  private updateRegistrationStep(step: RegistrationStep): void {
    this.stateManager.dispatch({
      type: 'AUTH_SET_REGISTRATION_STEP',
      payload: step
    });
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
      payload: error.message
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

  /**
   * Get auth state for debugging
   */
  getAuthState(): {
    isAuthenticated: boolean;
    user: UserData | null;
    registrationStep: RegistrationStep;
    isLoading: boolean;
    error: string | null;
  } {
    const sessionState = this.stateManager.getSessionState();
    const authState = this.stateManager.getAuthState();
    
    return {
      isAuthenticated: sessionState.isAuthenticated,
      user: sessionState.user,
      registrationStep: authState.registrationStep,
      isLoading: authState.isLoading,
      error: authState.error
    };
  }

  /**
   * Auto-validate session on app startup - NEW METHOD
   */
  async autoValidateSession(): Promise<{ 
    isValid: boolean; 
    user?: UserData; 
    shouldRedirect?: string;
  }> {
    try {
      console.log('🔍 AuthService: Auto-validating session on startup...');
      
      // Check if we have any stored session data first
      const hasStoredSession = this.sessionService.loadPersistedSession();
      
      if (!hasStoredSession) {
        console.log('ℹ️ AuthService: No stored session found');
        return { isValid: false };
      }
      
      // Validate the session with the server
      const validation = await this.validateSession();
      
      if (validation.valid && validation.user) {
        console.log('✅ AuthService: Auto-validation successful for user:', validation.user.email);
        
        // Check if user is on a public page and should be redirected
        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '/home') {
          return {
            isValid: true,
            user: validation.user,
            shouldRedirect: '/dashboard'
          };
        }
        
        return {
          isValid: true,
          user: validation.user
        };
      } else {
        console.log('⚠️ AuthService: Auto-validation failed, clearing stored session');
        this.sessionService.clearSession();
        
        return { isValid: false };
      }
      
    } catch (error) {
      console.error('❌ AuthService: Auto-validation error:', error);
      this.sessionService.clearSession();
      
      return { isValid: false };
    }
  }

    /**
   * Handle successful authentication (login/registration/oauth2)
   */
  private handleAuthSuccess(user: UserData, source: 'login' | 'registration' | 'oauth2'): void {
    console.log(`✅ AuthService: ${source} successful for user:`, user.email);
    
    this.setAuthenticatedUser(user);
    
    // Emit appropriate events
    if (source === 'oauth2') {
      this.emitEvent('oauth2:success', { user });
    }
    
    this.emitEvent('login:success', { user });
    
    // Clear any OAuth2 state
    this.oauth2Service.clearOAuth2State();
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const response = await this.authApiClient.healthCheck();
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Health check failed'
        };
      }

      return {
        success: true,
        status: response.data?.status || 'OK'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check error'
      };
    }
  }
}