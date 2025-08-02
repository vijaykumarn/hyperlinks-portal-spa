// ========================================
// src/components/ui/LoadingSpinner.ts - Loading Spinner Component
// ========================================

import { Component, type ComponentProps } from '../base/Component';

/**
 * Props for the LoadingSpinner component
 */

export interface LoadingSpinnerProps extends ComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'gray' | 'white';
  text?: string;
}

export class LoadingSpinner extends Component<LoadingSpinnerProps> {
  protected setupEventListeners(): void {
    // No event listeners needed for spinner
  }

  public render(): string {
    const {
      size = 'md',
      color = 'blue',
      text = ''
    } = this.props;

    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-8 w-8',
      lg: 'h-12 w-12'
    };

    const colorClasses = {
      blue: 'border-blue-500',
      gray: 'border-gray-500',
      white: 'border-white'
    };

    return `
      <div data-component="loading-spinner" class="flex items-center justify-center">
        <div class="animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}"></div>
        ${text ? `<span class="ml-2 text-gray-600">${text}</span>` : ''}
      </div>
    `;
  }
}
