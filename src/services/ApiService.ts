// src/services/ApiService.ts - CLEAN VERSION using generic HttpClient

import { HttpClient } from './HttpClient';
import type { ApiResponse } from './SessionService';
import type { UrlData, AnalyticsData } from '../state/types';

/**
 * API Service - Business logic layer over HttpClient
 * HttpClient handles mock vs real API transparency
 */
export class ApiService {
  private static instance: ApiService;
  private httpClient: HttpClient;

  private constructor(config: {
    baseUrl: string;
    useMockApi?: boolean;
  }) {
    this.httpClient = HttpClient.initialize(config.baseUrl);
    
    // Configure HttpClient to use mock API if needed
    if (config.useMockApi !== undefined) {
      this.httpClient.setUseMockApi(config.useMockApi);
    }

    console.log(`🔗 API Service initialized`);
  }

  public static initialize(config: {
    baseUrl: string;
    useMockApi?: boolean;
  }): ApiService {
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
   * Login user - Uses generic HttpClient
   */
  public async login(email: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.httpClient.post<{ message: string }>('/auth/login', {
      email,
      password
    });
  }

  /**
   * Logout user - Uses generic HttpClient
   */
  public async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.httpClient.post<{ message: string }>('/auth/logout');
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
    return this.httpClient.post('/urls/shorten', {
      originalUrl
    });
  }

  /**
   * Resolve a short URL (for redirection)
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
   * Check if API is available
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

  // =====================================
  // HELPER METHODS
  // =====================================

  /**
   * Switch between mock and real API
   */
  public setUseMockApi(useMock: boolean): void {
    this.httpClient.setUseMockApi(useMock);
  }

  /**
   * Get current authentication status
   */
  public isAuthenticated(): boolean {
    return this.httpClient.isAuthenticated();
  }

  /**
   * Get current user
   */
  public getCurrentUser() {
    return this.httpClient.getCurrentUser();
  }

  /**
   * Set API base URL
   */
  public setBaseUrl(baseUrl: string): void {
    this.httpClient.setBaseUrl(baseUrl);
  }

  /**
   * Get API base URL
   */
  public getBaseUrl(): string {
    return this.httpClient.getBaseUrl();
  }
}