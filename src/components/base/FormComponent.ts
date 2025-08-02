// ========================================
// src/components/base/FormComponent.ts - Form Component Base
// ========================================

import { type ComponentProps, type ComponentState, Component, type ComponentOptions } from "./Component";


export interface FormComponentProps extends ComponentProps {
  onSubmit?: (data: Record<string, any>) => void;
  validation?: Record<string, (value: any) => string | null>;
}

export interface FormComponentState extends ComponentState {
  errors: Record<string, string>;
  isSubmitting: boolean;
}

/**
 * Base class for form components
 */
export abstract class FormComponent<P extends FormComponentProps = FormComponentProps> 
  extends Component<P, FormComponentState> {

  constructor(options: ComponentOptions & { props?: P } = {}) {
    super({
      ...options,
      state: {
        errors: {},
        isSubmitting: false,
        ...options.state
      }
    });
  }

  /**
   * Get form data
   */
  protected getFormData(): Record<string, any> {
    if (!this.el) return {};

    const form = this.el.querySelector('form');
    if (!form) return {};

    const formData = new FormData(form);
    const data: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  }

  /**
   * Validate form data
   */
  protected validateForm(data: Record<string, any>): Record<string, string> {
    const errors: Record<string, string> = {};
    const validation = this.props.validation || {};

    for (const [field, validator] of Object.entries(validation)) {
      const error = validator(data[field]);
      if (error) {
        errors[field] = error;
      }
    }

    return errors;
  }

  /**
   * Handle form submission
   */
  protected async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.state.isSubmitting) {
      return;
    }

    this.setState({ isSubmitting: true, errors: {} });

    try {
      const data = this.getFormData();
      const errors = this.validateForm(data);

      if (Object.keys(errors).length > 0) {
        this.setState({ errors, isSubmitting: false });
        return;
      }

      if (this.props.onSubmit) {
        await this.props.onSubmit(data);
      }

    } catch (error) {
      console.error('Form submission error:', error);
      this.setState({ 
        errors: { general: 'An error occurred. Please try again.' },
        isSubmitting: false 
      });
    } finally {
      this.setState({ isSubmitting: false });
    }
  }

  /**
   * Show field error
   */
  protected showFieldError(fieldName: string): string {
    const error = this.state.errors[fieldName];
    return error ? `<div class="text-red-500 text-sm mt-1">${error}</div>` : '';
  }

  /**
   * Get field classes with error state
   */
  protected getFieldClasses(fieldName: string, baseClasses: string): string {
    const hasError = this.state.errors[fieldName];
    const errorClasses = hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                                   'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    return `${baseClasses} ${errorClasses}`;
  }
}

