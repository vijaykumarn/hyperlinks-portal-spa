// src/core/App.ts

import type { AppConfig, AppLifecycle, AppState } from '../types/app';
import type { Router } from './router/Router';
import { createRouter, navigateTo, setPageManager } from './router';
import { DOMManagerImpl } from './dom/DOMManager';
import { PageManager } from '../pages/PageManager';

/**
 * Main application class that bootstraps and manages the entire URL shortener SPA
 */
export class App implements AppLifecycle {
  private config: AppConfig;
  private router: Router;
  private domManager: DOMManagerImpl;
  private pageManager: PageManager;
  private state: AppState;
  private eventListeners: Array<() => void> = [];

  constructor(config: AppConfig) {
    this.config = config;
    this.state = {
      isInitialized: false,
      isLoading: false,
      currentPage: null,
      session: null,
      error: null
    };

    // Initialize core systems
    this.domManager = new DOMManagerImpl('#app', 'URL Shortener');
    this.pageManager = new PageManager(this.domManager);
    this.router = createRouter(); // Router created but not initialized yet

    // Connect page manager to router
    setPageManager(this.pageManager);

    // Bind methods to maintain context
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
  }

  /**
   * Initialize and start the application
   */
  public async init(): Promise<void> {
    try {
      if (this.state.isInitialized) {
        console.warn('Application already initialized');
        return;
      }

      console.log('Initializing URL Shortener application...');

      // Run beforeMount hook
      if (this.beforeMount) {
        await this.beforeMount();
      }

      // Setup error handling
      this.setupErrorHandling();

      // Setup global event listeners
      this.setupGlobalEventListeners();

      // Register pages
      this.registerPages();

      // Initialize session state
      this.initializeSession();

      // Preload critical pages
      await this.preloadCriticalPages();

      // Initialize router AFTER everything else is ready
      this.router.init();

      // Mark as initialized
      this.state.isInitialized = true;

      // Run mounted hook
      if (this.mounted) {
        this.mounted();
      }

      console.log('Application initialized successfully');

    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Handle uncaught errors
    const errorListener = this.domManager.addEventListener(
      window,
      'error',
      this.handleError
    );
    this.eventListeners.push(errorListener);

    // Handle unhandled promise rejections
    const rejectionListener = this.domManager.addEventListener(
      window,
      'unhandledrejection',
      this.handleUnhandledRejection
    );
    this.eventListeners.push(rejectionListener);
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalEventListeners(): void {
    // Handle session storage changes (logout from another tab)
    const storageListener = this.domManager.addEventListener(
      window,
      'storage',
      (event) => {
        if (event.key === 'session' && !event.newValue) {
          // Session was cleared in another tab
          this.handleSessionExpiry();
        }
      }
    );
    this.eventListeners.push(storageListener);

    // Handle network status changes
    const onlineListener = this.domManager.addEventListener(
      window,
      'online',
      () => {
        console.log('Connection restored');
        this.domManager.removeClass('offline');
      }
    );
    this.eventListeners.push(onlineListener);

    const offlineListener = this.domManager.addEventListener(
      window,'offline', () => {
        console.log('Connection lost');
        this.domManager.addClass('offline');
      }
    );
    this.eventListeners.push(offlineListener);
  }

  /**
   * Register page components
   */
  private registerPages(): void {
    // Home page
    this.pageManager.registerPage('home', async () => {
      const { HomePage } = await import('../pages/HomePage');
      return new HomePage(this.domManager);
    });

    // Dashboard page
    this.pageManager.registerPage('dashboard', async () => {
      const { DashboardPage } = await import('../pages/DashboardPage');
      return new DashboardPage(this.domManager);
    });

    // URLs management page
    this.pageManager.registerPage('urls', async () => {
      const { UrlsPage } = await import('../pages/UrlsPage');
      return new UrlsPage(this.domManager);
    });

    // Analytics page
    this.pageManager.registerPage('analytics', async () => {
      const { AnalyticsPage } = await import('../pages/AnalyticsPage');
      return new AnalyticsPage(this.domManager);
    });

    // Settings page
    this.pageManager.registerPage('settings', async () => {
      const { SettingsPage } = await import('../pages/SettingsPage');
      return new SettingsPage(this.domManager);
    });

    // 404 page
    this.pageManager.registerPage('notFound', async () => {
      const { NotFoundPage } = await import('../pages/NotFoundPage');
      return new NotFoundPage(this.domManager);
    });
  }

  /**
   * Handle route changes
   */
  private async handleRouteChange(context: any): Promise<void> {
    try {
      this.state.isLoading = true;
      
      // Determine page name from route
      const pageName = this.getPageNameFromRoute(context.path);
      
      // Update current page state
      this.state.currentPage = pageName;
      
      // Render page
      await this.pageManager.renderPage(pageName, context);
      
    } catch (error) {
      console.error('Route change error:', error);
      this.handleError(error as Error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Get page name from route path
   */
  private getPageNameFromRoute(path: string): string {
    const pathMap: Record<string, string> = {
      '/': 'home',
      '/home': 'home',
      '/dashboard': 'dashboard',
      '/dashboard/urls': 'urls',
      '/dashboard/analytics': 'analytics',
      '/dashboard/settings': 'settings',
      '/404': 'notFound'
    };

    return pathMap[path] || 'notFound';
  }

  /**
   * Initialize session state from sessionStorage
   */
  private initializeSession(): void {
    try {
      const sessionData = sessionStorage.getItem('session');
      if (sessionData) {
        this.state.session = JSON.parse(sessionData);
      }
    } catch (error) {
      console.warn('Failed to load session data:', error);
      sessionStorage.removeItem('session');
    }
  }

  /**
   * Preload critical pages for better performance
   */
  private async preloadCriticalPages(): Promise<void> {
    if (this.config.environment === 'production') {
      // Preload dashboard pages if user is authenticated
      if (this.state.session) {
        await this.pageManager.preloadPages(['dashboard', 'urls']);
      } else {
        await this.pageManager.preloadPages(['home']);
      }
    }
  }

  /**
   * Handle session expiry
   */
  private handleSessionExpiry(): void {
    this.state.session = null;
    sessionStorage.removeItem('session');
    
    // Redirect to home if on protected route
    const currentRoute = this.router.getCurrentRoute();
    if (currentRoute && currentRoute.path.startsWith('/dashboard')) {
      navigateTo('/', true);
    }
  }

  /**
   * Handle application errors
   */
  private handleError(event: ErrorEvent | Error): void {
    const error = event instanceof ErrorEvent ? event.error : event;
    
    console.error('Application error:', error);
    
    this.state.error = error.message;
    
    if (this.onError) {
      this.onError(error);
    }

    // Show error page for critical errors
    if (!this.state.isInitialized) {
      this.domManager.showError('Failed to initialize application', true);
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent default browser behavior
    event.preventDefault();
    
    this.handleError(new Error(event.reason?.message || 'Unhandled promise rejection'));
  }

  /**
   * Get current application state
   */
  public getState(): Readonly<AppState> {
    return { ...this.state };
  }

  /**
   * Get application config
   */
  public getConfig(): Readonly<AppConfig> {
    return { ...this.config };
  }

  /**
   * Get router instance
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Get DOM manager instance
   */
  public getDOMManager(): DOMManagerImpl {
    return this.domManager;
  }

  /**
   * Get page manager instance
   */
  public getPageManager(): PageManager {
    return this.pageManager;
  }

  /**
   * Lifecycle hooks
   */
  public async beforeMount(): Promise<void> {
    console.log('App: beforeMount');
  }

  public mounted(): void {
    console.log('App: mounted');
  }

  public async beforeUnmount(): Promise<void> {
    console.log('App: beforeUnmount');
  }

  public unmounted(): void {
    console.log('App: unmounted');
  }

  public onError(error: Error): void {
    // Override this method to implement custom error handling
    console.error('App error:', error);
  }

  /**
   * Cleanup and destroy the application
   */
  public async destroy(): Promise<void> {
    try {
      // Run beforeUnmount hook
      if (this.beforeUnmount) {
        await this.beforeUnmount();
      }

      // Cleanup event listeners
      this.eventListeners.forEach(cleanup => cleanup());
      this.eventListeners = [];

      // Destroy router
      this.router.destroy();

      // Destroy page manager
      await this.pageManager.destroy();

      // Clear state
      this.state.isInitialized = false;

      // Run unmounted hook
      if (this.unmounted) {
        this.unmounted();
      }

      console.log('Application destroyed');

    } catch (error) {
      console.error('Error during application cleanup:', error);
      throw error;
    }
  }
}