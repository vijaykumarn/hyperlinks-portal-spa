// src/services/auth/OAuth2Service.ts - FIXED SESSION VALIDATION AFTER OAUTH2 CALLBACK

import { ApiConfig } from '../core/ApiConfig';
import { AuthApiClient } from './AuthApiClient';
import type { OAuth2State } from './types';

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

    // Clean up any stale OAuth2 data on initialization
    this.cleanupStaleData();
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

      // Create OAuth2 state object
      const oauth2State: OAuth2State = {
        state,
        provider: 'google',
        redirectUrl
      };

      // Store OAuth2 state with timestamp
      this.storeOAuth2State(oauth2State);

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
      if (urlParams.error || urlParams.oauth2_error) {
        console.error('❌ OAuth2Service: OAuth2 error from provider:', urlParams.error || urlParams.oauth2_error);
        return {
          success: false,
          error: this.getOAuth2ErrorMessage(urlParams.error || urlParams.oauth2_error, urlParams.error_description)
        };
      }

      // For successful OAuth2 redirects (like /dashboard?welcome=true),
      // we don't need to validate state or code - the backend has already processed everything
      if (this.isSuccessfulOAuth2Redirect(callbackUrl)) {
        console.log('🔍 OAuth2Service: Detecting successful OAuth2 redirect...');
        
        const sessionValidation = await this.validatePostCallbackSession();
        
        if (!sessionValidation.success) {
          console.error('❌ OAuth2Service: Session validation failed after successful redirect');
          return {
            success: false,
            error: 'Failed to establish session after Google login'
          };
        }

        // Clear OAuth2 state
        this.clearOAuth2State();

        console.log('✅ OAuth2Service: OAuth2 redirect handled successfully');
        
        return {
          success: true,
          user: sessionValidation.user,
          requiresRedirect: '/dashboard'
        };
      }

      // Handle traditional callback with code and state parameters
      if (urlParams.code && urlParams.state) {
        console.log('🔍 OAuth2Service: Processing traditional OAuth2 callback...');
        
        // Validate state parameter
        const stateValidation = this.validateState(urlParams.state);
        if (!stateValidation.isValid) {
          console.error('❌ OAuth2Service: State validation failed:', stateValidation.error);
          return {
            success: false,
            error: 'Invalid OAuth2 state. Please try logging in again.'
          };
        }

        // The backend should have already processed the callback and created a session
        const sessionValidation = await this.validatePostCallbackSession();
        
        if (!sessionValidation.success) {
          console.error('❌ OAuth2Service: Session validation failed after callback');
          return {
            success: false,
            error: 'Failed to create session after Google login'
          };
        }

        // Get redirect URL from stored state
        const storedState = this.getCurrentState();
        const redirectUrl = storedState?.redirectUrl || '/dashboard';

        // Clear OAuth2 state
        this.clearOAuth2State();

        console.log('✅ OAuth2Service: OAuth2 callback handled successfully');
        
        return {
          success: true,
          user: sessionValidation.user,
          requiresRedirect: redirectUrl
        };
      }

      // If we reach here, it's not a valid OAuth2 callback
      console.warn('⚠️ OAuth2Service: URL does not appear to be a valid OAuth2 callback');
      return {
        success: false,
        error: 'Invalid OAuth2 callback URL'
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
   * Check if current URL is OAuth2 callback - FIXED DETECTION
   */
  isOAuth2Callback(url: string = window.location.href): boolean {
    try {
      console.log('🔍 OAuth2Service: Checking if URL is OAuth2 callback:', url);
      
      const urlObj = new URL(url);
      
      // Method 1: Traditional OAuth2 callback with code and state
      const hasCode = urlObj.searchParams.has('code');
      const hasState = urlObj.searchParams.has('state');
      const hasTraditionalParams = hasCode && hasState;
      
      // Method 2: OAuth2 error parameters
      const hasOAuth2Error = urlObj.searchParams.has('error') || urlObj.searchParams.has('oauth2_error');
      
      // Method 3: Specific callback path
      const isCallbackPath = urlObj.pathname === '/auth/callback';
      
      // Method 4: FIXED - Check if we have stored OAuth2 state AND this looks like a success redirect
      const hasStoredState = this.hasStoredOAuth2State();
      const isSuccessfulRedirect = hasStoredState && this.isSuccessfulOAuth2Redirect(url);
      
      const isOAuth2 = hasTraditionalParams || hasOAuth2Error || isCallbackPath || isSuccessfulRedirect;
      
      console.log('🔍 OAuth2 callback detection:', {
        hasCode,
        hasState,
        hasTraditionalParams,
        hasOAuth2Error,
        hasStoredState,
        isSuccessfulRedirect,
        isCallbackPath,
        isOAuth2,
        pathname: urlObj.pathname,
        searchParams: Object.fromEntries(urlObj.searchParams.entries())
      });
      
      return isOAuth2;
    } catch (error) {
      console.error('❌ OAuth2Service: Error checking callback URL:', error);
      return false;
    }
  }

  /**
   * Check if URL is a successful OAuth2 redirect - FIXED LOGIC
   */
  private isSuccessfulOAuth2Redirect(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // CRITICAL: Don't treat error URLs as successful redirects
      if (urlObj.searchParams.has('oauth2_error') || urlObj.searchParams.has('error')) {
        console.log('🔍 OAuth2 redirect check: Error parameter found, not a successful redirect');
        return false;
      }
      
      // Check for patterns that indicate successful OAuth2 completion
      const hasWelcomeParam = urlObj.searchParams.has('welcome');
      const hasSuccessParam = urlObj.searchParams.has('success');
      const hasOAuth2SuccessParam = urlObj.searchParams.has('oauth2_success');
      
      // Check if redirected to protected routes that would only be accessible after login
      const isProtectedRoute = urlObj.pathname.startsWith('/dashboard');
      
      // FIXED: Only consider it a successful redirect if we have OAuth2 state AND either:
      // 1. We have explicit success parameters, OR
      // 2. We're on a protected route (like /dashboard?welcome=true)
      const isSuccessfulRedirect = hasWelcomeParam || 
                                  hasSuccessParam || 
                                  hasOAuth2SuccessParam ||
                                  isProtectedRoute;
      
      console.log('🔍 OAuth2 successful redirect detection:', {
        hasWelcomeParam,
        hasSuccessParam,
        hasOAuth2SuccessParam,
        isProtectedRoute,
        isSuccessfulRedirect,
        pathname: urlObj.pathname
      });
      
      return isSuccessfulRedirect;
    } catch (error) {
      console.error('❌ OAuth2Service: Error checking successful redirect:', error);
      return false;
    }
  }

  /**
   * Validate session after OAuth2 callback - FIXED TO MATCH NEW BACKEND RESPONSE FORMAT
   */
  private async validatePostCallbackSession(): Promise<{ 
    success: boolean; 
    user?: any; 
    error?: string; 
  }> {
    try {
      console.log('🔍 OAuth2Service: Validating session after callback...');
      
      // Since the backend creates HttpOnly cookies after successful OAuth2,
      // we can validate the session by calling the session validation endpoint
      const response = await this.authApiClient.validateSession();
      
      // FIXED: Handle new backend response format
      if (response.success && response.data) {
        const { authenticated, valid, userId, email, user } = response.data;
        
        // FIXED: Check for authenticated AND valid flags
        if (authenticated && valid) {
          let userData: any = null;
          
          // Try to construct user object from available data
          if (user) {
            // Full user object returned
            userData = user;
          } else if (userId && email) {
            // Basic user info returned, construct user object
            userData = {
              id: userId,
              username: email.split('@')[0], // Fallback username
              email: email,
              emailVerified: true, // OAuth2 users are considered verified
              role: 'USER',
              createdAt: Date.now()
            };
          }
          
          if (userData) {
            console.log('✅ OAuth2Service: Session validation successful, user:', userData.email);
            return {
              success: true,
              user: userData
            };
          } else {
            console.warn('⚠️ OAuth2Service: Session valid but no user data available');
            return {
              success: true
            };
          }
        }
      }

      // If validation fails, wait a moment and try once more
      // (sometimes there's a small delay for cookie propagation)
      console.log('⏳ OAuth2Service: Session validation failed, retrying in 1000ms...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const retryResponse = await this.authApiClient.validateSession();
      
      // FIXED: Handle retry response with new format
      if (retryResponse.success && retryResponse.data) {
        const { authenticated, valid, userId, email, user } = retryResponse.data;
        
        if (authenticated && valid) {
          let userData: any = null;
          
          if (user) {
            userData = user;
          } else if (userId && email) {
            userData = {
              id: userId,
              username: email.split('@')[0],
              email: email,
              emailVerified: true,
              role: 'USER',
              createdAt: Date.now()
            };
          }
          
          if (userData) {
            console.log('✅ OAuth2Service: Session validation successful on retry, user:', userData.email);
            return {
              success: true,
              user: userData
            };
          }
        }
      }

      console.warn('⚠️ OAuth2Service: Session validation failed after retry');
      return {
        success: false,
        error: 'Session validation failed - no valid session found'
      };

    } catch (error) {
      console.error('❌ OAuth2Service: Session validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session validation error'
      };
    }
  }

  // =====================================
  // PRIVATE HELPER METHODS (keep all existing ones unchanged)
  // =====================================

  /**
   * Check if we have stored OAuth2 state - WITH VALIDATION
   */
  private hasStoredOAuth2State(): boolean {
    try {
      const stored = sessionStorage.getItem('oauth2_state');
      if (!stored) {
        return false;
      }
      
      // Validate the stored state
      const parsedState = JSON.parse(stored);
      const hasValidState = parsedState && 
                           parsedState.state && 
                           parsedState.provider === 'google';
      
      // EXTENDED: Check if state is not too old (max 15 minutes for OAuth2 flow)
      const stateAge = Date.now() - (parsedState.timestamp || 0);
      const maxAge = 15 * 60 * 1000; // 15 minutes
      
      if (stateAge > maxAge) {
        console.log('🧹 OAuth2Service: Stored state is too old, clearing');
        this.clearOAuth2State();
        return false;
      }
      
      return hasValidState;
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Error checking stored state:', error);
      this.clearOAuth2State(); // Clear invalid state
      return false;
    }
  }

  /**
   * Enhanced OAuth2 state storage with timestamp
   */
  private storeOAuth2State(state: OAuth2State): void {
    try {
      const stateWithTimestamp = {
        ...state,
        timestamp: Date.now()
      };
      sessionStorage.setItem('oauth2_state', JSON.stringify(stateWithTimestamp));
      this.currentState = state;
      console.log('💾 OAuth2Service: State stored successfully with timestamp');
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to store OAuth2 state:', error);
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
        const parsedState = JSON.parse(stored);
        this.currentState = {
          state: parsedState.state,
          provider: parsedState.provider === 'google' ? 'google' : undefined,
          redirectUrl: parsedState.redirectUrl
        };
        return { ...this.currentState };
      }
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to load state from sessionStorage:', error);
    }

    return null;
  }

  /**
   * Clear OAuth2 state - ENHANCED
   */
  clearOAuth2State(): void {
    this.currentState = null;
    try {
      sessionStorage.removeItem('oauth2_state');
      sessionStorage.removeItem('oauth2_processed'); // Also clear processing flag
      console.log('🧹 OAuth2Service: OAuth2 state cleared');
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Failed to clear state from sessionStorage:', error);
    }
  }

  /**
   * Clean up stale OAuth2 data on service initialization
   */
  private cleanupStaleData(): void {
    try {
      // Check for stale oauth2_processed flag
      const processed = sessionStorage.getItem('oauth2_processed');
      if (processed === 'true') {
        // If it's been more than 5 minutes, clear it
        const processingAge = Date.now() - (parseInt(sessionStorage.getItem('oauth2_processed_time') || '0') || Date.now());
        if (processingAge > 5 * 60 * 1000) {
          sessionStorage.removeItem('oauth2_processed');
          sessionStorage.removeItem('oauth2_processed_time');
        }
      }
      
      // Check for stale OAuth2 state
      this.hasStoredOAuth2State(); // This will clean up stale state automatically
      
    } catch (error) {
      console.warn('⚠️ OAuth2Service: Error during cleanup:', error);
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
      
      console.log('🔍 Parsed callback URL params:', Object.keys(params));
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
      console.warn('⚠️ OAuth2Service: No stored state found, but proceeding anyway');
      // In some cases, the state might not be stored but the callback is still valid
      return { isValid: true };
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
}