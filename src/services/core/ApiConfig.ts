// src/services/core/ApiConfig.ts

export interface AuthServerConfig {
  baseUrl: string;
  endpoints: {
    register: string;
    login: string;
    logout: string;
    forgotPassword: string;
    resetPassword: string;
    confirmAccount: string;
    resendVerification: string;
    confirmPasswordToken: string;
    oauth2GoogleAuthUrl: string;
  };
}

export interface ResourceServerConfig {
  baseUrl: string;
  endpoints: {
    // Will be added when implementing business features
    urls: string;
    qrCodes: string;
    barcodes: string;
    analytics: string;
  };
}

export interface SessionConfig {
  endpoints: {
    info: string;
    all: string;
    invalidateAll: string;
    validate: string;
  };
}

export interface OAuth2Config {
  // OAuth2 config is managed by backend, frontend just needs to know if it's available
  googleEnabled: boolean;
}

export interface AppApiConfig {
  authServer: AuthServerConfig;
  resourceServer: ResourceServerConfig;
  session: SessionConfig;
  oauth2: OAuth2Config;
  requestTimeout: number;
  retryAttempts: number;
}

/**
 * API Configuration Manager
 * Centralizes all API endpoints and configuration
 */
export class ApiConfig {
  private static instance: ApiConfig;
  private config: AppApiConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): AppApiConfig {
    const authServerBaseUrl = import.meta.env.VITE_AUTH_SERVER_URL || 'http://localhost:8090';
    const resourceServerBaseUrl = import.meta.env.VITE_RESOURCE_SERVER_URL || 'http://localhost:8080';
    
    return {
      authServer: {
        baseUrl: authServerBaseUrl,
        endpoints: {
          register: '/api/auth/register',
          login: '/api/auth/login',
          logout: '/api/auth/logout',
          forgotPassword: '/api/auth/forgot-password',
          resetPassword: '/api/auth/reset-password',
          confirmAccount: '/api/auth/confirm-account',
          resendVerification: '/api/auth/resend-verification',
          confirmPasswordToken: '/api/auth/confirm-password-token',
          oauth2GoogleAuthUrl: '/api/auth/oauth2/authorization-url/google'
        }
      },
      resourceServer: {
        baseUrl: resourceServerBaseUrl,
        endpoints: {
          urls: '/api/urls',
          qrCodes: '/api/qr-codes',
          barcodes: '/api/barcodes',
          analytics: '/api/analytics'
        }
      },
      session: {
        endpoints: {
          info: '/api/session/info',
          all: '/api/session/all',
          invalidateAll: '/api/session/invalidate-all',
          validate: '/api/session/validate'
        }
      },
      oauth2: {
        googleEnabled: true // Just a flag, backend handles all OAuth2 config
      },
      requestTimeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000'),
      retryAttempts: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '3')
    };
  }

  /**
   * Get auth server configuration
   */
  public getAuthServerConfig(): AuthServerConfig {
    return this.config.authServer;
  }

  /**
   * Get resource server configuration
   */
  public getResourceServerConfig(): ResourceServerConfig {
    return this.config.resourceServer;
  }

  /**
   * Get session configuration
   */
  public getSessionConfig(): SessionConfig {
    return this.config.session;
  }

  /**
   * Get OAuth2 configuration
   */
  public getOAuth2Config(): OAuth2Config {
    return this.config.oauth2;
  }

  /**
   * Get full configuration
   */
  public getConfig(): Readonly<AppApiConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration (useful for testing or dynamic config)
   */
  public updateConfig(updates: Partial<AppApiConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get request timeout
   */
  public getRequestTimeout(): number {
    return this.config.requestTimeout;
  }

  /**
   * Get retry attempts
   */
  public getRetryAttempts(): number {
    return this.config.retryAttempts;
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check auth server URL
    if (!this.config.authServer.baseUrl) {
      errors.push('Auth server base URL is required');
    }

    // Check resource server URL  
    if (!this.config.resourceServer.baseUrl) {
      errors.push('Resource server base URL is required');
    }

    // Validate URLs
    try {
      new URL(this.config.authServer.baseUrl);
    } catch {
      errors.push('Invalid auth server URL');
    }

    try {
      new URL(this.config.resourceServer.baseUrl);
    } catch {
      errors.push('Invalid resource server URL');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Build full URL for auth server endpoint
   */
  public buildAuthUrl(endpoint: keyof AuthServerConfig['endpoints']): string {
    return `${this.config.authServer.baseUrl}${this.config.authServer.endpoints[endpoint]}`;
  }

  /**
   * Build full URL for resource server endpoint
   */
  public buildResourceUrl(endpoint: keyof ResourceServerConfig['endpoints']): string {
    return `${this.config.resourceServer.baseUrl}${this.config.resourceServer.endpoints[endpoint]}`;
  }

  /**
   * Build full URL for session endpoint (using auth server)
   */
  public buildSessionUrl(endpoint: keyof SessionConfig['endpoints']): string {
    return `${this.config.authServer.baseUrl}${this.config.session.endpoints[endpoint]}`;
  }
}