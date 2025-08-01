// src/core/dom/DOMManager.ts - FIXED VERSION

import type { DOMManager } from '../../types/app';

/**
 * DOM management utilities for the application
 */
export class DOMManagerImpl implements DOMManager {
  private appRoot: HTMLElement;
  private defaultTitle: string;

  constructor(rootSelector: string = '#app', defaultTitle: string = 'URL Shortener') {
    const root = document.querySelector(rootSelector) as HTMLElement;
    
    if (!root) {
      throw new Error(`Root element not found: ${rootSelector}`);
    }
    
    this.appRoot = root;
    this.defaultTitle = defaultTitle;
  }

  /**
   * Get the application root element
   */
  public getAppRoot(): HTMLElement {
    return this.appRoot;
  }

  /**
   * Clear all content from the app root
   */
  public clearContent(): void {
    this.appRoot.innerHTML = '';
  }

  /**
   * Set content in the app root
   */
  public setContent(html: string): void {
    this.appRoot.innerHTML = html;
  }

  /**
   * Append content to the app root
   */
  public appendContent(html: string): void {
    this.appRoot.insertAdjacentHTML('beforeend', html);
  }

  /**
   * Add element to document head
   */
  public addToHead(element: HTMLElement): void {
    document.head.appendChild(element);
  }

  /**
   * Set document title
   */
  public setTitle(title: string): void {
    document.title = title ? `${title} - ${this.defaultTitle}` : this.defaultTitle;
  }

  /**
   * Add class to document body
   */
  public addClass(className: string): void {
    document.body.classList.add(className);
  }

  /**
   * Remove class from document body
   */
  public removeClass(className: string): void {
    document.body.classList.remove(className);
  }

  /**
   * Toggle class on document body
   */
  public toggleClass(className: string): void {
    document.body.classList.toggle(className);
  }

  /**
   * Show loading state
   */
  public showLoading(): void {
    this.addClass('loading');
    this.setContent(`
      <div class="flex items-center justify-center min-h-screen">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-600">Loading...</span>
      </div>
    `);
  }

  /**
   * Hide loading state
   */
  public hideLoading(): void {
    this.removeClass('loading');
  }

  /**
   * Show error message
   */
  public showError(message: string, canRetry: boolean = true): void {
    this.setContent(`
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center max-w-md mx-auto">
          <div class="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p class="text-gray-600 mb-4">${this.escapeHtml(message)}</p>
          ${canRetry ? `
            <button 
              id="retry-btn" 
              class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Try Again
            </button>
          ` : ''}
        </div>
      </div>
    `);

    if (canRetry) {
      const retryBtn = document.getElementById('retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }
  }

  /**
   * Create and return a loading spinner element
   */
  public createLoadingSpinner(size: 'sm' | 'md' | 'lg' = 'md'): HTMLElement {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-8 w-8',
      lg: 'h-12 w-12'
    };

    const spinner = document.createElement('div');
    spinner.className = `animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`;
    return spinner;
  }

  /**
   * FIXED: Overloaded addEventListener method to handle different element types
   */
  public addEventListener<K extends keyof WindowEventMap>(
    element: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;
  
  public addEventListener<K extends keyof DocumentEventMap>(
    element: Document,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;
  
  public addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;

  public addEventListener(
    element: Window | Document | HTMLElement,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    element.addEventListener(type, listener, options);
    
    // Return cleanup function
    return () => {
      element.removeEventListener(type, listener, options);
    };
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Smooth scroll to element
   */
  public scrollToElement(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
    element.scrollIntoView({ behavior, block: 'start' });
  }

  /**
   * Get element dimensions and position
   */
  public getElementRect(element: HTMLElement): DOMRect {
    return element.getBoundingClientRect();
  }

  /**
   * Check if element is in viewport
   */
  public isInViewport(element: HTMLElement): boolean {
    const rect = this.getElementRect(element);
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Debounce function for performance optimization
   */
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function for performance optimization
   */
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}