// src/components/base/Component.ts - ENHANCED VERSION (BACKWARD COMPATIBLE)

import { CleanupManager } from '../../core/cleanup/CleanupManager';

export interface ComponentProps {
  [key: string]: any;
}

export interface ComponentState {
  [key: string]: any;
}

export interface ComponentOptions {
  el?: HTMLElement | string;
  props?: ComponentProps;
  state?: ComponentState;
}

/**
 * Enhanced Component base class - FULLY BACKWARD COMPATIBLE
 * Existing components will continue to work without changes
 */
export abstract class Component<P extends ComponentProps = ComponentProps, S extends ComponentState = ComponentState> {
  protected props: P;
  protected state: S;
  protected el: HTMLElement | null = null;
  protected container: HTMLElement | null = null;
  protected isMountedFlag = false;
  protected eventListeners: Array<() => void> = [];
  protected childComponents: Component[] = [];
  
  // NEW: Optional cleanup manager (doesn't break existing code)
  protected cleanupManager: CleanupManager | null = null;

  constructor(options: ComponentOptions = {}) {
    this.props = (options.props || {}) as P;
    this.state = (options.state || {}) as S;

    if (options.el) {
      if (typeof options.el === 'string') {
        this.el = document.querySelector(options.el);
      } else {
        this.el = options.el;
      }
    }

    // NEW: Initialize cleanup manager (optional feature)
    this.initializeCleanupManager();
  }

  /**
   * NEW: Initialize cleanup manager (optional)
   */
  private initializeCleanupManager(): void {
    try {
      this.cleanupManager = new CleanupManager();
    } catch (error) {
      console.warn('Component: Failed to initialize cleanup manager:', error);
      this.cleanupManager = null;
    }
  }

  /**
   * Abstract render method - unchanged
   */
  abstract render(): string;

  /**
   * Mount component - ENHANCED but backward compatible
   */
  public mount(container?: HTMLElement | string): this {
    if (this.isMountedFlag) {
      console.warn('Component already mounted');
      return this;
    }

    const target = this.resolveContainer(container);
    if (!target) {
      throw new Error('Cannot mount component: container not found');
    }

    this.container = target;
    this.beforeMount();

    const html = this.render();
    target.innerHTML = html;
    this.el = target.firstElementChild as HTMLElement || target;

    this.isMountedFlag = true;
    this.setupEventListeners();
    this.onMounted();

    return this;
  }

  /**
   * Update component - ENHANCED but backward compatible
   */
  public update(newProps: Partial<P>): this {
    if (!this.isMountedFlag || !this.container) {
      console.warn('Cannot update unmounted component');
      return this;
    }

    this.props = { ...this.props, ...newProps };
    this.beforeUpdate();

    // Use enhanced cleanup if available, fallback to existing method
    if (this.cleanupManager) {
      this.cleanupManager.cleanupByType('event');
    } else {
      this.cleanup(); // Existing cleanup method
    }

    const html = this.render();
    this.container.innerHTML = html;
    this.el = this.container.firstElementChild as HTMLElement || this.container;

    this.setupEventListeners();
    this.onUpdated();

    return this;
  }

  /**
   * Set component state - unchanged
   */
  protected setState(newState: Partial<S>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Set state without re-render - unchanged
   */
  protected setStateQuiet(newState: Partial<S>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Force update - unchanged
   */
  protected forceUpdate(): void {
    if (this.isMountedFlag) {
      this.update(this.props);
    }
  }

  /**
   * Unmount component - ENHANCED but backward compatible
   */
  public unmount(): this {
    if (!this.isMountedFlag) {
      return this;
    }

    this.beforeUnmount();

    // Use enhanced cleanup if available, fallback to existing method
    if (this.cleanupManager) {
      // Clean up using object-based cleanup for better memory management
      this.cleanupManager.cleanupForObject(this);
      this.cleanupManager.cleanupAll();
    } else {
      this.cleanup(); // Existing cleanup method
    }

    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.isMountedFlag = false;
    this.el = null;
    this.container = null;

    this.onUnmounted();

    return this;
  }

  /**
   * ENHANCED: Add event listener with automatic cleanup
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  
  protected addEventListener<K extends keyof DocumentEventMap>(
    element: Document,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;

  protected addEventListener<K extends keyof WindowEventMap>(
    element: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;

  protected addEventListener(
    element: HTMLElement | Document | Window,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    // Try enhanced cleanup first, fallback to existing method
    if (this.cleanupManager) {
      // Use object-based cleanup for better memory management
      this.cleanupManager.registerForObject(this, () => {
        element.removeEventListener(type, listener, options);
      }, 'event');
    } else {
      // Existing method - unchanged for backward compatibility
      this.eventListeners.push(() => {
        element.removeEventListener(type, listener, options);
      });
    }

    element.addEventListener(type, listener, options);
  }

  /**
   * NEW: Enhanced setTimeout with automatic cleanup
   */
  protected setTimeout(callback: () => void, delay: number): void {
    if (this.cleanupManager) {
      this.cleanupManager.setTimeout(callback, delay);
    } else {
      // Fallback for components not using cleanup manager
      const timerId = window.setTimeout(callback, delay);
      this.eventListeners.push(() => clearTimeout(timerId));
    }
  }

  /**
   * NEW: Enhanced setInterval with automatic cleanup
   */
  protected setInterval(callback: () => void, delay: number): void {
    if (this.cleanupManager) {
      this.cleanupManager.setInterval(callback, delay);
    } else {
      // Fallback for components not using cleanup manager
      const intervalId = window.setInterval(callback, delay);
      this.eventListeners.push(() => clearInterval(intervalId));
    }
  }

  /**
   * Find element within component - unchanged
   */
  protected querySelector<T extends HTMLElement>(selector: string): T | null {
    if (this.el) {
      const result = this.el.querySelector<T>(selector);
      if (result) return result;
    }
    
    if (this.container) {
      return this.container.querySelector<T>(selector);
    }
    
    return null;
  }

  /**
   * Find all elements within component - unchanged
   */
  protected querySelectorAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
    if (this.container) {
      return this.container.querySelectorAll<T>(selector);
    }
    return document.querySelectorAll<T>('');
  }

  /**
   * Add child component - unchanged
   */
  protected addChildComponent(component: Component): void {
    this.childComponents.push(component);
  }

  /**
   * Cleanup event listeners - ENHANCED but maintains existing behavior
   */
  protected cleanup(): void {
    // Enhanced cleanup if available
    if (this.cleanupManager) {
      this.cleanupManager.cleanupByType('event');
    }
    
    // Always run existing cleanup for backward compatibility
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }

  /**
   * Resolve container element - unchanged
   */
  private resolveContainer(container?: HTMLElement | string): HTMLElement | null {
    if (!container) {
      return this.container;
    }

    if (typeof container === 'string') {
      return document.querySelector(container);
    }

    return container;
  }

  // Lifecycle hooks - unchanged
  protected beforeMount(): void {}
  protected onMounted(): void {}
  protected beforeUpdate(): void {}
  protected onUpdated(): void {}
  protected beforeUnmount(): void {}
  protected onUnmounted(): void {}

  // Abstract method - unchanged
  protected abstract setupEventListeners(): void;

  // Getters - unchanged
  public get isMounted(): boolean {
    return this.isMountedFlag;
  }

  public get element(): HTMLElement | null {
    return this.el;
  }

  public getProps(): Readonly<P> {
    return { ...this.props };
  }

  public getState(): Readonly<S> {
    return { ...this.state };
  }

  /**
   * NEW: Get cleanup statistics (for debugging)
   */
  public getCleanupStats(): any {
    return this.cleanupManager?.getStats() || { note: 'Cleanup manager not available' };
  }
}