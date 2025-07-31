// src/main.ts

import { App } from '../core/App';
import type { AppConfig } from '../types/app';
import '../styles/main.css'; // Import your CSS

/**
 * Application configuration
 */
const config: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  environment: (import.meta.env.MODE as 'development' | 'production' | 'test') || 'development',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableLogging: import.meta.env.MODE === 'development'
};

/**
 * Global application instance
 */
let app: App | null = null;

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  try {
    console.log('Starting URL Shortener application...');
    console.log('Environment:', config.environment);
    console.log('API Base URL:', config.apiBaseUrl);

    // Create app instance
    app = new App(config);

    // Initialize the app
    await app.init();

    console.log('Application started successfully!');

  } catch (error) {
    console.error('Failed to start application:', error);
    
    // Show error message to user
    const appRoot = document.getElementById('app');
    if (appRoot) {
      appRoot.innerHTML = `
        <div class="flex items-center justify-center min-h-screen bg-gray-50">
          <div class="text-center max-w-md mx-auto p-6">
            <div class="text-red-500 text-6xl mb-4">💥</div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Application Failed to Start</h1>
            <p class="text-gray-600 mb-4">
              ${error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button 
              onclick="window.location.reload()" 
              class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      `;
    }
    
    throw error;
  }
}

/**
 * Handle page visibility changes for performance optimization
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    console.log('App hidden - pausing non-critical operations');
    // Pause timers, stop animations, etc.
  } else {
    console.log('App visible - resuming operations');
    // Resume operations
  }
}

/**
 * Handle browser unload
 */
function handleBeforeUnload(): void {
  if (app) {
    // Perform quick cleanup
    console.log('App unloading - performing cleanup');
  }
}

/**
 * Setup global event listeners
 */
function setupGlobalListeners(): void {
  // Handle page visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Handle browser unload
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Handle critical errors during development
  if (config.environment === 'development') {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled rejection:', event.reason);
    });
  }
}

/**
 * Wait for DOM to be ready
 */
function waitForDOM(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve());
    } else {
      resolve();
    }
  });
}

/**
 * Check if required DOM elements exist
 */
function validateDOM(): boolean {
  const appRoot = document.getElementById('app');
  if (!appRoot) {
    console.error('App root element (#app) not found in DOM');
    return false;
  }
  return true;
}

/**
 * Show initial loading state
 */
function showInitialLoading(): void {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Initializing application...</p>
        </div>
      </div>
    `;
  }
}

/**
 * Main application bootstrap function
 */
async function bootstrap(): Promise<void> {
  try {
    // Wait for DOM to be ready
    await waitForDOM();

    // Validate required DOM elements
    if (!validateDOM()) {
      throw new Error('Required DOM elements not found');
    }

    // Show initial loading state
    showInitialLoading();

    // Setup global event listeners
    setupGlobalListeners();

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize the application
    await initializeApp();

  } catch (error) {
    console.error('Bootstrap failed:', error);
    throw error;
  }
}

/**
 * Hot Module Replacement (HMR) support for Vite
 */
if (import.meta.hot) {
  import.meta.hot.accept();
  
  import.meta.hot.dispose(() => {
    if (app) {
      console.log('HMR: Disposing app instance');
      app.destroy().catch(console.error);
      app = null;
    }
  });
}

/**
 * Export for testing and debugging
 */
if (config.environment === 'development') {
  (window as any).__APP__ = {
    getInstance: () => app,
    getConfig: () => config,
    restart: async () => {
      if (app) {
        await app.destroy();
      }
      await initializeApp();
    }
  };
}

/**
 * Start the application
 */
bootstrap().catch((error) => {
  console.error('Critical startup error:', error);
  
  // Last resort error display
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f9fafb;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    ">
      <div style="
        text-align: center;
        max-width: 500px;
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">💥</div>
        <h1 style="color: #1f2937; margin-bottom: 16px; font-size: 24px;">
          Critical Application Error
        </h1>
        <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.5;">
          The application failed to start due to a critical error. Please try refreshing the page.
        </p>
        <details style="text-align: left; margin-bottom: 24px;">
          <summary style="cursor: pointer; color: #6b7280; margin-bottom: 8px;">
            Error Details
          </summary>
          <pre style="
            background: #f3f4f6;
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            color: #374151;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-word;
          ">${error instanceof Error ? error.stack || error.message : String(error)}</pre>
        </details>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.background='#2563eb'"
          onmouseout="this.style.background='#3b82f6'"
        >
          Reload Application
        </button>
      </div>
    </div>
  `;
});