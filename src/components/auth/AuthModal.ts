// src/components/auth/AuthModal.ts - FIXED ALL TYPE ERRORS

import { Component, type ComponentProps } from '../base/Component';
import { Modal } from '../ui';
import { LoginForm } from '../forms/LoginForm';
import { RegistrationForm } from './RegistrationForm';
import { EmailVerification } from './EmailVerification';
import type { RegistrationRequest, LoginRequest } from '../../services/auth/types';

export type AuthModalMode = 'login' | 'register' | 'verification' | 'closed';

export interface AuthModalProps extends ComponentProps {
  mode: AuthModalMode;
  onClose?: () => void;
  onLogin?: (credentials: LoginRequest) => Promise<void>;
  onRegister?: (data: RegistrationRequest) => Promise<void>;
  onGoogleAuth?: (mode: 'login' | 'register') => Promise<void>;
  onResendVerification?: () => Promise<void>;
  verificationEmail?: string;
  isLoading?: boolean;
  showGoogleOption?: boolean;
  resendCooldown?: number;
}

export class AuthModal extends Component<AuthModalProps> {
  private modal: Modal | null = null;
  private loginForm: LoginForm | null = null;
  private registrationForm: RegistrationForm | null = null;
  private emailVerification: EmailVerification | null = null;

  protected setupEventListeners(): void {
    // Event listeners will be handled by child components
  }

  protected onMounted(): void {
    console.log('🔐 AuthModal mounted with mode:', this.props.mode);
    this.createChildComponents();
    this.mountChildComponents();
  }

  protected onUpdated(): void {
    console.log('🔄 AuthModal updated to mode:', this.props.mode);
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
  }

  private createChildComponents(): void {
    // Create modal wrapper
    this.modal = new Modal({
      props: {
        isOpen: this.props.mode !== 'closed',
        onClose: this.props.onClose,
        closeOnBackdrop: true,
        children: this.getModalContent()
      }
    });
  }

  private getModalContent(): string {
    const { mode } = this.props;

    switch (mode) {
      case 'login':
        return '<div id="login-form-container"></div>';
      case 'register':
        return '<div id="registration-form-container"></div>';
      case 'verification':
        return '<div id="verification-container"></div>';
      default:
        return '';
    }
  }

  private mountChildComponents(): void {
    const modalContainer = this.querySelector('#auth-modal-container');
    
    if (modalContainer && this.modal) {
      this.modal.mount(modalContainer);
      this.addChildComponent(this.modal);

      // Mount specific form components after modal is mounted
      setTimeout(() => {
        this.mountFormComponents();
      }, 50);
    }
  }

  private mountFormComponents(): void {
    const { mode } = this.props;

    switch (mode) {
      case 'login':
        this.mountLoginForm();
        break;
      case 'register':
        this.mountRegistrationForm();
        break;
      case 'verification':
        this.mountEmailVerification();
        break;
    }
  }

  private mountLoginForm(): void {
    const container = this.querySelector('#login-form-container');
    if (!container) return;

    this.loginForm = new LoginForm({
      props: {
        onLogin: this.props.onLogin,
        isLoading: this.props.isLoading,
        validation: {
          email: (value: string) => {
            if (!value) return 'Email is required';
            if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
            return null;
          },
          password: (value: string) => {
            if (!value) return 'Password is required';
            return null;
          }
        }
      }
    });

    this.loginForm.mount(container);
    this.addChildComponent(this.loginForm);

    // Add mode switching and Google auth to login form
    this.addLoginFormExtensions(container);
  }

  private mountRegistrationForm(): void {
    const container = this.querySelector('#registration-form-container');
    if (!container) return;

    this.registrationForm = new RegistrationForm({
      props: {
        onRegister: this.props.onRegister,
        onSwitchToLogin: () => this.switchMode('login'),
        onGoogleRegister: () => {
          if (this.props.onGoogleAuth) {
            this.props.onGoogleAuth('register');
          }
        },
        isLoading: this.props.isLoading,
        showGoogleOption: this.props.showGoogleOption
      }
    });

    this.registrationForm.mount(container);
    this.addChildComponent(this.registrationForm);
  }

  private mountEmailVerification(): void {
    const container = this.querySelector('#verification-container');
    if (!container || !this.props.verificationEmail) return;

    this.emailVerification = new EmailVerification({
      props: {
        email: this.props.verificationEmail,
        onResendVerification: this.props.onResendVerification,
        onBackToLogin: () => this.switchMode('login'),
        isResending: this.props.isLoading,
        resendCooldown: this.props.resendCooldown
      }
    });

    this.emailVerification.mount(container);
    this.addChildComponent(this.emailVerification);
  }

  private addLoginFormExtensions(container: HTMLElement): void {
    // Add switch to register link
    const switchContainer = document.createElement('div');
    switchContainer.className = 'mt-6 text-center';
    switchContainer.innerHTML = `
      <p class="text-sm text-gray-600">
        Don't have an account? 
        <button 
          id="switch-to-register" 
          class="text-blue-600 hover:text-blue-500 font-medium underline bg-none border-none cursor-pointer"
        >
          Sign up
        </button>
      </p>
    `;

    container.appendChild(switchContainer);

    // Add event listener for switch - FIXED TYPE ERROR
    const switchBtn = switchContainer.querySelector('#switch-to-register') as HTMLElement;
    if (switchBtn) {
      this.addEventListener(switchBtn, 'click', () => {
        this.switchMode('register');
      });
    }

    // Add Google login option if enabled
    if (this.props.showGoogleOption) {
      const googleContainer = document.createElement('div');
      googleContainer.className = 'mt-4';
      googleContainer.innerHTML = `
        <div class="relative mb-4">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>
        <button 
          id="google-login-btn"
          class="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          ${this.props.isLoading ? 'disabled' : ''}
        >
          <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      `;

      // Insert before the switch container
      container.insertBefore(googleContainer, switchContainer);

      // Add event listener for Google login - FIXED TYPE ERROR
      const googleBtn = googleContainer.querySelector('#google-login-btn') as HTMLElement;
      if (googleBtn) {
        this.addEventListener(googleBtn, 'click', () => {
          if (this.props.onGoogleAuth && !this.props.isLoading) {
            this.props.onGoogleAuth('login');
          }
        });
      }
    }
  }

  private unmountChildComponents(): void {
    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];
    this.modal = null;
    this.loginForm = null;
    this.registrationForm = null;
    this.emailVerification = null;
  }

  private switchMode(newMode: AuthModalMode): void {
    // This should trigger a parent component update
    if (this.props.onClose) {
      // Emit a custom event that parent can listen to
      const event = new CustomEvent('auth-mode-change', {
        detail: { mode: newMode }
      });
      window.dispatchEvent(event);
    }
  }

  public render(): string {
    return `
      <div data-component="auth-modal">
        <div id="auth-modal-container"></div>
      </div>
    `;
  }

  /**
   * Get current mode
   */
  public getCurrentMode(): AuthModalMode {
    return this.props.mode;
  }

  /**
   * Update verification email and cooldown
   */
  public updateVerificationState(email: string, cooldown?: number): void {
    if (this.emailVerification) {
      this.emailVerification.update({
        email,
        resendCooldown: cooldown
      });
    }
  }
}