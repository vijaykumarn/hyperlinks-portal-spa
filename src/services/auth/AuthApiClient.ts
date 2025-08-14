// src/services/auth/AuthApiClient.ts - PHASE 3: REFACTORED TO USE UNIFIED CLIENT

import { UnifiedApiClient } from '../core/UnifiedApiClient';
import type { FrontendApiResponse } from '../core/HttpClient';
import type {
  RegistrationRequest,
  RegistrationResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ConfirmAccountResponse,
  SessionInfo,
  OAuth2AuthUrlResponse,
} from './types';
import type { User } from '../../types/user';

/**
 * Auth Server API Client - Refactored to use UnifiedApiClient
 * No more endpoint hardcoding - everything goes through ApiConfig
 */
export class AuthApiClient {
  private unifiedClient: UnifiedApiClient;

  constructor() {
    this.unifiedClient = UnifiedApiClient.getInstance();
  }

  // =====================================
  // REGISTRATION METHODS
  // =====================================

  /**
   * Register new user
   */
  async register(registrationData: RegistrationRequest): Promise<FrontendApiResponse<RegistrationResponse>> {
    console.log('🔐 AuthApiClient: Registering user:', {
      username: registrationData.username,
      email: registrationData.email,
      organisation: registrationData.organisation || 'none',
      terms: registrationData.terms,
      marketing: registrationData.marketing
    });

    return this.unifiedClient.post<RegistrationResponse>('auth.register', registrationData);
  }

  /**
   * Confirm user account
   */
  async confirmAccount(token: string): Promise<FrontendApiResponse<ConfirmAccountResponse>> {
    console.log('✅ AuthApiClient: Confirming account with token');
    
    return this.unifiedClient.post<ConfirmAccountResponse>('auth.confirmAccount', { token });
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<FrontendApiResponse<{ message: string }>> {
    console.log('📧 AuthApiClient: Resending verification email to:', email);
    
    return this.unifiedClient.post<{ message: string }>('auth.resendVerification', { email });
  }

  // =====================================
  // AUTHENTICATION METHODS
  // =====================================

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<FrontendApiResponse<LoginResponse>> {
    console.log('🔑 AuthApiClient: Logging in user:', credentials.email);
    
    // Transform to backend expected format
    const loginData = {
      login: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe || false
    };
    
    return this.unifiedClient.post<LoginResponse>('auth.login', loginData);
  }

  /**
   * Logout user
   */
  async logout(): Promise<FrontendApiResponse<{ message: string }>> {
    console.log('🚪 AuthApiClient: Logging out user');
    
    return this.unifiedClient.post<{ message: string }>('auth.logout');
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<FrontendApiResponse<User>> {
    console.log('👤 AuthApiClient: Getting current user info');
    
    return this.unifiedClient.get<User>('auth.me');
  }

  // =====================================
  // PASSWORD RESET METHODS
  // =====================================

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<FrontendApiResponse<ForgotPasswordResponse>> {
    console.log('🔑 AuthApiClient: Requesting password reset for:', email);
    
    return this.unifiedClient.post<ForgotPasswordResponse>('auth.forgotPassword', { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData: ResetPasswordRequest): Promise<FrontendApiResponse<{ message: string }>> {
    console.log('🔐 AuthApiClient: Resetting password with token');
    
    return this.unifiedClient.post<{ message: string }>('auth.resetPassword', resetData);
  }

  /**
   * Confirm password reset token validity
   */
  async confirmPasswordToken(token: string): Promise<FrontendApiResponse<{ valid: boolean; message: string }>> {
    console.log('🔍 AuthApiClient: Confirming password reset token');
    
    return this.unifiedClient.get<{ valid: boolean; message: string }>('auth.confirmPasswordToken', { token });
  }

  // =====================================
  // SESSION METHODS
  // =====================================

  /**
   * Get current session info
   */
  async getSessionInfo(): Promise<FrontendApiResponse<SessionInfo>> {
    console.log('ℹ️ AuthApiClient: Getting session info');
    
    return this.unifiedClient.get<SessionInfo>('session.info');
  }

  /**
   * Get all user sessions
   */
  async getAllSessions(): Promise<FrontendApiResponse<SessionInfo[]>> {
    console.log('📋 AuthApiClient: Getting all sessions');
    
    return this.unifiedClient.get<SessionInfo[]>('session.all');
  }

  /**
   * Invalidate all sessions
   */
  async invalidateAllSessions(): Promise<FrontendApiResponse<{ message: string; invalidatedCount: number }>> {
    console.log('🗑️ AuthApiClient: Invalidating all sessions');
    
    return this.unifiedClient.post<{ message: string; invalidatedCount: number }>('session.invalidateAll');
  }

  /**
   * Invalidate specific session
   */
  async invalidateSpecificSession(sessionId: string): Promise<FrontendApiResponse<{ message: string }>> {
    console.log('🗑️ AuthApiClient: Invalidating session:', sessionId);
    
    return this.unifiedClient.delete<{ message: string }>('session.invalidateSpecific', { sessionId });
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<FrontendApiResponse<{ 
    authenticated: boolean; 
    valid: boolean; 
    userId?: string; 
    email?: string;
    user?: User;
  }>> {
    console.log('✅ AuthApiClient: Validating session');
    
    return this.unifiedClient.get<{ 
      authenticated: boolean; 
      valid: boolean; 
      userId?: string; 
      email?: string;
      user?: User;
    }>('session.validate');
  }

  /**
   * Simple session check
   */
  async checkSession(): Promise<FrontendApiResponse<{ 
    authenticated: boolean; 
    sessionId?: string;
    hasSession: boolean;
    principal?: string;
  }>> {
    console.log('🔍 AuthApiClient: Checking session');
    
    return this.unifiedClient.get<{ 
      authenticated: boolean; 
      sessionId?: string;
      hasSession: boolean;
      principal?: string;
    }>('session.check');
  }

  // =====================================
  // OAUTH2 METHODS
  // =====================================

  /**
   * Get Google OAuth2 authorization URL
   */
  async getGoogleAuthUrl(redirectUrl?: string): Promise<FrontendApiResponse<OAuth2AuthUrlResponse>> {
    console.log('🔗 AuthApiClient: Getting Google OAuth2 URL');
    
    const params = redirectUrl ? { redirectUrl } : undefined;
    return this.unifiedClient.get<OAuth2AuthUrlResponse>('auth.oauth2GoogleAuthUrl', params);
  }

  // =====================================
  // SECURITY METHODS
  // =====================================

  /**
   * Get CSRF token
   */
  async getCsrfToken(): Promise<FrontendApiResponse<{
    token: string;
    parameterName: string;
    headerName: string;
  }>> {
    console.log('🔒 AuthApiClient: Getting CSRF token');
    
    return this.unifiedClient.get<{
      token: string;
      parameterName: string;
      headerName: string;
    }>('security.csrfToken');
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Health check for auth server
   */
  async healthCheck(): Promise<FrontendApiResponse<{ status: string; timestamp: number }>> {
    console.log('❤️ AuthApiClient: Health check');
    
    return this.unifiedClient.get<{ status: string; timestamp: number }>('auth.health');
  }

  /**
   * Get comprehensive client stats
   */
  getClientStats(): {
    unifiedClient: any;
    endpointsUsed: string[];
  } {
    return {
      unifiedClient: this.unifiedClient.getStats(),
      endpointsUsed: [
        // Authentication
        'auth.register',
        'auth.login',
        'auth.logout',
        'auth.me',
        
        // Password management
        'auth.forgotPassword',
        'auth.resetPassword',
        'auth.confirmPasswordToken',
        
        // Account verification
        'auth.confirmAccount',
        'auth.resendVerification',
        
        // OAuth2
        'auth.oauth2GoogleAuthUrl',
        
        // Session management
        'session.info',
        'session.all',
        'session.invalidateAll',
        'session.invalidateSpecific',
        'session.validate',
        'session.check',
        
        // Security
        'security.csrfToken',
        
        // Health
        'auth.health'
      ]
    };
  }

  /**
   * Test all auth endpoints connectivity
   */
  async testConnectivity(): Promise<{
    reachable: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const response = await this.healthCheck();
      const latency = Date.now() - startTime;
      
      return {
        reachable: response.success,
        latency,
        error: response.success ? undefined : response.error
      };
    } catch (error) {
      return {
        reachable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch validation of multiple endpoints
   */
  async validateEndpoints(): Promise<{
    valid: number;
    invalid: string[];
    total: number;
  }> {
    const stats = this.getClientStats();
    const results = {
      valid: 0,
      invalid: [] as string[],
      total: stats.endpointsUsed.length
    };

    // This would ideally test each endpoint, but for now we'll just validate they exist in config
    const apiConfig = this.unifiedClient['apiConfig']; // Access private property for validation
    
    stats.endpointsUsed.forEach(endpointKey => {
      if (apiConfig && apiConfig.hasEndpoint(endpointKey)) {
        results.valid++;
      } else {
        results.invalid.push(endpointKey);
      }
    });

    return results;
  }

  /**
   * Get auth server specific health
   */
  async getServerHealth(): Promise<{
    server: 'auth';
    healthy: boolean;
    latency?: number;
    error?: string;
    circuitBreakerState?: string;
  }> {
    const unifiedStats = this.unifiedClient.getStats();
    const healthResult = await this.testConnectivity();
    
    return {
      server: 'auth',
      healthy: healthResult.reachable,
      latency: healthResult.latency,
      error: healthResult.error,
      circuitBreakerState: unifiedStats.circuitBreakers.auth?.state || 'CLOSED'
    };
  }
}