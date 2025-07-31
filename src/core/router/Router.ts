// src/core/router/Router.ts

import type { 
  Route, 
  RouteContext, 
  RouteGuardContext, 
  RouterConfig, 
  NavigationOptions,
  MatchedRoute,
  RouteGuard,
  NavigationFailureType
} from '../../types/router';
import { NavigationFailure } from '../../types/router';
import { 
  matchRoute, 
  parseQuery, 
  stringifyQuery, 
  normalizePath,
  resolvePath
} from './utils';

export class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private currentContext: RouteContext | null = null;
  private config: RouterConfig;
  private isResolving = false;
  private pendingNavigation: string | null = null;
  private isInitialized = false;

  constructor(config: RouterConfig) {
    this.config = {
      mode: 'history',
      base: '',
      fallback: '/',
      ...config
    };

    // Don't initialize immediately - let the app control this
  }

  /**
   * Initialize the router - called by the app when ready
   */
  public init(): void {
    if (this.isInitialized) {
      console.warn('Router already initialized');
      return;
    }

    if (this.config.mode === 'history') {
      window.addEventListener('popstate', this.handlePopState.bind(this));
    } else {
      window.addEventListener('hashchange', this.handleHashChange.bind(this));
    }

    this.isInitialized = true;
    console.log('🚀 Router initialized');

    // Handle initial route
    this.handleInitialRoute();
  }

  /**
   * Add routes to the router
   */
  public addRoutes(routes: Route[]): void {
    this.routes.push(...routes);
  }

  /**
   * Add a single route
   */
  public addRoute(route: Route): void {
    this.routes.push(route);
  }

  /**
   * Navigate to a path
   */
  public async push(path: string, options: NavigationOptions = {}): Promise<void> {
    try {
      await this.navigate(path, { ...options, replace: false });
    } catch (error) {
      if (error instanceof NavigationFailure) {
        throw error;
      }
      throw new NavigationFailure('aborted', this.getCurrentPath(), path, (error as Error).message);
    }
  }

  /**
   * Replace current route
   */
  public async replace(path: string, options: NavigationOptions = {}): Promise<void> {
    try {
      await this.navigate(path, { ...options, replace: true });
    } catch (error) {
      if (error instanceof NavigationFailure) {
        throw error;
      }
      throw new NavigationFailure('aborted', this.getCurrentPath(), path, (error as Error).message);
    }
  }

  /**
   * Go back in history
   */
  public back(): void {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  public forward(): void {
    window.history.forward();
  }

  /**
   * Go to a specific position in history
   */
  public go(delta: number): void {
    window.history.go(delta);
  }

  /**
   * Get current route context
   */
  public getCurrentRoute(): RouteContext | null {
    return this.currentContext;
  }

  /**
   * Get current path
   */
  public getCurrentPath(): string {
    if (this.config.mode === 'hash') {
      return window.location.hash.slice(1) || '/';
    }
    return window.location.pathname + window.location.search;
  }

  /**
   * Resolve a path with parameters
   */
  public resolve(path: string, params?: Record<string, string>): string {
    const resolved = params ? resolvePath(path, params) : path;
    return this.config.mode === 'hash' ? `#${resolved}` : resolved;
  }

  /**
   * Main navigation method
   */
  private async navigate(path: string, options: NavigationOptions = {}): Promise<void> {
    // Prevent concurrent navigation
    if (this.isResolving) {
      if (this.pendingNavigation) {
        throw new NavigationFailure('cancelled', this.pendingNavigation, path);
      }
      this.pendingNavigation = path;
      return;
    }

    const normalizedPath = normalizePath(path);
    const currentPath = this.getCurrentPath();

    // Check for duplicate navigation - but allow initial navigation
    if (normalizedPath === currentPath && !options.replace && this.currentRoute) {
      console.warn('Duplicate navigation detected:', normalizedPath);
      return; // Silently ignore duplicate navigation
    }

    this.isResolving = true;
    this.pendingNavigation = null;

    try {
      const [pathOnly, search] = normalizedPath.split('?');
      const query = parseQuery(search || '');
      
      const matchedRoute = matchRoute(pathOnly, this.routes);
      
      if (!matchedRoute) {
        // No route found, try fallback
        if (this.config.fallback && normalizedPath !== this.config.fallback) {
          await this.navigate(this.config.fallback, options);
          return;
        }
        throw new Error(`No route found for path: ${normalizedPath}`);
      }

      const context: RouteContext = {
        params: matchedRoute.params,
        query,
        path: pathOnly,
        fullPath: normalizedPath
      };

      // Run guards
      const guardResult = await this.runGuards(matchedRoute.route, context);
      
      if (guardResult !== true) {
        if (typeof guardResult === 'string') {
          // Redirect
          await this.navigate(guardResult, options);
          return;
        }
        // Guard failed
        throw new NavigationFailure('aborted', currentPath, normalizedPath, 'Route guard failed');
      }

      // Update browser history only if path actually changed
      if (normalizedPath !== currentPath || options.replace) {
        this.updateHistory(normalizedPath, options);
      }

      // Update current route
      this.currentRoute = matchedRoute.route;
      this.currentContext = context;

      // Execute route handler
      await matchedRoute.route.handler(context);

    } finally {
      this.isResolving = false;
      
      // Handle pending navigation
      if (this.pendingNavigation) {
        const pending = this.pendingNavigation;
        this.pendingNavigation = null;
        await this.navigate(pending, options);
      }
    }
  }

  /**
   * Run route guards
   */
  private async runGuards(route: Route, context: RouteContext): Promise<boolean | string> {
    const guards: RouteGuard[] = [];
    
    // Add global guards
    if (this.config.guards) {
      guards.push(...this.config.guards);
    }
    
    // Add route-specific guards
    if (route.guards) {
      guards.push(...route.guards);
    }

    for (const guard of guards) {
      const guardContext: RouteGuardContext = {
        ...context,
        from: this.currentRoute || undefined,
        to: route
      };

      const result = await guard(guardContext);
      
      if (result !== true) {
        return result;
      }
    }

    return true;
  }

  /**
   * Update browser history
   */
  private updateHistory(path: string, options: NavigationOptions): void {
    const url = this.config.mode === 'hash' ? `#${path}` : path;
    
    if (options.replace) {
      window.history.replaceState(options.state || null, '', url);
    } else {
      window.history.pushState(options.state || null, '', url);
    }
  }

  /**
   * Handle popstate event (back/forward navigation)
   */
  private handlePopState(event: PopStateEvent): void {
    const path = this.getCurrentPath();
    this.navigate(path).catch(error => {
      console.error('Navigation error on popstate:', error);
      // Could implement error recovery here
    });
  }

  /**
   * Handle hashchange event
   */
  private handleHashChange(): void {
    const path = window.location.hash.slice(1) || '/';
    this.navigate(path).catch(error => {
      console.error('Navigation error on hashchange:', error);
    });
  }

  /**
   * Handle initial route when router starts
   */
  private handleInitialRoute(): void {
    const path = this.getCurrentPath();
    console.log('🏁 Initial route:', path);
    
    this.navigate(path).catch(error => {
      console.error('Initial navigation error:', error);
      // Try fallback route
      if (this.config.fallback && path !== this.config.fallback) {
        this.navigate(this.config.fallback).catch(fallbackError => {
          console.error('Fallback navigation error:', fallbackError);
        });
      }
    });
  }

  /**
   * Destroy the router and clean up event listeners
   */
  public destroy(): void {
    if (this.config.mode === 'history') {
      window.removeEventListener('popstate', this.handlePopState.bind(this));
    } else {
      window.removeEventListener('hashchange', this.handleHashChange.bind(this));
    }
    
    this.isInitialized = false;
    this.currentRoute = null;
    this.currentContext = null;
    this.isResolving = false;
    this.pendingNavigation = null;
  }
}