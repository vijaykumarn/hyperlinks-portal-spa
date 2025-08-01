// src/core/router/guards.ts

import type { RouteGuard } from '../../types/router';
import { SessionService } from '../../services/SessionService';

/**
 * Get session service instance
 */
function getSessionService(): SessionService {
  return SessionService.getInstance();
}

/**
 * Authentication guard - checks if user is authenticated via session data
 * NO JWT tokens - uses HttpOnly cookie + session data pattern
 */
export const authGuard: RouteGuard = async (context) => {
  const sessionService = getSessionService();
  
  if (!sessionService.isAuthenticated()) {
    console.log('🔒 AuthGuard: User not authenticated, redirecting to /');
    return '/';
  }
  
  console.log('✅ AuthGuard: User authenticated, allowing access');
  return true;
};

/**
 * Guest guard - ensures only unauthenticated users can access certain routes
 * Redirects to dashboard if already authenticated
 */
export const guestGuard: RouteGuard = async (context) => {
  const sessionService = getSessionService();
  
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
export const adminGuard: RouteGuard = async (context) => {
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
 * Route meta guard - checks route meta requirements using session data
 */
export const metaGuard: RouteGuard = async (context) => {
  const { to } = context;
  const sessionService = getSessionService();
  
  if (!to.meta) {
    return true;
  }
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !sessionService.isAuthenticated()) {
    console.log('🔒 MetaGuard: Route requires auth, redirecting to /');
    return '/';
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
 * Now includes secure session info
 */
export const loggingGuard: RouteGuard = async (context) => {
  if (process.env.NODE_ENV === 'development') {
    const sessionService = getSessionService();
    const user = sessionService.getCurrentUser();
    
    console.log('🚀 Navigation:', {
      from: context.from?.path || 'initial',
      to: context.to.path,
      params: context.params,
      query: context.query,
      authenticated: sessionService.isAuthenticated(),
      user: user ? { id: user.id, email: user.email, role: user.role } : null
    });
  }
  
  return true;
};

/**
 * Session validation guard - ensures session is not stale
 * Useful for sensitive operations
 */
export const sessionValidationGuard: RouteGuard = async (context) => {
  const sessionService = getSessionService();
  
  if (!sessionService.isAuthenticated()) {
    return '/';
  }
  
  // Check if session is stale (older than 30 minutes)
  if (sessionService.isSessionStale(30)) {
    console.log('⚠️ Session is stale, but allowing access (will validate on next API call)');
    // Note: We don't block here because the next API call will validate the session
    // This provides better UX than blocking on potentially valid sessions
  }
  
  return true;
};

/**
 * Rate limiting guard - prevents too frequent navigation
 */
export const rateLimitGuard: RouteGuard = (() => {
  let lastNavigation = 0;
  const minInterval = 100; // 100ms minimum between navigations
  
  return async (context) => {
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
export const devOnlyGuard: RouteGuard = async (context) => {
  if (process.env.NODE_ENV !== 'development') {
    console.log('🔒 DevOnlyGuard: Not in development mode, redirecting to /');
    return '/';
  }
  
  return true;
};

/**
 * Maintenance guard - blocks access during maintenance
 */
export const maintenanceGuard: RouteGuard = async (context) => {
  // You could check a feature flag or environment variable here
  const isMaintenanceMode = false; // Configure this based on your needs
  
  if (isMaintenanceMode) {
    console.log('🚧 MaintenanceGuard: Site in maintenance mode');
    // You could redirect to a maintenance page
    return '/maintenance';
  }
  
  return true;
};