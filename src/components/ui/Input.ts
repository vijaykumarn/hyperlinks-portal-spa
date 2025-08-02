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

    // Handle input changes - FIXED to capture all input types
    this.addEventListener(input, 'input', (e) => {
      const target = e.target as HTMLInputElement;
      this.currentValue = target.value;
      console.log(`📝 Input ${this.props.name} changed to: ${this.currentValue ? '***' : 'EMPTY'} (length: ${this.currentValue.length})`);
      
      if (this.props.onChange) {
        this.props.onChange(this.currentValue, e);
      }
    });

    // Also handle 'change' event for better compatibility
    this.addEventListener(input, 'change', (e) => {
      const target = e.target as HTMLInputElement;
      this.currentValue = target.value;
      console.log(`🔄 Input ${this.props.name} change event: ${this.currentValue ? '***' : 'EMPTY'} (length: ${this.currentValue.length})`);
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

    // Sync value immediately
    this.syncValue();
  }

  protected onMounted(): void {
    // Ensure value is set after mounting
    setTimeout(() => this.syncValue(), 0);
  }

  protected onUpdated(): void {
    // Re-sync value after update
    this.syncValue();
  }

  private syncValue(): void {
    const input = this.querySelector('input');
    if (input) {
      // Set value from props or current value
      const valueToSet = this.props.value || this.currentValue || '';
      input.value = valueToSet;
      this.currentValue = valueToSet;
      console.log(`🔄 Input ${this.props.name} synced to: ${valueToSet ? '***' : 'EMPTY'} (length: ${valueToSet.length})`);
    }
  }

  public getValue(): string {
    // Always get the latest value from the DOM element
    const input = this.querySelector('input');
    if (input) {
      this.currentValue = input.value;
      console.log(`📤 Input ${this.props.name} getValue(): ${this.currentValue ? '***' : 'EMPTY'} (length: ${this.currentValue.length})`);
    }
    return this.currentValue;
  }

  public setValue(value: string): void {
    this.currentValue = value;
    const input = this.querySelector('input');
    if (input) {
      input.value = value;
      console.log(`📥 Input ${this.props.name} setValue(): ${value ? '***' : 'EMPTY'} (length: ${value.length})`);
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

    // Use current value if available, otherwise use prop value
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
          autocomplete="${type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'off'}"
        />
        
        ${error ? `
          <p class="mt-1 text-sm text-red-600">${error}</p>
        ` : ''}
      </div>
    `;
  }
}