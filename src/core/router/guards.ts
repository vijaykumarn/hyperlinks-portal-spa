// src/core/router/guards.ts

import type { RouteGuard } from '../../types/router';

/**
 * Authentication guard - checks if user is authenticated
 * Redirects to home (public area) if not authenticated
 */
export const authGuard: RouteGuard = async (context) => {
  // Check if user is authenticated
  const isAuthenticated = checkAuthStatus();
  
  if (!isAuthenticated) {
    // Redirect to home (public area) for unauthenticated users
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
  const isAuthenticated = checkAuthStatus();
  
  if (isAuthenticated) {
    // Redirect authenticated users to dashboard
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
  const isAuthenticated = checkAuthStatus();
  
  if (!isAuthenticated) {
    console.log('🔒 AdminGuard: User not authenticated, redirecting to /');
    return '/';
  }
  
  const hasAdminRole = checkAdminRole();
  
  if (!hasAdminRole) {
    // Redirect to user dashboard if not admin
    console.log('🔒 AdminGuard: User not admin, redirecting to /dashboard');
    return '/dashboard';
  }
  
  console.log('✅ AdminGuard: User is admin, allowing access');
  return true;
};

/**
 * Route meta guard - checks route meta requirements
 */
export const metaGuard: RouteGuard = async (context) => {
  const { to } = context;
  
  if (!to.meta) {
    return true;
  }
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !checkAuthStatus()) {
    console.log('🔒 MetaGuard: Route requires auth, redirecting to /');
    return '/';
  }
  
  // Check if route requires specific role
  if (to.meta.requiredRole) {
    if (!checkAuthStatus()) {
      console.log('🔒 MetaGuard: Route requires role but user not authenticated, redirecting to /');
      return '/';
    }
    
    if (!checkUserRole(to.meta.requiredRole)) {
      console.log('🔒 MetaGuard: User lacks required role, redirecting to /dashboard');
      return '/dashboard';
    }
  }
  
  return true;
};

/**
 * Helper function to check authentication status
 * This should integrate with your session management system
 */
function checkAuthStatus(): boolean {
  try {
    const sessionData = sessionStorage.getItem('session');
    if (!sessionData) {
      return false;
    }
    
    const session = JSON.parse(sessionData);
    
    // Check if session is still valid (you might want to check expiry, etc.)
    const isValid = !!(session && session.user && session.token);
    
    // Optional: Check expiry
    if (isValid && session.expiresAt && Date.now() > session.expiresAt) {
      console.log('🔒 Session expired, clearing storage');
      sessionStorage.removeItem('session');
      return false;
    }
    
    return isValid;
  } catch (error) {
    console.error('🔒 Error checking auth status:', error);
    return false;
  }
}

/**
 * Helper function to check admin role
 */
function checkAdminRole(): boolean {
  try {
    const sessionData = sessionStorage.getItem('session');
    if (!sessionData) {
      return false;
    }
    
    const session = JSON.parse(sessionData);
    return session?.user?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Helper function to check specific user role
 */
function checkUserRole(requiredRole: string): boolean {
  try {
    const sessionData = sessionStorage.getItem('session');
    if (!sessionData) {
      return false;
    }
    
    const session = JSON.parse(sessionData);
    return session?.user?.role === requiredRole;
  } catch {
    return false;
  }
}

/**
 * Logging guard - logs navigation for debugging/analytics
 */
export const loggingGuard: RouteGuard = async (context) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Navigation:', {
      from: context.from?.path || 'initial',
      to: context.to.path,
      params: context.params,
      query: context.query,
      authenticated: checkAuthStatus()
    });
  }
  
  // Could also send analytics data here
  
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