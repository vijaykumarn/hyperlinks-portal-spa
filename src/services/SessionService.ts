// src/services/SessionService.ts - REFACTORED WITH RACE CONDITION FIX

import { StateManager } from '../core/state/StateManager';
import type { 
  User, 
  AuthenticationState, 
  SessionValidationResult 
} from '../types/user';
import type { ApiResponse } from '../types/app';

/**
 * Session validation queue to prevent race conditions
 */
class SessionValidationQueue {
  private isValidating = false;
  private pendingCallbacks: Array<{
    resolve: (result: SessionValidationResult) => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * Add validation request to queue
   */
  async enqueue(validationFn: () => Promise<SessionValidationResult>): Promise<SessionValidationResult> {
    return new Promise((resolve, reject) => {
      this.pendingCallbacks.push({ resolve, reject });
      
      if (!this.isValidating) {
        this.processQueue(validationFn);
      }
    });
  }

  /**
   * Process validation queue
   */
  private async processQueue(validationFn: () => Promise<SessionValidationResult>): Promise<void> {
    if (this.isValidating) return;
    
    this.isValidating = true;
    
    try {
      const result = await validationFn();
      
      // Resolve all pending callbacks with the same result
      this.pendingCallbacks.forEach(({ resolve }) => resolve(result));
    } catch (error) {
      // Reject all pending callbacks with the same error
      this.pendingCallbacks.forEach(({ reject }) => reject(error as Error));
    } finally {
      this.pendingCallbacks = [];
      this.isValidating = false;
    }
  }

  /**
   * Clear queue (for cleanup)
   */
  clear(): void {
    this.pendingCallbacks = [];
    this.isValidating = false;
  }
}

/**
 * Session management service with race condition prevention
 */
export class SessionService {
  private static instance: SessionService;
  private stateManager: StateManager;
  private validationQueue: SessionValidationQueue;
  private validationDebounceTimer: NodeJS.Timeout | null = null;
  private lastValidationTimestamp = 0;
  private readonly VALIDATION_DEBOUNCE_MS = 1000; // 1 second
  private readonly MIN_VALIDATION_INTERVAL_MS = 5000; // 5 seconds

  private constructor() {
    this.stateManager = StateManager.getInstance();
    this.validationQueue = new SessionValidationQueue();
    this.setupStorageListener();
  }

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
        console.log('🔄 SessionService: Session cleared in another tab');
        this.clearSessionState();
      } else if (event.key === 'oauth2_session_established') {
        console.log('🔄 SessionService: OAuth2 session established in another tab');
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
        this.setSession(user, 'oauth2', false);
      } catch (error) {
        console.warn('Failed to parse cross-tab OAuth2 session data:', error);
      }
    }
  }

  /**
   * Set user session with source tracking
   */
  public setSession(
    user: User, 
    source: AuthenticationState['sessionSource'] = 'password',
    notifyOtherTabs: boolean = true
  ): void {
    const authState: AuthenticationState = {
      isAuthenticated: true,
      user,
      sessionValidatedAt: Date.now(),
      sessionSource: source
    };

    this.stateManager.dispatch({
      type: 'SESSION_SET',
      payload: { user, isAuthenticated: true }
    });

    // Store session data with metadata
    this.storeSessionData(authState);

    // Notify other tabs if this is a new session
    if (notifyOtherTabs && source === 'oauth2') {
      try {
        localStorage.setItem('oauth2_session_established', JSON.stringify(user));
        setTimeout(() => localStorage.removeItem('oauth2_session_established'), 1000);
      } catch (error) {
        console.warn('Failed to notify other tabs:', error);
      }
    }

    console.log(`👤 SessionService: Session set for user: ${user.email} (source: ${source})`);
  }

  /**
   * Clear session with comprehensive cleanup
   */
  public clearSession(): void {
    console.log('🔒 SessionService: Clearing session...');
    
    // Clear validation queue
    this.validationQueue.clear();
    
    // Clear debounce timer
    if (this.validationDebounceTimer) {
      clearTimeout(this.validationDebounceTimer);
      this.validationDebounceTimer = null;
    }
    
    // Clear state
    this.clearSessionState();
    
    // Notify other tabs
    try {
      localStorage.setItem('session_cleared', Date.now().toString());
      setTimeout(() => localStorage.removeItem('session_cleared'), 1000);
    } catch (error) {
      console.warn('Failed to notify other tabs:', error);
    }

    // Clear session storage
    this.clearStoredSessionData();

    console.log('🔒 SessionService: Session cleared successfully');
  }

  /**
   * Debounced session validation to prevent race conditions
   */
  public async validateSessionDebounced(
    validationFn: () => Promise<SessionValidationResult>,
    force: boolean = false
  ): Promise<SessionValidationResult> {
    // Check if we need to validate at all
    if (!force && !this.shouldValidateSession()) {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        return { valid: true, user: currentUser };
      }
    }

    // Clear existing debounce timer
    if (this.validationDebounceTimer) {
      clearTimeout(this.validationDebounceTimer);
      this.validationDebounceTimer = null;
    }

    // Return queued validation
    return new Promise((resolve, reject) => {
      this.validationDebounceTimer = setTimeout(async () => {
        try {
          const result = await this.validationQueue.enqueue(validationFn);
          this.lastValidationTimestamp = Date.now();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.VALIDATION_DEBOUNCE_MS);
    });
  }

  /**
   * Check if session should be validated
   */
  private shouldValidateSession(): boolean {
    const now = Date.now();
    const timeSinceLastValidation = now - this.lastValidationTimestamp;
    
    return timeSinceLastValidation > this.MIN_VALIDATION_INTERVAL_MS;
  }

  /**
   * Store session data in sessionStorage with metadata
   */
  private storeSessionData(authState: AuthenticationState): void {
    try {
      const sessionData = {
        user: authState.user,
        sessionSource: authState.sessionSource,
        timestamp: authState.sessionValidatedAt,
        version: '1.0' // For future migration compatibility
      };
      
      sessionStorage.setItem('session', JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to store session data:', error);
    }
  }

  /**
   * Load persisted session data with validation
   */
  public loadPersistedSession(): boolean {
    try {
      const sessionData = sessionStorage.getItem('session');
      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData);
      if (!this.isValidSessionData(session)) {
        console.warn('Invalid session data format, clearing...');
        this.clearStoredSessionData();
        return false;
      }

      // Check if session is not too old
      const maxAge = session.sessionSource === 'oauth2' ? 24 : 12; // hours
      const ageHours = (Date.now() - session.timestamp) / (1000 * 60 * 60);
      
      if (ageHours > maxAge) {
        console.log('⏰ SessionService: Persisted session expired, removing');
        this.clearStoredSessionData();
        return false;
      }

      console.log(`🔄 SessionService: Loading persisted ${session.sessionSource} session for:`, session.user.email);
      this.setSession(session.user, session.sessionSource, false);
      return true;

    } catch (error) {
      console.warn('Failed to load persisted session:', error);
      this.clearStoredSessionData();
      return false;
    }
  }

  /**
   * Validate session data structure
   */
  private isValidSessionData(session: any): boolean {
    return session &&
           session.user &&
           typeof session.user.id === 'string' &&
           typeof session.user.email === 'string' &&
           typeof session.timestamp === 'number' &&
           typeof session.sessionSource === 'string';
  }

  /**
   * Clear stored session data
   */
  private clearStoredSessionData(): void {
    try {
      sessionStorage.removeItem('session');
      sessionStorage.removeItem('oauth2_state');
      sessionStorage.removeItem('oauth2_processed');
    } catch (error) {
      console.warn('Failed to clear stored session data:', error);
    }
  }

  /**
   * Clear only the session state (internal)
   */
  private clearSessionState(): void {
    this.stateManager.dispatch({ type: 'SESSION_CLEAR' });
    this.stateManager.dispatch({ type: 'URLS_SET_USER_URLS', payload: [] });
    this.stateManager.dispatch({ type: 'ANALYTICS_SET_DATA', payload: null });
  }

  /**
   * Update session timestamp
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
   * Handle authentication errors with improved logic
   */
  public handleAuthError(error: { status: number; message?: string }): void {
    if (error.status === 401 || error.status === 403) {
      console.log('🔒 SessionService: Authentication error - clearing session');
      
      const wasAuthenticated = this.isAuthenticated();
      this.clearSession();
      
      if (wasAuthenticated) {
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
          setTimeout(() => {
            window.history.replaceState(null, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }, 100);
        }
      }
    }
  }

  /**
   * Process API response for session updates
   */
  public processApiResponse<T>(response: ApiResponse<T> & { status?: number }): void {
    if (response.success && this.isAuthenticated()) {
      this.updateTimestamp();
    }

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

  // Public getters
  public isAuthenticated(): boolean {
    return this.stateManager.isAuthenticated();
  }

  public getCurrentUser(): User | null {
    return this.stateManager.getCurrentUser();
  }

  public getSessionInfo(): {
    isAuthenticated: boolean;
    user: User | null;
    lastValidated: number;
    source?: string;
    ageMinutes?: number;
  } {
    const sessionState = this.stateManager.getSessionState();
    
    let source: string | undefined;
    let ageMinutes: number | undefined;
    
    try {
      const stored = sessionStorage.getItem('session');
      if (stored) {
        const sessionData = JSON.parse(stored);
        source = sessionData.sessionSource;
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

  public isSessionStale(maxAgeMinutes: number = 30): boolean {
    const sessionState = this.stateManager.getSessionState();
    if (!sessionState.isAuthenticated) return false;
    
    const ageMinutes = (Date.now() - sessionState.lastValidated) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  public subscribeToSession(callback: (session: {
    isAuthenticated: boolean;
    user: User | null;
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
   * Cleanup resources (called on app destruction)
   */
  public destroy(): void {
    this.validationQueue.clear();
    
    if (this.validationDebounceTimer) {
      clearTimeout(this.validationDebounceTimer);
      this.validationDebounceTimer = null;
    }
  }
}