
// ========================================
// src/components/ui/Button.ts - FINAL FIXED BUTTON
// ========================================

import { Component, type ComponentProps } from '../base/Component';

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: MouseEvent) => void;
  children?: string;
}

export class Button extends Component<ButtonProps> {
  protected setupEventListeners(): void {
    console.log('🔘 Button setupEventListeners called');
    console.log('🔍 Button container:', this.container);
    console.log('🔍 Button element:', this.el);
    
    // Find button element - it should be the main element
    const button = this.el as HTMLButtonElement;
    console.log('🔍 Button found:', !!button);
    console.log('🔍 Button tagName:', button?.tagName);
    console.log('🔍 onClick handler provided:', !!this.props.onClick);
    
    if (button && button.tagName === 'BUTTON' && this.props.onClick) {
      console.log('✅ Adding click listener to button');
      this.addEventListener(button, 'click', (event: MouseEvent) => {
        console.log('🔘 Button clicked!', event);
        if (this.props.onClick) {
          this.props.onClick(event);
        }
      });
    } else {
      console.warn('⚠️ Button setup failed:', {
        button: !!button,
        tagName: button?.tagName,
        onClick: !!this.props.onClick
      });
    }
  }

  public render(): string {
    const {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      type = 'button',
      children = 'Button'
    } = this.props;

    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
    const isDisabled = disabled || loading;

    return `
      <button 
        type="${type}"
        class="${classes}"
        ${isDisabled ? 'disabled' : ''}
      >
        ${loading ? `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ` : ''}
        ${children}
      </button>
    `;
  }
}
