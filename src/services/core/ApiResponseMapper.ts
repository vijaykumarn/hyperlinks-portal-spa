// src/services/core/ApiResponseMapper.ts - Backend API Response Mapping
// Maps backend responses to frontend format based on OpenAPI spec

import type { BackendApiResponse } from '../../types/unified';
import { TypeGuards } from '../../types/unified';
import { ErrorFactory } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * Maps backend API responses to standardized frontend format
 */
export class ApiResponseMapper {
  /**
   * Map backend response to frontend ApiResponse format
   */
  static mapResponse<T>(backendResponse: unknown): {
    success: boolean;
    data?: T;
    error?: AppError;
    message?: string;
  } {
    // Validate response format
    if (!TypeGuards.isBackendApiResponse(backendResponse)) {
      logger.api.warn('Invalid backend response format', { backendResponse });
      
      return {
        success: false,
        error: ErrorFactory.server('Invalid response format', 500, {
          receivedType: typeof backendResponse
        })
      };
    }

    const response = backendResponse as BackendApiResponse<T>;

    // Handle successful responses
    if (response.success) {
      return {
        success: true,
        data: response.data,
        message: response.message
      };
    }

    // Handle error responses
    const error = ErrorFactory.fromApiResponse({
      success: false,
      error: response.error,
      message: response.message
    });

    return {
      success: false,
      error,
      message: response.message
    };
  }

  /**
   * Map authentication response specifically
   */
  static mapAuthResponse<T>(backendResponse: unknown): {
    success: boolean;
    data?: T;
    error?: AppError;
    requiresVerification?: boolean;
  } {
    const mapped = this.mapResponse<T>(backendResponse);

    // Check for verification requirement
    const requiresVerification = mapped.error?.code === 'ACCOUNT_NOT_VERIFIED' ||
                                mapped.error?.message?.includes('verify') ||
                                mapped.error?.message?.includes('verification');

    return {
      ...mapped,
      requiresVerification
    };
  }

  /**
   * Map session validation response
   */
  static mapSessionResponse(backendResponse: unknown): {
    valid: boolean;
    user?: any;
    error?: AppError;
  } {
    const mapped = this.mapResponse<{
      authenticated?: boolean;
      valid?: boolean;
      userId?: string;
      email?: string;
      user?: any;
    }>(backendResponse);

    if (!mapped.success || !mapped.data) {
      return {
        valid: false,
        error: mapped.error || ErrorFactory.authentication('SESSION_INVALID', 'Session validation failed')
      };
    }

    const { authenticated, valid, userId, email, user } = mapped.data;

    // Backend uses both 'authenticated' and 'valid' flags
    const isValid = authenticated && valid;

    return {
      valid: isValid,
      user: user || (userId && email ? { id: userId, email } : undefined),
      error: isValid ? undefined : ErrorFactory.authentication('SESSION_INVALID', 'Session is not valid')
    };
  }

  /**
   * Map OAuth2 response
   */
  static mapOAuth2Response(backendResponse: unknown): {
    success: boolean;
    authUrl?: string;
    state?: string;
    error?: AppError;
  } {
    const mapped = this.mapResponse<{
      authorizationUrl?: string;
      state?: string;
    }>(backendResponse);

    if (!mapped.success) {
      return {
        success: false,
        error: mapped.error || ErrorFactory.authentication('OAUTH2_ERROR', 'OAuth2 setup failed')
      };
    }

    const { authorizationUrl, state } = mapped.data || {};

    if (!authorizationUrl) {
      return {
        success: false,
        error: ErrorFactory.authentication('OAUTH2_ERROR', 'No authorization URL received')
      };
    }

    return {
      success: true,
      authUrl: authorizationUrl,
      state
    };
  }
}