// src/core/state/types.ts - ENHANCED VERSION

import type { UserData, UrlData, AnalyticsData } from '../../types/app';
import type { RegistrationRequest, RegistrationStep, OAuth2State } from '../../services/auth/types';

/**
 * Session state (NO TOKENS - HttpOnly cookies only)
 */
export interface SessionState {
  user: UserData | null;
  isAuthenticated: boolean;
  lastValidated: number;
}

/**
 * Enhanced Auth state for registration and OAuth2 flows
 */
export interface AuthState {
  registrationStep: RegistrationStep;
  registrationData: Partial<RegistrationRequest> | null;
  oauth2State: OAuth2State | null;
  emailVerificationRequired: boolean;
  emailForVerification: string | null;
  verificationResendCooldown: number | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * URL management state
 */
export interface UrlState {
  userUrls: UrlData[];
  recentUrls: UrlData[];
  isLoading: boolean;
  error: string | null;
}

/**
 * UI state management
 */
export interface UIState {
  isLoading: boolean;
  currentPage: string | null;
  error: string | null;
  notifications: Notification[];
  modals: {
    login: boolean;
    register: boolean;
    emailVerification: boolean;
    forgotPassword: boolean;
    createUrl: boolean;
  };
}

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

/**
 * Notification action
 */
export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

/**
 * Analytics state
 */
export interface AnalyticsState {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

/**
 * Complete application state
 */
export interface AppState {
  session: SessionState;
  auth: AuthState;
  urls: UrlState;
  ui: UIState;
  analytics: AnalyticsState;
}

/**
 * Action types for state updates
 */
export type Action =
  // Session actions
  | { type: 'SESSION_SET'; payload: { user: UserData; isAuthenticated: boolean } }
  | { type: 'SESSION_CLEAR' }
  | { type: 'SESSION_UPDATE_TIMESTAMP' }
  
  // Auth actions
  | { type: 'AUTH_SET_REGISTRATION_STEP'; payload: RegistrationStep }
  | { type: 'AUTH_SET_REGISTRATION_DATA'; payload: Partial<RegistrationRequest> | null }
  | { type: 'AUTH_SET_OAUTH2_STATE'; payload: OAuth2State | null }
  | { type: 'AUTH_SET_EMAIL_VERIFICATION'; payload: { required: boolean; email: string | null } }
  | { type: 'AUTH_SET_VERIFICATION_COOLDOWN'; payload: number | null }
  | { type: 'AUTH_SET_LOADING'; payload: boolean }
  | { type: 'AUTH_SET_ERROR'; payload: string | null }
  | { type: 'AUTH_CLEAR_STATE' }
  
  // URL actions
  | { type: 'URLS_SET_USER_URLS'; payload: UrlData[] }
  | { type: 'URLS_ADD_URL'; payload: UrlData }
  | { type: 'URLS_SET_LOADING'; payload: boolean }
  | { type: 'URLS_SET_ERROR'; payload: string | null }
  
  // UI actions
  | { type: 'UI_SET_LOADING'; payload: boolean }
  | { type: 'UI_SET_CURRENT_PAGE'; payload: string }
  | { type: 'UI_SET_ERROR'; payload: string | null }
  | { type: 'UI_ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UI_REMOVE_NOTIFICATION'; payload: string }
  | { type: 'UI_TOGGLE_MODAL'; payload: { modal: keyof UIState['modals']; open: boolean } }
  
  // Analytics actions
  | { type: 'ANALYTICS_SET_DATA'; payload: AnalyticsData | null }
  | { type: 'ANALYTICS_SET_LOADING'; payload: boolean }
  | { type: 'ANALYTICS_SET_ERROR'; payload: string | null };

/**
 * State selector function type
 */
export type StateSelector<T> = (state: AppState) => T;

/**
 * State subscription callback type
 */
export type StateCallback<T> = (value: T, previousValue: T) => void;