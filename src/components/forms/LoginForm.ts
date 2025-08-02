// src/components/forms/LoginForm.ts - FIXED VERSION WITH TYPE SAFETY

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

  protected setupEventListeners(): void {
    const form = this.querySelector('form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
      console.log('✅ LoginForm submit listener attached');
    }
  }

  protected onMounted(): void {
    console.log('🔐 LoginForm mounted, creating child components...');
    this.createChildComponents();
    this.mountChildComponents();
  }

  protected onUpdated(): void {
    console.log('🔄 LoginForm updated, re-creating child components...');
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
  }

  private createChildComponents(): void {
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
          console.log('📧 Email input changed:', value ? '***' : 'EMPTY');
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
          console.log('🔒 Password input changed:', value ? '***' : 'EMPTY');
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
        // Note: No onClick for submit button - form submission handles this
      }
    });
  }

  private mountChildComponents(): void {
    const emailContainer = this.querySelector('#email-container');
    const passwordContainer = this.querySelector('#password-container');
    const buttonContainer = this.querySelector('#button-container');

    console.log('📍 LoginForm mounting children to containers:', {
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

  protected async handleSubmit(event: Event): Promise<void> {
    console.log('📝 LoginForm submission started...');
    event.preventDefault(); // Prevent default form submission
    
    // Get form data FIRST, before validation
    const formData = this.getFormData();
    console.log('📊 Form data collected:', {
      email: formData.email || 'MISSING',
      password: formData.password ? '***' : 'MISSING',
      emailLength: formData.email?.length || 0,
      passwordLength: formData.password?.length || 0,
      allKeys: Object.keys(formData)
    });

    // Validate the collected data
    const errors = this.validateForm(formData);
    if (Object.keys(errors).length > 0) {
      console.warn('⚠️ LoginForm validation failed:', errors);
      this.setState({ errors, isSubmitting: false });
      return;
    }

    // If we have onLogin handler and valid data, proceed
    if (this.props.onLogin && formData.email && formData.password) {
      console.log('✅ LoginForm validation passed, calling onLogin...');
      
      this.setState({ isSubmitting: true, errors: {} });
      
      try {
        await this.props.onLogin({
          email: formData.email as string,
          password: formData.password as string
        });
      } catch (error) {
        console.error('❌ LoginForm onLogin failed:', error);
        this.setState({
          errors: { general: 'Login failed. Please check your credentials.' },
          isSubmitting: false
        });
      } finally {
        this.setState({ isSubmitting: false });
      }
    } else {
      console.warn('⚠️ LoginForm: Missing onLogin handler or form data:', {
        hasOnLogin: !!this.props.onLogin,
        formData: formData
      });
    }
  }

  /**
   * Enhanced getFormData to ensure we capture all form fields properly
   */
  protected getFormData(): Record<string, any> {
    console.log('📋 Getting form data...');
    
    const data: Record<string, any> = {};
    
    // Method 1: Get data directly from our Input components
    if (this.emailInput) {
      const emailValue = this.emailInput.getValue();
      data.email = emailValue;
      console.log(`📧 Email from component: ${emailValue ? '***' : 'EMPTY'} (length: ${emailValue?.length || 0})`);
    }
    
    if (this.passwordInput) {
      const passwordValue = this.passwordInput.getValue();
      data.password = passwordValue;
      console.log(`🔒 Password from component: ${passwordValue ? '***' : 'EMPTY'} (length: ${passwordValue?.length || 0})`);
    }
    
    // Method 2: Fallback to form element scanning
    const form = this.querySelector('form');
    if (form) {
      console.log('📋 Form element found, scanning inputs as fallback...');
      
      // Get all input elements
      const inputs = form.querySelectorAll('input');
      console.log('📋 Input elements found:', inputs.length);
      
      inputs.forEach((input: HTMLInputElement) => {
        if (input.name && input.value && !data[input.name]) {
          data[input.name] = input.value;
          console.log(`📋 Input ${input.name}: ${input.value ? '***' : 'EMPTY'} (length: ${input.value?.length || 0})`);
        }
      });
      
      // Method 3: FormData as final fallback - FIXED TYPE CASTING
      try {
        const formElement = form as HTMLFormElement;
        const formData = new FormData(formElement);
        for (const [key, value] of formData.entries()) {
          if (!data[key] && value) { // Only if not already captured and has value
            data[key] = value;
            console.log(`📋 FormData ${key}: ${value ? '***' : 'EMPTY'} (length: ${value?.toString().length || 0})`);
          }
        }
      } catch (error) {
        console.warn('⚠️ FormData extraction failed:', error);
      }
    } else {
      console.error('❌ Form element not found for data collection');
    }
    
    console.log('📋 Final form data keys:', Object.keys(data));
    console.log('📋 Final data validity:', {
      hasEmail: !!data.email,
      hasPassword: !!data.password,
      emailLength: data.email?.length || 0,
      passwordLength: data.password?.length || 0
    });
    
    return data;
  }

  public render(): string {
    const { errors } = this.state;

    return `
      <form data-component="login-form" class="space-y-6">
        ${errors.general ? `
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <p class="text-red-800 text-sm">${errors.general}</p>
          </div>
        ` : ''}

        <div id="email-container"></div>
        <div id="password-container"></div>

        <div id="button-container" class="w-full"></div>

        <div class="text-center">
          <p class="text-sm text-gray-600">
            Don't have an account? 
            <a href="#" class="text-blue-600 hover:text-blue-500">Sign up</a>
          </p>
        </div>
      </form>
    `;
  }
}