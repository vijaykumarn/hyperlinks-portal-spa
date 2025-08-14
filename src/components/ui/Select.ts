// src/components/ui/Select.ts

import { Component, type ComponentProps } from '../base/Component';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends ComponentProps {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  label?: string;
  error?: string;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (value: string | string[], event: Event) => void;
}

export class Select extends Component<SelectProps> {
  private currentValue: string | string[] = '';

  protected setupEventListeners(): void {
    const select = this.querySelector<HTMLSelectElement>('select');
    if (!select) {
      console.error('❌ Select element not found in Select component');
      return;
    }

    console.log('🔧 Setting up Select event listeners for:', this.props.name);

    // Set initial value
    if (this.props.multiple) {
      this.currentValue = Array.isArray(this.props.value) ? this.props.value : this.props.value ? [this.props.value] : [];
      if (Array.isArray(this.currentValue)) {
        Array.from(select.options).forEach(option => {
          option.selected = this.currentValue.includes(option.value);
        });
      }
    } else {
      this.currentValue = this.props.value || '';
      if (this.currentValue) {
        select.value = this.currentValue as string;
      }
    }

    // Handle selection changes
    this.addEventListener(select, 'change', (e) => {
      const target = e.target as HTMLSelectElement;

      if (this.props.multiple) {
        const selectedValues = Array.from(target.selectedOptions).map(option => option.value);
        this.currentValue = selectedValues;
        console.log(`📝 Select ${this.props.name} changed to:`, selectedValues);
      } else {
        this.currentValue = target.value;
        console.log(`📝 Select ${this.props.name} changed to:`, target.value);
      }

      if (this.props.onChange) {
        this.props.onChange(this.currentValue, e);
      }
    });

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
    const select = this.querySelector<HTMLSelectElement>('select');
    if (select) {
      if (this.props.multiple) {
        const values = Array.isArray(this.props.value) ? this.props.value : this.props.value ? [this.props.value] : [];
        Array.from(select.options).forEach(option => {
          option.selected = values.includes(option.value);
        });
        this.currentValue = values;
      } else {
        const valueToSet = this.props.value || '';
        select.value = valueToSet;
        this.currentValue = valueToSet;
      }
      console.log(`🔄 Select ${this.props.name} synced to:`, this.currentValue);
    }
  }

  public getValue(): string | string[] {
    // Always get the latest value from the DOM element
    const select = this.querySelector<HTMLSelectElement>('select');
    if (select) {
      if (this.props.multiple) {
        this.currentValue = Array.from(select.selectedOptions).map(option => option.value);
      } else {
        this.currentValue = select.value;
      }
      console.log(`📤 Select ${this.props.name} getValue():`, this.currentValue);
    }
    return this.currentValue;
  }

  public setValue(value: string | string[]): void {
    const select = this.querySelector<HTMLSelectElement>('select');
    if (select) {
      if (this.props.multiple && Array.isArray(value)) {
        Array.from(select.options).forEach(option => {
          option.selected = value.includes(option.value);
        });
        this.currentValue = value;
      } else if (!this.props.multiple && typeof value === 'string') {
        select.value = value;
        this.currentValue = value;
      }
      console.log(`📥 Select ${this.props.name} setValue():`, value);
    }
  }

  private getSizeClasses(): string {
    const { size = 'md' } = this.props;
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg'
    };
    return sizeClasses[size];
  }

  public render(): string {
    const {
      options = [],
      value,
      placeholder = 'Select an option',
      disabled = false,
      required = false,
      name = '',
      id = '',
      label = '',
      error = '',
      multiple = false
    } = this.props;

    const sizeClasses = this.getSizeClasses();
    const selectClasses = `
      block w-full ${sizeClasses} border rounded-md shadow-sm 
      focus:outline-none focus:ring-2 focus:ring-offset-2 
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      ${error ? 
        'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
      }
    `.trim();

    // Use current value if available, otherwise use prop value
    const displayValue = this.currentValue !== undefined ? this.currentValue : value;

    return `
      <div data-component="select">
        ${label ? `
          <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">
            ${label}
            ${required ? '<span class="text-red-500">*</span>' : ''}
          </label>
        ` : ''}
        
        <select
          id="${id}"
          name="${name}"
          class="${selectClasses}"
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
          ${multiple ? 'multiple' : ''}
        >
          ${!multiple && placeholder ? `
            <option value="" disabled ${!displayValue ? 'selected' : ''}>
              ${placeholder}
            </option>
          ` : ''}
          
          ${options.map(option => {
            let isSelected = false;
            if (multiple && Array.isArray(displayValue)) {
              isSelected = displayValue.includes(option.value);
            } else {
              isSelected = displayValue === option.value;
            }
            
            return `
              <option 
                value="${option.value}" 
                ${isSelected ? 'selected' : ''}
                ${option.disabled ? 'disabled' : ''}
              >
                ${option.label}
              </option>
            `;
          }).join('')}
        </select>
        
        ${error ? `
          <p class="mt-1 text-sm text-red-600">${error}</p>
        ` : ''}
      </div>
    `;
  }
}