// src/scripts/main.ts - PHASE 3: COMPLETE UNIFIED API ARCHITECTURE

import { App } from '../core/App';
import type { AppConfig } from '../types/app';
import { StateManager } from '../core/state/StateManager';
import { SessionService } from '../services/SessionService';
import { AuthService } from '../services/auth/AuthService';
import { ApiConfig } from '../services/core/ApiConfig';
import { UnifiedApiClient } from '../services/core/UnifiedApiClient';
import { ApiService } from '../services/ApiService';
import { ApiErrorHandler } from '../services/core/ApiErrorHandler';
import '../styles/main.css';

// PHASE 3: Initialize API configuration and unified client first
console.log('🔧 Initializing Phase 3 API architecture...');

const apiConfig = ApiConfig.getInstance();

// Validate configuration
const configValidation = apiConfig.validateConfig();
if (!configValidation.isValid) {
  console.error('❌ Invalid API configuration:', configValidation.errors);
  throw new Error('Invalid application configuration: ' + configValidation.errors.join(', '));
}

// PHASE 3: Initialize Unified API Client
console.log('🔧 Initializing UnifiedApiClient...');
const unifiedApiClient = UnifiedApiClient.getInstance();
console.log('✅ UnifiedApiClient initialized');

// PHASE 3: Initialize Enhanced Error Handler
console.log('🔧 Initializing Enhanced API Error Handler...');
const apiErrorHandler = ApiErrorHandler.getInstance();
console.log('✅ Enhanced API Error Handler initialized');

// PHASE 3: Initialize ApiService with new architecture
console.log('🔧 Initializing ApiService with unified architecture...');
const apiService = ApiService.initialize();
console.log('✅ ApiService initialized with unified client');

// Initialize other services
const stateManager = StateManager.getInstance();
const sessionService = SessionService.getInstance();
const authService = AuthService.getInstance();

// PHASE 3: Make new API services globally available for debugging
if (import.meta.env.MODE === 'development') {
  (window as any).__STATE__ = stateManager;
  (window as any).__SESSION__ = sessionService;
  (window as any).__AUTH__ = authService;
  (window as any).__API_CONFIG__ = apiConfig;
  (window as any).__UNIFIED_CLIENT__ = unifiedApiClient;
  (window as any).__API_SERVICE__ = apiService;
  (window as any).__API_ERROR_HANDLER__ = apiErrorHandler;
  
  // PHASE 3: Add enhanced debugging tools
  (window as any).__API_STATS__ = () => ({
    config: apiConfig.getConfig(),
    unifiedClient: unifiedApiClient.getStats(),
    apiService: apiService.getServiceStats(),
    errorHandler: apiErrorHandler.getErrorStats()
  });
  
  (window as any).__API_HEALTH__ = async () => {
    const health = await unifiedApiClient.healthCheck();
    console.log('🏥 API Health Check:', health);
    return health;
  };

  // PHASE 3: Add circuit breaker control
  (window as any).__RESET_CIRCUIT_BREAKERS__ = () => {
    unifiedApiClient.resetCircuitBreakers();
    console.log('🔄 Circuit breakers reset');
  };

  // PHASE 3: Add offline queue management
  (window as any).__OFFLINE_QUEUE__ = {
    size: () => unifiedApiClient.getStats().offlineQueueSize,
    clear: () => unifiedApiClient.clearOfflineQueue(),
    stats: () => unifiedApiClient.getStats()
  };
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
 * Handle OAuth2 callbacks - ENHANCED WITH UNIFIED CLIENT
 */
async function handleOAuth2Callback(): Promise<boolean> {
  const currentUrl = window.location.href;
  
  // Enhanced OAuth2 callback detection
  const isOAuth2 = authService.isOAuth2Callback(currentUrl);
  
  console.log('🔍 OAuth2 callback check:', {
    currentUrl,
    isOAuth2,
    hasStoredState: !!sessionStorage.getItem('oauth2_state'),
    urlParams: Object.fromEntries(new URL(currentUrl).searchParams.entries()),
    pathname: new URL(currentUrl).pathname
  });
  
  if (!isOAuth2) {
    return false;
  }

  console.log('🔄 OAuth2 callback detected, processing...', currentUrl);
  
  // Check for OAuth2 error in URL first
  const urlObj = new URL(currentUrl);
  if (urlObj.searchParams.has('oauth2_error') || urlObj.searchParams.has('error')) {
    console.error('❌ OAuth2 error detected in URL parameters');
    
    showOAuth2ErrorState('OAuth2 authentication was cancelled or failed');
    
    setTimeout(() => {
      window.history.replaceState({}, document.title, '/');
      window.location.reload();
    }, 3000);
    
    return false;
  }
  
  try {
    showOAuth2LoadingState();
    
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
      
      const hasWelcome = cleanUrl.searchParams.has('welcome');
      
      let finalPath = '/dashboard';
      if (hasWelcome) {
        finalPath = '/dashboard?welcome=true';
      }
      
      window.history.replaceState({}, document.title, finalPath);
      
      sessionStorage.setItem('oauth2_processed', 'true');
      sessionStorage.setItem('oauth2_processed_time', Date.now().toString());
      
      console.log('🎯 OAuth2 processing complete, URL cleaned:', finalPath);
      return true;
      
    } else {
      console.error('❌ OAuth2 callback failed:', result.error);
      showOAuth2ErrorState(result.error || 'OAuth2 authentication failed');
      
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
        window.location.reload();
      }, 3000);
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ OAuth2 callback error:', error);
    
    // PHASE 3: Use enhanced error handler
    const processedError = apiErrorHandler.processError(error, {
      operation: 'oauth2_callback',
      server: 'auth',
      endpoint: 'oauth2/callback',
      method: 'GET',
      timestamp: Date.now()
    });
    
    console.error('📊 Processed OAuth2 error:', apiErrorHandler.formatForLogging(processedError));
    
    showOAuth2ErrorState('An unexpected error occurred during authentication');
    
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
    
    sessionStorage.removeItem('oauth2_processed');
    sessionStorage.removeItem('oauth2_processed_time');
    
    if (sessionService.isAuthenticated()) {
      const user = sessionService.getCurrentUser();
      console.log('✅ OAuth2 session already established for user:', user?.email);
      
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/dashboard')) {
        showOAuth2SuccessState(user);
        
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/dashboard');
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
 * Initialize the application - ENHANCED WITH PHASE 3
 */
async function initializeApp(): Promise<void> {
  try {
    console.log('🚀 Starting URL Shortener application...');
    console.log('🌍 Environment:', config.environment);
    console.log('🔐 Auth Server:', apiConfig.getAuthServerConfig().baseUrl);
    console.log('📊 Resource Server:', apiConfig.getResourceServerConfig().baseUrl);
    console.log('🔗 Google OAuth2 enabled:', authService.isGoogleOAuth2Available());

    // PHASE 3: Perform API health check
    console.log('🏥 Performing API health check...');
    try {
      const healthCheck = await unifiedApiClient.healthCheck();
      console.log('🏥 API Health Check Results:', healthCheck);
      
      if (!healthCheck.overall) {
        console.warn('⚠️ Some API services are not healthy:', {
          auth: healthCheck.auth.healthy,
          resource: healthCheck.resource.healthy
        });
        
        // PHASE 3: Show health warnings to user in development
        if (config.environment === 'development') {
          showHealthWarning(healthCheck);
        }
      }
    } catch (healthError) {
      console.warn('⚠️ API health check failed:', healthError);
      // Continue with app initialization even if health check fails
    }

    // Create app instance
    app = new App(config);

    // Initialize the app
    await app.init();

    console.log('✅ Application started successfully!');
    
    // PHASE 3: Log API statistics in development
    if (config.environment === 'development') {
      console.log('📊 API Statistics:', {
        config: apiConfig.getConfig(),
        unifiedClient: unifiedApiClient.getStats(),
        errorHandler: apiErrorHandler.getErrorStats()
      });
    }

  } catch (error) {
    console.error('💥 Failed to start application:', error);

    // PHASE 3: Use enhanced error handler for app initialization errors
    if (error instanceof Error) {
      const processedError = apiErrorHandler.processError(error, {
        operation: 'app_initialization',
        server: 'auth', // Default to auth server for app init
        endpoint: 'initialization',
        method: 'INIT',
        timestamp: Date.now()
      });
      
      console.error('📊 Processed app initialization error:', apiErrorHandler.formatForLogging(processedError));
    }

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
 * Show health warning for development - PHASE 3 NEW
 */
function showHealthWarning(healthCheck: any): void {
  const warnings = [];
  if (!healthCheck.auth.healthy) {
    warnings.push(`Auth Server (${apiConfig.getAuthServerConfig().baseUrl})`);
  }
  if (!healthCheck.resource.healthy) {
    warnings.push(`Resource Server (${apiConfig.getResourceServerConfig().baseUrl})`);
  }

  if (warnings.length > 0) {
    console.warn(`⚠️ Health Warning: ${warnings.join(', ')} not responding`);
    
    // Show non-blocking notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50 max-w-sm';
    notification.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <span class="text-yellow-500">⚠️</span>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">API Health Warning</p>
          <p class="text-xs mt-1">${warnings.join(', ')} not responding</p>
        </div>
        <button onclick="this.parentNode.parentNode.remove()" class="ml-auto text-yellow-500 hover:text-yellow-700">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }
}

/**
 * Setup enhanced auth event listeners - PHASE 3 COMPLETE
 */
function setupAuthEventListeners(): void {
  authService.addEventListener('login:success', (data) => {
    if (data && data.user) {
      console.log('👤 User logged in successfully:', data.user.email);
    }
  });

  authService.addEventListener('oauth2:success', (data) => {
    if (data && data.user) {
      console.log('🔗 OAuth2 login successful:', data.user.email);
    }
  });

  authService.addEventListener('verification:success', (_data) => {
    console.log('✅ Verification successful');
  });

  authService.addEventListener('registration:success', (data) => {
    if (data && data.userId) {
      console.log('📝 User registered successfully:', data.userId);
    }
  });

  authService.addEventListener('verification:required', (data) => {
    if (data && data.email) {
      console.log('📧 Email verification required for:', data.email);
    }
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
  window.addEventListener('auth-mode-change', (event: any) => {
    console.log('🔄 Auth modal mode changed to:', event.detail?.mode);
  });

  // PHASE 3: Listen for API errors
  window.addEventListener('api-error', (event: any) => {
    const error = event.detail;
    console.error('🔴 API Error Event:', error);
    
    // Handle specific error types
    if (error.type === 'circuit_breaker_open') {
      console.warn('⚡ Circuit breaker opened for:', error.server);
    } else if (error.type === 'offline_detected') {
      console.warn('📴 Offline mode detected, queuing requests');
    } else if (error.type === 'rate_limit') {
      console.warn('🚦 Rate limit exceeded for:', error.endpoint);
    }
  });

  // PHASE 3: Listen for network status changes
  window.addEventListener('online', () => {
    console.log('🌐 Network: Back online');
    showNetworkStatusNotification('Back online! Processing queued requests...', 'success');
  });

  window.addEventListener('offline', () => {
    console.log('📡 Network: Gone offline');
    showNetworkStatusNotification('You are offline. Requests will be queued.', 'warning');
  });
}

/**
 * Show network status notification - PHASE 3 NEW
 */
function showNetworkStatusNotification(message: string, type: 'success' | 'warning' | 'error'): void {
  const colors = {
    success: 'bg-green-100 border-green-500 text-green-700',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    error: 'bg-red-100 border-red-500 text-red-700'
  };

  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 ${colors[type]} border-l-4 p-4 rounded shadow-lg z-50 max-w-sm`;
  notification.innerHTML = `
    <div class="flex items-center">
      <span class="mr-2">${icons[type]}</span>
      <p class="text-sm">${message}</p>
      <button onclick="this.parentNode.parentNode.remove()" class="ml-auto hover:opacity-70">×</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

/**
 * Setup performance monitoring - PHASE 3 NEW
 */
function setupPerformanceMonitoring(): void {
  if (config.environment === 'development') {
    // Monitor API response times
    let apiCallCount = 0;
    const apiTimes: number[] = [];

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        apiCallCount++;
        apiTimes.push(duration);
        
        // Log slow API calls
        if (duration > 2000) {
          console.warn(`🐌 Slow API call (${duration.toFixed(2)}ms):`, args[0]);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        console.error(`❌ API call failed (${(endTime - startTime).toFixed(2)}ms):`, args[0], error);
        throw error;
      }
    };

    // Log API statistics every 60 seconds
    setInterval(() => {
      if (apiCallCount > 0) {
        const avgTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
        const maxTime = Math.max(...apiTimes);
        console.log(`📊 API Performance: ${apiCallCount} calls, avg: ${avgTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms`);
        
        // Reset counters
        apiCallCount = 0;
        apiTimes.length = 0;
      }
    }, 60000);
  }
}

/**
 * Handle page visibility changes - PHASE 3 NEW
 */
function setupVisibilityHandlers(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('👁️ Page became visible');
      
      // Check if we need to refresh session or sync data
      if (sessionService.isAuthenticated()) {
        const sessionInfo = sessionService.getSessionInfo();
        const now = Date.now();
        
        // If page was hidden for more than 5 minutes, validate session
        if (sessionInfo.lastValidated && (now - sessionInfo.lastValidated) > 300000) {
          console.log('🔄 Validating session after long absence...');
          authService.validateSession().catch(error => {
            console.warn('⚠️ Session validation failed:', error);
          });
        }
      }
    } else {
      console.log('👁️ Page became hidden');
      
      // Update last activity timestamp
      if (sessionService.isAuthenticated()) {
        // Session activity is tracked automatically by session validation
        console.log('📝 Session activity noted');
      }
    }
  });
}

/**
 * Setup error boundary for unhandled errors - PHASE 3 NEW
 */
function setupGlobalErrorHandling(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    
    // Process through API error handler if it looks like an API error
    if (event.reason && typeof event.reason === 'object') {
      const processedError = apiErrorHandler.processError(event.reason, {
        operation: 'unhandled_promise_rejection',
        server: 'unknown',
        endpoint: 'unknown',
        method: 'UNKNOWN',
        timestamp: Date.now()
      });
      
      console.error('📊 Processed unhandled error:', apiErrorHandler.formatForLogging(processedError));
    }
    
    // Prevent the default browser behavior
    event.preventDefault();
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('🚨 Global JavaScript Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });
}

/**
 * Main application bootstrap function - PHASE 3 COMPLETE
 */
async function bootstrap(): Promise<void> {
  try {
    console.log('🔄 Bootstrapping Phase 3 application...');
    
    // Setup global error handling first
    setupGlobalErrorHandling();
    
    // Setup event listeners
    setupAuthEventListeners();
    setupVisibilityHandlers();
    setupPerformanceMonitoring();
    
    // Check for OAuth2 callback first
    const isOAuth2Callback = await handleOAuth2Callback();
    if (isOAuth2Callback) {
      console.log('🔗 OAuth2 callback handled, app will reload');
      return;
    }
    
    // Check for OAuth2 success state
    await handleOAuth2SuccessState();
    
    // Initialize the application
    await initializeApp();
    
    console.log('🎉 Phase 3 application bootstrap complete!');
    
  } catch (error) {
    console.error('💥 Bootstrap failed:', error);
    
    // Last resort error display
    const appRoot = document.getElementById('app');
    if (appRoot) {
      appRoot.innerHTML = `
        <div class="flex items-center justify-center min-h-screen bg-gray-50">
          <div class="text-center max-w-md mx-auto p-6">
            <div class="text-red-500 text-6xl mb-4">💥</div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Bootstrap Failed</h1>
            <p class="text-gray-600 mb-4">The application failed to start properly.</p>
            <details class="text-left text-sm text-gray-500 mb-4">
              <summary class="cursor-pointer hover:text-gray-700">Technical Details</summary>
              <pre class="mt-2 p-2 bg-gray-100 rounded overflow-auto">${error instanceof Error ? error.stack : String(error)}</pre>
            </details>
            <button 
              onclick="window.location.reload()" 
              class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Wait for DOM to be ready then bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// PHASE 3: Export for debugging and testing
export {
  app,
  config,
  apiConfig,
  unifiedApiClient,
  apiService,
  apiErrorHandler,
  stateManager,
  sessionService,
  authService
};