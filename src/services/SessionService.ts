// src/services/SessionService.ts

import { StateManager } from '../core/state/StateManager';
import type { UserData, ApiResponse } from '../types/app';

/**
 * Session management service - HttpOnly cookies only
 * No JWT tokens, no mock API integration
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
      }
    });
  }

  /**
   * Set user session (after successful login)
   */
  public setSession(user: UserData): void {
    this.stateManager.dispatch({
      type: 'SESSION_SET',
      payload: { user, isAuthenticated: true }
    });

    // Store minimal session info for cross-tab sync
    try {
      sessionStorage.setItem('session', JSON.stringify({
        user,
        timestamp: Date.now()
      }));
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

      // Redirect to home if on protected route
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/dashboard')) {
        window.history.replaceState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }

  /**
   * Load session from storage on app start
   */
  public loadPersistedSession(): boolean {
    try {
      const sessionData = sessionStorage.getItem('session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.user && session.timestamp) {
          // Check if session is not too old (24 hours)
          const ageHours = (Date.now() - session.timestamp) / (1000 * 60 * 60);
          if (ageHours < 24) {
            this.setSession(session.user);
            return true;
          } else {
            // Session expired
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
   * Process API response that might contain user data
   */
  public processApiResponse<T>(response: ApiResponse<T>): void {
    // If response contains user data, update session
    if (response.success && response.data && typeof response.data === 'object') {
      const data = response.data as any;
      if (data.user && data.user.id) {
        this.setSession(data.user);
      }
    }

    // Handle authentication errors
    if (!response.success && response.error) {
      if (response.error.includes('401') || response.error.includes('403')) {
        this.handleAuthError({
          status: response.error.includes('401') ? 401 : 403,
          message: response.error
        });
      }
    }
  }
}