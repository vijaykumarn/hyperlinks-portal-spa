// src/core/sync/StateSynchronizer.ts - NEW FILE
// Helps components sync with global state without breaking existing functionality

import type { Component } from '../../components/base/Component';
import type { StateManager } from '../state/StateManager';

/**
 * State subscription configuration
 */
interface StateSubscription<T> {
  id: string;
  selector: (state: any) => T;
  callback: (value: T, previousValue: T) => void;
  lastValue: T;
  component: Component;
}

/**
 * StateSynchronizer - Optional state sync utility
 * Components can use this to sync with global state without breaking existing code
 */
export class StateSynchronizer {
  private static instance: StateSynchronizer;
  private subscriptions: Map<string, StateSubscription<any>> = new Map();
  private stateManager: StateManager | null = null;
  private nextId = 1;

  public static getInstance(): StateSynchronizer {
    if (!StateSynchronizer.instance) {
      StateSynchronizer.instance = new StateSynchronizer();
    }
    return StateSynchronizer.instance;
  }

  /**
   * Initialize with state manager
   */
  public initialize(stateManager: StateManager): void {
    this.stateManager = stateManager;
    console.log('📊 StateSynchronizer initialized');
  }

  /**
   * Subscribe a component to state changes
   */
  public subscribe<T>(
    component: Component,
    selector: (state: any) => T,
    callback: (value: T, previousValue: T) => void
  ): string {
    if (!this.stateManager) {
      console.warn('StateSynchronizer: StateManager not initialized');
      return '';
    }

    const id = `sync_${this.nextId++}_${Date.now()}`;
    const currentValue = selector(this.stateManager.getState());

    const subscription: StateSubscription<T> = {
      id,
      selector,
      callback,
      lastValue: currentValue,
      component
    };

    // Subscribe to state manager
    const unsubscribe = this.stateManager.subscribe(selector, (value: T, previousValue: T) => {
      subscription.lastValue = value;
      
      try {
        callback(value, previousValue);
      } catch (error) {
        console.error('StateSynchronizer: Error in callback:', error);
      }
    });

    // Store subscription with cleanup
    this.subscriptions.set(id, subscription);

    // Register cleanup with component if it has cleanup manager
    if ('cleanupManager' in component && component.cleanupManager) {
      component.cleanupManager.register(() => {
        this.unsubscribe(id);
      }, 'subscription');
    }

    console.log(`📊 StateSynchronizer: Subscribed component to state (${id})`);
    return id;
  }

  /**
   * Unsubscribe from state changes
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);
    console.log(`📊 StateSynchronizer: Unsubscribed ${subscriptionId}`);
    return true;
  }

  /**
   * Unsubscribe all subscriptions for a component
   */
  public unsubscribeComponent(component: Component): number {
    let unsubscribed = 0;

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.component === component) {
        this.unsubscribe(id);
        unsubscribed++;
      }
    }

    if (unsubscribed > 0) {
      console.log(`📊 StateSynchronizer: Unsubscribed ${unsubscribed} subscriptions for component`);
    }

    return unsubscribed;
  }

  /**
   * Subscribe component to authentication state
   */
  public subscribeToAuth(
    component: Component,
    callback: (authState: { isAuthenticated: boolean; user: any }) => void
  ): string {
    return this.subscribe(
      component,
      (state) => ({
        isAuthenticated: state.session.isAuthenticated,
        user: state.session.user
      }),
      callback
    );
  }

  /**
   * Subscribe component to UI state
   */
  public subscribeToUI(
    component: Component,
    callback: (uiState: { isLoading: boolean; error: string | null }) => void
  ): string {
    return this.subscribe(
      component,
      (state) => ({
        isLoading: state.ui.isLoading,
        error: state.ui.error
      }),
      callback
    );
  }

  /**
   * Subscribe component to modal state
   */
  public subscribeToModals(
    component: Component,
    callback: (modals: Record<string, boolean>) => void
  ): string {
    return this.subscribe(
      component,
      (state) => state.ui.modals,
      callback
    );
  }

  /**
   * Get synchronizer statistics
   */
  public getStats(): {
    totalSubscriptions: number;
    componentCount: number;
    subscriptionsByComponent: Record<string, number>;
  } {
    const stats = {
      totalSubscriptions: this.subscriptions.size,
      componentCount: 0,
      subscriptionsByComponent: {} as Record<string, number>
    };

    const componentCounts = new Map<Component, number>();

    for (const subscription of this.subscriptions.values()) {
      const count = componentCounts.get(subscription.component) || 0;
      componentCounts.set(subscription.component, count + 1);
    }

    stats.componentCount = componentCounts.size;

    let componentIndex = 0;
    for (const [_component, count] of componentCounts.entries()) {
      stats.subscriptionsByComponent[`component_${componentIndex++}`] = count;
    }

    return stats;
  }

  /**
   * Cleanup all subscriptions
   */
  public destroy(): void {
    const subscriptionCount = this.subscriptions.size;
    
    for (const [id] of this.subscriptions.entries()) {
      this.unsubscribe(id);
    }

    this.stateManager = null;
    console.log(`📊 StateSynchronizer destroyed, cleaned ${subscriptionCount} subscriptions`);
  }
}