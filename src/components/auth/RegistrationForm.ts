// src/components/auth/RegistrationForm.ts - EMERGENCY FIX

import { FormComponent, type FormComponentProps } from '../base/FormComponent';
import { Input, Button } from '../ui';
import type { RegistrationRequest } from '../../services/auth/types';

export interface RegistrationFormProps extends FormComponentProps {
  onRegister?: (data: RegistrationRequest) => Promise<void>;
  onSwitchToLogin?: () => void;
  onGoogleRegister?: () => void;
  isLoading?: boolean;
  showGoogleOption?: boolean;
}

export class RegistrationForm extends FormComponent<RegistrationFormProps> {
  private usernameInput: Input | null = null;
  private emailInput: Input | null = null;
  private passwordInput: Input | null = null;
  private organisationInput: Input | null = null;
  private registerButton: Button | null = null;
  private googleButton: Button | null = null;
  private switchToLoginButton: Button | null = null;

  // EMERGENCY: Direct form data tracking
  private formValues = {
    username: '',
    email: '',
    password: '',
    organisation: '',
    terms: false,
    marketing: false
  };

  protected setupEventListeners(): void {
    // EMERGENCY: Setup native form events
    setTimeout(() => {
      this.setupNativeFormEvents();
    }, 100);
  }

  private setupNativeFormEvents(): void {
    const form = this.querySelector('form');
    if (form) {
      form.onsubmit = (e) => {
        console.log('📝 NATIVE registration form submit');
        e.preventDefault();
        this.handleNativeSubmit(e);
      };
    }

    // EMERGENCY: Direct input event binding
    const inputs = {
      username: this.querySelector('#reg-username') as HTMLInputElement,
      email: this.querySelector('#reg-email') as HTMLInputElement,
      password: this.querySelector('#reg-password') as HTMLInputElement,
      organisation: this.querySelector('#reg-organisation') as HTMLInputElement,
      terms: this.querySelector('#terms') as HTMLInputElement,
      marketing: this.querySelector('#marketing') as HTMLInputElement
    };

    if (inputs.username) {
      inputs.username.oninput = (e) => {
        this.formValues.username = (e.target as HTMLInputElement).value;
        console.log('👤 Username:', this.formValues.username);
        this.validateUsernameRealTime(this.formValues.username);
      };
    }

    if (inputs.email) {
      inputs.email.oninput = (e) => {
        this.formValues.email = (e.target as HTMLInputElement).value;
        console.log('📧 Email:', this.formValues.email);
        this.validateEmailRealTime(this.formValues.email);
      };
    }

    if (inputs.password) {
      inputs.password.oninput = (e) => {
        this.formValues.password = (e.target as HTMLInputElement).value;
        console.log('🔒 Password:', this.formValues.password ? 'HAS_VALUE' : 'EMPTY');
        this.validatePasswordRealTime(this.formValues.password);
      };
    }

    if (inputs.organisation) {
      inputs.organisation.oninput = (e) => {
        this.formValues.organisation = (e.target as HTMLInputElement).value;
        console.log('🏢 Organisation:', this.formValues.organisation);
      };
    }

    if (inputs.terms) {
      inputs.terms.onchange = (e) => {
        this.formValues.terms = (e.target as HTMLInputElement).checked;
        console.log('📋 Terms:', this.formValues.terms);
      };
    }

    if (inputs.marketing) {
      inputs.marketing.onchange = (e) => {
        this.formValues.marketing = (e.target as HTMLInputElement).checked;
        console.log('📢 Marketing:', this.formValues.marketing);
      };
    }
  }

  protected onMounted(): void {
    console.log('📝 RegistrationForm mounted');
    this.createChildComponents();
    this.mountChildComponents();
    
    setTimeout(() => {
      this.setupNativeFormEvents();
    }, 200);
  }

  protected onUpdated(): void {
    console.log('🔄 RegistrationForm updated');
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
    
    setTimeout(() => {
      this.setupNativeFormEvents();
    }, 200);
  }

  private createChildComponents(): void {
    // Username input
    this.usernameInput = new Input({
      props: {
        type: 'text',
        id: 'reg-username',
        name: 'username',
        label: 'Username',
        placeholder: 'Enter your username',
        required: true,
        error: this.state.errors.username,
        onChange: (value: string) => {
          this.formValues.username = value;
        }
      }
    });

    // Email input
    this.emailInput = new Input({
      props: {
        type: 'email',
        id: 'reg-email',
        name: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email address',
        required: true,
        error: this.state.errors.email,
        onChange: (value: string) => {
          this.formValues.email = value;
        }
      }
    });

    // Password input
    this.passwordInput = new Input({
      props: {
        type: 'password',
        id: 'reg-password',
        name: 'password',
        label: 'Password',
        placeholder: 'Create a strong password',
        required: true,
        error: this.state.errors.password,
        onChange: (value: string) => {
          this.formValues.password = value;
        }
      }
    });

    // Organisation input (optional)
    this.organisationInput = new Input({
      props: {
        type: 'text',
        id: 'reg-organisation',
        name: 'organisation',
        label: 'Organisation (Optional)',
        placeholder: 'Your company or organisation',
        required: false,
        error: this.state.errors.organisation,
        onChange: (value: string) => {
          this.formValues.organisation = value;
        }
      }
    });

    // Register button
    this.registerButton = new Button({
      props: {
        type: 'submit',
        variant: 'primary',
        loading: this.props.isLoading || this.state.isSubmitting,
        disabled: this.props.isLoading || this.state.isSubmitting,
        children: this.state.isSubmitting ? 'Creating Account...' : 'Create Account'
      }
    });

    // Google register button
    if (this.props.showGoogleOption) {
      this.googleButton = new Button({
        props: {
          type: 'button',
          variant: 'secondary',
          disabled: this.props.isLoading || this.state.isSubmitting,
          onClick: () => {
            if (this.props.onGoogleRegister) {
              this.props.onGoogleRegister();
            }
          },
          children: `
            <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          `
        }
      });
    }

    // Switch to login button
    this.switchToLoginButton = new Button({
      props: {
        type: 'button',
        variant: 'secondary',
        disabled: this.props.isLoading || this.state.isSubmitting,
        onClick: () => {
          if (this.props.onSwitchToLogin) {
            this.props.onSwitchToLogin();
          }
        },
        children: 'Already have an account? Sign In'
      }
    });
  }

  private mountChildComponents(): void {
    const containers = {
      username: this.querySelector('#username-container'),
      email: this.querySelector('#email-container'),
      password: this.querySelector('#password-container'),
      organisation: this.querySelector('#organisation-container'),
      register: this.querySelector('#register-button-container'),
      google: this.querySelector('#google-button-container'),
      switch: this.querySelector('#switch-button-container')
    };

    if (containers.username && this.usernameInput) {
      this.usernameInput.mount(containers.username);
      this.addChildComponent(this.usernameInput);
    }

    if (containers.email && this.emailInput) {
      this.emailInput.mount(containers.email);
      this.addChildComponent(this.emailInput);
    }

    if (containers.password && this.passwordInput) {
      this.passwordInput.mount(containers.password);
      this.addChildComponent(this.passwordInput);
    }

    if (containers.organisation && this.organisationInput) {
      this.organisationInput.mount(containers.organisation);
      this.addChildComponent(this.organisationInput);
    }

    if (containers.register && this.registerButton) {
      this.registerButton.mount(containers.register);
      this.addChildComponent(this.registerButton);
    }

    if (containers.google && this.googleButton) {
      this.googleButton.mount(containers.google);
      this.addChildComponent(this.googleButton);
    }

    if (containers.switch && this.switchToLoginButton) {
      this.switchToLoginButton.mount(containers.switch);
      this.addChildComponent(this.switchToLoginButton);
    }
  }

  private unmountChildComponents(): void {
    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];
    this.usernameInput = null;
    this.emailInput = null;
    this.passwordInput = null;
    this.organisationInput = null;
    this.registerButton = null;
    this.googleButton = null;
    this.switchToLoginButton = null;
  }

  // EMERGENCY: Native form submission handler
  private async handleNativeSubmit(event: Event): Promise<void> {
    console.log('📝 NATIVE registration submission started');
    
    try {
      // Collect values from multiple sources
      const formData = this.collectFormData();
      
      console.log('📊 Registration data collected:', {
        username: formData.username ? 'HAS_VALUE' : 'EMPTY',
        email: formData.email ? 'HAS_VALUE' : 'EMPTY',
        password: formData.password ? 'HAS_VALUE' : 'EMPTY',
        organisation: formData.organisation || 'none',
        terms: formData.terms,
        marketing: formData.marketing
      });

      // Validate form
      const errors = this.validateForm(formData);
      if (Object.keys(errors).length > 0) {
        console.warn('⚠️ Registration validation failed:', errors);
        this.setStateQuiet({ errors, isSubmitting: false });
        this.displayValidationErrors(errors);
        return;
      }

      // Prepare registration data
      const registrationData: RegistrationRequest = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        organisation: formData.organisation || undefined,
        terms: formData.terms,
        marketing: formData.marketing
      };

      this.setStateQuiet({ isSubmitting: true, errors: {} });
      this.clearAllErrors();

      if (this.props.onRegister) {
        console.log('✅ Calling onRegister handler');
        await this.props.onRegister(registrationData);
      } else {
        throw new Error('No registration handler available');
      }

    } catch (error) {
      console.error('❌ Registration submission error:', error);
      this.setStateQuiet({
        errors: { 
          general: error instanceof Error ? error.message : 'Registration failed. Please try again.' 
        },
        isSubmitting: false
      });
      this.updateGeneralError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      this.setStateQuiet({ isSubmitting: false });
    }
  }

  private collectFormData(): any {
    // Method 1: From tracked values
    let data = { ...this.formValues };

    // Method 2: From DOM elements
    const form = this.querySelector('form');
    if (form) {
      const inputs = {
        username: form.querySelector('#reg-username') as HTMLInputElement,
        email: form.querySelector('#reg-email') as HTMLInputElement,
        password: form.querySelector('#reg-password') as HTMLInputElement,
        organisation: form.querySelector('#reg-organisation') as HTMLInputElement,
        terms: form.querySelector('#terms') as HTMLInputElement,
        marketing: form.querySelector('#marketing') as HTMLInputElement
      };

      if (inputs.username?.value) data.username = inputs.username.value;
      if (inputs.email?.value) data.email = inputs.email.value;
      if (inputs.password?.value) data.password = inputs.password.value;
      if (inputs.organisation?.value) data.organisation = inputs.organisation.value;
      if (inputs.terms) data.terms = inputs.terms.checked;
      if (inputs.marketing) data.marketing = inputs.marketing.checked;
    }

    return data;
  }

  // Override base class method
  protected async handleSubmit(event: Event): Promise<void> {
    return this.handleNativeSubmit(event);
  }

  /**
   * Real-time validation methods without re-render
   */
  private validateUsernameRealTime(username: string): void {
    if (!username) return;
    
    const errors = { ...this.state.errors };
    
    if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (username.length > 20) {
      errors.username = 'Username cannot exceed 20 characters';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      errors.username = 'Username can only contain letters, numbers, dots, underscores and hyphens';
    } else {
      delete errors.username;
    }
    
    this.setStateQuiet({ errors });
    this.updateFieldError('username', errors.username);
  }

  private validateEmailRealTime(email: string): void {
    if (!email) return;
    
    const errors = { ...this.state.errors };
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    } else if (email.length > 255) {
      errors.email = 'Email cannot exceed 255 characters';
    } else {
      delete errors.email;
    }
    
    this.setStateQuiet({ errors });
    this.updateFieldError('email', errors.email);
  }

  private validatePasswordRealTime(password: string): void {
    if (!password) return;
    
    const errors = { ...this.state.errors };
    const feedback: string[] = [];
    
    if (password.length < 8) {
      feedback.push('At least 8 characters');
    }
    if (!/[a-z]/.test(password)) {
      feedback.push('One lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push('One uppercase letter');
    }
    if (!/\d/.test(password)) {
      feedback.push('One number');
    }
    if (!/[@$!%*?&]/.test(password)) {
      feedback.push('One special character (@$!%*?&)');
    }
    
    if (feedback.length > 0) {
      errors.password = `Password needs: ${feedback.join(', ')}`;
    } else {
      delete errors.password;
    }
    
    this.setStateQuiet({ errors });
    this.updateFieldError('password', errors.password);
  }

  /**
   * Update individual field error without full re-render
   */
  private updateFieldError(fieldName: string, error?: string): void {
    const input = this.querySelector(`#reg-${fieldName}`) as HTMLInputElement;
    if (!input) return;
    
    const container = input.closest('[data-component="input"]');
    if (!container) return;
    
    let errorElement = container.querySelector('.text-red-600');
    
    if (error) {
      if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'text-sm text-red-600';
        container.appendChild(errorElement);
      }
      errorElement.textContent = error;
      input.className = input.className.replace(/border-gray-300|border-red-300/g, 'border-red-300');
    } else {
      if (errorElement) {
        errorElement.remove();
      }
      input.className = input.className.replace(/border-red-300/g, 'border-gray-300');
    }
  }

  /**
   * Update general error message
   */
  private updateGeneralError(error?: string): void {
    const form = this.querySelector('form');
    if (!form) return;

    let errorContainer = form.querySelector('.general-error');
    
    if (error) {
      if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'bg-red-50 border border-red-200 rounded-md p-4 mb-6 general-error';
        form.insertBefore(errorContainer, form.firstChild);
      }
      errorContainer.innerHTML = `<p class="text-red-800 text-sm">${error}</p>`;
    } else {
      if (errorContainer) {
        errorContainer.remove();
      }
    }
  }

  /**
   * Display validation errors
   */
  private displayValidationErrors(errors: Record<string, string>): void {
    Object.entries(errors).forEach(([field, error]) => {
      if (field === 'general') {
        this.updateGeneralError(error);
      } else if (field === 'terms') {
        this.updateTermsError(error);
      } else {
        this.updateFieldError(field, error);
      }
    });
  }

  /**
   * Update terms checkbox error
   */
  private updateTermsError(error?: string): void {
    const termsContainer = this.querySelector('#terms')?.closest('.flex');
    if (!termsContainer) return;

    let errorElement = termsContainer.parentElement?.querySelector('.terms-error');
    
    if (error) {
      if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'text-red-600 text-sm terms-error';
        termsContainer.parentElement?.appendChild(errorElement);
      }
      errorElement.textContent = error;
    } else {
      if (errorElement) {
        errorElement.remove();
      }
    }
  }

  /**
   * Clear all error displays
   */
  private clearAllErrors(): void {
    this.updateFieldError('username');
    this.updateFieldError('email');
    this.updateFieldError('password');
    this.updateFieldError('organisation');
    this.updateGeneralError();
    this.updateTermsError();
  }

  public render(): string {
    const { errors } = this.state;
    const { showGoogleOption = true } = this.props;

    return `
      <div data-component="registration-form" class="w-full max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
            <p class="text-gray-600">Join us to start shortening your URLs</p>
          </div>

          ${errors.general ? `
            <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6 general-error">
              <p class="text-red-800 text-sm">${errors.general}</p>
            </div>
          ` : ''}

          <!-- Google Register Button -->
          ${showGoogleOption ? `
            <div id="google-button-container" class="mb-4"></div>
            <div class="relative mb-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
          ` : ''}

          <form class="space-y-4" novalidate>
            <div id="username-container"></div>
            <div id="email-container"></div>
            <div id="password-container"></div>
            <div id="organisation-container"></div>

            <!-- Terms and Marketing Checkboxes -->
            <div class="space-y-3">
              <div class="flex items-start">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  required
                  class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="terms" class="ml-2 text-sm text-gray-700">
                  I accept the 
                  <a href="/terms" class="text-blue-600 hover:text-blue-500 underline" target="_blank">
                    Terms and Conditions
                  </a> <span class="text-red-500">*</span>
                </label>
              </div>
              ${errors.terms ? `
                <p class="text-red-600 text-sm terms-error">${errors.terms}</p>
              ` : ''}

              <div class="flex items-start">
                <input
                  type="checkbox"
                  id="marketing"
                  name="marketing"
                  class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="marketing" class="ml-2 text-sm text-gray-700">
                  I would like to receive marketing communications and updates
                </label>
              </div>
            </div>

            <div id="register-button-container" class="w-full"></div>
          </form>

          <!-- Switch to Login -->
          <div class="mt-6 text-center">
            <div id="switch-button-container"></div>
          </div>
        </div>
      </div>
    `;
  }
}