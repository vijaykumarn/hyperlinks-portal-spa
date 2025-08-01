// src/state/types.ts

/**
 * Core state interfaces for the URL shortener application
 */

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
}

export interface SessionState {
  user: UserData | null;
  isAuthenticated: boolean;
  lastValidated: number;
  // NO TOKEN - HttpOnly cookies handle authentication!
}

export interface UrlData {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: number;
  clicks: number;
  userId?: string;
  expiresAt?: number;
}

export interface UrlState {
  userUrls: UrlData[];
  recentUrls: UrlData[];
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  isLoading: boolean;
  currentPage: string | null;
  error: string | null;
  notifications: Notification[];
  modals: {
    login: boolean;
    createUrl: boolean;
  };
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface AnalyticsData {
  totalUrls: number;
  totalClicks: number;
  topUrls: Array<{ shortCode: string; originalUrl: string; clicks: number }>;
  recentActivity: Array<{ date: string; clicks: number }>;
}

export interface AnalyticsState {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export interface AppState {
  session: SessionState;
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
  | { type: 'ANALYTICS_SET_DATA'; payload: AnalyticsData }
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