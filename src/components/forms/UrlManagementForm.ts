// src/components/forms/UrlManagementForm.ts

import { FormComponent, type FormComponentProps } from '../base/FormComponent';
import { Input, Button, Select } from '../ui';
import type { UrlData } from '../../types/app';


export interface UrlManagementFormProps extends FormComponentProps {
  url?: UrlData; // For editing existing URLs
  onSave?: (data: {
    originalUrl: string;
    customCode?: string;
    expiresAt?: number;
    description?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}


export class UrlManagementForm extends FormComponent<UrlManagementFormProps> {
  private originalUrlInput: Input | null = null;
  private customCodeInput: Input | null = null;
  private descriptionInput: Input | null = null;
  private expirationSelect: Select | null = null;
  private submitButton: Button | null = null;


  protected setupEventListeners(): void {
    const form = this.querySelector('form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
    }
  }


  protected onMounted(): void {
    this.createChildComponents();
    this.mountChildComponents();
  }


  protected onUpdated(): void {
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
  }


  private createChildComponents(): void {
    const { url, mode = 'create' } = this.props;


    // Original URL Input
    this.originalUrlInput = new Input({
      props: {
        type: 'url',
        id: 'original-url',
        name: 'originalUrl',
        label: 'Original URL',
        placeholder: 'https://example.com/very-long-url',
        required: true,
        value: url?.originalUrl || '',
        error: this.state.errors.originalUrl
      }
    });


    // Custom Short Code Input
    this.customCodeInput = new Input({
      props: {
        type: 'text',
        id: 'custom-code',
        name: 'customCode',
        label: 'Custom Short Code (Optional)',
        placeholder: 'my-custom-link',
        value: url?.shortCode || '',
        error: this.state.errors.customCode
      }
    });


    // Description Input
    this.descriptionInput = new Input({
      props: {
        type: 'text',
        id: 'description',
        name: 'description',
        label: 'Description (Optional)',
        placeholder: 'Brief description of this link',
        error: this.state.errors.description
      }
    });


    // Expiration Select
    this.expirationSelect = new Select({
      props: {
        id: 'expiration',
        name: 'expiration',
        label: 'Expiration',
        value: this.getExpirationValue(url?.expiresAt),
        options: [
          { value: '', label: 'Never expires' },
          { value: '1h', label: '1 Hour' },
          { value: '1d', label: '1 Day' },
          { value: '1w', label: '1 Week' },
          { value: '1m', label: '1 Month' },
          { value: '3m', label: '3 Months' },
          { value: '6m', label: '6 Months' },
          { value: '1y', label: '1 Year' }
        ],
        error: this.state.errors.expiration
      }
    });


    // Submit Button
    this.submitButton = new Button({
      props: {
        type: 'submit',
        variant: 'primary',
        loading: this.props.isLoading || this.state.isSubmitting,
        disabled: this.props.isLoading || this.state.isSubmitting,
        children: this.state.isSubmitting 
          ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
          : (mode === 'edit' ? 'Update URL' : 'Create Short URL')
      }
    });
  }


  private mountChildComponents(): void {
    const containers = {
      originalUrl: this.querySelector('#original-url-container'),
      customCode: this.querySelector('#custom-code-container'),
      description: this.querySelector('#description-container'),
      expiration: this.querySelector('#expiration-container'),
      submit: this.querySelector('#submit-container')
    };


    if (containers.originalUrl && this.originalUrlInput) {
      this.originalUrlInput.mount(containers.originalUrl);
      this.addChildComponent(this.originalUrlInput);
    }


    if (containers.customCode && this.customCodeInput) {
      this.customCodeInput.mount(containers.customCode);
      this.addChildComponent(this.customCodeInput);
    }


    if (containers.description && this.descriptionInput) {
      this.descriptionInput.mount(containers.description);
      this.addChildComponent(this.descriptionInput);
    }


    if (containers.expiration && this.expirationSelect) {
      this.expirationSelect.mount(containers.expiration);
      this.addChildComponent(this.expirationSelect);
    }


    if (containers.submit && this.submitButton) {
      this.submitButton.mount(containers.submit);
      this.addChildComponent(this.submitButton);
    }
  }


  private unmountChildComponents(): void {
    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];
    this.originalUrlInput = null;
    this.customCodeInput = null;
    this.descriptionInput = null;
    this.expirationSelect = null;
    this.submitButton = null;
  }


  private getExpirationValue(expiresAt?: number): string {
    if (!expiresAt) return '';


    const now = Date.now();
    const diffMs = expiresAt - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const diffWeeks = diffDays / 7;
    const diffMonths = diffDays / 30;
    const diffYears = diffDays / 365;


    if (diffHours <= 1) return '1h';
    if (diffDays <= 1) return '1d';
    if (diffWeeks <= 1) return '1w';
    if (diffMonths <= 1) return '1m';
    if (diffMonths <= 3) return '3m';
    if (diffMonths <= 6) return '6m';
    if (diffYears <= 1) return '1y';
    return '';
  }


  private calculateExpirationTimestamp(value: string): number | undefined {
    if (!value) return undefined;


    const now = Date.now();
    const multipliers: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1m': 30 * 24 * 60 * 60 * 1000,
      '3m': 3 * 30 * 24 * 60 * 60 * 1000,
      '6m': 6 * 30 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };


    const multiplier = multipliers[value];
    return multiplier ? now + multiplier : undefined;
  }


  protected async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();


    if (this.state.isSubmitting) return;


    this.setState({ isSubmitting: true, errors: {} });


    try {
      const formData = this.getFormData();
      const errors = this.validateForm(formData);


      if (Object.keys(errors).length > 0) {
        this.setState({ errors, isSubmitting: false });
        return;
      }


      if (this.props.onSave) {
        const expiresAt = this.calculateExpirationTimestamp(formData.expiration as string);


        await this.props.onSave({
          originalUrl: formData.originalUrl as string,
          customCode: formData.customCode as string || undefined,
          expiresAt,
          description: formData.description as string || undefined
        });
      }


    } catch (error) {
      console.error('Form submission error:', error);
      this.setState({
        errors: { general: 'Failed to save URL. Please try again.' },
        isSubmitting: false
      });
    } finally {
      this.setState({ isSubmitting: false });
    }
  }


  protected getFormData(): Record<string, any> {
    const data: Record<string, any> = {};


    if (this.originalUrlInput) {
      data.originalUrl = this.originalUrlInput.getValue();
    }


    if (this.customCodeInput) {
      data.customCode = this.customCodeInput.getValue();
    }


    if (this.descriptionInput) {
      data.description = this.descriptionInput.getValue();
    }


    if (this.expirationSelect) {
      data.expiration = this.expirationSelect.getValue();
    }


    return data;
  }


  protected validateForm(data: Record<string, any>): Record<string, string> {
    const errors: Record<string, string> = {};


    // Validate original URL
    if (!data.originalUrl) {
      errors.originalUrl = 'Original URL is required';
    } else {
      try {
        new URL(data.originalUrl);
      } catch {
        errors.originalUrl = 'Please enter a valid URL';
      }
    }


    // Validate custom code (optional)
    if (data.customCode) {
      const code = data.customCode.trim();
      if (code.length < 3) {
        errors.customCode = 'Custom code must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9-_]+$/.test(code)) {
        errors.customCode = 'Custom code can only contain letters, numbers, hyphens, and underscores';
      }
    }


    return errors;
  }


  public render(): string {
    const { errors } = this.state;
    const { mode = 'create' } = this.props;


    return `
      <form data-component="url-management-form" class="space-y-6">
        ${errors.general ? `
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <p class="text-red-800 text-sm">${errors.general}</p>
          </div>
        ` : ''}

        <div id="original-url-container"></div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div id="custom-code-container"></div>
          <div id="expiration-container"></div>
        </div>

        <div id="description-container"></div>

        <div class="flex items-center justify-between pt-4 border-t border-gray-200">
          <p class="text-sm text-gray-500">
            ${mode === 'edit' ? 'Update your shortened URL settings' : 'Create a new shortened URL'}
          </p>
          <div id="submit-container"></div>
        </div>
      </form>
    `;
  }
}