// src/components/ui/Input.ts - CONSERVATIVE ENHANCEMENT
// Keeps all existing functionality while improving reliability

import { type ComponentProps, Component } from "../base/Component";

export interface InputProps extends ComponentProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'number';
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  label?: string;
  error?: string;
  value?: string; // NEW: Allow initial value
  onChange?: (value: string, event: Event) => void;
  onBlur?: (event: FocusEvent) => void;
  onFocus?: (event: FocusEvent) => void;
}

export class Input extends Component<InputProps> {
  private currentValue: string = '';
  private inputElement: HTMLInputElement | null = null;
  private isInitialized = false;

  protected setupEventListeners(): void {
    // Use enhanced setTimeout with automatic cleanup
    this.setTimeout(() => {
      this.initializeInput();
    }, 50);
  }

  /**
   * ENHANCED: Robust input initialization
   */
  private initializeInput(): void {
    if (this.isInitialized) {
      return; // Prevent double initialization
    }

    this.inputElement = this.querySelector<HTMLInputElement>('input');
    
    if (!this.inputElement) {
      console.warn('❌ Input element not found for:', this.props.name);
      // Retry with longer delay
      this.setTimeout(() => {
        this.initializeInput();
      }, 100);
      return;
    }

    console.log('✅ Input element found, initializing:', this.props.name);
    
    // Set initial value from props or current value
    const initialValue = this.props.value || this.currentValue || '';
    if (initialValue) {
      this.inputElement.value = initialValue;
      this.currentValue = initialValue;
    }

    this.bindEvents();
    this.isInitialized = true;
  }

  /**
   * ENHANCED: More reliable event binding
   */
  private bindEvents(): void {
    if (!this.inputElement) return;

    console.log('🔧 Binding events for input:', this.props.name);

    // ENHANCED: Multiple event types for maximum compatibility
    const inputEvents = ['input', 'keyup', 'change'];
    const pasteEvents = ['paste'];
    
    // Handle input/keyup/change events
    inputEvents.forEach(eventType => {
      this.addEventListener(this.inputElement!, eventType, (e) => {
        this.handleInputChange(e);
      });
    });

    // Handle paste events with delay
    pasteEvents.forEach(eventType => {
      this.addEventListener(this.inputElement!, eventType, (e) => {
        this.setTimeout(() => {
          this.handleInputChange(e);
        }, 10);
      });
    });

    // Handle focus/blur events
    if (this.props.onFocus) {
      this.addEventListener(this.inputElement, 'focus', this.props.onFocus);
    }

    if (this.props.onBlur) {
      this.addEventListener(this.inputElement, 'blur', this.props.onBlur);
    }

    console.log('✅ Events bound successfully for:', this.props.name);
  }

  /**
   * ENHANCED: Robust input change handling
   */
  private handleInputChange(event: Event): void {
    if (!this.inputElement) return;

    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    
    // Only trigger onChange if value actually changed
    if (newValue !== this.currentValue) {
      this.currentValue = newValue;
      
      const valueMask = newValue ? 'HAS_VALUE' : 'EMPTY';
      console.log(`📝 Input change [${this.props.name}]: ${valueMask} (${newValue.length} chars)`);
      
      if (this.props.onChange) {
        try {
          this.props.onChange(this.currentValue, event);
        } catch (error) {
          console.error('❌ Error in onChange handler:', error);
        }
      }
    }
  }

  protected onMounted(): void {
    console.log('🎯 Input mounted:', this.props.name);
    // Enhanced initialization will be called by setupEventListeners
  }

  protected onUpdated(): void {
    console.log('🔄 Input updated:', this.props.name);
    
    // Reset initialization flag and re-initialize
    this.isInitialized = false;
    this.inputElement = null;
    
    this.setTimeout(() => {
      this.initializeInput();
    }, 50);
  }

  /**
   * ENHANCED: Reliable value getter
   */
  public getValue(): string {
    // Always get the latest value from the DOM if available
    if (this.inputElement) {
      const domValue = this.inputElement.value;
      if (domValue !== this.currentValue) {
        this.currentValue = domValue;
      }
    }
    
    console.log(`📤 getValue [${this.props.name}]: ${this.currentValue ? 'HAS_VALUE' : 'EMPTY'} (${this.currentValue.length} chars)`);
    return this.currentValue;
  }

  /**
   * ENHANCED: Reliable value setter
   */
  public setValue(value: string): void {
    this.currentValue = value;
    
    if (this.inputElement) {
      this.inputElement.value = value;
    }
    
    console.log(`📥 setValue [${this.props.name}]: ${value ? 'HAS_VALUE' : 'EMPTY'} (${value.length} chars)`);
    
    // Trigger onChange if provided
    if (this.props.onChange) {
      try {
        this.props.onChange(value, new Event('change'));
      } catch (error) {
        console.error('❌ Error in setValue onChange:', error);
      }
    }
  }

  /**
   * Focus the input
   */
  public focus(): void {
    if (this.inputElement) {
      this.inputElement.focus();
    } else {
      // Retry after initialization
      this.setTimeout(() => {
        if (this.inputElement) {
          this.inputElement.focus();
        }
      }, 100);
    }
  }

  /**
   * ENHANCED: Clear any error styling
   */
  public clearError(): void {
    if (this.inputElement) {
      this.inputElement.className = this.inputElement.className.replace(/border-red-300/g, 'border-gray-300');
    }
  }

  /**
   * ENHANCED: Set error styling
   */
  public setError(error: string): void {
    if (this.inputElement) {
      this.inputElement.className = this.inputElement.className.replace(/border-gray-300/g, 'border-red-300');
    }
    // Update the component to show error
    this.update({ error });
  }

  public render(): string {
    const {
      type = 'text',
      placeholder = '',
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