// src/services/core/ApiConfig.ts - PHASE 3: UNIFIED ENDPOINT MANAGEMENT

export interface AuthServerConfig {
  baseUrl: string;
  endpoints: {
    // Authentication endpoints
    register: string;
    login: string;
    logout: string;
    me: string; // NEW: Get current user
    
    // Password management
    forgotPassword: string;
    resetPassword: string;
    confirmPasswordToken: string;
    
    // Account verification
    confirmAccount: string;
    resendVerification: string;
    
    // OAuth2 endpoints
    oauth2GoogleAuthUrl: string;
    
    // Health check
    health: string;
  };
}

export interface ResourceServerConfig {
  baseUrl: string;
  endpoints: {
    // URL management
    shortenUrl: string;
    resolveUrl: string; // /urls/resolve/:shortCode
    getUserUrls: string;
    updateUrl: string; // /urls/:id
    deleteUrl: string; // /urls/:id
    
    // QR Code generation
    generateQrCode: string;
    getQrCode: string; // /qr-codes/:id
    
    // Barcode generation
    generateBarcode: string;
    getBarcode: string; // /barcodes/:id
    
    // Analytics
    getAnalytics: string;
    getUrlAnalytics: string; // /analytics/url/:shortCode
    getDashboardStats: string;
    
    // Health check
    health: string;
  };
}

export interface SessionConfig {
  endpoints: {
    info: string;
    all: string;
    invalidateAll: string;
    validate: string;
    check: string;
    invalidateSpecific: string; // /session/invalidate/:sessionId
  };
}

export interface SecurityConfig {
  endpoints: {
    csrfToken: string;
  };
}

export interface OAuth2Config {
  googleEnabled: boolean;
  providers: {
    google: {
      enabled: boolean;
      scopes: string[];
    };
  };
}

export interface ApiEndpointConfig {
  authServer: AuthServerConfig;
  resourceServer: ResourceServerConfig;
  session: SessionConfig;
  security: SecurityConfig;
  oauth2: OAuth2Config;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  maxRetryDelay: number;
}

/**
 * Server type for routing decisions
 */
export type ServerType = 'auth' | 'resource';

/**
 * Endpoint information with routing details
 */
export interface EndpointInfo {
  path: string;
  server: ServerType;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth?: boolean;
  timeout?: number;
}

/**
 * Enhanced API Configuration Manager with complete endpoint management
 */
export class ApiConfig {
  private static instance: ApiConfig;
  private config: ApiEndpointConfig;
  private endpointRegistry: Map<string, EndpointInfo> = new Map();

  private constructor() {
    this.config = this.loadConfiguration();
    this.buildEndpointRegistry();
    this.validateConfiguration();
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
  private loadConfiguration(): ApiEndpointConfig {
    const authServerBaseUrl = import.meta.env.VITE_AUTH_SERVER_URL || 'http://localhost:8090';
    const resourceServerBaseUrl = import.meta.env.VITE_RESOURCE_SERVER_URL || 'http://localhost:8080';
    
    return {
      authServer: {
        baseUrl: authServerBaseUrl,
        endpoints: {
          // Authentication
          register: '/api/auth/register',
          login: '/api/auth/login',
          logout: '/api/auth/logout',
          me: '/api/auth/me',
          
          // Password management
          forgotPassword: '/api/auth/forgot-password',
          resetPassword: '/api/auth/reset-password',
          confirmPasswordToken: '/api/auth/confirm-password-token',
          
          // Account verification
          confirmAccount: '/api/auth/confirm-account',
          resendVerification: '/api/auth/resend-verification',
          
          // OAuth2
          oauth2GoogleAuthUrl: '/api/auth/oauth2/authorization-url/google',
          
          // Health
          health: '/api/health'
        }
      },
      resourceServer: {
        baseUrl: resourceServerBaseUrl,
        endpoints: {
          // URL management
          shortenUrl: '/api/urls/shorten',
          resolveUrl: '/api/urls/resolve',
          getUserUrls: '/api/urls/user',
          updateUrl: '/api/urls',
          deleteUrl: '/api/urls',
          
          // QR Codes
          generateQrCode: '/api/qr-codes/generate',
          getQrCode: '/api/qr-codes',
          
          // Barcodes
          generateBarcode: '/api/barcodes/generate',
          getBarcode: '/api/barcodes',
          
          // Analytics
          getAnalytics: '/api/analytics',
          getUrlAnalytics: '/api/analytics/url',
          getDashboardStats: '/api/analytics/dashboard',
          
          // Health
          health: '/api/health'
        }
      },
      session: {
        endpoints: {
          info: '/api/session/info',
          all: '/api/session/all',
          invalidateAll: '/api/session/invalidate-all',
          validate: '/api/session/validate',
          check: '/api/session/check',
          invalidateSpecific: '/api/session/invalidate'
        }
      },
      security: {
        endpoints: {
          csrfToken: '/api/security/csrf-token'
        }
      },
      oauth2: {
        googleEnabled: import.meta.env.VITE_ENABLE_GOOGLE_AUTH !== 'false',
        providers: {
          google: {
            enabled: import.meta.env.VITE_ENABLE_GOOGLE_AUTH !== 'false',
            scopes: ['email', 'profile']
          }
        }
      },
      requestTimeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000'),
      retryAttempts: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(import.meta.env.VITE_RETRY_DELAY || '1000'),
      maxRetryDelay: parseInt(import.meta.env.VITE_MAX_RETRY_DELAY || '10000')
    };
  }

  /**
   * Build endpoint registry with routing information
   */
  private buildEndpointRegistry(): void {
    // Auth server endpoints
    Object.entries(this.config.authServer.endpoints).forEach(([key, path]) => {
      this.endpointRegistry.set(`auth.${key}`, {
        path,
        server: 'auth',
        requiresAuth: !['register', 'login', 'forgotPassword', 'resetPassword', 'confirmAccount', 'resendVerification', 'confirmPasswordToken', 'health'].includes(key)
      });
    });

    // Resource server endpoints  
    Object.entries(this.config.resourceServer.endpoints).forEach(([key, path]) => {
      this.endpointRegistry.set(`resource.${key}`, {
        path,
        server: 'resource',
        requiresAuth: key !== 'health'
      });
    });

    // Session endpoints (go to auth server)
    Object.entries(this.config.session.endpoints).forEach(([key, path]) => {
      this.endpointRegistry.set(`session.${key}`, {
        path,
        server: 'auth',
        requiresAuth: true
      });
    });

    // Security endpoints (go to auth server)
    Object.entries(this.config.security.endpoints).forEach(([key, path]) => {
      this.endpointRegistry.set(`security.${key}`, {
        path,
        server: 'auth',
        requiresAuth: false
      });
    });

    console.log(`🔧 ApiConfig: Registered ${this.endpointRegistry.size} endpoints`);
  }

  /**
   * Get endpoint information by key
   */
  public getEndpoint(key: string): EndpointInfo | null {
    const endpoint = this.endpointRegistry.get(key);
    if (!endpoint) {
      console.warn(`⚠️ ApiConfig: Endpoint '${key}' not found`);
      return null;
    }
    return endpoint;
  }

  /**
   * Get full URL for an endpoint
   */
  public getEndpointUrl(key: string, pathParams?: Record<string, string>): string | null {
    const endpoint = this.getEndpoint(key);
    if (!endpoint) {
      return null;
    }

    const baseUrl = endpoint.server === 'auth' 
      ? this.config.authServer.baseUrl 
      : this.config.resourceServer.baseUrl;

    let path = endpoint.path;

    // Replace path parameters
    if (pathParams) {
      Object.entries(pathParams).forEach(([param, value]) => {
        path = path.replace(`:${param}`, value);
      });
    }

    return `${baseUrl}${path}`;
  }

  /**
   * Get server base URL by type
   */
  public getServerBaseUrl(server: ServerType): string {
    return server === 'auth' 
      ? this.config.authServer.baseUrl 
      : this.config.resourceServer.baseUrl;
  }

  /**
   * Check if endpoint exists
   */
  public hasEndpoint(key: string): boolean {
    return this.endpointRegistry.has(key);
  }

  /**
   * Get all endpoints for a server
   */
  public getEndpointsByServer(server: ServerType): Map<string, EndpointInfo> {
    const serverEndpoints = new Map<string, EndpointInfo>();
    
    this.endpointRegistry.forEach((endpoint, key) => {
      if (endpoint.server === server) {
        serverEndpoints.set(key, endpoint);
      }
    });

    return serverEndpoints;
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate server URLs
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

    // Validate timeout values
    if (this.config.requestTimeout <= 0) {
      errors.push('Request timeout must be positive');
    }

    if (this.config.retryAttempts < 0) {
      errors.push('Retry attempts cannot be negative');
    }

    if (errors.length > 0) {
      console.error('❌ ApiConfig validation failed:', errors);
      throw new Error(`Invalid API configuration: ${errors.join(', ')}`);
    }

    console.log('✅ ApiConfig validation passed');
  }

  /**
   * Get validation result
   */
  public validateConfig(): { isValid: boolean; errors: string[] } {
    try {
      this.validateConfiguration();
      return { isValid: true, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error instanceof Error ? error.message : 'Unknown validation error'] 
      };
    }
  }

  // Legacy getters for backward compatibility
  public getAuthServerConfig(): AuthServerConfig {
    return this.config.authServer;
  }

  public getResourceServerConfig(): ResourceServerConfig {
    return this.config.resourceServer;
  }

  public getSessionConfig(): SessionConfig {
    return this.config.session;
  }

  public getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  public getOAuth2Config(): OAuth2Config {
    return this.config.oauth2;
  }

  public getConfig(): Readonly<ApiEndpointConfig> {
    return { ...this.config };
  }

  public getRequestTimeout(): number {
    return this.config.requestTimeout;
  }

  public getRetryAttempts(): number {
    return this.config.retryAttempts;
  }

  public getRetryDelay(): number {
    return this.config.retryDelay;
  }

  public getMaxRetryDelay(): number {
    return this.config.maxRetryDelay;
  }

  /**
   * Update configuration dynamically
   */
  public updateConfig(updates: Partial<ApiEndpointConfig>): void {
    this.config = { ...this.config, ...updates };
    this.endpointRegistry.clear();
    this.buildEndpointRegistry();
    this.validateConfiguration();
    console.log('🔄 ApiConfig: Configuration updated');
  }

  /**
   * Build legacy URLs for backward compatibility
   */
  public buildAuthUrl(endpoint: keyof AuthServerConfig['endpoints']): string {
    const url = this.getEndpointUrl(`auth.${endpoint}`);
    if (!url) {
      throw new Error(`Auth endpoint '${endpoint}' not found`);
    }
    return url;
  }

  public buildResourceUrl(endpoint: keyof ResourceServerConfig['endpoints']): string {
    const url = this.getEndpointUrl(`resource.${endpoint}`);
    if (!url) {
      throw new Error(`Resource endpoint '${endpoint}' not found`);
    }
    return url;
  }

  public buildSessionUrl(endpoint: keyof SessionConfig['endpoints']): string {
    const url = this.getEndpointUrl(`session.${endpoint}`);
    if (!url) {
      throw new Error(`Session endpoint '${endpoint}' not found`);
    }
    return url;
  }

  /**
   * Get endpoint registry for debugging
   */
  public getEndpointRegistry(): ReadonlyMap<string, EndpointInfo> {
    return new Map(this.endpointRegistry);
  }

  /**
   * Health check all endpoints
   */
  public async healthCheckEndpoints(): Promise<{
    auth: boolean;
    resource: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let authHealthy = false;
    let resourceHealthy = false;

    try {
      const authHealthUrl = this.getEndpointUrl('auth.health');
      if (authHealthUrl) {
        const response = await fetch(authHealthUrl);
        authHealthy = response.ok;
      }
    } catch (error) {
      errors.push(`Auth server health check failed: ${error}`);
    }

    try {
      const resourceHealthUrl = this.getEndpointUrl('resource.health');
      if (resourceHealthUrl) {
        const response = await fetch(resourceHealthUrl);
        resourceHealthy = response.ok;
      }
    } catch (error) {
      errors.push(`Resource server health check failed: ${error}`);
    }

    return {
      auth: authHealthy,
      resource: resourceHealthy,
      errors
    };
  }
}