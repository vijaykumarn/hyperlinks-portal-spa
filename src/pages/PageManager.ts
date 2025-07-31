// src/pages/PageManager.ts

import type { PageComponent } from '../types/app';
import type { RouteContext } from '../types/router';
import type { DOMManager } from '../types/app';

export class PageManager {
  private domManager: DOMManager;
  private pages: Map<string, () => Promise<PageComponent>> = new Map();
  private pageInstances: Map<string, PageComponent> = new Map();
  private currentPage: PageComponent | null = null;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  /**
   * Register a page component
   */
  public registerPage(name: string, factory: () => Promise<PageComponent>): void {
    this.pages.set(name, factory);
    console.log(`📄 Registered page: ${name}`);
  }

  /**
   * Render a page
   */
  public async renderPage(pageName: string, context: RouteContext): Promise<void> {
    try {
      console.log(`🎨 Rendering page: ${pageName}`, context);

      // Cleanup current page
      if (this.currentPage && this.currentPage.cleanup) {
        this.currentPage.cleanup();
      }

      // Get page factory
      const pageFactory = this.pages.get(pageName);
      if (!pageFactory) {
        throw new Error(`Page not found: ${pageName}`);
      }

      // Create or get page instance
      let pageInstance = this.pageInstances.get(pageName);
      if (!pageInstance) {
        pageInstance = await pageFactory();
        this.pageInstances.set(pageName, pageInstance);
      }

      // Check if page can be entered
      if (pageInstance.beforeEnter) {
        const canEnter = await pageInstance.beforeEnter(context);
        if (!canEnter) {
          console.log(`🚫 Page ${pageName} prevented entry`);
          return;
        }
      }

      // Show loading state
      this.domManager.showLoading();

      // Set page title if available
      if (context.path === '/') {
        this.domManager.setTitle('Home');
      } else if (context.path === '/dashboard') {
        this.domManager.setTitle('Dashboard');
      } else if (context.path === '/dashboard/urls') {
        this.domManager.setTitle('URLs - Dashboard');
      } else if (context.path === '/dashboard/analytics') {
        this.domManager.setTitle('Analytics - Dashboard');
      } else if (context.path === '/dashboard/settings') {
        this.domManager.setTitle('Settings - Dashboard');
      }

      // Render the page
      await pageInstance.render(context);

      // Hide loading state
      this.domManager.hideLoading();

      // Set current page
      this.currentPage = pageInstance;

      // Call afterEnter hook
      if (pageInstance.afterEnter) {
        await pageInstance.afterEnter(context);
      }

      console.log(`✅ Page ${pageName} rendered successfully`);

    } catch (error) {
      console.error(`❌ Error rendering page ${pageName}:`, error);
      this.domManager.hideLoading();
      this.domManager.showError(`Failed to load page: ${pageName}`);
      throw error;
    }
  }

  /**
   * Preload pages for better performance
   */
  public async preloadPages(pageNames: string[]): Promise<void> {
    for (const pageName of pageNames) {
      try {
        const pageFactory = this.pages.get(pageName);
        if (pageFactory && !this.pageInstances.has(pageName)) {
          const pageInstance = await pageFactory();
          this.pageInstances.set(pageName, pageInstance);
          console.log(`📦 Preloaded page: ${pageName}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to preload page ${pageName}:`, error);
      }
    }
  }

  /**
   * Get current page instance
   */
  public getCurrentPage(): PageComponent | null {
    return this.currentPage;
  }

  /**
   * Clear page instances cache
   */
  public clearCache(): void {
    // Cleanup all page instances
    for (const [name, instance] of this.pageInstances) {
      if (instance.cleanup) {
        instance.cleanup();
      }
    }
    this.pageInstances.clear();
    this.currentPage = null;
  }

  /**
   * Destroy the page manager
   */
  public async destroy(): Promise<void> {
    console.log('🧹 Destroying page manager...');
    
    // Cleanup current page
    if (this.currentPage && this.currentPage.cleanup) {
      this.currentPage.cleanup();
    }

    // Clear all page instances
    this.clearCache();

    // Clear registered pages
    this.pages.clear();

    console.log('✅ Page manager destroyed');
  }
}