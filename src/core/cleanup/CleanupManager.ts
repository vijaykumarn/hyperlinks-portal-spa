// src/core/cleanup/CleanupManager.ts - NEW FILE
// Memory leak prevention without touching existing components

/**
 * Resource cleanup registration
 */
interface CleanupResource {
  id: string;
  cleanup: () => void;
  type: 'event' | 'timer' | 'subscription' | 'component' | 'other';
  created: number;
}

/**
 * CleanupManager - Automatic resource management
 * This is a NEW utility that existing components can optionally adopt
 */
export class CleanupManager {
  private resources: Map<string, CleanupResource> = new Map();
  private isDestroyed = false;
  private nextId = 1;

  /**
   * Register a cleanup function
   */
  public register(cleanup: () => void, type: CleanupResource['type'] = 'other'): string {
    if (this.isDestroyed) {
      console.warn('CleanupManager: Cannot register on destroyed manager');
      return '';
    }

    const id = `cleanup_${this.nextId++}_${Date.now()}`;
    
    this.resources.set(id, {
      id,
      cleanup,
      type,
      created: Date.now()
    });

    return id;
  }

  /**
   * Register an event listener with automatic cleanup
   */
  public addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): string {
    element.addEventListener(type, listener, options);
    
    return this.register(() => {
      element.removeEventListener(type, listener, options);
    }, 'event');
  }

  /**
   * Register a timer with automatic cleanup
   */
  public setTimeout(callback: () => void, delay: number): string {
    const timerId = window.setTimeout(callback, delay);
    
    return this.register(() => {
      clearTimeout(timerId);
    }, 'timer');
  }

  /**
   * Register an interval with automatic cleanup
   */
  public setInterval(callback: () => void, delay: number): string {
    const intervalId = window.setInterval(callback, delay);
    
    return this.register(() => {
      clearInterval(intervalId);
    }, 'timer');
  }

  /**
   * Register a state subscription with automatic cleanup
   */
  public subscribeToState<T>(
    selector: (state: any) => T,
    callback: (value: T, previousValue: T) => void
  ): string {
    // This would integrate with your StateManager
    // For now, just a placeholder that existing code can use
    const unsubscribe = () => {
      // Actual unsubscribe logic would go here
    };

    return this.register(unsubscribe, 'subscription');
  }

  /**
   * Manually cleanup a specific resource
   */
  public cleanup(id: string): boolean {
    const resource = this.resources.get(id);
    if (!resource) {
      return false;
    }

    try {
      resource.cleanup();
      this.resources.delete(id);
      return true;
    } catch (error) {
      console.error('CleanupManager: Error during cleanup:', error);
      this.resources.delete(id); // Remove even if cleanup failed
      return false;
    }
  }

  /**
   * Cleanup resources by type
   */
  public cleanupByType(type: CleanupResource['type']): number {
    let cleaned = 0;
    
    for (const [id, resource] of this.resources.entries()) {
      if (resource.type === type) {
        if (this.cleanup(id)) {
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * Cleanup all resources
   */
  public cleanupAll(): number {
    const resourceCount = this.resources.size;
    
    for (const [id] of this.resources.entries()) {
      this.cleanup(id);
    }

    return resourceCount;
  }

  /**
   * Get cleanup statistics
   */
  public getStats(): {
    total: number;
    byType: Record<CleanupResource['type'], number>;
    oldestResource: number | null;
  } {
    const stats = {
      total: this.resources.size,
      byType: {
        event: 0,
        timer: 0,
        subscription: 0,
        component: 0,
        other: 0
      },
      oldestResource: null as number | null
    };

    let oldestTime = Date.now();
    
    for (const resource of this.resources.values()) {
      stats.byType[resource.type]++;
      if (resource.created < oldestTime) {
        oldestTime = resource.created;
        stats.oldestResource = Date.now() - resource.created;
      }
    }

    return stats;
  }

  /**
   * Destroy the cleanup manager
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    const cleaned = this.cleanupAll();
    this.isDestroyed = true;
    
    console.log(`CleanupManager destroyed, cleaned ${cleaned} resources`);
  }

  /**
   * Check if manager is destroyed
   */
  public get destroyed(): boolean {
    return this.isDestroyed;
  }
}