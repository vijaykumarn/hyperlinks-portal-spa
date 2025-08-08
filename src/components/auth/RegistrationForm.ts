// src/components/auth/RegistrationForm.ts

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

  protected setupEventListeners(): void {
    const form = this.querySelector('form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
    }
  }

  protected onMounted(): void {
    console.log('📝 RegistrationForm mounted, creating child components...');
    this.createChildComponents();
    this.mountChildComponents();
  }

  protected onUpdated(): void {
    console.log('🔄 RegistrationForm updated, re-creating child components...');
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
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
          this.validateUsernameRealTime(value);
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
          this.validateEmailRealTime(value);
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
          this.validatePasswordRealTime(value);
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
        error: this.state.errors.organisation
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
    const usernameContainer = this.querySelector('#username-container');
    const emailContainer = this.querySelector('#email-container');
    const passwordContainer = this.querySelector('#password-container');
    const organisationContainer = this.querySelector('#organisation-container');
    const registerButtonContainer = this.querySelector('#register-button-container');
    const googleButtonContainer = this.querySelector('#google-button-container');
    const switchButtonContainer = this.querySelector('#switch-button-container');

    if (usernameContainer && this.usernameInput) {
      this.usernameInput.mount(usernameContainer);
      this.addChildComponent(this.usernameInput);
    }

    if (emailContainer && this.emailInput) {
      this.emailInput.mount(emailContainer);
      this.addChildComponent(this.emailInput);
    }

    if (passwordContainer && this.passwordInput) {
      this.passwordInput.mount(passwordContainer);
      this.addChildComponent(this.passwordInput);
    }

    if (organisationContainer && this.organisationInput) {
      this.organisationInput.mount(organisationContainer);
      this.addChildComponent(this.organisationInput);
    }

    if (registerButtonContainer && this.registerButton) {
      this.registerButton.mount(registerButtonContainer);
      this.addChildComponent(this.registerButton);
    }

    if (googleButtonContainer && this.googleButton) {
      this.googleButton.mount(googleButtonContainer);
      this.addChildComponent(this.googleButton);
    }

    if (switchButtonContainer && this.switchToLoginButton) {
      this.switchToLoginButton.mount(switchButtonContainer);
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

  protected async handleSubmit(event: Event): Promise<void> {
    console.log('📝 RegistrationForm submission started...');
    event.preventDefault();

    const formData = this.getFormData();
    console.log('📊 Registration form data collected:', {
      username: formData.username || 'MISSING',
      email: formData.email || 'MISSING',
      organisation: formData.organisation || 'none',
      terms: formData.terms || false,
      marketing: formData.marketing || false
    });

    // Validate form
    const errors = this.validateForm(formData);
    if (Object.keys(errors).length > 0) {
      console.warn('⚠️ RegistrationForm validation failed:', errors);
      this.setState({ errors, isSubmitting: false });
      return;
    }

    // Prepare registration data
    const registrationData: RegistrationRequest = {
      username: formData.username as string,
      email: formData.email as string,
      password: formData.password as string,
      organisation: (formData.organisation as string) || undefined,
      terms: Boolean(formData.terms),
      marketing: Boolean(formData.marketing)
    };

    if (this.props.onRegister) {
      console.log('✅ RegistrationForm validation passed, calling onRegister...');
      
      this.setState({ isSubmitting: true, errors: {} });
      
      try {
        await this.props.onRegister(registrationData);
      } catch (error) {
        console.error('❌ RegistrationForm onRegister failed:', error);
        this.setState({
          errors: { general: 'Registration failed. Please try again.' },
          isSubmitting: false
        });
      } finally {
        this.setState({ isSubmitting: false });
      }
    }
  }

  /**
   * Enhanced form data collection
   */
  protected getFormData(): Record<string, any> {
    const data: Record<string, any> = {};
    
    // Get data from child components
    if (this.usernameInput) {
      data.username = this.usernameInput.getValue();
    }
    if (this.emailInput) {
      data.email = this.emailInput.getValue();
    }
    if (this.passwordInput) {
      data.password = this.passwordInput.getValue();
    }
    if (this.organisationInput) {
      data.organisation = this.organisationInput.getValue();
    }

    // Get checkbox values from form elements
    const form = this.querySelector('form');
    if (form) {
      const termsCheckbox = form.querySelector('#terms') as HTMLInputElement;
      const marketingCheckbox = form.querySelector('#marketing') as HTMLInputElement;
      
      data.terms = termsCheckbox?.checked || false;
      data.marketing = marketingCheckbox?.checked || false;
    }

    return data;
  }

  /**
   * Real-time validation methods
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
    
    this.setState({ errors });
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
    
    this.setState({ errors });
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
    
    this.setState({ errors });
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
            <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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

          <form class="space-y-4">
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
                <p class="text-red-600 text-sm">${errors.terms}</p>
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