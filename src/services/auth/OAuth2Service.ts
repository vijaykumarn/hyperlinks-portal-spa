// src/services/auth/OAuth2Service.ts

import { ApiConfig } from '../core/ApiConfig';
import { AuthApiClient } from './AuthApiClient';
import type { OAuth2State, OAuth2AuthUrlResponse } from './types';
import type { ApiResponse } from '../core/HttpClient';

/**
 * OAuth2 Service
 * Handles Google OAuth2 authentication flow
 */
export class OAuth2Service {
  private static instance: OAuth2Service;
  private apiConfig: ApiConfig;
  private authApiClient: AuthApiClient;
  private currentState: OAuth2State | null = null;

  private constructor() {
    this.apiConfig = ApiConfig.getInstance();
    this.authApiClient = new AuthApiClient();
  }

  public static getInstance(): OAuth2Service {
    if (!OAuth2Service.instance) {
      OAuth2Service.instance = new OAuth2Service();
    }
    return OAuth2Service.instance;
  }

  // =====================================
  // GOOGLE OAUTH2 METHODS
  // =====================================

  /**
   * Initiate Google OAuth2 login
   */
  async initiateGoogleLogin(redirectUrl?: string): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      console.log('🚀 OAuth2Service: Initiating Google login...');
      
      // Get authorization URL from auth server
      const response = await this.authApiClient.getGoogleAuthUrl(redirectUrl);
      
      if (!response.success || !response.data) {
        console.error('❌ OAuth2Service: Failed to get auth URL:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to get authorization URL'
        };
      }

      const { authorizationUrl, state } = response.data;

      // Store OAuth2 state
      this.currentState = {
        state,
        provider: 'google',
        redirectUrl
      };

      // Store state in sessionStorage for callback handling
      try {
        sessionStorage.setItem('oauth2_state', JSON.stringify(this.currentState));
      } catch (error) {
        console.warn('⚠️ OAuth2Service: Failed to store state in sessionStorage:', error);
      }

      console.log('✅ OAuth2Service: Google auth URL generated successfully');
      
      return {
        success: true,
        authUrl: authorizationUrl
      };

    } catch (error) {
      console.error('❌ OAuth2Service: Error initiating Google login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Handle OAuth2 callback
   * Called when user returns from Google OAuth2 flow
   */
  async handleCallback(callbackUrl: string): Promise<{ 
    success: boolean; 
    user?: any; 
    error?: string; 
    requiresRedirect?: string;
  }> {
    try {
      console.log('🔄 OAuth2Service: Handling OAuth2 callback...');

      const urlParams = this.parseCallbackUrl(callbackUrl);
      
      // Check for error in callback
      if (urlParams.error) {
        console.error('❌ OAuth2Service: OAuth2 error from provider:', urlParams.error);
        return {
          success: false,
          error: this.getOAuth2ErrorMessage(urlParams.error, urlParams.error_description)
        };
      }

      // Validate state parameter
      const stateValidation = this.validateState(urlParams.state);
      if (!stateValidation.isValid) {
        console.error('❌ OAuth2Service: State validation failed:', stateValidation.error);
        return {
          success: false,
          error: 'Invalid OAuth2 state. Please try logging in again.'
        };
      }

      // Check if we have authorization code
      if (!urlParams.code) {
        console.error('❌ OAuth2Service: No authorization code in callback');
        return {
          success: false,
          error: 'No authorization code received from Google'
        };
      }

      // The Spring Auth Server should handle the code exchange and session creation
      // We just need to validate that the session was created successfully
      const sessionValidation = await this.validatePostCallbackSession();
      
      if (!sessionValidation.success) {
        console.error('❌ OAuth2Service: Session validation failed after callback');
        return {
          success: false,
          error: 'Failed to create session after Google login'
        };
      }

      // Clear OAuth2 state
      this.clearOAuth2State();

      console.log('✅ OAuth2Service: OAuth2 callback handled successfully');
      
      return {
        success: true,
        user: sessionValidation.user,
        requiresRedirect: this.currentState?.redirectUrl
      };

    } catch (error) {
      console.error('❌ OAuth2Service: Error handling callback:', error);
      this.clearOAuth2State();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process OAuth2 callback'
      };
    }
  }

  /**
   * Check if current URL is OAuth2 callback
   */
  isOAuth2Callback(url: string = window.location.href): boolean {
    try {
      const urlObj = new URL(url);
      const hasCode = urlObj.searchParams.has('code');
      const hasState = urlObj.searchParams.has('state');
      const isCallbackPath = urlObj.pathname === '/auth/callback' || 
                            urlObj.pathname.endsWith('/auth/callback');
      
      return (hasCode && hasState) || isCallbackPath;
    } catch {
      return false;
    }
  }

  /**
   * Get current OAuth2 state
   */
  getCurrentState(): OAuth2State | null {
    if (this.currentState) {
      return { ...this.currentState };
    }

    // Try to load from sessionStorage
    try {
      const stored = sessionStorage.getItem('oauth2_state');
      if (stored) {
        this.currentState = JSON.parse(stored);
        return { ...this.currentState };
      }
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to load state from sessionStorage:', error);
    }

    return null;
  }

  /**
   * Clear OAuth2 state
   */
  clearOAuth2State(): void {
    this.currentState = null;
    try {
      sessionStorage.removeItem('oauth2_state');
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to clear state from sessionStorage:', error);
    }
  }

  // =====================================
  // PRIVATE HELPER METHODS
  // =====================================

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
   * Validate OAuth2 state parameter
   */
  private validateState(receivedState?: string): { isValid: boolean; error?: string } {
    if (!receivedState) {
      return {
        isValid: false,
        error: 'No state parameter received'
      };
    }

    const currentState = this.getCurrentState();
    if (!currentState) {
      return {
        isValid: false,
        error: 'No stored OAuth2 state found'
      };
    }

    if (currentState.state !== receivedState) {
      return {
        isValid: false,
        error: 'State parameter mismatch'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate session after OAuth2 callback
   */
  private async validatePostCallbackSession(): Promise<{ 
    success: boolean; 
    user?: any; 
    error?: string; 
  }> {
    try {
      // Check if session was created by validating with auth server
      const response = await this.authApiClient.validateSession();
      
      if (response.success && response.data?.valid && response.data.user) {
        return {
          success: true,
          user: response.data.user
        };
      }

      return {
        success: false,
        error: 'Session validation failed'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session validation error'
      };
    }
  }

  /**
   * Get human-readable OAuth2 error message
   */
  private getOAuth2ErrorMessage(error: string, description?: string): string {
    const errorMessages: Record<string, string> = {
      'access_denied': 'You cancelled the login process. Please try again.',
      'invalid_request': 'Invalid login request. Please try again.',
      'invalid_client': 'Invalid client configuration. Please contact support.',
      'invalid_grant': 'Invalid authorization grant. Please try again.',
      'unsupported_response_type': 'Unsupported login method. Please contact support.',
      'invalid_scope': 'Invalid permissions requested. Please contact support.',
      'server_error': 'Google server error. Please try again later.',
      'temporarily_unavailable': 'Google login is temporarily unavailable. Please try again later.'
    };

    const message = errorMessages[error] || 'An error occurred during Google login.';
    
    return description ? `${message} (${description})` : message;
  }

  /**
   * Generate secure random state
   */
  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Check if Google OAuth2 is configured
   */
  isGoogleOAuth2Configured(): boolean {
    return this.apiConfig.getOAuth2Config().googleEnabled;
  }

  /**
   * Get Google OAuth2 configuration
   */
  getGoogleConfig(): { enabled: boolean } {
    return { enabled: this.apiConfig.getOAuth2Config().googleEnabled };
  }

  /**
   * Build OAuth2 callback URL - Not used since backend handles everything
   */
  buildCallbackUrl(baseUrl: string = window.location.origin): string {
    // This is not used in our flow since Spring Auth Server handles the callback
    return `${baseUrl}/auth/callback`;
  }
}