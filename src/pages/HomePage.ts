// src/pages/HomePage.ts - PRODUCTION VERSION WITH WORKING FORMS

import type { PageComponent, DOMManager } from '../types/app';
import type { RouteContext } from '../types/router';
import { ApiService } from '../services/ApiService';
import { SessionService } from '../services/SessionService';
import { Modal, Button } from '../components/ui';
import { LoginForm, UrlShortenForm } from '../components/forms';

export class HomePage implements PageComponent {
  private domManager: DOMManager;
  private eventListeners: Array<() => void> = [];
  private apiService: ApiService;
  private sessionService: SessionService;
  
  // Component instances
  private loginModal: Modal | null = null;
  private loginForm: LoginForm | null = null;
  private urlShortenForm: UrlShortenForm | null = null;
  private loginButton: Button | null = null;
  
  // Component state
  private shortenResult: { shortCode: string; fullShortUrl: string } | null = null;
  private isLoading = false;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
    this.apiService = ApiService.getInstance();
    this.sessionService = SessionService.getInstance();
  }

  public async beforeEnter(_context: RouteContext): Promise<boolean> {
    if (this.sessionService.isAuthenticated()) {
      const router = (window as any).__APP__?.getInstance()?.getRouter();
      if (router) {
        router.replace('/dashboard');
        return false;
      }
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
        </main>

        <!-- Login Modal Container -->
        <div id="login-modal-container"></div>
      </div>
    `;

    this.domManager.setContent(html);
    
    setTimeout(() => {
      this.initializeComponents();
    }, 100);
  }

  private initializeComponents(): void {
    try {
      console.log('🎨 Initializing HomePage components...');

      // Initialize Login Button
      this.loginButton = new Button({
        props: {
          variant: 'primary',
          children: 'Login',
          onClick: () => {
            console.log('🔘 Login button clicked');
            this.showLoginModal();
          }
        }
      });

      // Initialize URL Shortening Form
      this.urlShortenForm = new UrlShortenForm({
        props: {
          onShorten: (url: string) => this.handleUrlShorten(url),
          isLoading: this.isLoading,
          result: this.shortenResult
        }
      });

      // Initialize Login Form with proper validation
      this.loginForm = new LoginForm({
        props: {
          onLogin: (credentials) => this.handleLogin(credentials),
          isLoading: this.isLoading,
          validation: {
            email: (value: string) => {
              if (!value) return 'Email is required';
              if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
              return null;
            },
            password: (value: string) => {
              if (!value) return 'Password is required';
              if (value.length < 6) return 'Password must be at least 6 characters';
              return null;
            }
          }
        }
      });

      // Initialize Login Modal
      this.loginModal = new Modal({
        props: {
          isOpen: false,
          title: 'Login to Your Account',
          onClose: () => {
            console.log('🔒 Modal close requested');
            this.hideLoginModal();
          },
          children: '<div id="login-form-container"></div>'
        }
      });

      this.mountComponents();
      
      console.log('✅ HomePage components initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing HomePage components:', error);
    }
  }

  private mountComponents(): void {
    try {
      const loginButtonContainer = document.getElementById('login-button-container');
      const urlFormContainer = document.getElementById('url-shorten-form-container');
      const modalContainer = document.getElementById('login-modal-container');

      if (loginButtonContainer && this.loginButton) {
        this.loginButton.mount(loginButtonContainer);
        console.log('✅ Login button mounted');
      }

      if (urlFormContainer && this.urlShortenForm) {
        this.urlShortenForm.mount(urlFormContainer);
        console.log('✅ URL shorten form mounted');
      }

      if (modalContainer && this.loginModal) {
        this.loginModal.mount(modalContainer);
        console.log('✅ Login modal mounted');
      }

    } catch (error) {
      console.error('❌ Error mounting components:', error);
    }
  }

  private showLoginModal(): void {
    console.log('🔓 Showing login modal...');
    
    if (this.loginModal) {
      this.loginModal.update({ isOpen: true });
      
      // Mount login form inside modal after a short delay
      setTimeout(() => {
        const loginFormContainer = document.getElementById('login-form-container');
        if (loginFormContainer && this.loginForm) {
          this.loginForm.mount(loginFormContainer);
          console.log('✅ Login form mounted inside modal');
        }
      }, 50);
    }
  }

  private hideLoginModal(): void {
    console.log('🔒 Hiding login modal...');
    
    if (this.loginModal) {
      this.loginModal.update({ isOpen: false });
    }
  }

  private async handleUrlShorten(url: string): Promise<{ shortCode: string; fullShortUrl: string }> {
    console.log('🔗 Shortening URL:', url);
    
    if (!this.isValidUrl(url)) {
      throw new Error('Please enter a valid URL');
    }

    this.isLoading = true;
    this.updateComponentsLoading();

    try {
      const result = await this.apiService.shortenUrl(url);

      if (result.success && result.data?.fullShortUrl) {
        this.shortenResult = {
          shortCode: result.data.shortCode,
          fullShortUrl: result.data.fullShortUrl
        };

        if (this.urlShortenForm) {
          this.urlShortenForm.update({
            result: this.shortenResult,
            isLoading: false
          });
        }

        return this.shortenResult;
      } else {
        throw new Error(result.error || 'Failed to shorten URL');
      }

    } catch (error) {
      console.error('❌ Error shortening URL:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.updateComponentsLoading();
    }
  }

  private async handleLogin(credentials: { email: string; password: string }): Promise<void> {
    console.log('🔐 Attempting login for:', credentials.email);
    console.log('📊 Login credentials received:', {
      email: credentials.email,
      password: credentials.password ? '***' : 'MISSING',
      emailLength: credentials.email?.length || 0,
      passwordLength: credentials.password?.length || 0
    });
    
    // Validate credentials before sending to API
    if (!credentials.email || !credentials.password) {
      const error = new Error('Email and password are required');
      console.error('❌ Login validation failed:', credentials);
      throw error;
    }
    
    this.isLoading = true;
    this.updateComponentsLoading();

    try {
      const result = await this.apiService.login(credentials.email, credentials.password);

      if (result.success && result.data?.user) {
        this.sessionService.setSession(result.data.user);
        console.log('✅ Login successful for user:', result.data.user.email);
        
        this.hideLoginModal();

        const router = (window as any).__APP__?.getInstance()?.getRouter();
        if (router) {
          await router.push('/dashboard');
        }
      } else {
        const error = new Error(result.error || result.message || 'Login failed. Please try again.');
        console.error('❌ Login failed:', result);
        throw error;
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.updateComponentsLoading();
    }
  }

  private updateComponentsLoading(): void {
    if (this.urlShortenForm) {
      this.urlShortenForm.update({ isLoading: this.isLoading });
    }
    
    if (this.loginForm) {
      this.loginForm.update({ isLoading: this.isLoading });
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

  public cleanup(): void {
    console.log('🧹 Cleaning up HomePage components...');
    
    try {
      if (this.loginModal) {
        this.loginModal.unmount();
        this.loginModal = null;
      }
      
      if (this.loginForm) {
        this.loginForm.unmount();
        this.loginForm = null;
      }
      
      if (this.urlShortenForm) {
        this.urlShortenForm.unmount();
        this.urlShortenForm = null;
      }
      
      if (this.loginButton) {
        this.loginButton.unmount();
        this.loginButton = null;
      }

      this.eventListeners.forEach(cleanup => cleanup());
      this.eventListeners = [];

      this.shortenResult = null;
      this.isLoading = false;

      console.log('✅ HomePage cleanup completed');
      
    } catch (error) {
      console.error('❌ Error during HomePage cleanup:', error);
    }
  }

  public async afterEnter(_context: RouteContext): Promise<void> {
    setTimeout(() => {
      const urlInput = document.querySelector('#url') as HTMLInputElement;
      if (urlInput) {
        urlInput.focus();
        console.log('✅ URL input focused');
      }
    }, 200);
  }
}