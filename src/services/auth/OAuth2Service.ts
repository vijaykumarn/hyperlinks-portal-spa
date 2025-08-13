// src/services/auth/OAuth2Service.ts - SIMPLIFIED AND STREAMLINED

import { ApiConfig } from '../core/ApiConfig';
import { AuthApiClient } from './AuthApiClient';
import type { User } from '../../types/user';

/**
 * OAuth2 state for flow management
 */
interface OAuth2FlowState {
  state: string;
  provider: 'google';
  redirectUrl?: string;
  timestamp: number;
}

/**
 * OAuth2 callback result
 */
interface OAuth2CallbackResult {
  success: boolean;
  user?: User;
  error?: string;
  redirectTo?: string;
}

/**
 * Simplified OAuth2 Service
 * Handles Google OAuth2 authentication with minimal state management
 */
export class OAuth2Service {
  private static instance: OAuth2Service;
  private apiConfig: ApiConfig;
  private authApiClient: AuthApiClient;
  private readonly STATE_STORAGE_KEY = 'oauth2_flow_state';
  private readonly STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    this.apiConfig = ApiConfig.getInstance();
    this.authApiClient = new AuthApiClient();
    this.cleanupExpiredState();
  }

  public static getInstance(): OAuth2Service {
    if (!OAuth2Service.instance) {
      OAuth2Service.instance = new OAuth2Service();
    }
    return OAuth2Service.instance;
  }

  /**
   * Initiate Google OAuth2 login
   */
  async initiateGoogleLogin(redirectUrl?: string): Promise<{ 
    success: boolean; 
    authUrl?: string; 
    error?: string; 
  }> {
    try {
      console.log('🚀 OAuth2Service: Initiating Google login...');
      
      const response = await this.authApiClient.getGoogleAuthUrl(redirectUrl);
      
      if (!response.success || !response.data) {
        console.error('❌ OAuth2Service: Failed to get auth URL:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to get authorization URL'
        };
      }

      const { authorizationUrl, state } = response.data;

      // Store minimal flow state
      this.storeFlowState({
        state,
        provider: 'google',
        redirectUrl,
        timestamp: Date.now()
      });

      console.log('✅ OAuth2Service: Google auth URL generated');
      
      return {
        success: true,
        authUrl: authorizationUrl
      };

    } catch (error) {
      console.error('❌ OAuth2Service: Error initiating Google login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Google login'
      };
    }
  }

  /**
   * Handle OAuth2 callback - SIMPLIFIED LOGIC
   */
  async handleCallback(callbackUrl: string): Promise<OAuth2CallbackResult> {
    try {
      console.log('🔄 OAuth2Service: Processing OAuth2 callback...');

      const urlParams = this.parseCallbackUrl(callbackUrl);
      
      // Check for errors first
      if (urlParams.error) {
        console.error('❌ OAuth2Service: OAuth2 error from provider:', urlParams.error);
        this.clearFlowState();
        return {
          success: false,
          error: this.getErrorMessage(urlParams.error, urlParams.error_description)
        };
      }

      // Handle different callback scenarios
      if (this.isSuccessfulRedirect(callbackUrl)) {
        return await this.handleSuccessfulRedirect();
      }

      if (urlParams.code && urlParams.state) {
        return await this.handleAuthorizationCode(urlParams);
      }

      console.warn('⚠️ OAuth2Service: Unrecognized callback format');
      return {
        success: false,
        error: 'Invalid OAuth2 callback'
      };

    } catch (error) {
      console.error('❌ OAuth2Service: Callback processing error:', error);
      this.clearFlowState();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth2 callback failed'
      };
    }
  }

  /**
   * Check if current URL is OAuth2 callback
   */
  isOAuth2Callback(url: string = window.location.href): boolean {
    try {
      const urlObj = new URL(url);
      
      // Traditional OAuth2 callback
      const hasAuthCode = urlObj.searchParams.has('code') && urlObj.searchParams.has('state');
      
      // OAuth2 error
      const hasOAuth2Error = urlObj.searchParams.has('error');
      
      // Explicit callback path
      const isCallbackPath = urlObj.pathname === '/auth/callback';
      
      // Successful redirect with stored state
      const hasStoredState = this.hasValidFlowState();
      const looksLikeSuccessRedirect = hasStoredState && 
                                      (urlObj.pathname.startsWith('/dashboard') || 
                                       urlObj.searchParams.has('welcome') ||
                                       urlObj.searchParams.has('oauth2_success'));

      const isCallback = hasAuthCode || hasOAuth2Error || isCallbackPath || looksLikeSuccessRedirect;
      
      console.log('🔍 OAuth2 callback detection:', {
        hasAuthCode,
        hasOAuth2Error,
        isCallbackPath,
        hasStoredState,
        looksLikeSuccessRedirect,
        isCallback
      });
      
      return isCallback;
    } catch (error) {
      console.error('❌ OAuth2Service: Error checking callback URL:', error);
      return false;
    }
  }

  /**
   * Handle successful redirect (backend already processed OAuth2)
   */
  private async handleSuccessfulRedirect(): Promise<OAuth2CallbackResult> {
    console.log('🔍 OAuth2Service: Handling successful redirect...');
    
    try {
      // Validate session with retry logic
      const user = await this.validateSessionWithRetry();
      
      if (user) {
        console.log('✅ OAuth2Service: Session validated after redirect');
        this.clearFlowState();
        return {
          success: true,
          user,
          redirectTo: '/dashboard'
        };
      }

      console.warn('⚠️ OAuth2Service: No valid session after successful redirect');
      return {
        success: false,
        error: 'Failed to establish session after Google login'
      };

    } catch (error) {
      console.error('❌ OAuth2Service: Error handling successful redirect:', error);
      return {
        success: false,
        error: 'Session validation failed after Google login'
      };
    }
  }

  /**
   * Handle authorization code callback
   */
  private async handleAuthorizationCode(params: Record<string, string>): Promise<OAuth2CallbackResult> {
    console.log('🔍 OAuth2Service: Processing authorization code...');
    
    // Validate state
    if (!this.validateState(params.state)) {
      return {
        success: false,
        error: 'Invalid OAuth2 state. Please try logging in again.'
      };
    }

    // Backend should have processed the callback by now
    const user = await this.validateSessionWithRetry();
    
    if (user) {
      const storedState = this.getFlowState();
      const redirectUrl = storedState?.redirectUrl || '/dashboard';
      
      this.clearFlowState();
      
      return {
        success: true,
        user,
        redirectTo: redirectUrl
      };
    }

    return {
      success: false,
      error: 'Failed to create session after authorization'
    };
  }

  /**
   * Validate session with retry logic
   */
  private async validateSessionWithRetry(maxRetries: number = 2): Promise<User | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 OAuth2Service: Session validation attempt ${attempt + 1}`);
        
        const response = await this.authApiClient.validateSession();
        
        if (response.success && response.data) {
          const { authenticated, valid, user: _user, userId: _userId, email: _email } = response.data;
          
          if (authenticated && valid) {
            // Import UserDataTransformer here to avoid circular dependency
            const { UserDataTransformer } = await import('../../types/user');
            return UserDataTransformer.fromSessionResponse(response.data);
          }
        }

        // Wait before retry (except on last attempt)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.warn(`⚠️ OAuth2Service: Session validation attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.warn('⚠️ OAuth2Service: All session validation attempts failed');
    return null;
  }

  /**
   * Store OAuth2 flow state
   */
  private storeFlowState(state: OAuth2FlowState): void {
    try {
      sessionStorage.setItem(this.STATE_STORAGE_KEY, JSON.stringify(state));
      console.log('💾 OAuth2Service: Flow state stored');
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to store flow state:', error);
    }
  }

  /**
   * Get stored flow state
   */
  private getFlowState(): OAuth2FlowState | null {
    try {
      const stored = sessionStorage.getItem(this.STATE_STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored);
      
      // Validate state structure
      if (!state.state || !state.provider || !state.timestamp) {
        console.warn('⚠️ OAuth2Service: Invalid flow state structure');
        this.clearFlowState();
        return null;
      }

      // Check if state is expired
      if (Date.now() - state.timestamp > this.STATE_MAX_AGE_MS) {
        console.log('⏰ OAuth2Service: Flow state expired');
        this.clearFlowState();
        return null;
      }

      return state;
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to parse flow state:', error);
      this.clearFlowState();
      return null;
    }
  }

  /**
   * Check if we have valid flow state
   */
  private hasValidFlowState(): boolean {
    return this.getFlowState() !== null;
  }

  /**
   * Clear OAuth2 flow state
   */
  private clearFlowState(): void {
    try {
      sessionStorage.removeItem(this.STATE_STORAGE_KEY);
      sessionStorage.removeItem('oauth2_processed');
      console.log('🧹 OAuth2Service: Flow state cleared');
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to clear flow state:', error);
    }
  }

  /**
   * Clean up expired state on service initialization
   */
  private cleanupExpiredState(): void {
    const state = this.getFlowState();
    if (!state) {
      // This will clean up any invalid/expired state
      this.clearFlowState();
    }
  }

  /**
   * Validate OAuth2 state parameter
   */
  private validateState(receivedState: string): boolean {
    const storedState = this.getFlowState();
    
    if (!storedState) {
      console.warn('⚠️ OAuth2Service: No stored state found for validation');
      return false;
    }

    if (storedState.state !== receivedState) {
      console.error('❌ OAuth2Service: State parameter mismatch');
      return false;
    }

    return true;
  }

  /**
   * Check if URL represents a successful OAuth2 redirect
   */
  private isSuccessfulRedirect(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Don't treat error URLs as successful
      if (urlObj.searchParams.has('error') || urlObj.searchParams.has('oauth2_error')) {
        return false;
      }

      // Check for success indicators
      const hasSuccessIndicators = urlObj.searchParams.has('welcome') ||
                                   urlObj.searchParams.has('oauth2_success') ||
                                   urlObj.pathname.startsWith('/dashboard');

      // Must also have valid stored state
      return hasSuccessIndicators && this.hasValidFlowState();
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse callback URL parameters
   */
  private parseCallbackUrl(url: string): Record<string, string> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      return params;
    } catch (error) {
      console.error('❌ OAuth2Service: Failed to parse callback URL:', error);
      return {};
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: string, description?: string): string {
    const errorMessages: Record<string, string> = {
      'access_denied': 'Login was cancelled. Please try again.',
      'invalid_request': 'Invalid login request. Please try again.',
      'invalid_client': 'Authentication service error. Please contact support.',
      'invalid_grant': 'Invalid authorization. Please try again.',
      'unsupported_response_type': 'Unsupported login method. Please contact support.',
      'invalid_scope': 'Invalid permissions requested. Please contact support.',
      'server_error': 'Google server error. Please try again later.',
      'temporarily_unavailable': 'Google login temporarily unavailable. Please try again later.'
    };

    const message = errorMessages[error] || 'Google login failed. Please try again.';
    return description ? `${message} (${description})` : message;
  }

  /**
   * Public utility methods
   */
  public isGoogleOAuth2Configured(): boolean {
    return this.apiConfig.getOAuth2Config().googleEnabled;
  }

  public getGoogleConfig(): { enabled: boolean } {
    return { enabled: this.apiConfig.getOAuth2Config().googleEnabled };
  }

  /**
   * Clear all OAuth2 state (public method for cleanup)
   */
  public clearOAuth2State(): void {
    this.clearFlowState();
  }

  /**
   * Get current OAuth2 state info for debugging
   */
  public getOAuth2StateInfo(): {
    hasStoredState: boolean;
    stateAge?: number;
    provider?: string;
  } {
    const state = this.getFlowState();
    
    if (!state) {
      return { hasStoredState: false };
    }

    return {
      hasStoredState: true,
      stateAge: Date.now() - state.timestamp,
      provider: state.provider
    };
  }
}