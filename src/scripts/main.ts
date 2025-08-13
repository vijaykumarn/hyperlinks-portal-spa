// src/scripts/main.ts - FIXED OAUTH2 CALLBACK HANDLING

import { App } from '../core/App';
import type { AppConfig } from '../types/app';
import { StateManager } from '../core/state/StateManager';
import { SessionService } from '../services/SessionService';
import { AuthService } from '../services/auth/AuthService';
import { ApiConfig } from '../services/core/ApiConfig';
import { ApiService } from '../services/ApiService';
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
  (window as any).__API_SERVICE__ = apiService;
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
 * Handle OAuth2 callbacks - ENHANCED AND FIXED
 */
async function handleOAuth2Callback(): Promise<boolean> {
  const currentUrl = window.location.href;
  
  // ENHANCED: Check if this is an OAuth2 callback with detailed logging
  const isOAuth2 = authService.isOAuth2Callback(currentUrl);
  
  console.log('🔍 OAuth2 callback check:', {
    currentUrl,
    isOAuth2,
    hasStoredState: !!sessionStorage.getItem('oauth2_state'),
    urlParams: Object.fromEntries(new URL(currentUrl).searchParams.entries()),
    pathname: new URL(currentUrl).pathname
  });
  
  if (!isOAuth2) {
    return false; // Not an OAuth2 callback
  }

  console.log('🔄 OAuth2 callback detected, processing...', currentUrl);
  
  // Check for OAuth2 error in URL first
  const urlObj = new URL(currentUrl);
  if (urlObj.searchParams.has('oauth2_error') || urlObj.searchParams.has('error')) {
    console.error('❌ OAuth2 error detected in URL parameters');
    
    // Show error and clean up URL
    showOAuth2ErrorState('OAuth2 authentication was cancelled or failed');
    
    // Clean up URL and redirect to home
    setTimeout(() => {
      window.history.replaceState({}, document.title, '/');
      window.location.reload();
    }, 3000);
    
    return false;
  }
  
  try {
    // Show loading state
    showOAuth2LoadingState();
    
    // ENHANCED: Add more time for backend processing
    console.log('⏳ Waiting for backend OAuth2 processing...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await authService.handleOAuth2Callback(currentUrl);
    
    if (result.success) {
      console.log('✅ OAuth2 callback successful', result.user ? `for user: ${result.user.email}` : '');
      
      // Clean up URL parameters while preserving the path
      const cleanUrl = new URL(window.location.href);
      
      // Remove OAuth2 parameters
      cleanUrl.searchParams.delete('code');
      cleanUrl.searchParams.delete('state');
      cleanUrl.searchParams.delete('scope');
      cleanUrl.searchParams.delete('authuser');
      cleanUrl.searchParams.delete('prompt');
      
      // Keep welcome parameter if present
      const hasWelcome = cleanUrl.searchParams.has('welcome');
      
      // FIXED: Ensure we redirect to dashboard after successful OAuth2
      let finalPath = '/dashboard';
      if (hasWelcome) {
        finalPath = '/dashboard?welcome=true';
      }
      
      // Update URL without OAuth2 parameters
      window.history.replaceState({}, document.title, finalPath);
      
      // Set a flag to indicate successful OAuth2 processing
      sessionStorage.setItem('oauth2_processed', 'true');
      sessionStorage.setItem('oauth2_processed_time', Date.now().toString());
      
      console.log('🎯 OAuth2 processing complete, URL cleaned:', finalPath);
      return true; // OAuth2 processed successfully
      
    } else {
      console.error('❌ OAuth2 callback failed:', result.error);
      showOAuth2ErrorState(result.error || 'OAuth2 authentication failed');
      
      // Redirect to home after error
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
        window.location.reload();
      }, 3000);
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ OAuth2 callback error:', error);
    showOAuth2ErrorState('An unexpected error occurred during authentication');
    
    // Redirect to home after error
    setTimeout(() => {
      window.history.replaceState({}, document.title, '/');
      window.location.reload();
    }, 3000);
    
    return false;
  }
}

/**
 * Check and handle OAuth2 success state - ENHANCED
 */
async function handleOAuth2SuccessState(): Promise<void> {
  const oauth2Processed = sessionStorage.getItem('oauth2_processed');
  
  if (oauth2Processed === 'true') {
    console.log('🎉 OAuth2 was successfully processed');
    
    // Clear the flag
    sessionStorage.removeItem('oauth2_processed');
    sessionStorage.removeItem('oauth2_processed_time');
    
    // FIXED: Don't validate session again - OAuth2 callback already did this
    // The session was already established by OAuth2Service.validatePostCallbackSession()
    
    // Check if user is authenticated (should be true after OAuth2)
    if (sessionService.isAuthenticated()) {
      const user = sessionService.getCurrentUser();
      console.log('✅ OAuth2 session already established for user:', user?.email);
      
      // Show success state briefly if we're still on a non-dashboard page
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/dashboard')) {
        showOAuth2SuccessState(user);
        
        // Redirect to dashboard after showing success
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/dashboard');
          // Trigger router navigation
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, 1500);
      }
    } else {
      console.warn('⚠️ OAuth2 was processed but no session found - this should not happen');
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
          <p class="text-sm text-gray-500 mt-4">Establishing secure session...</p>
        </div>
      </div>
    `;
  }
}

/**
 * Show OAuth2 success state
 */
function showOAuth2SuccessState(user: any): void {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-center">
          <div class="text-green-500 text-6xl mb-4">✅</div>
          <h1 class="text-2xl font-bold mb-2">Welcome ${user.name || user.email}!</h1>
          <p class="text-gray-600">Authentication successful</p>
          <p class="text-sm text-gray-500 mt-4">Loading your dashboard...</p>
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
 * Setup auth event listeners - ENHANCED VERSION
 */
function setupAuthEventListeners(): void {
  authService.addEventListener('login:success', (data) => {
    console.log('👤 User logged in successfully:', data.user.email);
  });

  authService.addEventListener('oauth2:success', (data) => {
    console.log('🔗 OAuth2 login successful:', data.user.email);
  });

  authService.addEventListener('verification:success', (_data) => {
    console.log('✅ Verification successful');
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
 * Main application bootstrap function - ENHANCED FOR OAUTH2
 */
async function bootstrap(): Promise<void> {
  try {
    // Wait for DOM to be ready
    await waitForDOM();

    // Validate required DOM elements
    if (!validateDOM()) {
      throw new Error('Required DOM elements not found');
    }

    // CRITICAL: Handle OAuth2 callback FIRST if present
    const isOAuth2Callback = await handleOAuth2Callback();
    
    if (isOAuth2Callback) {
      console.log('🔄 OAuth2 callback processed, continuing with app initialization...');
      // Small delay to ensure session is established
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Check for successful OAuth2 state
    await handleOAuth2SuccessState();

    // Show initial loading state (unless we're showing OAuth2 states)
    if (!isOAuth2Callback && !sessionStorage.getItem('oauth2_processed')) {
      showInitialLoading();
    }

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
    getApiService: () => apiService,
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