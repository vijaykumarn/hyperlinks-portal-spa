// ========================================
// src/components/base/index.ts - Base Component Exports
// ========================================

import { Component } from './Component';
import type { ComponentOptions } from './Component';

export { Component } from './Component';
export { FormComponent } from './FormComponent';

export type { 
  ComponentProps, 
  ComponentState, 
  ComponentOptions, 
} from './Component';

export type { 
  FormComponentProps, 
  FormComponentState 
} from './FormComponent';


// Utility function to create component instances
export function createComponent<T extends Component>(
  ComponentClass: new (options?: ComponentOptions) => T,
  options?: ComponentOptions
): T {
  return new ComponentClass(options);
}

// Component registration system
const componentRegistry = new Map<string, new (options?: ComponentOptions) => Component>();

export function registerComponent(name: string, ComponentClass: new (options?: ComponentOptions) => Component): void {
  componentRegistry.set(name, ComponentClass);
}

export function getComponent(name: string): (new (options?: ComponentOptions) => Component) | undefined {
  return componentRegistry.get(name);
}

export function createRegisteredComponent(name: string, options?: ComponentOptions): Component | null {
  const ComponentClass = getComponent(name);
  return ComponentClass ? new ComponentClass(options) : null;
}