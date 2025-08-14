// src/components/base/FormComponent.ts - ENHANCED BUT BACKWARD COMPATIBLE

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
 * Enhanced FormComponent base class - FULLY BACKWARD COMPATIBLE
 * Existing form components will continue to work without changes
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
   * Get form data - ENHANCED with better error handling
   */
  protected getFormData(): Record<string, any> {
    if (!this.el) {
      console.warn('FormComponent: Cannot get form data - component not mounted');
      return {};
    }

    const form = this.el.querySelector('form');
    if (!form) {
      console.warn('FormComponent: Cannot get form data - form element not found');
      return {};
    }

    try {
      const formData = new FormData(form);
      const data: Record<string, any> = {};

      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      // ENHANCED: Also collect checkbox states that might not be in FormData
      const checkboxes = form.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(checkbox => {
        if (checkbox.name && !data.hasOwnProperty(checkbox.name)) {
          data[checkbox.name] = checkbox.checked;
        }
      });

      return data;
    } catch (error) {
      console.error('FormComponent: Error collecting form data:', error);
      return {};
    }
  }

  /**
   * Validate form data - unchanged
   */
  protected validateForm(data: Record<string, any>): Record<string, string> {
    const errors: Record<string, string> = {};
    const validation = this.props.validation || {};

    for (const [field, validator] of Object.entries(validation)) {
      try {
        const error = validator(data[field]);
        if (error) {
          errors[field] = error;
        }
      } catch (validationError) {
        console.error(`FormComponent: Validation error for field ${field}:`, validationError);
        errors[field] = 'Validation error occurred';
      }
    }

    return errors;
  }

  /**
   * Handle form submission - ENHANCED with better error handling
   */
  protected async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.state.isSubmitting) {
      console.warn('FormComponent: Form already submitting, ignoring duplicate submission');
      return;
    }

    console.log('FormComponent: Handling form submission');

    this.setState({ isSubmitting: true, errors: {} });

    try {
      const data = this.getFormData();
      console.log('FormComponent: Form data collected:', Object.keys(data));

      const errors = this.validateForm(data);

      if (Object.keys(errors).length > 0) {
        console.warn('FormComponent: Validation failed:', errors);
        this.setState({ errors, isSubmitting: false });
        return;
      }

      if (this.props.onSubmit) {
        console.log('FormComponent: Calling onSubmit handler');
        await this.props.onSubmit(data);
        console.log('FormComponent: onSubmit completed successfully');
      } else {
        console.warn('FormComponent: No onSubmit handler provided');
      }

    } catch (error) {
      console.error('FormComponent: Form submission error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      
      this.setState({ 
        errors: { general: errorMessage },
        isSubmitting: false 
      });
    } finally {
      // Only set isSubmitting to false if no error occurred in setState above
      if (!this.state.errors.general) {
        this.setState({ isSubmitting: false });
      }
    }
  }

  /**
   * Show field error - unchanged
   */
  protected showFieldError(fieldName: string): string {
    const error = this.state.errors[fieldName];
    return error ? `<div class="text-red-500 text-sm mt-1">${error}</div>` : '';
  }

  /**
   * Get field classes with error state - unchanged
   */
  protected getFieldClasses(fieldName: string, baseClasses: string): string {
    const hasError = this.state.errors[fieldName];
    const errorClasses = hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                                   'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    return `${baseClasses} ${errorClasses}`;
  }

  /**
   * NEW: Clear specific field error
   */
  protected clearFieldError(fieldName: string): void {
    if (this.state.errors[fieldName]) {
      const newErrors = { ...this.state.errors };
      delete newErrors[fieldName];
      this.setStateQuiet({ errors: newErrors });
    }
  }

  /**
   * NEW: Set specific field error
   */
  protected setFieldError(fieldName: string, error: string): void {
    const newErrors = { ...this.state.errors };
    newErrors[fieldName] = error;
    this.setStateQuiet({ errors: newErrors });
  }

  /**
   * NEW: Clear all errors
   */
  protected clearAllErrors(): void {
    if (Object.keys(this.state.errors).length > 0) {
      this.setStateQuiet({ errors: {} });
    }
  }

  /**
   * NEW: Check if form has any errors
   */
  protected hasErrors(): boolean {
    return Object.keys(this.state.errors).length > 0;
  }

  /**
   * NEW: Check if form is valid (no errors and not submitting)
   */
  protected isFormValid(): boolean {
    return !this.hasErrors() && !this.state.isSubmitting;
  }

  /**
   * NEW: Get form submission state
   */
  protected getSubmissionState(): {
    isSubmitting: boolean;
    hasErrors: boolean;
    errors: Record<string, string>;
    canSubmit: boolean;
  } {
    return {
      isSubmitting: this.state.isSubmitting,
      hasErrors: this.hasErrors(),
      errors: { ...this.state.errors },
      canSubmit: this.isFormValid()
    };
  }

  /**
   * NEW: Reset form state
   */
  protected resetForm(): void {
    this.setState({
      errors: {},
      isSubmitting: false
    });

    // Also reset form inputs
    const form = this.querySelector('form');
    if (form) {
      try {
        form.reset();
      } catch (error) {
        console.warn('FormComponent: Error resetting form:', error);
      }
    }
  }
}