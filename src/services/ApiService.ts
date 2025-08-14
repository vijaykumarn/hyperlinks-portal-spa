// src/services/ApiService.ts - PHASE 3: REFACTORED TO USE UNIFIED CLIENT

import { UnifiedApiClient } from './core/UnifiedApiClient';
import type { FrontendApiResponse } from './core/HttpClient';
import type { UrlData, AnalyticsData } from '../types/app';
import type { User } from '../types/user';

/**
 * Business Logic API Service - Refactored to use UnifiedApiClient
 * Handles both authentication and business operations through unified client
 */
export class ApiService {
  private static instance: ApiService;
  private unifiedClient: UnifiedApiClient;

  private constructor() {
    this.unifiedClient = UnifiedApiClient.getInstance();
    console.log('🔗 ApiService: Initialized with unified client architecture');
  }

  public static initialize(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
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
  // AUTHENTICATION METHODS (using auth server)
  // =====================================

  /**
   * Login user
   */
  public async login(email: string, password: string): Promise<FrontendApiResponse<{
    user: User;
    message: string;
  }>> {
    console.log('🔐 ApiService: Login request for:', email);
    
    return this.unifiedClient.post('auth.login', {
      login: email,
      password,
      rememberMe: false
    });
  }

  /**
   * Logout user
   */
  public async logout(): Promise<FrontendApiResponse<{ message: string }>> {
    console.log('🚪 ApiService: Logout request');
    
    return this.unifiedClient.post('auth.logout');
  }

  /**
   * Get current user (check authentication status)
   */
  public async getCurrentUser(): Promise<FrontendApiResponse<User>> {
    console.log('👤 ApiService: Get current user request');
    
    return this.unifiedClient.get('auth.me');
  }

  // =====================================
  // URL MANAGEMENT METHODS (using resource server)
  // =====================================

  /**
   * Shorten a URL
   */
  public async shortenUrl(originalUrl: string): Promise<FrontendApiResponse<{
    shortCode: string;
    fullShortUrl: string;
  }>> {
    console.log('🔗 ApiService: Shorten URL request for:', originalUrl);
    
    // Validate URL before sending
    const validation = this.validateUrl(originalUrl);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Invalid URL format',
        status: 400
      };
    }

    return this.unifiedClient.post('resource.shortenUrl', { originalUrl });
  }

  /**
   * Resolve a short URL
   */
  public async resolveUrl(shortCode: string): Promise<FrontendApiResponse<{
    originalUrl: string;
  }>> {
    console.log('🔍 ApiService: Resolve URL request for shortCode:', shortCode);
    
    if (!shortCode || shortCode.trim().length === 0) {
      return {
        success: false,
        error: 'Short code is required',
        status: 400
      };
    }

    return this.unifiedClient.get('resource.resolveUrl', undefined, { shortCode });
  }

  /**
   * Get user's URLs
   */
  public async getUserUrls(): Promise<FrontendApiResponse<UrlData[]>> {
    console.log('📋 ApiService: Get user URLs request');
    
    return this.unifiedClient.get('resource.getUserUrls');
  }

  /**
   * Delete a URL
   */
  public async deleteUrl(urlId: string): Promise<FrontendApiResponse<{ message: string }>> {
    console.log('🗑️ ApiService: Delete URL request for ID:', urlId);
    
    if (!urlId) {
      return {
        success: false,
        error: 'URL ID is required',
        status: 400
      };
    }

    return this.unifiedClient.delete('resource.deleteUrl', { id: urlId });
  }

  /**
   * Update a URL
   */
  public async updateUrl(urlId: string, updates: {
    originalUrl?: string;
    customCode?: string;
  }): Promise<FrontendApiResponse<UrlData>> {
    console.log('✏️ ApiService: Update URL request for ID:', urlId);
    
    if (!urlId) {
      return {
        success: false,
        error: 'URL ID is required',
        status: 400
      };
    }

    // Validate originalUrl if provided
    if (updates.originalUrl) {
      const validation = this.validateUrl(updates.originalUrl);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'Invalid URL format',
          status: 400
        };
      }
    }

    return this.unifiedClient.put('resource.updateUrl', updates, { id: urlId });
  }

  // =====================================
  // QR CODE METHODS (using resource server)
  // =====================================

  /**
   * Generate QR code for URL
   */
  public async generateQrCode(url: string, options?: {
    size?: number;
    format?: 'png' | 'svg';
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  }): Promise<FrontendApiResponse<{
    qrCodeId: string;
    qrCodeUrl: string;
    downloadUrl: string;
  }>> {
    console.log('📱 ApiService: Generate QR code for URL:', url);
    
    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Invalid URL format',
        status: 400
      };
    }

    return this.unifiedClient.post('resource.generateQrCode', {
      url,
      ...options
    });
  }

  /**
   * Get QR code by ID
   */
  public async getQrCode(qrCodeId: string): Promise<FrontendApiResponse<{
    qrCodeId: string;
    url: string;
    qrCodeUrl: string;
    downloadUrl: string;
    createdAt: number;
  }>> {
    console.log('📱 ApiService: Get QR code for ID:', qrCodeId);
    
    if (!qrCodeId) {
      return {
        success: false,
        error: 'QR code ID is required',
        status: 400
      };
    }

    return this.unifiedClient.get('resource.getQrCode', undefined, { id: qrCodeId });
  }

  // =====================================
  // BARCODE METHODS (using resource server)
  // =====================================

  /**
   * Generate barcode
   */
  public async generateBarcode(data: string, options?: {
    format?: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
    width?: number;
    height?: number;
  }): Promise<FrontendApiResponse<{
    barcodeId: string;
    barcodeUrl: string;
    downloadUrl: string;
  }>> {
    console.log('📊 ApiService: Generate barcode for data:', data);
    
    if (!data || data.trim().length === 0) {
      return {
        success: false,
        error: 'Barcode data is required',
        status: 400
      };
    }

    return this.unifiedClient.post('resource.generateBarcode', {
      data,
      ...options
    });
  }

  /**
   * Get barcode by ID
   */
  public async getBarcode(barcodeId: string): Promise<FrontendApiResponse<{
    barcodeId: string;
    data: string;
    barcodeUrl: string;
    downloadUrl: string;
    createdAt: number;
  }>> {
    console.log('📊 ApiService: Get barcode for ID:', barcodeId);
    
    if (!barcodeId) {
      return {
        success: false,
        error: 'Barcode ID is required',
        status: 400
      };
    }

    return this.unifiedClient.get('resource.getBarcode', undefined, { id: barcodeId });
  }

  // =====================================
  // ANALYTICS METHODS (using resource server)
  // =====================================

  /**
   * Get analytics data
   */
  public async getAnalytics(options?: {
    timeRange?: '24h' | '7d' | '30d' | '90d' | '1y';
    includeDetails?: boolean;
  }): Promise<FrontendApiResponse<AnalyticsData>> {
    console.log('📊 ApiService: Get analytics data');
    
    const params = options ? {
      timeRange: options.timeRange || '30d',
      includeDetails: String(options.includeDetails || false)
    } : undefined;

    return this.unifiedClient.get('resource.getAnalytics', params);
  }

  /**
   * Get URL-specific analytics
   */
  public async getUrlAnalytics(shortCode: string, options?: {
    timeRange?: '24h' | '7d' | '30d' | '90d' | '1y';
  }): Promise<FrontendApiResponse<{
    shortCode: string;
    clicks: number;
    clickHistory: Array<{ date: string; clicks: number }>;
    referrers: Array<{ source: string; clicks: number }>;
    countries: Array<{ country: string; clicks: number }>;
    devices: Array<{ device: string; clicks: number }>;
  }>> {
    console.log('📊 ApiService: Get URL analytics for shortCode:', shortCode);
    
    if (!shortCode) {
      return {
        success: false,
        error: 'Short code is required',
        status: 400
      };
    }

    const params = options ? {
      timeRange: options.timeRange || '30d'
    } : undefined;

    return this.unifiedClient.get('resource.getUrlAnalytics', params, { shortCode });
  }

  /**
   * Get dashboard statistics
   */
  public async getDashboardStats(): Promise<FrontendApiResponse<{
    totalUrls: number;
    totalClicks: number;
    todayClicks: number;
    topUrls: Array<{ shortCode: string; originalUrl: string; clicks: number }>;
    recentActivity: Array<{ date: string; clicks: number }>;
    clicksByCountry: Array<{ country: string; clicks: number }>;
  }>> {
    console.log('📊 ApiService: Get dashboard statistics');
    
    return this.unifiedClient.get('resource.getDashboardStats');
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Health check both servers
   */
  public async healthCheck(): Promise<FrontendApiResponse<{ 
    auth: boolean;
    resource: boolean;
    overall: boolean;
    latency: { auth?: number; resource?: number };
  }>> {
    console.log('❤️ ApiService: Comprehensive health check');
    
    try {
      const healthResult = await this.unifiedClient.healthCheck();
      
      return {
        success: true,
        data: {
          auth: healthResult.auth.healthy,
          resource: healthResult.resource.healthy,
          overall: healthResult.overall,
          latency: {
            auth: healthResult.auth.latency,
            resource: healthResult.resource.latency
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        status: 503
      };
    }
  }

  /**
   * Validate URL format
   */
  public validateUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || url.trim().length === 0) {
      return {
        isValid: false,
        error: 'URL is required'
      };
    }

    try {
      const urlObj = new URL(url);
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: 'Only HTTP and HTTPS URLs are supported'
        };
      }
      
      // Check for localhost in production
      if (import.meta.env.PROD && 
          (urlObj.hostname === 'localhost' || 
           urlObj.hostname === '127.0.0.1' || 
           urlObj.hostname.endsWith('.local'))) {
        return {
          isValid: false,
          error: 'Localhost URLs are not allowed in production'
        };
      }

      // Check for very long URLs
      if (url.length > 2048) {
        return {
          isValid: false,
          error: 'URL is too long (maximum 2048 characters)'
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

  /**
   * Validate short code format
   */
  public validateShortCode(shortCode: string): { isValid: boolean; error?: string } {
    if (!shortCode || shortCode.trim().length === 0) {
      return {
        isValid: false,
        error: 'Short code is required'
      };
    }

    // Basic validation - adjust based on your short code format
    if (!/^[a-zA-Z0-9_-]+$/.test(shortCode)) {
      return {
        isValid: false,
        error: 'Short code contains invalid characters'
      };
    }

    if (shortCode.length < 3 || shortCode.length > 20) {
      return {
        isValid: false,
        error: 'Short code must be between 3 and 20 characters'
      };
    }

    return { isValid: true };
  }

  // Configuration methods
  public getBaseUrl(): string {
    const stats = this.unifiedClient.getStats();
    return stats.clients.resource.baseUrl;
  }

  public setBaseUrl(_baseUrl: string): void {
    // Update through unified client configuration
    console.warn('⚠️ ApiService: Direct base URL setting deprecated. Update through ApiConfig instead.');
  }

  /**
   * Get service statistics
   */
  public getServiceStats(): {
    unifiedClient: ReturnType<UnifiedApiClient['getStats']>;
    endpointsAvailable: {
      auth: string[];
      resource: string[];
      session: string[];
    };
    connectivity: {
      isOnline: boolean;
      offlineQueueSize: number;
    };
  } {
    const unifiedStats = this.unifiedClient.getStats();
    
    return {
      unifiedClient: unifiedStats,
      endpointsAvailable: {
        auth: ['login', 'logout', 'me', 'register', 'forgotPassword', 'resetPassword'],
        resource: ['shortenUrl', 'resolveUrl', 'getUserUrls', 'updateUrl', 'deleteUrl', 'generateQrCode', 'generateBarcode'],
        session: ['validate', 'info', 'all', 'invalidateAll']
      },
      connectivity: {
        isOnline: unifiedStats.isOnline,
        offlineQueueSize: unifiedStats.offlineQueueSize
      }
    };
  }

  /**
   * Test connectivity to both servers
   */
  public async testConnectivity(): Promise<{
    auth: { reachable: boolean; latency?: number; error?: string };
    resource: { reachable: boolean; latency?: number; error?: string };
    overall: boolean;
  }> {
    try {
      const healthResult = await this.unifiedClient.healthCheck();
      
      return {
        auth: {
          reachable: healthResult.auth.healthy,
          latency: healthResult.auth.latency,
          error: healthResult.auth.error
        },
        resource: {
          reachable: healthResult.resource.healthy,
          latency: healthResult.resource.latency,
          error: healthResult.resource.error
        },
        overall: healthResult.overall
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        auth: { reachable: false, error: errorMessage },
        resource: { reachable: false, error: errorMessage },
        overall: false
      };
    }
  }

  /**
   * Clear offline queue
   */
  public clearOfflineQueue(): void {
    this.unifiedClient.clearOfflineQueue();
  }

  /**
   * Reset circuit breakers
   */
  public resetCircuitBreakers(): void {
    this.unifiedClient.resetCircuitBreakers();
  }

  /**
   * Update configuration
   */
  public updateConfiguration(): void {
    this.unifiedClient.updateConfig();
    console.log('🔄 ApiService: Configuration updated through unified client');
  }
}