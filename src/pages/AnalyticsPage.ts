// src/pages/AnalyticsPage.ts - FIXED VERSION

import type { PageComponent, DOMManager } from '../types/app';
import type { RouteContext } from '../types/router';

export class AnalyticsPage implements PageComponent {
  private domManager: DOMManager;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  public async render(_context: RouteContext): Promise<void> {
    const html = `
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">Analytics</h1>
            <p class="text-gray-600 mb-8">This page will show your URL analytics</p>
            <button 
              id="back-btn"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    `;

    this.domManager.setContent(html);

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const app = (window as any).__APP__;
        if (app) {
          const router = app.getRouter();
          if (router) router.push('/dashboard');
        }
      });
    }
  }

  public cleanup(): void {}
}

// src/pages/SettingsPage.ts - FIXED VERSION

export class SettingsPage implements PageComponent {
  private domManager: DOMManager;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  public async render(_context: RouteContext): Promise<void> {
    const html = `
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
            <p class="text-gray-600 mb-8">This page will show your account settings</p>
            <button 
              id="back-btn"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    `;

    this.domManager.setContent(html);

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const app = (window as any).__APP__;
        if (app) {
          const router = app.getRouter();
          if (router) router.push('/dashboard');
        }
      });
    }
  }

  public cleanup(): void {}
}

// src/pages/NotFoundPage.ts - FIXED VERSION

export class NotFoundPage implements PageComponent {
  private domManager: DOMManager;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  public async render(_context: RouteContext): Promise<void> {
    const html = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <div class="text-6xl mb-4">🔍</div>
          <h1 class="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
          <p class="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
          <button 
            id="home-btn"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    `;

    this.domManager.setContent(html);

    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        const app = (window as any).__APP__;
        if (app) {
          const router = app.getRouter();
          if (router) router.push('/');
        }
      });
    }
  }

  public cleanup(): void {}
}