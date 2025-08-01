// src/core/state/StateManager.ts - FIXED VERSION

import type { 
  AppState, 
  Action, 
  StateSelector, 
  StateCallback,
  SessionState,
  UrlState,
  UIState,
  AnalyticsState
} from './types';
import type { UserData } from '../../types/app';

/**
 * Subscription interface for state changes
 */
interface Subscription<T> {
  id: string;
  selector: StateSelector<T>;
  callback: StateCallback<T>;
  lastValue: T;
}

/**
 * Central state management with observable pattern
 * Thread-safe, type-safe state management for the URL shortener SPA
 */
export class StateManager {
  private static instance: StateManager;
  private state: AppState;
  private subscriptions: Map<string, Subscription<any>> = new Map();
  private nextSubscriptionId = 1;

  private constructor() {
    this.state = this.getInitialState();
    this.loadPersistedState();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Get initial state
   */
  private getInitialState(): AppState {
    return {
      session: {
        user: null,
        isAuthenticated: false,
        lastValidated: 0
      },
      urls: {
        userUrls: [],
        recentUrls: [],
        isLoading: false,
        error: null
      },
      ui: {
        isLoading: false,
        currentPage: null,
        error: null,
        notifications: [],
        modals: {
          login: false,
          createUrl: false
        }
      },
      analytics: {
        data: null,
        isLoading: false,
        error: null,
        lastUpdated: null
      }
    };
  }

  /**
   * Load persisted state from sessionStorage
   */
  private loadPersistedState(): void {
    try {
      const sessionData = sessionStorage.getItem('session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.user) {
          this.state.session = {
            user: session.user,
            isAuthenticated: true,
            lastValidated: session.timestamp || Date.now()
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted session state:', error);
      sessionStorage.removeItem('session');
    }
  }

  /**
   * Persist session state to sessionStorage
   */
  private persistSessionState(): void {
    try {
      if (this.state.session.isAuthenticated && this.state.session.user) {
        const sessionData = {
          user: this.state.session.user,
          timestamp: this.state.session.lastValidated
        };
        sessionStorage.setItem('session', JSON.stringify(sessionData));
      } else {
        sessionStorage.removeItem('session');
      }
    } catch (error) {
      console.warn('Failed to persist session state:', error);
    }
  }

  /**
   * Get current state (readonly)
   */
  public getState(): Readonly<AppState> {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes with a selector
   */
  public subscribe<T>(
    selector: StateSelector<T>, 
    callback: StateCallback<T>
  ): () => void {
    const id = `sub_${this.nextSubscriptionId++}`;
    const currentValue = selector(this.state);
    
    const subscription: Subscription<T> = {
      id,
      selector,
      callback,
      lastValue: currentValue
    };

    this.subscriptions.set(id, subscription);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(id);
    };
  }

  /**
   * Dispatch an action to update state
   */
  public dispatch(action: Action): void {
    const previousState = { ...this.state };
    
    // Update state based on action
    this.state = this.reducer(this.state, action);
    
    // Persist session changes
    if (this.isSessionAction(action)) {
      this.persistSessionState();
    }

    // Notify subscribers
    this.notifySubscribers(previousState);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 State Action:', action.type, action);
      console.log('📊 New State:', this.state);
    }
  }

  /**
   * Check if action affects session state
   */
  private isSessionAction(action: Action): boolean {
    return action.type.startsWith('SESSION_');
  }

  /**
   * State reducer function
   */
  private reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
      // Session actions
      case 'SESSION_SET':
        return {
          ...state,
          session: {
            user: action.payload.user,
            isAuthenticated: action.payload.isAuthenticated,
            lastValidated: Date.now()
          }
        };

      case 'SESSION_CLEAR':
        return {
          ...state,
          session: {
            user: null,
            isAuthenticated: false,
            lastValidated: 0
          },
          urls: {
            ...state.urls,
            userUrls: [] // Clear user-specific data
          }
        };

      case 'SESSION_UPDATE_TIMESTAMP':
        return {
          ...state,
          session: {
            ...state.session,
            lastValidated: Date.now()
          }
        };

      // URL actions
      case 'URLS_SET_USER_URLS':
        return {
          ...state,
          urls: {
            ...state.urls,
            userUrls: action.payload,
            isLoading: false,
            error: null
          }
        };

      case 'URLS_ADD_URL':
        return {
          ...state,
          urls: {
            ...state.urls,
            userUrls: [action.payload, ...state.urls.userUrls],
            recentUrls: [action.payload, ...state.urls.recentUrls.slice(0, 9)] // Keep 10 recent
          }
        };

      case 'URLS_SET_LOADING':
        return {
          ...state,
          urls: {
            ...state.urls,
            isLoading: action.payload
          }
        };

      case 'URLS_SET_ERROR':
        return {
          ...state,
          urls: {
            ...state.urls,
            error: action.payload,
            isLoading: false
          }
        };

      // UI actions
      case 'UI_SET_LOADING':
        return {
          ...state,
          ui: {
            ...state.ui,
            isLoading: action.payload
          }
        };

      case 'UI_SET_CURRENT_PAGE':
        return {
          ...state,
          ui: {
            ...state.ui,
            currentPage: action.payload
          }
        };

      case 'UI_SET_ERROR':
        return {
          ...state,
          ui: {
            ...state.ui,
            error: action.payload
          }
        };

      case 'UI_ADD_NOTIFICATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: [...state.ui.notifications, action.payload]
          }
        };

      case 'UI_REMOVE_NOTIFICATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: state.ui.notifications.filter(n => n.id !== action.payload)
          }
        };

      case 'UI_TOGGLE_MODAL':
        return {
          ...state,
          ui: {
            ...state.ui,
            modals: {
              ...state.ui.modals,
              [action.payload.modal]: action.payload.open
            }
          }
        };

      // Analytics actions
      case 'ANALYTICS_SET_DATA':
        return {
          ...state,
          analytics: {
            ...state.analytics,
            data: action.payload,
            isLoading: false,
            error: null,
            lastUpdated: action.payload ? Date.now() : null
          }
        };

      case 'ANALYTICS_SET_LOADING':
        return {
          ...state,
          analytics: {
            ...state.analytics,
            isLoading: action.payload
          }
        };

      case 'ANALYTICS_SET_ERROR':
        return {
          ...state,
          analytics: {
            ...state.analytics,
            error: action.payload,
            isLoading: false
          }
        };

      default:
        return state;
    }
  }

  /**
   * Notify subscribers of state changes
   */
  private notifySubscribers(previousState: AppState): void {
    this.subscriptions.forEach(subscription => {
      const newValue = subscription.selector(this.state);
      const previousValue = subscription.selector(previousState);

      // Only notify if value actually changed (shallow comparison)
      if (!this.shallowEqual(newValue, previousValue)) {
        subscription.callback(newValue, previousValue);
        subscription.lastValue = newValue;
      }
    });
  }

  /**
   * Shallow equality check for state values
   */
  private shallowEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (a[key] !== b[key]) return false;
      }
      
      return true;
    }

    return false;
  }

  /**
   * Clear all state (useful for logout)
   */
  public clearState(): void {
    this.dispatch({ type: 'SESSION_CLEAR' });
    this.state.urls = this.getInitialState().urls;
    this.state.analytics = this.getInitialState().analytics;
    this.persistSessionState();
  }

  /**
   * Get specific state slice
   */
  public getSessionState(): Readonly<SessionState> {
    return { ...this.state.session };
  }

  public getUrlState(): Readonly<UrlState> {
    return { ...this.state.urls };
  }

  public getUIState(): Readonly<UIState> {
    return { ...this.state.ui };
  }

  public getAnalyticsState(): Readonly<AnalyticsState> {
    return { ...this.state.analytics };
  }

  /**
   * Convenience method to check authentication
   */
  public isAuthenticated(): boolean {
    return this.state.session.isAuthenticated && this.state.session.user !== null;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): UserData | null {
    return this.state.session.user;
  }
}