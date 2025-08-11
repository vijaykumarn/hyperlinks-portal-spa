// src/types/app.ts

import type { RouteContext } from './router';
import type { AppUser, BackendApiResponse, AppError } from './unified';

export type UserData = AppUser;
export type ApiResponse<T = any> = BackendApiResponse<T>;

/**
 * Application configuration
 */
export interface AppConfig {
  apiBaseUrl: string;
  environment: 'development' | 'production' | 'test';
  enableAnalytics: boolean;
  enableLogging: boolean;
}

/**
 * URL data structure
 */
export interface UrlData {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: number;
  clicks: number;
  userId?: string;
  expiresAt?: number;
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  totalUrls: number;
  totalClicks: number;
  topUrls: Array<{ shortCode: string; originalUrl: string; clicks: number }>;
  recentActivity: Array<{ date: string; clicks: number }>;
}

/**
 * Page component interface
 */
export interface PageComponent {
  render(context: RouteContext): Promise<void>;
  cleanup?(): void;
  beforeEnter?(context: RouteContext): Promise<boolean>;
  afterEnter?(context: RouteContext): Promise<void>;
}

/**
 * Application lifecycle hooks
 */
export interface AppLifecycle {
  beforeMount?(): Promise<void>;
  mounted?(): void;
  beforeUnmount?(): Promise<void>;
  unmounted?(): void;
  onError?(error: Error): void;
}

/**
 * Enhanced session data with readonly properties
 */
export interface SessionData {
  readonly user: AppUser;
  readonly sessionId: string;
  readonly expiresAt: number;
  readonly source: 'credentials' | 'oauth2';
}

/**
 * Application state
 */
export interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  currentPage: string | null;
  session: SessionData | null;
  error: string | null;
}

/**
 * DOM utilities interface - ENHANCED
 */
export interface DOMManager {
  // Core DOM methods
  getAppRoot(): HTMLElement;
  clearContent(): void;
  setContent(html: string): void;
  appendContent(html: string): void;
  addToHead(element: HTMLElement): void;
  
  // Title and class management
  setTitle(title: string): void;
  addClass(className: string): void;
  removeClass(className: string): void;
  toggleClass(className: string): void;
  
  // Loading and error states
  showLoading(): void;
  hideLoading(): void;
  showError(message: string, canRetry?: boolean): void;
  
  // Event handling with proper typing
  addEventListener<K extends keyof WindowEventMap>(
    element: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;
  
  addEventListener<K extends keyof DocumentEventMap>(
    element: Document,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;
  
  addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;
  
  // Utility methods
  createLoadingSpinner(size?: 'sm' | 'md' | 'lg'): HTMLElement;
  scrollToElement(element: HTMLElement, behavior?: ScrollBehavior): void;
  getElementRect(element: HTMLElement): DOMRect;
  isInViewport(element: HTMLElement): boolean;
  debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
  throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
}
