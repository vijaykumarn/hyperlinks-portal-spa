// src/scripts/main.ts - FIXED APISERVICE INITIALIZATION

import { App } from '../core/App';
import type { AppConfig } from '../types/app';
import { StateManager } from '../core/state/StateManager';
import { SessionService } from '../services/SessionService';
import { AuthService } from '../services/auth/AuthService';
import { ApiConfig } from '../services/core/ApiConfig';
import { ApiService } from '../services/ApiService'; // ADDED: Import ApiService
import '../styles/main.css';

// Initialize API configuration first
const apiConfig = ApiConfig.getInstance();

// Validate configuration
const configValidation = apiConfig.validateConfig();
if (!configValidation.isValid) {
  console.error('❌ Invalid configuration:', configValidation.errors);
  throw new Error('Invalid application configuration: ' + configValidation.errors.join(', '));
}

// CRITICAL FIX: Initialize ApiService before anything else
console.log('🔧 Initializing ApiService...');
const apiService = ApiService.initialize({
  baseUrl: apiConfig.getResourceServerConfig().baseUrl
});
console.log('✅ ApiService initialized with base URL:', apiService.getBaseUrl());

// Initialize other services
const stateManager = StateManager.getInstance();
const sessionService = SessionService.getInstance();
const authService = AuthService.getInstance();

// Make services globally available for debugging
if (import.meta.env.MODE === 'development') {
  (window as any).__STATE__ = stateManager;
  (window as any).__SESSION__ = sessionService;
  (window as any).__AUTH__ = authService;
  (window as any).__API_CONFIG__ = apiConfig;
  (window as any).__API_SERVICE__ = apiService; // ADDED: Expose ApiService
}

/**
 * Application configuration
 */
const config: AppConfig = {
  apiBaseUrl: apiConfig.getAuthServerConfig().baseUrl,
  environment: (import.meta.env.MODE as 'development' | 'production' | 'test') || 'development',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableLogging: import.meta.env.MODE === 'development'
};

/**
 * Global application instance
 */
let app: App | null = null;

/**
 * EMERGENCY FIX: Direct redirect to dashboard after OAuth2
 */
function forceRedirectToDashboard(): void {
  console.log('🚨 EMERGENCY: Force redirecting to dashboard');
  
  // Method 1: Try router if available
  try {
    if (app) {
      const router = app.getRouter();
      if (router) {
        router.push('/dashboard').then(() => {
          console.log('✅ Router redirect successful');
        }).catch((error) => {
          console.error('❌ Router redirect failed:', error);
          // Fallback to window.location
          window.location.href = '/dashboard';
        });
        return;
      }
    }
  } catch (error) {
    console.error('❌ Router method failed:', error);
  }
  
  // Method 2: Direct window.location
  console.log('🔄 Using window.location redirect');
  window.location.href = '/dashboard';
}

/**
 * Handle OAuth2 callbacks - EMERGENCY FIX
 */
async function handleOAuth2Callback(): Promise<void> {
  const currentUrl = window.location.href;
  
  if (authService.isOAuth2Callback(currentUrl)) {
    console.log('🔄 OAuth2 callback detected, processing...');
    
    try {
      // Show loading state
      showOAuth2LoadingState();
      
      const result = await authService.handleOAuth2Callback(currentUrl);
      
      if (result.success) {
        console.log('✅ OAuth2 callback successful');
        
        // EMERGENCY FIX: Immediate redirect without waiting
        console.log('🚨 Forcing immediate dashboard redirect');
        
        // Clear the callback URL immediately
        window.history.replaceState({}, document.title, '/dashboard');
        
        // Wait a moment for history to update, then force redirect
        setTimeout(() => {
          forceRedirectToDashboard();
        }, 100);
        
        return; // Exit early
      } else {
        console.error('❌ OAuth2 callback failed:', result.error);
        showOAuth2ErrorState(result.error || 'OAuth2 authentication failed');
        
        // Redirect to home after error
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (error) {
      console.error('❌ OAuth2 callback error:', error);
      showOAuth2ErrorState('An unexpected error occurred during authentication');
      
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    }
  }
}

/**
 * Show OAuth2 loading state
 */
function showOAuth2LoadingState(): void {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 class="text-2xl font-bold mb-2">Processing Authentication</h1>
          <p class="text-gray-600">Please wait while we complete your login...</p>
          <p class="text-sm text-gray-500 mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    `;
  }
}

/**
 * Show OAuth2 error state
 */
function showOAuth2ErrorState(error: string): void {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-center max-w-md mx-auto p-6">
          <div class="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 class="text-2xl font-bold text-gray-800 mb-2">Authentication Failed</h1>
          <p class="text-gray-600 mb-4">${error}</p>
          <p class="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    `;
  }
}

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  try {
    console.log('Starting URL Shortener application...');
    console.log('Environment:', config.environment);
    console.log('Auth Server:', apiConfig.getAuthServerConfig().baseUrl);
    console.log('Resource Server:', apiConfig.getResourceServerConfig().baseUrl);
    console.log('ApiService Base URL:', apiService.getBaseUrl());
    console.log('Google OAuth2 enabled:', authService.isGoogleOAuth2Available());

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
 * Setup auth event listeners with emergency redirect
 */
function setupAuthEventListeners(): void {
  // EMERGENCY: Force dashboard redirect on any successful login
  authService.addEventListener('login:success', (data) => {
    console.log('👤 User logged in successfully:', data.user.email);
    console.log('🚨 EMERGENCY: Forcing dashboard redirect');
    setTimeout(() => {
      forceRedirectToDashboard();
    }, 500);
  });

  authService.addEventListener('oauth2:success', (data) => {
    console.log('🔗 OAuth2 login successful:', data.user.email);
    console.log('🚨 EMERGENCY: Forcing dashboard redirect');
    setTimeout(() => {
      forceRedirectToDashboard();
    }, 500);
  });

  authService.addEventListener('verification:success', (data) => {
    console.log('✅ Verification successful');
    if (data.user) {
      console.log('🚨 EMERGENCY: Forcing dashboard redirect');
      setTimeout(() => {
        forceRedirectToDashboard();
      }, 500);
    }
  });

  authService.addEventListener('registration:success', (data) => {
    console.log('📝 User registered successfully:', data.userId);
  });

  authService.addEventListener('verification:required', (data) => {
    console.log('📧 Email verification required for:', data.email);
  });

  authService.addEventListener('session:expired', () => {
    console.log('⏰ Session expired');
  });

  authService.addEventListener('oauth2:failed', (data) => {
    console.error('❌ OAuth2 login failed:', data.error);
  });

  authService.addEventListener('login:failed', (data) => {
    console.error('❌ Login failed:', data.error);
  });

  // Listen for auth modal mode changes
  window.addEventListener('auth-mode-change', (event) => {
    console.log('🔄 Auth modal mode change:', (event as CustomEvent).detail.mode);
  });
}

/**
 * Handle page visibility changes for performance optimization
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    console.log('App hidden - pausing non-critical operations');
  } else {
    console.log('App visible - resuming operations');
    
    // Validate session when app becomes visible
    if (authService.isAuthenticated()) {
      authService.validateSession().catch(error => {
        console.warn('Session validation failed on visibility change:', error);
      });
    }
  }
}

/**
 * Handle browser unload
 */
function handleBeforeUnload(): void {
  if (app) {
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

  // Setup auth event listeners
  setupAuthEventListeners();

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

    // CRITICAL: Handle OAuth2 callback FIRST before anything else
    if (authService.isOAuth2Callback()) {
      console.log('🚨 PRIORITY: OAuth2 callback detected, handling immediately');
      await handleOAuth2Callback();
      return; // Exit early - OAuth2 handling takes over
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
    getAuthService: () => authService,
    getApiService: () => apiService, // ADDED: Expose ApiService
    restart: async () => {
      if (app) {
        await app.destroy();
      }
      await initializeApp();
    },
    // EMERGENCY: Manual redirect function
    forceDashboard: () => {
      forceRedirectToDashboard();
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