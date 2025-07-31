// src/pages/NotFoundPage.ts

import type { PageComponent, DOMManager } from "../types/app";
import type { RouteContext } from "../types/router";

export class NotFoundPage implements PageComponent {
  private domManager: DOMManager;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  public async render(context: RouteContext): Promise<void> {
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
        const router = (window as any).__APP__?.getInstance()?.getRouter();
        if (router) router.push('/');
      });
    }
  }

  public cleanup(): void {
    // No cleanup needed for this simple page
  }
}