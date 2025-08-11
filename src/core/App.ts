// src/core/App.ts - ENHANCED OAUTH2 SESSION HANDLING

import type { AppConfig, AppLifecycle, AppState } from '../types/app';
import type { Router } from './router/Router';
import { createRouter, setPageManager } from './router';
import { DOMManagerImpl } from './dom/DOMManager';
import { PageManager } from '../pages/PageManager';
import { SessionService } from '../services/SessionService';
import { AuthService } from '../services/auth/AuthService';

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
  private sessionService: SessionService;
  private authService: AuthService;

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
    this.router = createRouter();

    // Connect page manager to router
    setPageManager(this.pageManager);

    // Bind methods to maintain context
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);

    this.sessionService = SessionService.getInstance();
    this.authService = AuthService.getInstance();
  }

  /**
   * Initialize and start the application - ENHANCED FOR OAUTH2
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

      // ENHANCED: Initialize session state with OAuth2 support
      await this.initializeSessionState();

      // Setup auth event listeners
      this.setupAuthEventListeners();

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
   * Initialize session state with OAuth2 support
   */
  private async initializeSessionState(): Promise<void> {
    try {
      console.log('🔐 App: Initializing session state...');
      
      // Check for OAuth2 processing flag
      const oauth2Processed = sessionStorage.getItem('oauth2_processed');
      
      if (oauth2Processed === 'true') {
        console.log('🔄 App: OAuth2 was processed, validating session...');
        
        // Auto-validate session after OAuth2
        const validation = await this.authService.autoValidateSession();
        
        if (validation.isValid && validation.user) {
          console.log('✅ App: OAuth2 session validated successfully for:', validation.user.email);
          
          // Check if we should redirect
          if (validation.shouldRedirect && window.location.pathname !== validation.shouldRedirect) {
            console.log('🎯 App: Redirecting after OAuth2 session validation to:', validation.shouldRedirect);
            // Use setTimeout to ensure router is initialized
            setTimeout(() => {
              this.router.replace(validation.shouldRedirect!);
            }, 100);
          }
        } else {
          console.warn('⚠️ App: OAuth2 session validation failed');
        }
        
        // Clear the flag
        sessionStorage.removeItem('oauth2_processed');
        
      } else {
        // Normal session initialization
        const hasPersistedSession = this.sessionService.loadPersistedSession();
        
        if (hasPersistedSession) {
          console.log('🔄 App: Loaded persisted session');
          
          // Validate the persisted session
          const validation = await this.authService.validateSession();
          
          if (validation.valid && validation.user) {
            console.log('✅ App: Persisted session validated successfully');
          } else {
            console.warn('⚠️ App: Persisted session validation failed, clearing session');
            this.sessionService.clearSession();
          }
        } else {
          console.log('ℹ️ App: No persisted session found');
        }
      }
      
    } catch (error) {
      console.error('❌ App: Error initializing session state:', error);
      // Clear any invalid session data
      this.sessionService.clearSession();
    }
  }

  /**
   * Setup authentication event listeners
   */
  private setupAuthEventListeners(): void {
    // Listen for successful authentication
    const loginSuccessListener = this.authService.addEventListener('login:success', (data) => {
      console.log('👤 App: User logged in:', data.user.email);
      // Update app state
      this.state.session = { 
        user: data.user, 
        token: '', 
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) 
      };
    });
    this.eventListeners.push(loginSuccessListener);

    // Listen for OAuth2 success
    const oauth2SuccessListener = this.authService.addEventListener('oauth2:success', (data) => {
      console.log('🔗 App: OAuth2 login successful:', data.user.email);
      // Update app state
      this.state.session = { 
        user: data.user, 
        token: '', 
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) 
      };
    });
    this.eventListeners.push(oauth2SuccessListener);

    // Listen for session expiration
    const sessionExpiredListener = this.authService.addEventListener('session:expired', () => {
      console.log('⏰ App: Session expired');
      this.state.session = null;
    });
    this.eventListeners.push(sessionExpiredListener);

    // Listen for logout
    const logoutListener = this.authService.addEventListener('logout:success', () => {
      console.log('🚪 App: User logged out');
      this.state.session = null;
    });
    this.eventListeners.push(logoutListener);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Handle uncaught errors
    const errorListener = this.domManager.addEventListener(
      window,
      'error',
      (event) => this.handleError(event.error || new Error(event.message))
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
    // Handle network status changes
    const onlineListener = this.domManager.addEventListener(
      window,
      'online',
      () => {
        console.log('Connection restored');
        this.domManager.removeClass('offline');
        
        // Validate session when connection is restored
        if (this.authService.isAuthenticated()) {
          this.authService.validateSession().catch(error => {
            console.warn('Session validation failed after connection restored:', error);
          });
        }
      }
    );
    this.eventListeners.push(onlineListener);

    const offlineListener = this.domManager.addEventListener(
      window,
      'offline',
      () => {
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
   * Preload critical pages for better performance - ENHANCED
   */
  private async preloadCriticalPages(): Promise<void> {
    if (this.config.environment === 'production') {
      // Preload based on authentication status
      if (this.sessionService.isAuthenticated()) {
        console.log('🔄 App: Preloading authenticated user pages...');
        await this.pageManager.preloadPages(['dashboard', 'urls']);
      } else {
        console.log('🔄 App: Preloading public pages...');
        await this.pageManager.preloadPages(['home']);
      }
    }
  }

  /**
   * Handle application errors
   */
  private handleError(error: Error): void {
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
   * Get session service instance
   */
  public getSessionService(): SessionService {
    return this.sessionService;
  }

  /**
   * Get auth service instance
   */
  public getAuthService(): AuthService {
    return this.authService;
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

      // Clear session
      this.sessionService.clearSession();

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