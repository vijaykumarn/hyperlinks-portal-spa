// src/core/integration/Phase2Integration.ts - NEW FILE
// Helper to integrate Phase 2 enhancements with existing components

import { CleanupManager } from '../cleanup/CleanupManager';
import { StateSynchronizer } from '../sync/StateSynchronizer';
import { DOMReady } from '../dom/DOMReady';
import { StateManager } from '../state/StateManager';

/**
 * Phase 2 Integration Manager
 * Helps existing components adopt new features gradually
 */
export class Phase2Integration {
  private static instance: Phase2Integration;
  private domReady: DOMReady;
  private stateSynchronizer: StateSynchronizer;
  private globalCleanupManager: CleanupManager;

  private constructor() {
    this.domReady = DOMReady.getInstance();
    this.stateSynchronizer = StateSynchronizer.getInstance();
    this.globalCleanupManager = new CleanupManager();
  }

  public static getInstance(): Phase2Integration {
    if (!Phase2Integration.instance) {
      Phase2Integration.instance = new Phase2Integration();
    }
    return Phase2Integration.instance;
  }

  /**
   * Initialize Phase 2 integration with state manager
   */
  public async initialize(stateManager: StateManager): Promise<void> {
    try {
      console.log('🔧 Phase2Integration: Initializing...');

      // Wait for DOM to be ready
      await this.domReady.waitForReady();

      // Initialize state synchronizer
      this.stateSynchronizer.initialize(stateManager);

      console.log('✅ Phase2Integration: Initialized successfully');
    } catch (error) {
      console.error('❌ Phase2Integration: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced component mounting with retry logic
   */
  public async mountComponent(
    containerSelector: string,
    componentFactory: (container: HTMLElement) => any,
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<boolean> {
    return this.domReady.mountComponent(
      containerSelector,
      (container) => {
        const component = componentFactory(container);
        
        // Register component for global cleanup if it has unmount method
        if (component && typeof component.unmount === 'function') {
          this.globalCleanupManager.registerComponent(component);
        }
      },
      options
    );
  }

  /**
   * Enhanced form mounting with better error handling
   */
  public async mountForm(
    containerSelector: string,
    formComponentClass: any,
    props: any = {},
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<boolean> {
    return this.mountComponent(
      containerSelector,
      (container) => {
        console.log(`🎯 Phase2Integration: Mounting form to ${containerSelector}`);
        
        const formComponent = new formComponentClass({
          props
        });
        
        formComponent.mount(container);
        return formComponent;
      },
      options
    );
  }

  /**
   * Enhanced modal mounting with state synchronization
   */
  public async mountModal(
    containerSelector: string,
    modalComponentClass: any,
    props: any = {},
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
      syncWithState?: boolean;
    } = {}
  ): Promise<boolean> {
    return this.mountComponent(
      containerSelector,
      (container) => {
        console.log(`🎯 Phase2Integration: Mounting modal to ${containerSelector}`);
        
        const modalComponent = new modalComponentClass({
          props
        });
        
        // Optional state synchronization
        if (options.syncWithState !== false) {
          this.stateSynchronizer.subscribeToModals(modalComponent, (modals) => {
            // Update modal state based on global state
            if (modalComponent.update && typeof modalComponent.update === 'function') {
              modalComponent.update({ 
                mode: this.getModalModeFromState(modals, props.modalType || 'auth')
              });
            }
          });
        }
        
        modalComponent.mount(container);
        return modalComponent;
      },
      options
    );
  }

  /**
   * Helper to get modal mode from state
   */
  private getModalModeFromState(modals: Record<string, boolean>, modalType: string): string {
    // Map modal states to modes
    if (modals.login) return 'login';
    if (modals.register) return 'register';
    if (modals.emailVerification) return 'verification';
    return 'closed';
  }

  /**
   * Enhanced input mounting with automatic cleanup
   */
  public async mountInput(
    containerSelector: string,
    inputProps: any = {},
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<boolean> {
    const { Input } = await import('../../components/ui/Input');
    
    return this.mountComponent(
      containerSelector,
      (container) => {
        console.log(`🎯 Phase2Integration: Mounting input to ${containerSelector}`);
        
        const inputComponent = new Input({
          props: inputProps
        });
        
        inputComponent.mount(container);
        return inputComponent;
      },
      options
    );
  }

  /**
   * Enhanced button mounting with automatic cleanup
   */
  public async mountButton(
    containerSelector: string,
    buttonProps: any = {},
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<boolean> {
    const { Button } = await import('../../components/ui/Button');
    
    return this.mountComponent(
      containerSelector,
      (container) => {
        console.log(`🎯 Phase2Integration: Mounting button to ${containerSelector}`);
        
        const buttonComponent = new Button({
          props: buttonProps
        });
        
        buttonComponent.mount(container);
        return buttonComponent;
      },
      options
    );
  }

  /**
   * Wait for multiple elements to be ready
   */
  public async waitForElements(
    selectors: string[],
    timeout: number = 5000
  ): Promise<{ [selector: string]: HTMLElement | null }> {
    const results: { [selector: string]: HTMLElement | null } = {};
    
    await Promise.all(
      selectors.map(async (selector) => {
        results[selector] = await this.domReady.waitForElement(selector, timeout);
      })
    );
    
    return results;
  }

  /**
   * Batch mount multiple components
   */
  public async batchMount(
    mountConfigs: Array<{
      containerSelector: string;
      componentFactory: (container: HTMLElement) => any;
      options?: any;
    }>
  ): Promise<boolean[]> {
    const results = await Promise.all(
      mountConfigs.map(config => 
        this.mountComponent(
          config.containerSelector,
          config.componentFactory,
          config.options || {}
        )
      )
    );
    
    const successCount = results.filter(Boolean).length;
    console.log(`🎯 Phase2Integration: Batch mount completed: ${successCount}/${results.length} successful`);
    
    return results;
  }

  /**
   * Get integration statistics
   */
  public getStats(): {
    domReady: any;
    stateSynchronizer: any;
    globalCleanup: any;
  } {
    return {
      domReady: this.domReady.getReadyState(),
      stateSynchronizer: this.stateSynchronizer.getStats(),
      globalCleanup: this.globalCleanupManager.getStats()
    };
  }

  /**
   * Emergency cleanup for all Phase 2 resources
   */
  public emergencyCleanup(): void {
    console.warn('🚨 Phase2Integration: Performing emergency cleanup...');
    
    try {
      // Cleanup global resources
      this.globalCleanupManager.cleanupAll();
      
      // Cleanup state synchronizer
      this.stateSynchronizer.destroy();
      
      console.log('✅ Phase2Integration: Emergency cleanup completed');
    } catch (error) {
      console.error('❌ Phase2Integration: Emergency cleanup failed:', error);
    }
  }

  /**
   * Destroy integration manager
   */
  public destroy(): void {
    console.log('🧹 Phase2Integration: Destroying...');
    
    try {
      // Cleanup all resources
      this.globalCleanupManager.destroy();
      this.stateSynchronizer.destroy();
      
      console.log('✅ Phase2Integration: Destroyed successfully');
    } catch (error) {
      console.error('❌ Phase2Integration: Destruction failed:', error);
    }
  }
}

/**
 * Convenience functions for common operations
 */

/**
 * Quick component mounting with Phase 2 enhancements
 */
export async function mountComponentEnhanced<T>(
  containerSelector: string,
  ComponentClass: new (options?: any) => T,
  props: any = {},
  options: {
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
  } = {}
): Promise<T | null> {
  const integration = Phase2Integration.getInstance();
  
  let component: T | null = null;
  
  const success = await integration.mountComponent(
    containerSelector,
    (container) => {
      component = new ComponentClass({ props });
      if (component && 'mount' in component && typeof (component as any).mount === 'function') {
        (component as any).mount(container);
      }
      return component;
    },
    options
  );
  
  return success ? component : null;
}

/**
 * Quick form mounting with enhanced error handling
 */
export async function mountFormEnhanced<T>(
  containerSelector: string,
  FormClass: new (options?: any) => T,
  props: any = {},
  options: {
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
  } = {}
): Promise<T | null> {
  const integration = Phase2Integration.getInstance();
  
  const success = await integration.mountForm(
    containerSelector,
    FormClass,
    props,
    options
  );
  
  return success ? {} as T : null; // Form components are managed internally
}

/**
 * Quick modal mounting with state sync
 */
export async function mountModalEnhanced<T>(
  containerSelector: string,
  ModalClass: new (options?: any) => T,
  props: any = {},
  options: {
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    syncWithState?: boolean;
  } = {}
): Promise<T | null> {
  const integration = Phase2Integration.getInstance();
  
  const success = await integration.mountModal(
    containerSelector,
    ModalClass,
    props,
    options
  );
  
  return success ? {} as T : null; // Modal components are managed internally
}