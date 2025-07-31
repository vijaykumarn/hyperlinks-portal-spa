// src/core/router/index.ts

export { Router } from './Router';
export * from './guards';
export * from './utils';
export * from '../../types/router';

// Example usage and setup for your URL shortener app
import { Router } from './Router';
import { authGuard, guestGuard, loggingGuard } from './guards';
import type { Route } from '../../types/router';

// Global reference to page manager - will be set by App class
let globalPageManager: any = null;

/**
 * Set the global page manager reference
 */
export function setPageManager(pageManager: any): void {
  globalPageManager = pageManager;
  console.log('📱 Page manager connected to router');
}

/**
 * Create and configure the router for the URL shortener application
 */
export function createRouter(): Router {
  const router = new Router({
    mode: 'history', // Use history mode for cleaner URLs
    base: '/',
    fallback: '/', // Default fallback 
    guards: [loggingGuard] // Global guards
  });

  // Define routes for your URL shortener
  const routes: Route[] = [
    {
      path: '/',
      name: 'home',
      handler: async (context) => {
        await renderHomePage(context);
      },
      meta: {
        title: 'URL Shortener'
      }
    },
    {
      path: '/home',
      name: 'homeAlias',
      handler: async (context) => {
        await renderHomePage(context);
      },
      meta: {
        title: 'URL Shortener'
      }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      handler: async (context) => {
        await renderDashboard(context);
      },
      guards: [authGuard], // Requires authentication
      meta: {
        requiresAuth: true,
        title: 'Dashboard'
      }
    },
    {
      path: '/dashboard/urls',
      name: 'urls',
      handler: async (context) => {
        await renderUrlsPage(context);
      },
      guards: [authGuard], // Requires authentication
      meta: {
        requiresAuth: true,
        title: 'URLs - Dashboard'
      }
    },
    {
      path: '/dashboard/analytics',
      name: 'analytics',
      handler: async (context) => {
        await renderAnalyticsPage(context);
      },
      guards: [authGuard], // Requires authentication
      meta: {
        requiresAuth: true,
        title: 'Analytics - Dashboard'
      }
    },
    {
      path: '/dashboard/settings',
      name: 'settings',
      handler: async (context) => {
        await renderSettingsPage(context);
      },
      guards: [authGuard], // Requires authentication
      meta: {
        requiresAuth: true,
        title: 'Settings - Dashboard'
      }
    },
    {
      path: '/u/:shortCode',
      name: 'redirect',
      handler: async (context) => {
        await handleUrlRedirect(context);
      }
    },
    {
      path: '/404',
      name: 'notFound',
      handler: async (context) => {
        await render404Page(context);
      }
    },
    {
      path: '*', // Catch-all route
      name: 'catchAll',
      handler: async (context) => {
        // Redirect to 404
        router.replace('/404');
      }
    }
  ];

  router.addRoutes(routes);
  console.log('🛣️ Router configured with', routes.length, 'routes');
  return router;
}

// Route handlers that use the page manager
async function renderHomePage(context: any): Promise<void> {
  if (globalPageManager) {
    await globalPageManager.renderPage('home', context);
  } else {
    console.error('❌ Page manager not available for home page');
  }
}

async function renderDashboard(context: any): Promise<void> {
  if (globalPageManager) {
    await globalPageManager.renderPage('dashboard', context);
  } else {
    console.error('❌ Page manager not available for dashboard page');
  }
}

async function renderUrlsPage(context: any): Promise<void> {
  if (globalPageManager) {
    await globalPageManager.renderPage('urls', context);
  } else {
    console.error('❌ Page manager not available for urls page');
  }
}

async function renderAnalyticsPage(context: any): Promise<void> {
  if (globalPageManager) {
    await globalPageManager.renderPage('analytics', context);
  } else {
    console.error('❌ Page manager not available for analytics page');
  }
}

async function renderSettingsPage(context: any): Promise<void> {
  if (globalPageManager) {
    await globalPageManager.renderPage('settings', context);
  } else {
    console.error('❌ Page manager not available for settings page');
  }
}

async function handleUrlRedirect(context: any): Promise<void> {
  const { shortCode } = context.params;
  console.log('🔗 Handling redirect for:', shortCode);
  
  // Mock URL redirection - in real app, you'd fetch from API
  const mockUrls: Record<string, string> = {
    'abc123': 'https://www.google.com',
    'xyz789': 'https://www.github.com',
    'test': 'https://www.example.com'
  };

  const originalUrl = mockUrls[shortCode];
  
  if (originalUrl) {
    // In a real app, you'd also track analytics here
    console.log(`🚀 Redirecting ${shortCode} to ${originalUrl}`);
    
    // Show redirect page briefly, then redirect
    if (globalPageManager) {
      const domManager = globalPageManager.domManager;
      domManager.setContent(`
        <div class="flex items-center justify-center min-h-screen bg-gray-50">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h1 class="text-2xl font-bold mb-2">Redirecting...</h1>
            <p class="text-gray-600 mb-4">Taking you to: ${originalUrl}</p>
            <p class="text-sm text-gray-500">If you're not redirected automatically, 
              <a href="${originalUrl}" class="text-blue-500 underline">click here</a>
            </p>
          </div>
        </div>
      `);
    }
    
    // Redirect after 2 seconds
    setTimeout(() => {
      window.location.href = originalUrl;
    }, 2000);
  } else {
    // Short code not found
    if (globalPageManager) {
      const domManager = globalPageManager.domManager;
      domManager.setContent(`
        <div class="flex items-center justify-center min-h-screen bg-gray-50">
          <div class="text-center">
            <div class="text-6xl mb-4">🔗💔</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Link Not Found</h1>
            <p class="text-gray-600 mb-4">The short link "${shortCode}" doesn't exist or has expired.</p>
            <button 
              onclick="window.location.href = '/'" 
              class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      `);
    }
  }
}

async function render404Page(context: any): Promise<void> {
  if (globalPageManager) {
    await globalPageManager.renderPage('notFound', context);
  } else {
    console.error('❌ Page manager not available for 404 page');
  }
}

/**
 * Router instance singleton
 * Initialize this in your main application file
 */
let routerInstance: Router | null = null;

export function getRouter(): Router {
  if (!routerInstance) {
    routerInstance = createRouter();
  }
  return routerInstance;
}

/**
 * Helper function for programmatic navigation
 */
export function navigateTo(path: string, replace = false): Promise<void> {
  const router = getRouter();
  return replace ? router.replace(path) : router.push(path);
}

/**
 * Helper function to get current route
 */
export function getCurrentRoute() {
  return getRouter().getCurrentRoute();
}