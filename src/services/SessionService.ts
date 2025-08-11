// src/services/SessionService.ts - ENHANCED FOR OAUTH2

import { StateManager } from '../core/state/StateManager';
import type { UserData, ApiResponse } from '../types/app';
import { API_CONFIG, STORAGE_KEYS } from '../config/constants';
import type { AppUser } from '../types/unified';

/**
 * Session management service - HttpOnly cookies with OAuth2 support
 */
export class SessionService {
  private static instance: SessionService;
  private stateManager: StateManager;

  private constructor() {
    this.stateManager = StateManager.getInstance();
    this.setupStorageListener();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Setup cross-tab session synchronization
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'session_cleared') {
        // Session was cleared in another tab
        console.log('🔄 Session cleared in another tab');
        this.clearSessionState();
      } else if (event.key === 'oauth2_session_established') {
        // OAuth2 session was established in another tab
        console.log('🔄 OAuth2 session established in another tab');
        this.handleCrossTabOAuth2Session(event.newValue);
      }
    });
  }

  /**
   * Handle OAuth2 session established in another tab
   */
  private handleCrossTabOAuth2Session(userData: string | null): void {
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('🔄 SessionService: Syncing OAuth2 session from another tab:', user.email);
        this.setSession(user, false); // Don't notify other tabs to avoid loop
      } catch (error) {
        console.warn('Failed to parse cross-tab OAuth2 session data:', error);
      }
    }
  }

  /**
   * Set user session (after successful login) - ENHANCED FOR OAUTH2
   */
  public setSession(user: UserData, notifyOtherTabs: boolean = true): void {
    this.stateManager.dispatch({
      type: 'SESSION_SET',
      payload: { user, isAuthenticated: true }
    });

    // Store minimal session info for cross-tab sync and persistence
    try {
      const sessionData = {
        user,
        timestamp: Date.now(),
        source: 'oauth2' // Track that this came from OAuth2
      };
      
      sessionStorage.setItem('session', JSON.stringify(sessionData));
      
      // Notify other tabs if this is a new OAuth2 session
      if (notifyOtherTabs) {
        localStorage.setItem('oauth2_session_established', JSON.stringify(user));
        setTimeout(() => localStorage.removeItem('oauth2_session_established'), 1000);
      }
      
    } catch (error) {
      console.warn('Failed to store session data:', error);
    }

    console.log('👤 Session set for user:', user.email);
  }

  /**
   * Clear session (logout or auth failure)
   */
  public clearSession(): void {
    console.log('🔒 SessionService: Clearing session...');
    
    // Clear state
    this.clearSessionState();
    
    // Notify other tabs
    try {
      localStorage.setItem('session_cleared', Date.now().toString());
      setTimeout(() => localStorage.removeItem('session_cleared'), 1000);
    } catch (error) {
      console.warn('Failed to notify other tabs:', error);
    }

    // Clear any OAuth2 related data
    try {
      sessionStorage.removeItem('oauth2_state');
      sessionStorage.removeItem('oauth2_processed');
    } catch (error) {
      console.warn('Failed to clear OAuth2 data:', error);
    }

    console.log('🔒 SessionService: Session cleared');
  }

  /**
   * Clear only the session state (internal)
   */
  private clearSessionState(): void {
    this.stateManager.dispatch({ type: 'SESSION_CLEAR' });
    
    // Clear session storage
    try {
      sessionStorage.removeItem('session');
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }

    // Clear user-specific data
    this.stateManager.dispatch({ type: 'URLS_SET_USER_URLS', payload: [] });
    this.stateManager.dispatch({ type: 'ANALYTICS_SET_DATA', payload: null });
  }

  /**
   * Check if user is currently authenticated
   */
  public isAuthenticated(): boolean {
    return this.stateManager.isAuthenticated();
  }

  /**
   * Get current user data
   */
  public getCurrentUser(): UserData | null {
    return this.stateManager.getCurrentUser();
  }

  /**
   * Update session timestamp (called on API interactions)
   */
  public updateTimestamp(): void {
    if (this.isAuthenticated()) {
      this.stateManager.dispatch({ type: 'SESSION_UPDATE_TIMESTAMP' });
      
      // Update stored timestamp
      try {
        const stored = sessionStorage.getItem('session');
        if (stored) {
          const sessionData = JSON.parse(stored);
          sessionData.timestamp = Date.now();
          sessionStorage.setItem('session', JSON.stringify(sessionData));
        }
      } catch (error) {
        console.warn('Failed to update stored timestamp:', error);
      }
    }
  }

  /**
   * Handle authentication errors (401/403) - ENHANCED
   */
  public handleAuthError(error: { status: number; message?: string }): void {
    if (error.status === 401 || error.status === 403) {
      console.log('🔒 Authentication error - clearing session');
      
      const wasAuthenticated = this.isAuthenticated();
      this.clearSession();
      
      // Only show notification and redirect if user was previously authenticated
      if (wasAuthenticated) {
        // Add notification
        this.stateManager.dispatch({
          type: 'UI_ADD_NOTIFICATION',
          payload: {
            id: `auth_error_${Date.now()}`,
            type: 'warning',
            message: 'Your session has expired. Please log in again.',
            duration: 5000
          }
        });

        // Redirect to home if on protected route
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard')) {
          // Use a small delay to ensure state is updated
          setTimeout(() => {
            window.history.replaceState(null, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }, 100);
        }
      }
    }
  }

  /**
   * Load session from storage on app start - ENHANCED FOR OAUTH2
   */
  public loadPersistedSession(): boolean {
    try {
      const sessionData = sessionStorage.getItem('session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.user && session.timestamp) {
          // Check if session is not too old (24 hours for OAuth2 sessions)
          const maxAge = session.source === 'oauth2' ? 24 : 12; // OAuth2 sessions last longer
          const ageHours = (Date.now() - session.timestamp) / (1000 * 60 * 60);
          
          if (ageHours < maxAge) {
            console.log(`🔄 SessionService: Loading persisted ${session.source || 'regular'} session for:`, session.user.email);
            this.setSession(session.user, false); // Don't notify other tabs during load
            return true;
          } else {
            // Session expired
            console.log('⏰ SessionService: Persisted session expired, removing');
            sessionStorage.removeItem('session');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted session:', error);
      sessionStorage.removeItem('session');
    }
    return false;
  }

  /**
   * Get session info for debugging
   */
  public getSessionInfo(): {
    isAuthenticated: boolean;
    user: UserData | null;
    lastValidated: number;
    source?: string;
    ageMinutes?: number;
  } {
    const sessionState = this.stateManager.getSessionState();
    
    // Get additional info from stored session
    let source: string | undefined;
    let ageMinutes: number | undefined;
    
    try {
      const stored = sessionStorage.getItem('session');
      if (stored) {
        const sessionData = JSON.parse(stored);
        source = sessionData.source;
        ageMinutes = (Date.now() - sessionData.timestamp) / (1000 * 60);
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return {
      isAuthenticated: sessionState.isAuthenticated,
      user: sessionState.user,
      lastValidated: sessionState.lastValidated,
      source,
      ageMinutes
    };
  }

  /**
   * Subscribe to session changes
   */
  public subscribeToSession(callback: (session: {
    isAuthenticated: boolean;
    user: UserData | null;
  }) => void): () => void {
    return this.stateManager.subscribe(
      (state) => ({
        isAuthenticated: state.session.isAuthenticated,
        user: state.session.user
      }),
      callback
    );
  }

  /**
   * Check if session is stale (for UI warnings)
   */
  public isSessionStale(maxAgeMinutes: number = 30): boolean {
    const sessionState = this.stateManager.getSessionState();
    if (!sessionState.isAuthenticated) return false;
    
    const ageMinutes = (Date.now() - sessionState.lastValidated) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  /**
   * Process API response that might contain user data - ENHANCED
   */
  public processApiResponse<T>(response: ApiResponse<T>): void {
    // Update timestamp on successful API calls
    if (response.success && this.isAuthenticated()) {
      this.updateTimestamp();
    }

    // If response contains user data, update session
    if (response.success && response.data && typeof response.data === 'object') {
      const data = response.data as any;
      if (data.user && data.user.id) {
        const currentUser = this.getCurrentUser();
        // Only update if this is new user data or user data changed
        if (!currentUser || currentUser.id !== data.user.id || currentUser.email !== data.user.email) {
          console.log('🔄 SessionService: Updating session from API response');
          this.setSession(data.user);
        }
      }
    }

    // Handle authentication errors
    if (!response.success && response.error) {
      if (response.error.includes('401') || response.error.includes('403') || 
          response.status === 401 || response.status === 403) {
        this.handleAuthError({
          status: response.status || (response.error.includes('401') ? 401 : 403),
          message: response.error
        });
      }
    }
  }

  /**
   * Refresh session (useful for OAuth2 flows)
   */
  public async refreshSession(): Promise<{ success: boolean; user?: UserData; error?: string }> {
    try {
      console.log('🔄 SessionService: Refreshing session...');
      
      // This would typically call a session validation endpoint
      // For now, we'll just check if we have a valid stored session
      const hasValidSession = this.loadPersistedSession();
      
      if (hasValidSession) {
        const user = this.getCurrentUser();
        return {
          success: true,
          user: user || undefined
        };
      } else {
        return {
          success: false,
          error: 'No valid session found'
        };
      }
      
    } catch (error) {
      console.error('❌ SessionService: Session refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      };
    }
  }

  /**
   * Check if this is likely an OAuth2 session
   */
  public isOAuth2Session(): boolean {
    try {
      const stored = sessionStorage.getItem('session');
      if (stored) {
        const sessionData = JSON.parse(stored);
        return sessionData.source === 'oauth2';
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return false;
  }
}