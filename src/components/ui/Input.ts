// src/components/ui/Input.ts - FIXED VERSION WITH PROPER VALUE HANDLING

import { type ComponentProps, Component } from "../base/Component";

export interface InputProps extends ComponentProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'number';
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  label?: string;
  error?: string;
  onChange?: (value: string, event: Event) => void;
  onBlur?: (event: FocusEvent) => void;
  onFocus?: (event: FocusEvent) => void;
}

export class Input extends Component<InputProps> {
  private currentValue: string = '';

  protected setupEventListeners(): void {
    const input = this.querySelector('input');
    if (!input) {
      console.error('❌ Input element not found in Input component');
      return;
    }

    console.log('🔧 Setting up Input event listeners for:', this.props.name);

    // Set initial value
    this.currentValue = this.props.value || '';
    if (this.currentValue) {
      input.value = this.currentValue;
    }

    // Handle input changes
    this.addEventListener(input, 'input', (e) => {
      const target = e.target as HTMLInputElement;
      this.currentValue = target.value;
      console.log(`📝 Input ${this.props.name} changed:`, this.currentValue ? '***' : 'EMPTY');
      
      if (this.props.onChange) {
        this.props.onChange(this.currentValue, e);
      }
    });

    // Handle blur events
    if (this.props.onBlur) {
      this.addEventListener(input, 'blur', (e) => {
        console.log(`👁️ Input ${this.props.name} blurred with value:`, this.currentValue ? '***' : 'EMPTY');
        this.props.onBlur!(e);
      });
    }

    // Handle focus events
    if (this.props.onFocus) {
      this.addEventListener(input, 'focus', this.props.onFocus);
    }

    // Set form value immediately to ensure it's captured
    input.value = this.currentValue;
  }

  protected onUpdated(): void {
    // Re-setup event listeners and preserve value after update
    const input = this.querySelector('input');
    if (input) {
      input.value = this.currentValue;
    }
    this.setupEventListeners();
  }

  public getValue(): string {
    // Also try to get value from DOM element as backup
    const input = this.querySelector('input');
    if (input) {
      this.currentValue = input.value;
    }
    return this.currentValue;
  }

  public setValue(value: string): void {
    this.currentValue = value;
    const input = this.querySelector('input');
    if (input) {
      input.value = value;
    }
  }

  public render(): string {
    const {
      type = 'text',
      placeholder = '',
      value = '',
      disabled = false,
      required = false,
      name = '',
      id = '',
      label = '',
      error = ''
    } = this.props;

    // Ensure we use the current value
    const displayValue = this.currentValue || value;

    const inputClasses = `
      block w-full px-3 py-2 border rounded-md shadow-sm 
      focus:outline-none focus:ring-2 focus:ring-offset-2 
      disabled:bg-gray-50 disabled:text-gray-500
      ${error ? 
        'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
      }
    `.trim();

    return `
      <div data-component="input">
        ${label ? `
          <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">
            ${label}
            ${required ? '<span class="text-red-500">*</span>' : ''}
          </label>
        ` : ''}
        
        <input
          type="${type}"
          id="${id}"
          name="${name}"
          value="${displayValue}"
          placeholder="${placeholder}"
          class="${inputClasses}"
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
        />
        
        ${error ? `
          <p class="mt-1 text-sm text-red-600">${error}</p>
        ` : ''}
      </div>
    `;
  }
}