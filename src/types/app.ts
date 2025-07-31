// src/types/app.ts

import type { RouteContext } from './router';

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
 * Session data structure
 */
export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
  expiresAt: number;
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
 * DOM utilities interface
 */
export interface DOMManager {
  getAppRoot(): HTMLElement;
  clearContent(): void;
  setContent(html: string): void;
  addToHead(element: HTMLElement): void;
  setTitle(title: string): void;
  addClass(className: string): void;
  removeClass(className: string): void;
}