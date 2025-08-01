// src/pages/DashboardPage.ts - FIXED VERSION

import type { PageComponent, DOMManager } from '../types/app';
import type { RouteContext } from '../types/router';
import { SessionService } from '../services/SessionService';
import { ApiService } from '../services/ApiService';

export class DashboardPage implements PageComponent {
  private domManager: DOMManager;
  private eventListeners: Array<() => void> = [];
  private sessionService: SessionService;
  private apiService: ApiService;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
    this.sessionService = SessionService.getInstance();
    this.apiService = ApiService.getInstance();
  }

  public async beforeEnter(_context: RouteContext): Promise<boolean> {
    if (!this.sessionService.isAuthenticated()) {
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
    const userName = user?.name || 'User';

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
              <button 
                id="logout-btn" 
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="px-4 py-6 sm:px-0">
            <div class="text-center mb-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-4">Welcome to your Dashboard!</h2>
              <p class="text-gray-600 mb-8">Manage your URLs, view analytics, and more.</p>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white overflow-hidden shadow rounded-lg">
                  <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900">Manage URLs</h3>
                    <p class="text-gray-600 mt-2">Create, edit, and organize your shortened URLs.</p>
                    <button 
                      id="urls-btn"
                      class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Go to URLs
                    </button>
                  </div>
                </div>
                
                <div class="bg-white overflow-hidden shadow rounded-lg">
                  <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900">Analytics</h3>
                    <p class="text-gray-600 mt-2">View detailed statistics and insights.</p>
                    <button 
                      id="analytics-btn"
                      class="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      View Analytics
                    </button>
                  </div>
                </div>
                
                <div class="bg-white overflow-hidden shadow rounded-lg">
                  <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900">Settings</h3>
                    <p class="text-gray-600 mt-2">Configure your account and preferences.</p>
                    <button 
                      id="settings-btn"
                      class="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Open Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
      await this.apiService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear session, even if API call fails
      this.sessionService.clearSession();
      
      const router = (window as any).__APP__?.getInstance()?.getRouter();
      if (router) {
        router.replace('/');
      }
    }
  }

  public cleanup(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }
}