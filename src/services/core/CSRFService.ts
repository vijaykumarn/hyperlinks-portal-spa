// src/services/core/CSRFService.ts - CSRF Token Management
// Handles CSRF token retrieval and validation as per backend API

import { API_CONFIG } from '../../config/constants';
import { logger } from '../../utils/logger';
import type { BackendApiResponse } from '../../types/unified';

interface CSRFTokenResponse {
  parameterName: string;
  headerName: string;
  token: string;
}

class CSRFService {
  private static instance: CSRFService;
  private tokenCache: {
    token: string | null;
    headerName: string;
    expiresAt: number;
  } = {
    token: null,
    headerName: 'X-CSRF-Token',
    expiresAt: 0
  };

  private constructor() {}

  public static getInstance(): CSRFService {
    if (!CSRFService.instance) {
      CSRFService.instance = new CSRFService();
    }
    return CSRFService.instance;
  }

  /**
   * Get CSRF token from backend
   */
  public async getToken(): Promise<string> {
    try {
      // Check if we have a valid cached token
      if (this.tokenCache.token && Date.now() < this.tokenCache.expiresAt) {
        logger.api.debug('Using cached CSRF token');
        return this.tokenCache.token;
      }

      logger.api.info('Fetching new CSRF token from backend');

      // Create a minimal request to get CSRF token
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CSRF token request failed: ${response.status}`);
      }

      const data: BackendApiResponse<CSRFTokenResponse> = await response.json();

      if (!data.success || !data.data) {
        throw new Error('Invalid CSRF token response format');
      }

      const { token, headerName } = data.data;

      // Cache the token for 30 minutes
      this.tokenCache = {
        token,
        headerName: headerName || 'X-CSRF-Token',
        expiresAt: Date.now() + (30 * 60 * 1000)
      };

      logger.api.info('CSRF token obtained and cached successfully');
      return token;

    } catch (error) {
      logger.api.error('Failed to get CSRF token', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Get CSRF header name
   */
  public getHeaderName(): string {
    return this.tokenCache.headerName;
  }

  /**
   * Clear cached token (force refresh on next request)
   */
  public clearToken(): void {
    logger.api.debug('Clearing cached CSRF token');
    this.tokenCache = {
      token: null,
      headerName: 'X-CSRF-Token',
      expiresAt: 0
    };
  }

  /**
   * Check if CSRF protection is required for this method
   */
  public isCSRFRequired(method: string): boolean {
    const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return protectedMethods.includes(method.toUpperCase());
  }
}

export const csrfService = CSRFService.getInstance();