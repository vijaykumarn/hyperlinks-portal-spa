// src/components/base/Component.ts - FIXED VERSION

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
 * Base Component class - Foundation for all UI components
 */
export abstract class Component<P extends ComponentProps = ComponentProps, S extends ComponentState = ComponentState> {
  protected props: P;
  protected state: S;
  protected el: HTMLElement | null = null;
  protected container: HTMLElement | null = null;
  protected isMountedFlag = false;
  protected eventListeners: Array<() => void> = [];
  protected childComponents: Component[] = [];

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
  }

  /**
   * Abstract render method - must be implemented by subclasses
   */
  abstract render(): string;

  /**
   * Mount component to DOM - FIXED VERSION
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

    // Store container reference
    this.container = target;

    // Call beforeMount hook
    this.beforeMount();

    // Render and set content
    const html = this.render();
    target.innerHTML = html;
    
    // The component element is the content we just added
    this.el = target.firstElementChild as HTMLElement || target;

    // Mark as mounted BEFORE setting up event listeners
    this.isMountedFlag = true;

    // Setup event listeners AFTER marking as mounted
    this.setupEventListeners();

    // Call mounted hook
    this.onMounted();

    return this;
  }

  /**
   * Update component with new props - FIXED VERSION
   */
  public update(newProps: Partial<P>): this {
    if (!this.isMountedFlag || !this.container) {
      console.warn('Cannot update unmounted component');
      return this;
    }

    // Merge new props
    this.props = { ...this.props, ...newProps };

    // Call beforeUpdate hook
    this.beforeUpdate();

    // Cleanup current event listeners
    this.cleanup();

    // Re-render
    const html = this.render();
    this.container.innerHTML = html;
    
    // Update element reference
    this.el = this.container.firstElementChild as HTMLElement || this.container;

    // Re-setup event listeners
    this.setupEventListeners();

    // Call updated hook
    this.onUpdated();

    return this;
  }

  /**
   * Set component state and trigger re-render
   */
  protected setState(newState: Partial<S>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
 * Update component state without triggering re-render
 */
protected setStateQuiet(newState: Partial<S>): void {
  this.state = { ...this.state, ...newState };
}

/**
 * Force update component with current props and state
 */
protected forceUpdate(): void {
  if (this.isMountedFlag) {
    this.update(this.props);
  }
}

  /**
   * Unmount component from DOM
   */
  public unmount(): this {
    if (!this.isMountedFlag) {
      return this;
    }

    // Call beforeUnmount hook
    this.beforeUnmount();

    // Cleanup event listeners
    this.cleanup();

    // Unmount child components
    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];

    // Clear container content
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Mark as unmounted
    this.isMountedFlag = false;
    this.el = null;
    this.container = null;

    // Call unmounted hook
    this.onUnmounted();

    return this;
  }

  /**
   * Add event listener with automatic cleanup - FIXED WITH PROPER OVERLOADS
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
    element.addEventListener(type, listener, options);
    
    // Store cleanup function
    this.eventListeners.push(() => {
      element.removeEventListener(type, listener, options);
    });
  }

  /**
   * Find element within component - FIXED TO SEARCH IN CONTAINER
   */
  protected querySelector<T extends HTMLElement>(selector: string): T | null {
    // First try to find in the component element
    if (this.el) {
      const result = this.el.querySelector<T>(selector);
      if (result) return result;
    }
    
    // Fallback to searching in container
    if (this.container) {
      return this.container.querySelector<T>(selector);
    }
    
    return null;
  }

  /**
   * Find all elements within component
   */
  protected querySelectorAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
    if (this.container) {
      return this.container.querySelectorAll<T>(selector);
    }
    return document.querySelectorAll<T>('');
  }

  /**
   * Add child component
   */
  protected addChildComponent(component: Component): void {
    this.childComponents.push(component);
  }

  /**
   * Cleanup event listeners
   */
  protected cleanup(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }

  /**
   * Resolve container element
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

  // Lifecycle hooks - can be overridden by subclasses
  protected beforeMount(): void {}
  protected onMounted(): void {}
  protected beforeUpdate(): void {}
  protected onUpdated(): void {}
  protected beforeUnmount(): void {}
  protected onUnmounted(): void {}

  // Abstract method for setting up event listeners
  protected abstract setupEventListeners(): void;

  // Getters
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
}