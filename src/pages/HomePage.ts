// src/pages/HomePage.ts - FIXED VERSION

import type { PageComponent, DOMManager } from '../types/app';
import type { RouteContext } from '../types/router';
import { ApiService } from '../services/ApiService';
import { SessionService } from '../services/SessionService';

export class HomePage implements PageComponent {
  private domManager: DOMManager;
  private eventListeners: Array<() => void> = [];
  private apiService: ApiService;
  private sessionService: SessionService;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
    this.apiService = ApiService.getInstance();
    this.sessionService = SessionService.getInstance();
  }

  public async beforeEnter(_context: RouteContext): Promise<boolean> {
    if (this.sessionService.isAuthenticated()) {
      // User is authenticated, redirect to dashboard
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
                <button 
                  id="login-btn" 
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <!-- Hero Section -->
          <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Shorten Your URLs with Ease
            </h2>
            <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Create short, memorable links for your long URLs. Track clicks, 
              manage your links, and get detailed analytics.
            </p>
            
            <!-- URL Shortener Form -->
            <div class="max-w-2xl mx-auto">
              <div class="flex flex-col sm:flex-row gap-4">
                <input
                  type="url"
                  id="url-input"
                  placeholder="Enter your long URL here..."
                  class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  id="shorten-btn"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  Shorten URL
                </button>
              </div>
              
              <!-- Result Area -->
              <div id="result-area" class="mt-6 hidden">
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <p class="text-sm text-gray-600 mb-2">Your shortened URL:</p>
                  <div class="flex items-center gap-3">
                    <input
                      type="text"
                      id="short-url"
                      readonly
                      class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-blue-600 font-mono"
                    />
                    <button
                      id="copy-btn"
                      class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Guest Notice -->
              <p class="text-sm text-gray-500 mt-4">
                <span class="inline-flex items-center">
                  ℹ️ Guest mode: URLs expire in 24 hours. 
                  <button id="signup-link" class="text-blue-600 hover:text-blue-700 ml-1 underline">
                    Sign up
                  </button> 
                  for permanent links and analytics.
                </span>
              </p>
            </div>
          </div>
        </main>

        <!-- Login Modal -->
        <div id="login-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-semibold text-gray-900">Login to Your Account</h3>
              <button id="close-modal" class="text-gray-400 hover:text-gray-600">
                <span class="text-2xl">&times;</span>
              </button>
            </div>
            
            <form id="login-form">
              <div class="mb-4">
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="Enter your email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div class="mb-6">
                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  placeholder="Enter your password"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              
              <button
                type="submit"
                id="login-submit"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors font-medium disabled:opacity-50"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    this.domManager.setContent(html);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      const listener = this.domManager.addEventListener(loginBtn, 'click', () => {
        this.showLoginModal();
      });
      this.eventListeners.push(listener);
    }

    // URL shortening
    const shortenBtn = document.getElementById('shorten-btn');
    const urlInput = document.getElementById('url-input') as HTMLInputElement;

    if (shortenBtn && urlInput) {
      const listener = this.domManager.addEventListener(shortenBtn, 'click', () => {
        this.handleUrlShorten(urlInput.value);
      });
      this.eventListeners.push(listener);

      const enterListener = this.domManager.addEventListener(urlInput, 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleUrlShorten(urlInput.value);
        }
      });
      this.eventListeners.push(enterListener);
    }

    // Modal controls
    const closeModal = document.getElementById('close-modal');
    if (closeModal) {
      const listener = this.domManager.addEventListener(closeModal, 'click', () => {
        this.hideLoginModal();
      });
      this.eventListeners.push(listener);
    }

    const modal = document.getElementById('login-modal');
    if (modal) {
      const listener = this.domManager.addEventListener(modal, 'click', (e) => {
        if (e.target === modal) {
          this.hideLoginModal();
        }
      });
      this.eventListeners.push(listener);
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      const listener = this.domManager.addEventListener(loginForm, 'submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
      this.eventListeners.push(listener);
    }
  }

  private showLoginModal(): void {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  private hideLoginModal(): void {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  private async handleUrlShorten(url: string): Promise<void> {
    if (!url || !this.isValidUrl(url)) {
      alert('Please enter a valid URL');
      return;
    }

    const shortenBtn = document.getElementById('shorten-btn') as HTMLButtonElement;
    const resultArea = document.getElementById('result-area');
    const shortUrlInput = document.getElementById('short-url') as HTMLInputElement;

    try {
      shortenBtn.disabled = true;
      shortenBtn.textContent = 'Shortening...';

      const result = await this.apiService.shortenUrl(url);

      if (result.success && result.data?.fullShortUrl) {
        if (shortUrlInput) {
          shortUrlInput.value = result.data.fullShortUrl;
        }

        if (resultArea) {
          resultArea.classList.remove('hidden');
        }

        this.setupCopyButton(result.data.fullShortUrl);
      } else {
        alert(result.error || 'Failed to shorten URL');
      }

    } catch (error) {
      console.error('Error shortening URL:', error);
      alert('Failed to shorten URL. Please try again.');
    } finally {
      shortenBtn.disabled = false;
      shortenBtn.textContent = 'Shorten URL';
    }
  }

  private setupCopyButton(url: string): void {
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
      const newCopyBtn = copyBtn.cloneNode(true) as HTMLElement;
      copyBtn.parentNode?.replaceChild(newCopyBtn, copyBtn);

      const listener = this.domManager.addEventListener(newCopyBtn, 'click', async () => {
        try {
          await navigator.clipboard.writeText(url);
          newCopyBtn.textContent = 'Copied!';
          setTimeout(() => {
            newCopyBtn.textContent = 'Copy';
          }, 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);

          newCopyBtn.textContent = 'Copied!';
          setTimeout(() => {
            newCopyBtn.textContent = 'Copy';
          }, 2000);
        }
      });
      this.eventListeners.push(listener);
    }
  }

  private async handleLogin(): Promise<void> {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitBtn = document.getElementById('login-submit') as HTMLButtonElement;

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      const result = await this.apiService.login(email, password);

      if (result.success && result.data?.user) {
        // Set session with user data from API
        this.sessionService.setSession(result.data.user);
        
        this.hideLoginModal();

        const router = (window as any).__APP__?.getInstance()?.getRouter();
        if (router) {
          await router.push('/dashboard');
        }
      } else {
        alert(result.error || result.message || 'Login failed. Please try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
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
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }

  public async afterEnter(_context: RouteContext): Promise<void> {
    const urlInput = document.getElementById('url-input') as HTMLInputElement;
    if (urlInput) {
      urlInput.focus();
    }
  }
}