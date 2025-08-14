// src/components/forms/LoginForm.ts - EMERGENCY FIX FOR FORM INPUTS

import type { FormComponentProps } from "../base/FormComponent";
import { FormComponent } from "../base/FormComponent";
import { Input, Button } from '../ui';

export interface LoginFormProps extends FormComponentProps {
  onLogin?: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading?: boolean;
}

export class LoginForm extends FormComponent<LoginFormProps> {
  private emailInput: Input | null = null;
  private passwordInput: Input | null = null;
  private submitButton: Button | null = null;
  
  // EMERGENCY: Direct form data tracking
  private formValues = {
    email: '',
    password: ''
  };

  protected setupEventListeners(): void {
    // EMERGENCY: Setup native form submission
    setTimeout(() => {
      this.setupNativeFormEvents();
    }, 100);
  }

  private setupNativeFormEvents(): void {
    const form = this.querySelector('form');
    if (form) {
      form.onsubmit = (e) => {
        console.log('📝 NATIVE form submit triggered');
        e.preventDefault();
        this.handleNativeSubmit(e);
      };
      console.log('✅ Native form submit handler attached');
    }

    // EMERGENCY: Direct input event binding
    const emailInput = this.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = this.querySelector('#login-password') as HTMLInputElement;

    if (emailInput) {
      emailInput.oninput = (e) => {
        const target = e.target as HTMLInputElement;
        this.formValues.email = target.value;
        console.log('📧 NATIVE email input:', this.formValues.email);
        
        // Validate in real-time without re-render
        this.validateEmailRealTime(this.formValues.email);
      };
      console.log('✅ Native email input handler attached');
    }

    if (passwordInput) {
      passwordInput.oninput = (e) => {
        const target = e.target as HTMLInputElement;
        this.formValues.password = target.value;
        console.log('🔒 NATIVE password input:', this.formValues.password);
        
        // Validate in real-time without re-render
        this.validatePasswordRealTime(this.formValues.password);
      };
      console.log('✅ Native password input handler attached');
    }
  }

  protected onMounted(): void {
    console.log('🔐 LoginForm mounted');
    this.createChildComponents();
    this.mountChildComponents();
    
    // EMERGENCY: Additional setup
    setTimeout(() => {
      this.setupNativeFormEvents();
    }, 200);
  }

  protected onUpdated(): void {
    console.log('🔄 LoginForm updated');
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
    
    setTimeout(() => {
      this.setupNativeFormEvents();
    }, 200);
  }

  private createChildComponents(): void {
    console.log('🏗️ Creating child components...');

    this.emailInput = new Input({
      props: {
        type: 'email',
        id: 'login-email',
        name: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email',
        required: true,
        error: this.state.errors.email,
        onChange: (value: string) => {
          console.log('📧 Component email changed:', value);
          this.formValues.email = value;
        }
      }
    });

    this.passwordInput = new Input({
      props: {
        type: 'password',
        id: 'login-password',
        name: 'password',
        label: 'Password',
        placeholder: 'Enter your password',
        required: true,
        error: this.state.errors.password,
        onChange: (value: string) => {
          console.log('🔒 Component password changed:', value);
          this.formValues.password = value;
        }
      }
    });

    this.submitButton = new Button({
      props: {
        type: 'submit',
        variant: 'primary',
        loading: this.props.isLoading || this.state.isSubmitting,
        disabled: this.props.isLoading || this.state.isSubmitting,
        children: this.state.isSubmitting ? 'Logging in...' : 'Login'
      }
    });
  }

  private mountChildComponents(): void {
    const emailContainer = this.querySelector('#email-container');
    const passwordContainer = this.querySelector('#password-container');
    const buttonContainer = this.querySelector('#button-container');

    console.log('📍 Mounting components:', {
      emailContainer: !!emailContainer,
      passwordContainer: !!passwordContainer,
      buttonContainer: !!buttonContainer
    });

    if (emailContainer && this.emailInput) {
      this.emailInput.mount(emailContainer);
      this.addChildComponent(this.emailInput);
    }

    if (passwordContainer && this.passwordInput) {
      this.passwordInput.mount(passwordContainer);
      this.addChildComponent(this.passwordInput);
    }

    if (buttonContainer && this.submitButton) {
      this.submitButton.mount(buttonContainer);
      this.addChildComponent(this.submitButton);
    }
  }

  private unmountChildComponents(): void {
    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];
    this.emailInput = null;
    this.passwordInput = null;
    this.submitButton = null;
  }

  // EMERGENCY: Native form submission handler
  private async handleNativeSubmit(_event: Event): Promise<void> {
    console.log('📝 NATIVE form submission started');
    
    try {
      // Get values from multiple sources
      const emailValue = this.formValues.email || 
                         (this.querySelector('#login-email') as HTMLInputElement)?.value || 
                         this.emailInput?.getValue() || '';
      
      const passwordValue = this.formValues.password || 
                           (this.querySelector('#login-password') as HTMLInputElement)?.value || 
                           this.passwordInput?.getValue() || '';

      console.log('📊 Collected values:', {
        email: emailValue ? 'HAS_VALUE' : 'EMPTY',
        password: passwordValue ? 'HAS_VALUE' : 'EMPTY',
        emailLength: emailValue.length,
        passwordLength: passwordValue.length
      });

      // Validate
      if (!emailValue || !passwordValue) {
        console.error('❌ Missing credentials');
        this.setStateQuiet({
          errors: {
            general: 'Please enter both email and password'
          }
        });
        this.updateGeneralError('Please enter both email and password');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        console.error('❌ Invalid email format');
        this.setStateQuiet({
          errors: {
            email: 'Please enter a valid email address'
          }
        });
        this.updateFieldError('email', 'Please enter a valid email address');
        return;
      }

      // Clear errors and set loading
      this.setStateQuiet({ 
        errors: {}, 
        isSubmitting: true 
      });
      this.clearAllErrors();

      // Call login handler
      if (this.props.onLogin) {
        console.log('✅ Calling onLogin handler');
        await this.props.onLogin({
          email: emailValue,
          password: passwordValue
        });
      } else {
        console.error('❌ No onLogin handler provided');
        throw new Error('No login handler available');
      }

    } catch (error) {
      console.error('❌ Login submission error:', error);
      this.setStateQuiet({
        errors: {
          general: error instanceof Error ? error.message : 'Login failed. Please try again.'
        },
        isSubmitting: false
      });
      this.updateGeneralError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      this.setStateQuiet({ isSubmitting: false });
    }
  }

  // EMERGENCY: Override base class form submission
  protected async handleSubmit(event: Event): Promise<void> {
    return this.handleNativeSubmit(event);
  }

  /**
   * Real-time validation without re-render
   */
  private validateEmailRealTime(email: string): void {
    if (!email) return;
    
    const errors = { ...this.state.errors };
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    } else {
      delete errors.email;
    }
    
    // Use quiet state update to avoid re-render during typing
    this.setStateQuiet({ errors });
    
    // Update only the error display if needed
    this.updateFieldError('email', errors.email);
  }

  private validatePasswordRealTime(password: string): void {
    if (!password) return;
    
    const errors = { ...this.state.errors };
    
    if (password.length < 1) {
      errors.password = 'Password is required';
    } else {
      delete errors.password;
    }
    
    // Use quiet state update to avoid re-render during typing
    this.setStateQuiet({ errors });
    
    // Update only the error display if needed
    this.updateFieldError('password', errors.password);
  }

  /**
   * Update individual field error without full re-render
   */
  private updateFieldError(fieldName: string, error?: string): void {
    const input = this.querySelector(`#login-${fieldName}`) as HTMLInputElement;
    if (!input) return;
    
    const container = input.closest('[data-component="input"]');
    if (!container) return;
    
    // Find or create error element
    let errorElement = container.querySelector('.text-red-600');
    
    if (error) {
      if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'text-sm text-red-600';
        container.appendChild(errorElement);
      }
      errorElement.textContent = error;
      
      // Update input styling
      input.className = input.className.replace(/border-gray-300|border-red-300/g, 'border-red-300');
    } else {
      if (errorElement) {
        errorElement.remove();
      }
      
      // Reset input styling
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
   * Clear all error displays
   */
  public clearAllErrors(): void {
    this.updateFieldError('email');
    this.updateFieldError('password');
    this.updateGeneralError();
  }

  public render(): string {
    const { errors } = this.state;

    return `
      <div data-component="login-form" class="w-full max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p class="text-gray-600">Sign in to your account</p>
          </div>

          ${errors.general ? `
            <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6 general-error">
              <p class="text-red-800 text-sm">${errors.general}</p>
            </div>
          ` : ''}

          <form class="space-y-6" novalidate>
            <div id="email-container"></div>
            <div id="password-container"></div>

            <div id="button-container" class="w-full"></div>

            <div class="text-center">
              <p class="text-sm text-gray-600">
                Don't have an account? 
                <a href="#" class="text-blue-600 hover:text-blue-500 underline">Sign up</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}