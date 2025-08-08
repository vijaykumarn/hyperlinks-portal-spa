// src/services/auth/AuthApiClient.ts

import { HttpClient } from '../core/HttpClient';
import { ApiConfig } from '../core/ApiConfig';
import type { ApiResponse } from '../core/HttpClient';
import type {
  RegistrationRequest,
  RegistrationResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ConfirmAccountRequest,
  ConfirmAccountResponse,
  ResendVerificationRequest,
  SessionInfo,
  OAuth2AuthUrlResponse,
  UserData
} from './types';

/**
 * Auth Server API Client
 * Handles all HTTP communication with the Spring Auth Server
 */
export class AuthApiClient extends HttpClient {
  private apiConfig: ApiConfig;

  constructor() {
    const apiConfig = ApiConfig.getInstance();
    const authConfig = apiConfig.getAuthServerConfig();
    
    super({
      baseUrl: authConfig.baseUrl,
      timeout: apiConfig.getRequestTimeout(),
      withCredentials: true,
      defaultHeaders: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'spa',
        'X-Service-Type': 'auth'
      }
    });

    this.apiConfig = apiConfig;
  }

  // =====================================
  // REGISTRATION METHODS
  // =====================================

  /**
   * Register new user
   */
  async register(registrationData: RegistrationRequest): Promise<ApiResponse<RegistrationResponse>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.register;
    
    console.log('🔐 AuthApiClient: Registering user:', {
      username: registrationData.username,
      email: registrationData.email,
      organisation: registrationData.organisation || 'none',
      terms: registrationData.terms,
      marketing: registrationData.marketing
    });

    return this.post<RegistrationResponse>(endpoint, registrationData);
  }

  /**
   * Confirm user account
   */
  async confirmAccount(token: string): Promise<ApiResponse<ConfirmAccountResponse>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.confirmAccount;
    
    console.log('✅ AuthApiClient: Confirming account with token');
    
    return this.post<ConfirmAccountResponse>(endpoint, { token });
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.resendVerification;
    
    console.log('📧 AuthApiClient: Resending verification email to:', email);
    
    return this.post<{ message: string }>(endpoint, { email });
  }

  // =====================================
  // AUTHENTICATION METHODS
  // =====================================

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.login;
    
    console.log('🔑 AuthApiClient: Logging in user:', credentials.email);
    
    // FIXED: Send data in format expected by backend
    const loginData = {
      login: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe || false
    };
    
    return this.post<LoginResponse>(endpoint, loginData);
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.logout;
    
    console.log('🚪 AuthApiClient: Logging out user');
    
    return this.post<{ message: string }>(endpoint);
  }

  // =====================================
  // PASSWORD RESET METHODS
  // =====================================

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse<ForgotPasswordResponse>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.forgotPassword;
    
    console.log('🔑 AuthApiClient: Requesting password reset for:', email);
    
    return this.post<ForgotPasswordResponse>(endpoint, { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.resetPassword;
    
    console.log('🔐 AuthApiClient: Resetting password with token');
    
    return this.post<{ message: string }>(endpoint, resetData);
  }

  /**
   * Confirm password reset token validity
   */
  async confirmPasswordToken(token: string): Promise<ApiResponse<{ valid: boolean; message: string }>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.confirmPasswordToken;
    
    console.log('🔍 AuthApiClient: Confirming password reset token');
    
    return this.post<{ valid: boolean; message: string }>(endpoint, { token });
  }

  // =====================================
  // SESSION METHODS
  // =====================================

  /**
   * Get current session info
   */
  async getSessionInfo(): Promise<ApiResponse<SessionInfo>> {
    const endpoint = this.apiConfig.getSessionConfig().endpoints.info;
    
    console.log('ℹ️ AuthApiClient: Getting session info');
    
    return this.get<SessionInfo>(endpoint);
  }

  /**
   * Get all user sessions
   */
  async getAllSessions(): Promise<ApiResponse<SessionInfo[]>> {
    const endpoint = this.apiConfig.getSessionConfig().endpoints.all;
    
    console.log('📋 AuthApiClient: Getting all sessions');
    
    return this.get<SessionInfo[]>(endpoint);
  }

  /**
   * Invalidate all sessions
   */
  async invalidateAllSessions(): Promise<ApiResponse<{ message: string; invalidatedCount: number }>> {
    const endpoint = this.apiConfig.getSessionConfig().endpoints.invalidateAll;
    
    console.log('🗑️ AuthApiClient: Invalidating all sessions');
    
    return this.post<{ message: string; invalidatedCount: number }>(endpoint);
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<ApiResponse<{ valid: boolean; user?: UserData }>> {
    const endpoint = this.apiConfig.getSessionConfig().endpoints.validate;
    
    console.log('✅ AuthApiClient: Validating session');
    
    return this.get<{ valid: boolean; user?: UserData }>(endpoint);
  }

  // =====================================
  // OAUTH2 METHODS
  // =====================================

  /**
   * Get Google OAuth2 authorization URL
   */
  async getGoogleAuthUrl(redirectUrl?: string): Promise<ApiResponse<OAuth2AuthUrlResponse>> {
    const endpoint = this.apiConfig.getAuthServerConfig().endpoints.oauth2GoogleAuthUrl;
    const params: Record<string, string> = {};
    
    if (redirectUrl) {
      params.redirectUrl = redirectUrl;
    }
    
    console.log('🔗 AuthApiClient: Getting Google OAuth2 URL');
    
    return this.get<OAuth2AuthUrlResponse>(endpoint, { params });
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Health check for auth server
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: number }>> {
    console.log('❤️ AuthApiClient: Health check');
    
    return this.get<{ status: string; timestamp: number }>('/api/health');
  }

  /**
   * Get API configuration
   */
  getApiConfig(): ApiConfig {
    return this.apiConfig;
  }

  /**
   * Update base URL (useful for testing)
   */
  updateBaseUrl(baseUrl: string): void {
    this.setBaseUrl(baseUrl);
  }
}