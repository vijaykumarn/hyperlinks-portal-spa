// src/services/ApiService.ts

import type { ApiResponse, UserData, UrlData, AnalyticsData } from '../types/app';

/**
 * HTTP Client for real API communication
 * Handles authentication via HttpOnly cookies
 */
class HttpClient {
  private baseUrl: string;
  private defaultTimeout: number = 10000;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Generic request method
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const requestInit: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'spa',
          ...options.headers
        },
        credentials: 'include', // Include HttpOnly cookies
        signal: controller.signal,
        ...options
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

      console.error(`❌ API ${method} ${endpoint} failed:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Parse fetch response
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          message: data.message
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };

    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      };
    }
  }

  // HTTP method wrappers
  public async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  public async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  public async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  public async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // Configuration methods
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}

/**
 * API Service - Business logic layer
 * Clean separation from HTTP client
 */
export class ApiService {
  private static instance: ApiService;
  private httpClient: HttpClient;

  private constructor(config: { baseUrl: string }) {
    this.httpClient = new HttpClient(config.baseUrl);
    console.log(`🔗 API Service initialized for ${config.baseUrl}`);
  }

  public static initialize(config: { baseUrl: string }): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService(config);
    }
    return ApiService.instance;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      throw new Error('ApiService not initialized. Call ApiService.initialize() first.');
    }
    return ApiService.instance;
  }

  // =====================================
  // AUTHENTICATION METHODS
  // =====================================

  /**
   * Login user
   */
  public async login(email: string, password: string): Promise<ApiResponse<{
    user: UserData;
    message: string;
  }>> {
    return this.httpClient.post('/auth/login', { email, password });
  }

  /**
   * Logout user
   */
  public async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.httpClient.post('/auth/logout');
  }

  /**
   * Get current user (check authentication status)
   */
  public async getCurrentUser(): Promise<ApiResponse<UserData>> {
    return this.httpClient.get('/auth/me');
  }

  // =====================================
  // URL MANAGEMENT METHODS
  // =====================================

  /**
   * Shorten a URL
   */
  public async shortenUrl(originalUrl: string): Promise<ApiResponse<{
    shortCode: string;
    fullShortUrl: string;
  }>> {
    return this.httpClient.post('/urls/shorten', { originalUrl });
  }

  /**
   * Resolve a short URL
   */
  public async resolveUrl(shortCode: string): Promise<ApiResponse<{
    originalUrl: string;
  }>> {
    return this.httpClient.get(`/urls/resolve/${shortCode}`);
  }

  /**
   * Get user's URLs
   */
  public async getUserUrls(): Promise<ApiResponse<UrlData[]>> {
    return this.httpClient.get('/urls/user');
  }

  /**
   * Delete a URL
   */
  public async deleteUrl(urlId: string): Promise<ApiResponse<{ message: string }>> {
    return this.httpClient.delete(`/urls/${urlId}`);
  }

  /**
   * Update a URL
   */
  public async updateUrl(urlId: string, updates: {
    originalUrl?: string;
    customCode?: string;
  }): Promise<ApiResponse<UrlData>> {
    return this.httpClient.put(`/urls/${urlId}`, updates);
  }

  // =====================================
  // ANALYTICS METHODS
  // =====================================

  /**
   * Get analytics data
   */
  public async getAnalytics(): Promise<ApiResponse<AnalyticsData>> {
    return this.httpClient.get('/analytics');
  }

  /**
   * Get URL-specific analytics
   */
  public async getUrlAnalytics(shortCode: string): Promise<ApiResponse<{
    shortCode: string;
    clicks: number;
    clickHistory: Array<{ date: string; clicks: number }>;
    referrers: Array<{ source: string; clicks: number }>;
    countries: Array<{ country: string; clicks: number }>;
  }>> {
    return this.httpClient.get(`/analytics/url/${shortCode}`);
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Health check
   */
  public async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: number }>> {
    return this.httpClient.get('/health');
  }

  /**
   * Validate URL format
   */
  public validateUrl(url: string): { isValid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: 'Only HTTP and HTTPS URLs are supported'
        };
      }
      
      if (process.env.NODE_ENV === 'production' && 
          (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
        return {
          isValid: false,
          error: 'Localhost URLs are not allowed in production'
        };
      }
      
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }

  // Configuration methods
  public setBaseUrl(baseUrl: string): void {
    this.httpClient.setBaseUrl(baseUrl);
  }

  public getBaseUrl(): string {
    return this.httpClient.getBaseUrl();
  }
}