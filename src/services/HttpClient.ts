// src/services/HttpClient.ts - CLEAN ARCHITECTURE

import { SessionService, type ApiResponse } from './SessionService';
import { StateManager } from '../core/state/StateManager';
import { SecureMockApi } from './SecureMockApi';

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  includeSession?: boolean;
}

/**
 * Generic HTTP Client with integrated session management
 * Handles both real API and mock API transparently
 */
export class HttpClient {
  private static instance: HttpClient;
  private sessionService: SessionService;
  private stateManager: StateManager;
  private baseUrl: string;
  private defaultTimeout: number = 10000;
  private mockApi: SecureMockApi;
  private useMockApi: boolean = false;

  private constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.sessionService = SessionService.getInstance();
    this.stateManager = StateManager.getInstance();
    this.mockApi = SecureMockApi.getInstance();
    
    // Check if we should use mock API
    this.useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true' || 
                      import.meta.env.MODE === 'development';
                      
    console.log(`🌐 HttpClient initialized: ${this.useMockApi ? 'Mock API' : 'Real API'}`);
  }

  public static initialize(baseUrl: string): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient(baseUrl);
    }
    return HttpClient.instance;
  }

  public static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      throw new Error('HttpClient not initialized. Call HttpClient.initialize() first.');
    }
    return HttpClient.instance;
  }

  /**
   * Set whether to use mock API
   */
  public setUseMockApi(useMock: boolean): void {
    this.useMockApi = useMock;
    console.log(`🔄 HttpClient: Switched to ${useMock ? 'Mock API' : 'Real API'}`);
  }

  /**
   * Generic GET request
   */
  public async get<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * Generic POST request
   */
  public async post<T>(
    endpoint: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * Generic PUT request
   */
  public async put<T>(
    endpoint: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * Generic DELETE request
   */
  public async delete<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Core request method - handles both mock and real API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    console.log(`🌐 HttpClient: ${method} ${endpoint}`);

    let response: ApiResponse<T>;

    if (this.useMockApi) {
      // Handle mock API requests
      response = await this.handleMockRequest<T>(method, endpoint, data);
    } else {
      // Handle real API requests
      response = await this.handleRealRequest<T>(method, endpoint, data, options);
    }

    console.log(`🌐 HttpClient: ${method} ${endpoint} response:`, response);

    // ALWAYS update session from response (mock or real)
    if (response.session) {
      console.log('🔄 HttpClient: Updating session from response');
      this.sessionService.updateFromApiResponse(response);
    } else {
      console.log('🔄 HttpClient: No session data in response');
    }

    // Update session timestamp on successful requests
    if (response.success && this.sessionService.isAuthenticated()) {
      this.sessionService.updateTimestamp();
    }

    // Handle authentication errors
    if (!response.success && response.error?.includes('401') || response.error?.includes('403')) {
      this.sessionService.handleAuthError({
        status: response.error.includes('401') ? 401 : 403,
        message: response.error
      });
    }

    return response;
  }

  /**
   * Handle mock API requests
   */
  private async handleMockRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    console.log('🎭 Using mock API for:', method, endpoint);

    // Route to appropriate mock method based on endpoint
    switch (endpoint) {
      case '/auth/login':
        if (method === 'POST' && data?.email && data?.password) {
          return this.mockApi.login(data.email, data.password) as ApiResponse<T>;
        }
        break;

      case '/auth/logout':
        if (method === 'POST') {
          return this.mockApi.logout() as ApiResponse<T>;
        }
        break;

      case '/urls/shorten':
        if (method === 'POST' && data?.originalUrl) {
          return this.mockApi.shortenUrl(data.originalUrl) as ApiResponse<T>;
        }
        break;

      case '/urls/user':
        if (method === 'GET') {
          return this.mockApi.getUserUrls() as ApiResponse<T>;
        }
        break;

      case '/analytics':
        if (method === 'GET') {
          return this.mockApi.getAnalytics() as ApiResponse<T>;
        }
        break;

      default:
        // Handle dynamic endpoints like /urls/resolve/:shortCode
        if (endpoint.startsWith('/urls/resolve/') && method === 'GET') {
          const shortCode = endpoint.split('/').pop();
          if (shortCode) {
            return this.mockApi.resolveUrl(shortCode) as ApiResponse<T>;
          }
        }
        break;
    }

    // Fallback for unhandled mock endpoints
    return {
      success: false,
      error: `Mock API: Endpoint not implemented: ${method} ${endpoint}`
    };
  }

  /**
   * Handle real API requests
   */
  private async handleRealRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'spa',
      ...options.headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestInit: RequestInit = {
        method,
        headers,
        credentials: 'include', // Include HttpOnly cookies
        signal: controller.signal
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        requestInit.body = JSON.stringify(data);
      }

      const response = await fetch(url, requestInit);
      clearTimeout(timeoutId);

      return await this.parseResponse<T>(response);

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout'
        };
      }

      console.error(`❌ Real API ${method} ${endpoint} failed:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Parse fetch response to ApiResponse format
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          session: data.session
        };
      }

      return {
        success: true,
        data: data.data || data,
        session: data.session
      };

    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      };
    }
  }

  // Helper methods
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  public isAuthenticated(): boolean {
    return this.sessionService.isAuthenticated();
  }

  public getCurrentUser() {
    return this.sessionService.getCurrentUser();
  }
}