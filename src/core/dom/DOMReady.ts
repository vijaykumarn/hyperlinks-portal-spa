// src/core/dom/DOMReady.ts - NEW FILE
// Handles DOM ready timing issues for reliable component mounting

/**
 * DOM readiness checker with retry logic
 */
export class DOMReady {
  private static instance: DOMReady;
  private readyPromise: Promise<void> | null = null;
  private isReady = false;

  public static getInstance(): DOMReady {
    if (!DOMReady.instance) {
      DOMReady.instance = new DOMReady();
    }
    return DOMReady.instance;
  }

  /**
   * Wait for DOM to be ready
   */
  public async waitForReady(): Promise<void> {
    if (this.isReady) {
      return Promise.resolve();
    }

    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise<void>((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.isReady = true;
          resolve();
        }, { once: true });
      } else {
        this.isReady = true;
        resolve();
      }
    });

    return this.readyPromise;
  }

  /**
   * Wait for specific element to be available
   */
  public async waitForElement(
    selector: string, 
    timeout: number = 5000,
    retryInterval: number = 100
  ): Promise<HTMLElement | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        return element;
      }

      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    console.warn(`DOMReady: Element '${selector}' not found within ${timeout}ms`);
    return null;
  }

  /**
   * Execute callback when element is ready
   */
  public async whenElementReady(
    selector: string,
    callback: (element: HTMLElement) => void,
    timeout?: number
  ): Promise<boolean> {
    const element = await this.waitForElement(selector, timeout);
    
    if (element) {
      try {
        callback(element);
        return true;
      } catch (error) {
        console.error('DOMReady: Error in element ready callback:', error);
        return false;
      }
    }

    return false;
  }

  /**
   * Safe component mounting with retry logic
   */
  public async mountComponent(
    containerSelector: string,
    mountFunction: (container: HTMLElement) => void,
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<boolean> {
    const {
      timeout = 5000,
      retryCount = 3,
      retryDelay = 200
    } = options;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`DOMReady: Mount attempt ${attempt} for '${containerSelector}'`);

        const container = await this.waitForElement(containerSelector, timeout);
        
        if (container) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          mountFunction(container);
          console.log(`✅ DOMReady: Successfully mounted to '${containerSelector}'`);
          return true;
        } else {
          console.warn(`⚠️ DOMReady: Container '${containerSelector}' not found on attempt ${attempt}`);
        }

      } catch (error) {
        console.error(`❌ DOMReady: Mount attempt ${attempt} failed:`, error);
        
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    console.error(`❌ DOMReady: Failed to mount to '${containerSelector}' after ${retryCount} attempts`);
    return false;
  }

  /**
   * Check if DOM is ready
   */
  public get ready(): boolean {
    return this.isReady || document.readyState !== 'loading';
  }

  /**
   * Get DOM ready state
   */
  public getReadyState(): {
    isReady: boolean;
    documentState: DocumentReadyState;
    hasPromise: boolean;
  } {
    return {
      isReady: this.isReady,
      documentState: document.readyState,
      hasPromise: this.readyPromise !== null
    };
  }
}