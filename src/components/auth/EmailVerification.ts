// src/components/auth/EmailVerification.ts

import { Component, type ComponentProps } from '../base/Component';
import { Button } from '../ui';

export interface EmailVerificationProps extends ComponentProps {
  email: string;
  onResendVerification?: () => Promise<void>;
  onBackToLogin?: () => void;
  isResending?: boolean;
  resendCooldown?: number; // seconds until can resend again
}

export class EmailVerification extends Component<EmailVerificationProps> {
  private resendButton: Button | null = null;
  private backButton: Button | null = null;
  private cooldownTimer: NodeJS.Timeout | null = null;
  private remainingCooldown: number = 0;

  protected setupEventListeners(): void {
    // Setup cooldown timer if needed
    if (this.props.resendCooldown) {
      this.startCooldownTimer(this.props.resendCooldown);
    }
  }

  protected onMounted(): void {
    console.log('📧 EmailVerification mounted');
    this.createChildComponents();
    this.mountChildComponents();
  }

  protected onUpdated(): void {
    console.log('🔄 EmailVerification updated');
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
    
    // Restart cooldown if needed
    if (this.props.resendCooldown && this.props.resendCooldown > 0) {
      this.startCooldownTimer(this.props.resendCooldown);
    }
  }

  protected beforeUnmount(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  private createChildComponents(): void {
    const canResend = !this.props.isResending && this.remainingCooldown === 0;
    
    // Resend button
    this.resendButton = new Button({
      props: {
        type: 'button',
        variant: 'primary',
        loading: this.props.isResending,
        disabled: !canResend,
        onClick: async () => {
          if (this.props.onResendVerification && canResend) {
            try {
              await this.props.onResendVerification();
              // Start cooldown after successful resend
              this.startCooldownTimer(60); // 60 seconds cooldown
            } catch (error) {
              console.error('❌ Failed to resend verification:', error);
            }
          }
        },
        children: this.getResendButtonText()
      }
    });

    // Back to login button
    this.backButton = new Button({
      props: {
        type: 'button',
        variant: 'secondary',
        onClick: () => {
          if (this.props.onBackToLogin) {
            this.props.onBackToLogin();
          }
        },
        children: 'Back to Login'
      }
    });
  }

  private mountChildComponents(): void {
    const resendContainer = this.querySelector('#resend-button-container');
    const backContainer = this.querySelector('#back-button-container');

    if (resendContainer && this.resendButton) {
      this.resendButton.mount(resendContainer);
      this.addChildComponent(this.resendButton);
    }

    if (backContainer && this.backButton) {
      this.backButton.mount(backContainer);
      this.addChildComponent(this.backButton);
    }
  }

  private unmountChildComponents(): void {
    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];
    this.resendButton = null;
    this.backButton = null;
  }

  private startCooldownTimer(seconds: number): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }

    this.remainingCooldown = seconds;
    
    this.cooldownTimer = setInterval(() => {
      this.remainingCooldown--;
      
      // Update button text
      if (this.resendButton) {
        this.resendButton.update({
          children: this.getResendButtonText(),
          disabled: this.remainingCooldown > 0 || this.props.isResending
        });
      }

      if (this.remainingCooldown <= 0) {
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer);
          this.cooldownTimer = null;
        }
      }
    }, 1000);
  }

  private getResendButtonText(): string {
    if (this.props.isResending) {
      return 'Sending...';
    }
    
    if (this.remainingCooldown > 0) {
      return `Resend in ${this.remainingCooldown}s`;
    }
    
    return 'Resend Verification Email';
  }

  public render(): string {
    const { email } = this.props;

    return `
      <div data-component="email-verification" class="w-full max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <!-- Email Icon -->
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
            <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <!-- Title and Message -->
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
          
          <div class="mb-6">
            <p class="text-gray-600 mb-2">
              We've sent a verification link to:
            </p>
            <p class="text-lg font-semibold text-gray-900 mb-4">
              ${email}
            </p>
            <p class="text-sm text-gray-500">
              Click the link in the email to verify your account and complete your registration.
            </p>
          </div>

          <!-- Instructions -->
          <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div class="text-left">
              <h4 class="text-sm font-medium text-blue-800 mb-2">Next steps:</h4>
              <ol class="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Check your email inbox</li>
                <li>Look for an email from our team</li>
                <li>Click the verification link</li>
                <li>Return here to sign in</li>
              </ol>
            </div>
          </div>

          <!-- Didn't receive email section -->
          <div class="mb-6">
            <p class="text-sm text-gray-600 mb-4">
              Didn't receive the email? Check your spam folder or request a new one.
            </p>
            <div id="resend-button-container"></div>
          </div>

          <!-- Troubleshooting -->
          <details class="mb-6 text-left">
            <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800 mb-2">
              Having trouble? Click here for help
            </summary>
            <div class="text-sm text-gray-500 bg-gray-50 p-3 rounded border mt-2">
              <ul class="space-y-1 list-disc list-inside">
                <li>Check your spam or junk folder</li>
                <li>Make sure ${email} is correct</li>
                <li>Add our email to your contacts</li>
                <li>Wait a few minutes for the email to arrive</li>
                <li>Contact support if you continue having issues</li>
              </ul>
            </div>
          </details>

          <!-- Back to login -->
          <div class="border-t pt-4">
            <p class="text-sm text-gray-600 mb-3">
              Want to try with a different email?
            </p>
            <div id="back-button-container"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update cooldown from parent
   */
  public updateCooldown(seconds: number): void {
    this.startCooldownTimer(seconds);
  }

  /**
   * Get remaining cooldown seconds
   */
  public getRemainingCooldown(): number {
    return this.remainingCooldown;
  }
}