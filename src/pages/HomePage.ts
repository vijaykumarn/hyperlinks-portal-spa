// src/pages/HomePage.ts - FIXED ALL ISSUES

import type { PageComponent, DOMManager } from '../types/app';
import type { RouteContext } from '../types/router';
import { AuthService } from '../services/auth/AuthService';
import { SessionService } from '../services/SessionService';
import { AuthModal } from '../components/auth/AuthModal';
import { UrlShortenForm } from '../components/forms';
import { Button } from '../components/ui';
import type { AuthModalMode } from '../services/auth/types';
import type { LoginCredentials, RegistrationData } from '../types/user';

export class HomePage implements PageComponent {
  private domManager: DOMManager;
  private eventListeners: Array<() => void> = [];
  private authService: AuthService;
  private sessionService: SessionService;

  // Component instances
  private authModal: AuthModal | null = null;
  private urlShortenForm: UrlShortenForm | null = null;
  private loginButton: Button | null = null;
  private registerButton: Button | null = null;

  // Component state
  private authModalMode: AuthModalMode = 'closed';
  private shortenResult: { shortCode: string; fullShortUrl: string } | null = null;
  private isLoading = false;
  private verificationEmail: string | null = null;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
    this.authService = AuthService.getInstance();
    this.sessionService = SessionService.getInstance();
  }

  public async beforeEnter(_context: RouteContext): Promise<boolean> {
    if (this.sessionService.isAuthenticated()) {
      console.log('🏠 HomePage: User already authenticated, redirecting to dashboard');
      await this.redirectToDashboard();
      return false;
    }
    return true;
  }

  public async render(_context: RouteContext): Promise<void> {
    const html = `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <!-- Header -->
        <header class="bg-white shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-6">
              <div class="flex items-center">
                <h1 class="text-2xl font-bold text-gray-900">ShortURL</h1>
              </div>
              <div class="flex items-center space-x-4">
                <div id="register-button-container"></div>
                <div id="login-button-container"></div>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Shorten Your URLs with Ease
            </h2>
            <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Create short, memorable links for your long URLs. Track clicks, 
              manage your links, and get detailed analytics.
            </p>
            
            <div id="url-shorten-form-container"></div>
          </div>

          <!-- Features Section -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div class="text-center">
              <div class="bg-white rounded-lg p-6 shadow-sm">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Easy URL Shortening</h3>
                <p class="text-gray-600">Transform long URLs into short, memorable links in seconds</p>
              </div>
            </div>

            <div class="text-center">
              <div class="bg-white rounded-lg p-6 shadow-sm">
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Detailed Analytics</h3>
                <p class="text-gray-600">Track clicks, locations, and engagement metrics</p>
              </div>
            </div>

            <div class="text-center">
              <div class="bg-white rounded-lg p-6 shadow-sm">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg class="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
                <p class="text-gray-600">Your links are safe with enterprise-grade security</p>
              </div>
            </div>
          </div>
        </main>

        <!-- Auth Modal Container -->
        <div id="auth-modal-container"></div>
      </div>
    `;

    this.domManager.setContent(html);

    // Initialize components after a small delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeComponents();
      this.setupAuthEventListeners();
    }, 100);
  }

  private initializeComponents(): void {
    try {
      console.log('🎨 HomePage: Initializing components...');

      // Initialize auth buttons
      this.createAuthButtons();

      // Initialize URL Shortening Form
      this.createUrlShortenForm();

      // Initialize Auth Modal
      this.createAuthModal();

      // Mount all components
      this.mountComponents();

      console.log('✅ HomePage: Components initialized successfully');
    } catch (error) {
      console.error('❌ HomePage: Error initializing components:', error);
    }
  }

  private createAuthButtons(): void {
    this.loginButton = new Button({
      props: {
        variant: 'secondary',
        children: 'Sign In',
        onClick: () => {
          console.log('🔐 Login button clicked');
          this.openAuthModal('login');
        }
      }
    });

    this.registerButton = new Button({
      props: {
        variant: 'primary',
        children: 'Sign Up',
        onClick: () => {
          console.log('📝 Register button clicked');
          this.openAuthModal('register');
        }
      }
    });
  }

  private createUrlShortenForm(): void {
    this.urlShortenForm = new UrlShortenForm({
      props: {
        onShorten: (url: string) => this.handleUrlShorten(url),
        isLoading: this.isLoading,
        result: this.shortenResult
      }
    });
  }

  private createAuthModal(): void {
    this.authModal = new AuthModal({
      props: {
        mode: this.authModalMode,
        onClose: () => this.closeAuthModal(),
        // FIXED: Proper typing for event handlers
        onLogin: (credentials: LoginCredentials) => this.handleLogin(credentials),
        onRegister: (data: RegistrationData) => this.handleRegister(data),
        onGoogleAuth: (mode: 'login' | 'register') => this.handleGoogleAuth(mode),
        onResendVerification: () => this.handleResendVerification(),
        // FIXED: Handle null verification email properly
        verificationEmail: this.verificationEmail || undefined,
        isLoading: this.isLoading,
        showGoogleOption: this.authService.isGoogleOAuth2Available()
      }
    });
  }

  private mountComponents(): void {
    try {
      const containers = {
        login: document.getElementById('login-button-container'),
        register: document.getElementById('register-button-container'),
        urlForm: document.getElementById('url-shorten-form-container'),
        modal: document.getElementById('auth-modal-container')
      };

      // Check if containers exist
      Object.entries(containers).forEach(([name, container]) => {
        if (!container) {
          console.warn(`⚠️ HomePage: ${name} container not found`);
        }
      });

      // Mount components
      if (containers.login && this.loginButton) {
        this.loginButton.mount(containers.login);
        console.log('✅ Login button mounted');
      }

      if (containers.register && this.registerButton) {
        this.registerButton.mount(containers.register);
        console.log('✅ Register button mounted');
      }

      if (containers.urlForm && this.urlShortenForm) {
        this.urlShortenForm.mount(containers.urlForm);
        console.log('✅ URL shorten form mounted');
      }

      if (containers.modal && this.authModal) {
        this.authModal.mount(containers.modal);
        console.log('✅ Auth modal mounted');
      }

    } catch (error) {
      console.error('❌ HomePage: Error mounting components:', error);
    }
  }

  private setupAuthEventListeners(): void {
    try {
      // Listen for auth mode changes
      const authModeChangeListener = this.domManager.addEventListener(
        window,
        'auth-mode-change' as keyof WindowEventMap,
        (event: Event) => {
          const customEvent = event as CustomEvent;
          const newMode = customEvent.detail.mode;
          console.log('🔄 Auth mode change detected:', newMode);
          this.authModalMode = newMode;
          this.updateAuthModal();
        }
      );
      this.eventListeners.push(authModeChangeListener);

      // Listen for auth service events
      this.setupAuthServiceListeners();

    } catch (error) {
      console.error('❌ HomePage: Error setting up auth listeners:', error);
    }
  }

  private setupAuthServiceListeners(): void {
    // Login success
    const loginSuccessListener = this.authService.addEventListener('login:success', (data) => {
      console.log('✅ HomePage: Login successful:', data.user.email);
      this.closeAuthModal();
      // FIXED: Ensure proper redirect to dashboard
      setTimeout(() => this.redirectToDashboard(), 500);
    });
    this.eventListeners.push(() => loginSuccessListener());

    // Registration success
    const registrationSuccessListener = this.authService.addEventListener('registration:success', (data) => {
      console.log('✅ HomePage: Registration successful:', data.userId);
      // Don't close modal yet - wait for verification
    });
    this.eventListeners.push(() => registrationSuccessListener());

    // Verification required
    const verificationRequiredListener = this.authService.addEventListener('verification:required', (data) => {
      console.log('📧 HomePage: Verification required for:', data.email);
      this.verificationEmail = data.email;
      this.authModalMode = 'verification';
      this.updateAuthModal();
    });
    this.eventListeners.push(() => verificationRequiredListener());

    // Verification success
    const verificationSuccessListener = this.authService.addEventListener('verification:success', (data) => {
      console.log('✅ HomePage: Verification successful');
      this.closeAuthModal();
      if (data.user) {
        // FIXED: Ensure proper redirect to dashboard
        setTimeout(() => this.redirectToDashboard(), 500);
      }
    });
    this.eventListeners.push(() => verificationSuccessListener());

    // OAuth2 success - FIXED: Proper dashboard redirect
    const oauth2SuccessListener = this.authService.addEventListener('oauth2:success', (data) => {
      console.log('✅ HomePage: OAuth2 successful:', data.user.email);
      this.closeAuthModal();
      // FIXED: Ensure proper redirect to dashboard
      setTimeout(() => this.redirectToDashboard(), 500);
    });
    this.eventListeners.push(() => oauth2SuccessListener());

    // Error handlers
    const loginFailedListener = this.authService.addEventListener('login:failed', (data) => {
      console.error('❌ HomePage: Login failed:', data.error);
      this.isLoading = false;
      this.updateComponentsLoading();
    });
    this.eventListeners.push(() => loginFailedListener());

    const registrationFailedListener = this.authService.addEventListener('registration:failed', (data) => {
      console.error('❌ HomePage: Registration failed:', data.error);
      this.isLoading = false;
      this.updateComponentsLoading();
    });
    this.eventListeners.push(() => registrationFailedListener());

    const oauth2FailedListener = this.authService.addEventListener('oauth2:failed', (data) => {
      console.error('❌ HomePage: OAuth2 failed:', data.error);
      this.isLoading = false;
      this.updateComponentsLoading();
    });
    this.eventListeners.push(() => oauth2FailedListener());
  }

  private openAuthModal(mode: 'login' | 'register'): void {
    console.log('🔓 HomePage: Opening auth modal in mode:', mode);
    this.authModalMode = mode;
    this.updateAuthModal();
  }

  private closeAuthModal(): void {
    console.log('🔒 HomePage: Closing auth modal');
    this.authModalMode = 'closed';
    this.verificationEmail = null;
    this.updateAuthModal();
  }

  private updateAuthModal(): void {
    if (this.authModal) {
      this.authModal.update({
        mode: this.authModalMode,
        verificationEmail: this.verificationEmail || undefined, // FIXED: Handle null properly
        isLoading: this.isLoading
      });
    }
  }

  private async handleLogin(credentials: LoginCredentials): Promise<void> {
    console.log('🔐 HomePage: Handling login for:', credentials.email);

    this.isLoading = true;
    this.updateComponentsLoading();

    try {
      const result = await this.authService.login(credentials);

      if (result.success) {
        if ('user' in result && result.user) {
          console.log('✅ HomePage: Login successful');
          // Auth service event listeners will handle UI updates and redirect
        } else {
          console.log('✅ HomePage: Login successful - no user data returned');
          // Handle successful login without user data (shouldn't happen for login)
        }
      } else {
        if (result.requiresVerification) {
          console.log('📧 HomePage: Login requires verification');
          this.verificationEmail = credentials.email;
          this.authModalMode = 'verification';
          this.updateAuthModal();
        } else {
          throw new Error(result.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error('❌ HomePage: Login failed:', error);
      throw error; // Let the form component handle the error display
    } finally {
      this.isLoading = false;
      this.updateComponentsLoading();
    }
  }

  private async handleRegister(data: RegistrationData): Promise<void> {
    console.log('📝 HomePage: Handling registration for:', data.email);

    this.isLoading = true;
    this.updateComponentsLoading();

    try {
      const result = await this.authService.register(data);

      if (result.success) {
        console.log('✅ HomePage: Registration successful');

        if (result.requiresVerification) {
          this.verificationEmail = data.email;
          this.authModalMode = 'verification';
          this.updateAuthModal();
        } else {
          // Auto-login successful, redirect
          this.closeAuthModal();
          setTimeout(() => this.redirectToDashboard(), 500);
        }
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ HomePage: Registration failed:', error);
      throw error; // Let the form component handle the error display
    } finally {
      this.isLoading = false;
      this.updateComponentsLoading();
    }
  }

  private async handleGoogleAuth(mode: 'login' | 'register'): Promise<void> {
    console.log('🔗 HomePage: Handling Google auth for:', mode);

    this.isLoading = true;
    this.updateComponentsLoading();

    try {
      // FIXED: Use dashboard as redirect URL for successful OAuth2
      const result = await this.authService.loginWithGoogle('/dashboard');

      if (result.success && result.authUrl) {
        console.log('✅ HomePage: Google auth URL obtained, redirecting...');
        // Redirect to Google OAuth2
        window.location.href = result.authUrl;
      } else {
        throw new Error(result.error || 'Failed to initiate Google authentication');
      }
    } catch (error) {
      console.error('❌ HomePage: Google auth failed:', error);
      this.isLoading = false;
      this.updateComponentsLoading();
      throw error;
    }
  }

  private async handleResendVerification(): Promise<void> {
    if (!this.verificationEmail) {
      console.error('❌ HomePage: No verification email available');
      return;
    }

    console.log('📧 HomePage: Resending verification email to:', this.verificationEmail);

    this.isLoading = true;
    this.updateComponentsLoading();

    try {
      const result = await this.authService.resendVerificationEmail(this.verificationEmail);

      if (result.success) {
        console.log('✅ HomePage: Verification email resent successfully');
        // Update cooldown if provided
        if (this.authModal && result.nextResendAt) {
          const cooldownSeconds = Math.ceil((result.nextResendAt - Date.now()) / 1000);
          this.authModal.updateVerificationState(this.verificationEmail, cooldownSeconds);
        }
      } else {
        throw new Error(result.error || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('❌ HomePage: Failed to resend verification:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.updateComponentsLoading();
    }
  }

  private async handleUrlShorten(url: string): Promise<{ shortCode: string; fullShortUrl: string }> {
    console.log('🔗 HomePage: Shortening URL:', url);

    if (!this.isValidUrl(url)) {
      throw new Error('Please enter a valid URL');
    }

    this.isLoading = true;
    this.updateComponentsLoading();

    try {
      // For now, we'll simulate the URL shortening since we haven't implemented the business API yet
      // This will be replaced with actual API call later
      const shortCode = this.generateShortCode();
      const baseUrl = window.location.origin;
      const fullShortUrl = `${baseUrl}/u/${shortCode}`;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.shortenResult = {
        shortCode,
        fullShortUrl
      };

      if (this.urlShortenForm) {
        this.urlShortenForm.update({
          result: this.shortenResult,
          isLoading: false
        });
      }

      return this.shortenResult;

    } catch (error) {
      console.error('❌ HomePage: Error shortening URL:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.updateComponentsLoading();
    }
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private updateComponentsLoading(): void {
    if (this.urlShortenForm) {
      this.urlShortenForm.update({ isLoading: this.isLoading });
    }

    if (this.authModal) {
      this.authModal.update({ isLoading: this.isLoading });
    }
  }

  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  // FIXED: More robust dashboard redirect
  private async redirectToDashboard(): Promise<void> {
    console.log('🎯 HomePage: Redirecting to dashboard...');

    try {
      // Get router instance from global app
      const app = (window as any).__APP__?.getInstance?.();
      if (app) {
        const router = app.getRouter();
        if (router) {
          await router.push('/dashboard');
          console.log('✅ HomePage: Successfully redirected to dashboard');
          return;
        }
      }

      // Fallback to window.location if router not available
      console.warn('⚠️ HomePage: Router not available, using window.location');
      window.location.href = '/dashboard';

    } catch (error) {
      console.error('❌ HomePage: Error redirecting to dashboard:', error);
      // Last resort fallback
      window.location.href = '/dashboard';
    }
  }

  public cleanup(): void {
    console.log('🧹 HomePage: Cleaning up components...');

    try {
      // Cleanup components
      if (this.authModal) {
        this.authModal.unmount();
        this.authModal = null;
      }

      if (this.urlShortenForm) {
        this.urlShortenForm.unmount();
        this.urlShortenForm = null;
      }

      if (this.loginButton) {
        this.loginButton.unmount();
        this.loginButton = null;
      }

      if (this.registerButton) {
        this.registerButton.unmount();
        this.registerButton = null;
      }

      // Cleanup event listeners
      this.eventListeners.forEach(cleanup => cleanup());
      this.eventListeners = [];

      // Reset state
      this.shortenResult = null;
      this.isLoading = false;
      this.authModalMode = 'closed';
      this.verificationEmail = null;

      console.log('✅ HomePage: Cleanup completed');

    } catch (error) {
      console.error('❌ HomePage: Error during cleanup:', error);
    }
  }

  public async afterEnter(_context: RouteContext): Promise<void> {
    // Focus on URL input after page loads
    setTimeout(() => {
      const urlInput = document.querySelector('#url') as HTMLInputElement;
      if (urlInput) {
        urlInput.focus();
        console.log('✅ HomePage: URL input focused');
      }
    }, 200);
  }
}