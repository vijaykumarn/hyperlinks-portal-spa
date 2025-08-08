// src/pages/DashboardPage.ts - FIXED APISERVICE DEPENDENCY

import type { PageComponent, DOMManager } from '../types/app';
import type { RouteContext } from '../types/router';
import { SessionService } from '../services/SessionService';
import { ApiService } from '../services/ApiService';

export class DashboardPage implements PageComponent {
  private domManager: DOMManager;
  private eventListeners: Array<() => void> = [];
  private sessionService: SessionService;
  private apiService: ApiService | null = null;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
    this.sessionService = SessionService.getInstance();
    
    // FIXED: Safely get ApiService instance with error handling
    try {
      this.apiService = ApiService.getInstance();
      console.log('✅ DashboardPage: ApiService obtained successfully');
    } catch (error) {
      console.warn('⚠️ DashboardPage: ApiService not available, will work without it:', error);
      this.apiService = null;
    }
  }

  public async beforeEnter(_context: RouteContext): Promise<boolean> {
    if (!this.sessionService.isAuthenticated()) {
      console.log('🚫 DashboardPage: User not authenticated, redirecting to /');
      const router = (window as any).__APP__?.getInstance()?.getRouter();
      if (router) {
        router.replace('/');
        return false;
      }
    }
    return true;
  }

  public async render(_context: RouteContext): Promise<void> {
    const user = this.sessionService.getCurrentUser();
    const userName = user?.name || user?.email?.split('@')[0] || 'User';

    const html = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-6">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p class="text-gray-600 mt-1">Welcome back, ${userName}!</p>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-500">
                  ${user?.email || 'Unknown user'}
                </span>
                <button 
                  id="logout-btn" 
                  class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="px-4 py-6 sm:px-0">
            <!-- Welcome Section -->
            <div class="bg-white overflow-hidden shadow rounded-lg mb-6">
              <div class="px-4 py-5 sm:p-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">🎉 Welcome to your Dashboard!</h2>
                <p class="text-gray-600 mb-6">
                  You're successfully logged in! From here you can manage your URLs, view analytics, and configure your account.
                </p>
                
                <!-- Status Info -->
                <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-green-800">
                        Authentication Successful
                      </h3>
                      <div class="mt-2 text-sm text-green-700">
                        <p>
                          ✅ You are logged in as <strong>${user?.email}</strong><br>
                          ✅ Session is active and secure<br>
                          ✅ ${this.apiService ? 'API services are available' : 'Operating in demo mode'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Feature Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-6">
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div class="ml-4">
                      <h3 class="text-lg font-medium text-gray-900">Manage URLs</h3>
                    </div>
                  </div>
                  <div class="mt-4">
                    <p class="text-gray-600 text-sm mb-4">
                      Create, edit, and organize your shortened URLs with custom aliases and expiration dates.
                    </p>
                    <button 
                      id="urls-btn"
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
                    >
                      Manage URLs
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-6">
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div class="ml-4">
                      <h3 class="text-lg font-medium text-gray-900">Analytics</h3>
                    </div>
                  </div>
                  <div class="mt-4">
                    <p class="text-gray-600 text-sm mb-4">
                      View detailed statistics, click tracking, geographic data, and performance insights.
                    </p>
                    <button 
                      id="analytics-btn"
                      class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
                    >
                      View Analytics
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-6">
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <svg class="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div class="ml-4">
                      <h3 class="text-lg font-medium text-gray-900">Settings</h3>
                    </div>
                  </div>
                  <div class="mt-4">
                    <p class="text-gray-600 text-sm mb-4">
                      Configure your account preferences, API keys, domain settings, and security options.
                    </p>
                    <button 
                      id="settings-btn"
                      class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
                    >
                      Open Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="mt-8 bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button class="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Short URL
                  </button>
                  <button class="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Reports
                  </button>
                  <button class="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share Link
                  </button>
                  <button class="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Data
                  </button>
                </div>
              </div>
            </div>

            <!-- Development Info -->
            ${import.meta.env.MODE === 'development' ? `
              <div class="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-yellow-800 mb-2">🚀 Development Mode</h4>
                <div class="text-xs text-yellow-700 space-y-1">
                  <p>• User ID: ${user?.id || 'N/A'}</p>
                  <p>• Email: ${user?.email || 'N/A'}</p>
                  <p>• Role: ${user?.role || 'N/A'}</p>
                  <p>• API Service: ${this.apiService ? '✅ Available' : '❌ Not Available'}</p>
                  <p>• Session Service: ✅ Active</p>
                </div>
              </div>
            ` : ''}
          </div>
        </main>
      </div>
    `;

    this.domManager.setContent(html);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      const listener = this.domManager.addEventListener(logoutBtn, 'click', () => {
        this.handleLogout();
      });
      this.eventListeners.push(listener);
    }

    // Navigation buttons
    const urlsBtn = document.getElementById('urls-btn');
    if (urlsBtn) {
      const listener = this.domManager.addEventListener(urlsBtn, 'click', () => {
        const router = (window as any).__APP__?.getInstance()?.getRouter();
        if (router) router.push('/dashboard/urls');
      });
      this.eventListeners.push(listener);
    }

    const analyticsBtn = document.getElementById('analytics-btn');
    if (analyticsBtn) {
      const listener = this.domManager.addEventListener(analyticsBtn, 'click', () => {
        const router = (window as any).__APP__?.getInstance()?.getRouter();
        if (router) router.push('/dashboard/analytics');
      });
      this.eventListeners.push(listener);
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      const listener = this.domManager.addEventListener(settingsBtn, 'click', () => {
        const router = (window as any).__APP__?.getInstance()?.getRouter();
        if (router) router.push('/dashboard/settings');
      });
      this.eventListeners.push(listener);
    }
  }

  private async handleLogout(): Promise<void> {
    try {
      console.log('🚪 DashboardPage: Logging out user...');
      
      // Try to call logout API if available
      if (this.apiService) {
        try {
          await this.apiService.logout();
          console.log('✅ API logout successful');
        } catch (error) {
          console.warn('⚠️ API logout failed, but continuing with local logout:', error);
        }
      }
    } catch (error) {
      console.error('❌ Logout API error:', error);
    } finally {
      // Always clear local session, even if API call fails
      this.sessionService.clearSession();
      
      console.log('✅ Local session cleared');
      
      // Redirect to home page
      const router = (window as any).__APP__?.getInstance()?.getRouter();
      if (router) {
        router.replace('/');
      } else {
        window.location.href = '/';
      }
    }
  }

  public cleanup(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }
}