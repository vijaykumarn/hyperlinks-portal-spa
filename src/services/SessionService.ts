// src/services/SessionService.ts

import { StateManager } from '../core/state/StateManager';
import type { UserData } from '../core/state/types';

/**
 * API Response interface with optional session data
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  session?: {
    user: UserData;
    isAuthenticated: boolean;
    expiresAt?: number;
  };
}

/**
 * Secure session management service
 * NO JWT tokens - works with HttpOnly cookies + session data
 */
export class SessionService {
  private static instance: SessionService;
  private stateManager: StateManager;
  private storageEventListener: () => void;

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
    this.storageEventListener = () => {
      window.addEventListener('storage', (event) => {
        if (event.key === 'session') {
          if (!event.newValue) {
            // Session was cleared in another tab
            console.log('🔄 Session cleared in another tab');
            this.clearSession();
          } else {
            // Session was updated in another tab
            try {
              const sessionData = JSON.parse(event.newValue);
              if (sessionData.user) {
                console.log('🔄 Session updated from another tab');
                this.setSession(sessionData.user, true);
              }
            } catch (error) {
              console.warn('Failed to parse session data from storage event:', error);
            }
          }
        }
      });
    };
    
    this.storageEventListener();
  }

/**
 * Update session from API response - DEBUG VERSION
 * This is called automatically by the HTTP client
 */
public updateFromApiResponse<T>(response: ApiResponse<T>): void {
  console.log('🔄 SessionService: updateFromApiResponse called');
  console.log('🔄 SessionService: Response object:', response);
  
  if (response.session) {
    console.log('🔄 SessionService: Found session data:', response.session);
    console.log('🔄 SessionService: Session isAuthenticated:', response.session.isAuthenticated);
    console.log('🔄 SessionService: Session user:', response.session.user);
    
    if (response.session.isAuthenticated && response.session.user) {
      console.log('🔄 SessionService: Calling setSession with user:', response.session.user.email);
      
      // Update session with fresh data from backend
      this.setSession(response.session.user, true);
      
      console.log('✅ SessionService: Session updated from API response');
      
      // Verify the update worked
      const currentState = this.stateManager.getSessionState();
      console.log('🔄 SessionService: Current session state after update:', currentState);
      
    } else {
      console.log('🔒 SessionService: Session data indicates not authenticated');
      this.clearSession();
    }
  } else {
    console.log('⚠️ SessionService: No session data in API response');
  }
}

  /**
   * Set user session (after successful login or API update)
   */
  public setSession(user: UserData, isAuthenticated: boolean = true): void {
    this.stateManager.dispatch({
      type: 'SESSION_SET',
      payload: { user, isAuthenticated }
    });

    console.log('👤 Session set for user:', user.email);
  }

/**
 * Clear session (logout or auth failure) - FIXED VERSION
 */
public clearSession(): void {
  console.log('🔒 SessionService: Clearing session...');
  
  // Clear state manager
  this.stateManager.dispatch({ type: 'SESSION_CLEAR' });
  
  // EXPLICIT localStorage cleanup - don't rely on StateManager
  try {
    // Clear session data
    sessionStorage.removeItem('session');
    
    // Clear mock session data (if using mock API)
    localStorage.removeItem('mock_session_id');
    localStorage.removeItem('mock_sessions');
    
    console.log('🧹 SessionService: localStorage cleaned up');
  } catch (error) {
    console.warn('⚠️ SessionService: Failed to clear localStorage:', error);
  }
  
  // Also clear user-specific data
  this.stateManager.dispatch({ type: 'URLS_SET_USER_URLS', payload: [] });
  this.stateManager.dispatch({ type: 'ANALYTICS_SET_DATA', payload: null });

  console.log('🔒 SessionService: Session cleared completely');
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
    }
  }

  /**
   * Handle authentication errors (401/403)
   */
  public handleAuthError(error: { status: number; message?: string }): void {
    if (error.status === 401 || error.status === 403) {
      console.log('🔒 Authentication error - clearing session');
      this.clearSession();
      
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

      // Redirect to home if not already there
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/dashboard')) {
        window.history.replaceState(null, '', '/');
        // Trigger router to handle the navigation
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }

  /**
   * Get session info for debugging
   */
  public getSessionInfo(): {
    isAuthenticated: boolean;
    user: UserData | null;
    lastValidated: number;
  } {
    const sessionState = this.stateManager.getSessionState();
    return {
      isAuthenticated: sessionState.isAuthenticated,
      user: sessionState.user,
      lastValidated: sessionState.lastValidated
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
   * Destroy the service (cleanup)
   */
  public destroy(): void {
    if (this.storageEventListener) {
      window.removeEventListener('storage', this.storageEventListener);
    }
  }
}