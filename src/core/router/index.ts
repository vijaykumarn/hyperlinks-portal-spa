// src/core/router/index.ts - FIXED VERSION

export { Router } from './Router';
export * from './guards';
export * from './utils';
export * from '../../types/router';

import { Router } from './Router';
import { authGuard, loggingGuard } from './guards';
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
    mode: 'history',
    base: '/',
    fallback: '/',
    guards: [loggingGuard]
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
      guards: [authGuard],
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
      guards: [authGuard],
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
      guards: [authGuard],
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
      guards: [authGuard],
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
      path: '*',
      name: 'catchAll',
      handler: async (_context) => {
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
  
  if (globalPageManager) {
    const domManager = globalPageManager.domManager;
    domManager.setContent(`
      <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 class="text-2xl font-bold mb-2">Redirecting...</h1>
          <p class="text-gray-600 mb-4">Looking up short URL: ${shortCode}</p>
          <p class="text-sm text-gray-500">Please wait while we redirect you...</p>
        </div>
      </div>
    `);
  }

  // In a real app, you'd call your API here
  // For now, show a placeholder
  setTimeout(() => {
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
  }, 2000);
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