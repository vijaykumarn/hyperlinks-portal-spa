// src/components/ui/Input.ts - FINAL WORKING VERSION

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
  private inputElement: HTMLInputElement | null = null;

  protected setupEventListeners(): void {
    // CRITICAL: Find the input element first
    this.inputElement = this.querySelector<HTMLInputElement>('input');
    
    if (!this.inputElement) {
      console.error('❌ Input element not found for:', this.props.name);
      // Retry after a delay
      setTimeout(() => {
        this.inputElement = this.querySelector<HTMLInputElement>('input');
        if (this.inputElement) {
          console.log('✅ Input element found on retry for:', this.props.name);
          this.bindEvents();
        }
      }, 100);
      return;
    }

    console.log('🔧 Input element found, setting up events for:', this.props.name);
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.inputElement) return;

    // Set initial value
    this.currentValue = this.props.value || '';
    if (this.currentValue) {
      this.inputElement.value = this.currentValue;
    }

    // CRITICAL: Use multiple event types for maximum compatibility
    const events = ['input', 'keyup', 'change', 'paste'];
    
    events.forEach(eventType => {
      this.inputElement!.addEventListener(eventType, (e) => {
        // Small delay for paste events
        const delay = eventType === 'paste' ? 10 : 0;
        
        setTimeout(() => {
          const target = e.target as HTMLInputElement;
          const newValue = target.value;
          
          if (newValue !== this.currentValue) {
            this.currentValue = newValue;
            console.log(`📝 ${this.props.name} ${eventType}:`, newValue ? 'HAS_VALUE' : 'EMPTY', `(${newValue.length} chars)`);
            
            if (this.props.onChange) {
              this.props.onChange(this.currentValue, e);
            }
          }
        }, delay);
      });
    });

    // Handle blur and focus events
    if (this.props.onBlur) {
      this.inputElement.addEventListener('blur', this.props.onBlur);
    }

    if (this.props.onFocus) {
      this.inputElement.addEventListener('focus', this.props.onFocus);
    }

    console.log('✅ All events bound for:', this.props.name);
  }

  protected onMounted(): void {
    console.log('🎯 Input mounted:', this.props.name);
    
    // Ensure events are set up after mount
    setTimeout(() => {
      if (!this.inputElement) {
        this.setupEventListeners();
      }
      
      // Set initial value if provided
      if (this.props.value && this.inputElement) {
        this.inputElement.value = this.props.value;
        this.currentValue = this.props.value;
      }
    }, 50);
  }

  protected onUpdated(): void {
    console.log('🔄 Input updated:', this.props.name);
    
    // Re-setup events after update
    setTimeout(() => {
      this.inputElement = this.querySelector<HTMLInputElement>('input');
      if (this.inputElement) {
        this.bindEvents();
      }
    }, 50);
  }

  public getValue(): string {
    // Always get the latest value from the DOM
    if (this.inputElement) {
      this.currentValue = this.inputElement.value;
    }
    console.log(`📤 getValue for ${this.props.name}:`, this.currentValue ? 'HAS_VALUE' : 'EMPTY', `(${this.currentValue.length} chars)`);
    return this.currentValue;
  }

  public setValue(value: string): void {
    this.currentValue = value;
    if (this.inputElement) {
      this.inputElement.value = value;
    }
    console.log(`📥 setValue for ${this.props.name}:`, value ? 'HAS_VALUE' : 'EMPTY', `(${value.length} chars)`);
    
    // Trigger onChange if provided
    if (this.props.onChange) {
      this.props.onChange(value, new Event('change'));
    }
  }

  public focus(): void {
    if (this.inputElement) {
      this.inputElement.focus();
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

    const inputClasses = `
      block w-full px-3 py-2 border rounded-md shadow-sm text-sm
      focus:outline-none focus:ring-2 focus:ring-offset-2 
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      ${error ? 
        'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
      }
    `.trim();

    // CRITICAL: Don't pre-fill value in HTML to avoid conflicts
    return `
      <div data-component="input" class="space-y-1">
        ${label ? `
          <label for="${id}" class="block text-sm font-medium text-gray-700">
            ${label}
            ${required ? '<span class="text-red-500 ml-1">*</span>' : ''}
          </label>
        ` : ''}
        
        <input
          type="${type}"
          id="${id}"
          name="${name}"
          placeholder="${placeholder}"
          class="${inputClasses}"
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
          autocomplete="${this.getAutocompleteValue(type)}"
        />
        
        ${error ? `
          <p class="text-sm text-red-600">${error}</p>
        ` : ''}
      </div>
    `;
  }

  private getAutocompleteValue(type: string): string {
    switch (type) {
      case 'email': return 'email';
      case 'password': return 'current-password';
      case 'url': return 'url';
      default: return 'off';
    }
  }
}