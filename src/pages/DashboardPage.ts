// src/pages/DashboardPage.ts

import type { PageComponent } from '../types/app';
import type { RouteContext } from '../types/router';
import type { DOMManager } from '../types/app';

export class DashboardPage implements PageComponent {
  private domManager: DOMManager;
  private eventListeners: Array<() => void> = [];

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  public async beforeEnter(context: RouteContext): Promise<boolean> {
    // Check authentication
    const sessionData = sessionStorage.getItem('session');
    if (!sessionData) {
      // Redirect to home if not authenticated
      const router = (window as any).__APP__?.getInstance()?.getRouter();
      if (router) {
        router.replace('/');
        return false;
      }
    }
    return true;
  }

  public async render(context: RouteContext): Promise<void> {
    const html = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-6">
              <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
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
            <div class="text-center">
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

  private handleLogout(): void {
    sessionStorage.removeItem('session');
    const router = (window as any).__APP__?.getInstance()?.getRouter();
    if (router) {
      router.replace('/');
    }
  }

  public cleanup(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }
}