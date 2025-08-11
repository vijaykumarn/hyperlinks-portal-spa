// src/core/router/guards.ts - ENHANCED OAUTH2 SUPPORT

import type { RouteGuard } from '../../types/router';
import { SessionService } from '../../services/SessionService';
import { AuthService } from '../../services/auth/AuthService';

/**
 * Get session service instance
 */
function getSessionService(): SessionService {
  return SessionService.getInstance();
}

/**
 * Get auth service instance
 */
function getAuthService(): AuthService {
  return AuthService.getInstance();
}

/**
 * Authentication guard - ENHANCED FOR OAUTH2
 */
export const authGuard: RouteGuard = async (context) => {
  const sessionService = getSessionService();
  const authService = getAuthService();
  
  console.log('🔒 AuthGuard: Checking authentication for:', context.path);
  
  // Check if user is authenticated
  if (!sessionService.isAuthenticated()) {
    console.log('🔒 AuthGuard: User not authenticated initially, checking for OAuth2 session...');
    
    // Check if this might be an OAuth2 callback or redirect
    const isOAuth2Related = authService.isOAuth2Callback() || 
                           sessionStorage.getItem('oauth2_processed') === 'true' ||
                           sessionStorage.getItem('oauth2_state');
    
    if (isOAuth2Related) {
      console.log('🔄 AuthGuard: OAuth2 related request detected, attempting session validation...');
      
      try {
        // Give a moment for OAuth2 processing to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to validate session
        const validation = await authService.validateSession();
        
        if (validation.valid && validation.user) {
          console.log('✅ AuthGuard: OAuth2 session validated successfully, allowing access');
          return true;
        } else {
          console.log('❌ AuthGuard: OAuth2 session validation failed');
        }
      } catch (error) {
        console.error('❌ AuthGuard: OAuth2 session validation error:', error);
      }
    }
    
    // Check for persisted session one more time
    const hasPersistedSession = sessionService.loadPersistedSession();
    if (hasPersistedSession && sessionService.isAuthenticated()) {
      console.log('✅ AuthGuard: Found persisted session, allowing access');
      return true;
    }
    
    console.log('🔒 AuthGuard: No valid authentication found, redirecting to /');
    return '/';
  }
  
  // User is authenticated, but let's validate the session for protected routes
  if (context.path.startsWith('/dashboard')) {
    console.log('🔍 AuthGuard: Validating session for protected route...');
    
    try {
      const validation = await authService.validateSession();
      
      if (!validation.valid) {
        console.log('🔒 AuthGuard: Session validation failed, clearing and redirecting');
        sessionService.clearSession();
        return '/';
      }
      
      console.log('✅ AuthGuard: Session validated successfully');
    } catch (error) {
      console.warn('⚠️ AuthGuard: Session validation error, but allowing access:', error);
      // Don't block access if validation fails due to network issues
    }
  }
  
  console.log('✅ AuthGuard: Authentication check passed');
  return true;
};

/**
 * Guest guard - ensures only unauthenticated users can access certain routes
 * ENHANCED FOR OAUTH2
 */
export const guestGuard: RouteGuard = async (context) => {
  const sessionService = getSessionService();
  const authService = getAuthService();
  
  console.log('🔒 GuestGuard: Checking guest access for:', context.path);
  
  // Check for OAuth2 processing
  const isOAuth2Processing = authService.isOAuth2Callback() || 
                            sessionStorage.getItem('oauth2_processed') === 'true';
  
  if (isOAuth2Processing) {
    console.log('🔄 GuestGuard: OAuth2 processing detected, allowing temporary access');
    return true; // Allow access during OAuth2 processing
  }
  
  if (sessionService.isAuthenticated()) {
    console.log('🔒 GuestGuard: User authenticated, redirecting to /dashboard');
    return '/dashboard';
  }
  
  console.log('✅ GuestGuard: User not authenticated, allowing access');
  return true;
};

/**
 * Admin guard - checks if user has admin privileges
 */
export const adminGuard: RouteGuard = async (_context) => {
  const sessionService = getSessionService();
  
  if (!sessionService.isAuthenticated()) {
    console.log('🔒 AdminGuard: User not authenticated, redirecting to /');
    return '/';
  }
  
  const user = sessionService.getCurrentUser();
  const hasAdminRole = user?.role === 'admin';
  
  if (!hasAdminRole) {
    console.log('🔒 AdminGuard: User not admin, redirecting to /dashboard');
    return '/dashboard';
  }
  
  console.log('✅ AdminGuard: User is admin, allowing access');
  return true;
};

/**
 * Route meta guard - checks route meta requirements
 * ENHANCED FOR OAUTH2
 */
export const metaGuard: RouteGuard = async (context) => {
  const { to } = context;
  const sessionService = getSessionService();
  const authService = getAuthService();
  
  if (!to.meta) {
    return true;
  }
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!sessionService.isAuthenticated()) {
      // Check for OAuth2 processing
      const isOAuth2Processing = authService.isOAuth2Callback() || 
                                sessionStorage.getItem('oauth2_processed') === 'true';
      
      if (isOAuth2Processing) {
        console.log('🔄 MetaGuard: OAuth2 processing, attempting session validation...');
        
        try {
          const validation = await authService.validateSession();
          if (validation.valid) {
            console.log('✅ MetaGuard: OAuth2 session validated');
            return true;
          }
        } catch (error) {
          console.warn('⚠️ MetaGuard: OAuth2 session validation failed:', error);
        }
      }
      
      console.log('🔒 MetaGuard: Route requires auth, redirecting to /');
      return '/';
    }
  }
  
  // Check if route requires specific role
  if (to.meta.requiredRole) {
    if (!sessionService.isAuthenticated()) {
      console.log('🔒 MetaGuard: Route requires role but user not authenticated, redirecting to /');
      return '/';
    }
    
    const user = sessionService.getCurrentUser();
    if (!user || user.role !== to.meta.requiredRole) {
      console.log('🔒 MetaGuard: User lacks required role, redirecting to /dashboard');
      return '/dashboard';
    }
  }
  
  return true;
};

/**
 * Logging guard - logs navigation for debugging/analytics
 * ENHANCED WITH OAUTH2 INFO
 */
export const loggingGuard: RouteGuard = async (context) => {
  if (process.env.NODE_ENV === 'development') {
    const sessionService = getSessionService();
    const authService = getAuthService();
    const user = sessionService.getCurrentUser();
    
    // Get session info
    const sessionInfo = sessionService.getSessionInfo();
    
    console.log('🚀 Navigation:', {
      from: context.from?.path || 'initial',
      to: context.to.path,
      params: context.params,
      query: context.query,
      authenticated: sessionService.isAuthenticated(),
      user: user ? { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      } : null,
      sessionSource: sessionInfo.source,
      sessionAge: sessionInfo.ageMinutes ? `${Math.round(sessionInfo.ageMinutes)}m` : 'unknown',
      isOAuth2Callback: authService.isOAuth2Callback(),
      oauth2Processing: sessionStorage.getItem('oauth2_processed') === 'true'
    });
  }
  
  return true;
};

/**
 * Session validation guard - ensures session is not stale
 * ENHANCED FOR OAUTH2
 */
export const sessionValidationGuard: RouteGuard = async (context) => {
  const sessionService = getSessionService();
  const authService = getAuthService();
  
  if (!sessionService.isAuthenticated()) {
    return '/';
  }
  
  // Skip validation for OAuth2 callbacks to avoid interference
  if (authService.isOAuth2Callback()) {
    console.log('🔄 SessionValidationGuard: Skipping validation for OAuth2 callback');
    return true;
  }
  
  // Check if session is stale (older than 30 minutes)
  if (sessionService.isSessionStale(30)) {
    console.log('⚠️ SessionValidationGuard: Session is stale, validating with server...');
    
    try {
      const validation = await authService.validateSession();
      
      if (!validation.valid) {
        console.log('🔒 SessionValidationGuard: Stale session validation failed, clearing');
        sessionService.clearSession();
        return '/';
      }
      
      console.log('✅ SessionValidationGuard: Stale session validated successfully');
    } catch (error) {
      console.warn('⚠️ SessionValidationGuard: Session validation error, but allowing access:', error);
    }
  }
  
  return true;
};

/**
 * Rate limiting guard - prevents too frequent navigation
 */
export const rateLimitGuard: RouteGuard = (() => {
  let lastNavigation = 0;
  const minInterval = 100; // 100ms minimum between navigations
  
  return async (_context) => {
    const now = Date.now();
    
    if (now - lastNavigation < minInterval) {
      console.warn('⚠️ Navigation rate limited');
      return false;
    }
    
    lastNavigation = now;
    return true;
  };
})();

/**
 * Development guard - only allows access in development mode
 */
export const devOnlyGuard: RouteGuard = async (_context) => {
  if (process.env.NODE_ENV !== 'development') {
    console.log('🔒 DevOnlyGuard: Not in development mode, redirecting to /');
    return '/';
  }
  
  return true;
};

/**
 * Maintenance guard - blocks access during maintenance
 */
export const maintenanceGuard: RouteGuard = async (_context) => {
  const isMaintenanceMode = false; // Configure this based on your needs
  
  if (isMaintenanceMode) {
    console.log('🚧 MaintenanceGuard: Site in maintenance mode');
    return '/maintenance';
  }
  
  return true;
};

/**
 * OAuth2 callback guard - handles OAuth2 callback processing
 */
export const oauth2CallbackGuard: RouteGuard = async (context) => {
  const authService = getAuthService();
  
  // Check if this is an OAuth2 callback
  if (authService.isOAuth2Callback()) {
    console.log('🔄 OAuth2CallbackGuard: Processing OAuth2 callback...');
    
    try {
      const result = await authService.handleOAuth2Callback(window.location.href);
      
      if (result.success) {
        console.log('✅ OAuth2CallbackGuard: OAuth2 callback successful');
        // Redirect will be handled by the OAuth2 service
        return result.redirectTo || '/dashboard';
      } else {
        console.error('❌ OAuth2CallbackGuard: OAuth2 callback failed:', result.error);
        return '/?oauth2_error=true';
      }
    } catch (error) {
      console.error('❌ OAuth2CallbackGuard: OAuth2 callback error:', error);
      return '/?oauth2_error=true';
    }
  }
  
  return true;
};