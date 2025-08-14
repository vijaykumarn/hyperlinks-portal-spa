// src/services/core/UnifiedApiClient.ts - PHASE 3: UNIFIED API CLIENT

import { HttpClient, type FrontendApiResponse, type RequestConfig } from './HttpClient';
import { ApiConfig, type ServerType } from './ApiConfig';

/**
 * Extended HttpClient that exposes protected methods publicly
 */
class AuthHttpClient extends HttpClient {
  public async publicGet<T>(endpoint: string, config: RequestConfig = {}) {
    return this.get<T>(endpoint, config);
  }
  public async publicPost<T>(endpoint: string, body?: any, config: RequestConfig = {}) {
    return this.post<T>(endpoint, body, config);
  }
  public async publicPut<T>(endpoint: string, body?: any, config: RequestConfig = {}) {
    return this.put<T>(endpoint, body, config);
  }
  public async publicPatch<T>(endpoint: string, body?: any, config: RequestConfig = {}) {
    return this.patch<T>(endpoint, body, config);
  }
  public async publicDelete<T>(endpoint: string, config: RequestConfig = {}) {
    return this.delete<T>(endpoint, config);
  }
}

/**
 * Request context for routing and error handling
 */
export interface RequestContext {
  endpoint: string;
  server: ServerType;
  requiresAuth: boolean;
  operation: string;
  pathParams?: Record<string, string>;
}

/**
 * Offline request for queuing
 */
interface OfflineRequest {
  context: RequestContext;
  method: string;
  body?: any;
  config?: RequestConfig;
  timestamp: number;
  retryCount: number;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * Unified API Client that handles both Auth and Resource servers
 */
export class UnifiedApiClient {
  private static instance: UnifiedApiClient;
  private apiConfig: ApiConfig;
  private authClient!: AuthHttpClient;
  private resourceClient!: AuthHttpClient;
  private offlineQueue: OfflineRequest[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private isOnline = navigator.onLine;

  // Circuit breaker settings
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_DURATION = 30000; // 30 seconds

  private constructor() {
    this.apiConfig = ApiConfig.getInstance();
    this.initializeClients();
    this.setupNetworkListeners();
    this.setupInterceptors();
  }

  public static getInstance(): UnifiedApiClient {
    if (!UnifiedApiClient.instance) {
      UnifiedApiClient.instance = new UnifiedApiClient();
    }
    return UnifiedApiClient.instance;
  }

  /**
   * Initialize HTTP clients for both servers
   */
  private initializeClients(): void {
    const config = this.apiConfig.getConfig();

    this.authClient = new AuthHttpClient({
      baseUrl: config.authServer.baseUrl,
      timeout: config.requestTimeout,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay,
      maxRetryDelay: config.maxRetryDelay,
      withCredentials: true,
      defaultHeaders: {
        'X-Service-Type': 'auth',
        'Content-Type': 'application/json',
      }
    });

    this.resourceClient = new AuthHttpClient({
      baseUrl: config.resourceServer.baseUrl,
      timeout: config.requestTimeout,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay,
      maxRetryDelay: config.maxRetryDelay,
      withCredentials: true,
      defaultHeaders: {
        'X-Service-Type': 'resource',
        'Content-Type': 'application/json',
      }
    });

    console.log('🔧 UnifiedApiClient: Initialized clients for both servers');
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Network: Back online');
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Network: Gone offline');
      this.isOnline = false;
    });
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Add timestamp to all requests
    const timestampInterceptor = (config: RequestConfig) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          'X-Request-Timestamp': Date.now().toString(),
          'Content-Type': 'application/json',
        }
      };
    };

    this.authClient.addRequestInterceptor(timestampInterceptor);
    this.resourceClient.addRequestInterceptor(timestampInterceptor);

    // Add response logging
    const loggingInterceptor = <T>(response: FrontendApiResponse<T>) => {
      if (!response.success && response.status && response.status >= 500) {
        console.error('🚨 Server error detected:', response);
      }
      return response;
    };

    this.authClient.addResponseInterceptor(loggingInterceptor);
    this.resourceClient.addResponseInterceptor(loggingInterceptor);
  }

  /**
   * Get appropriate client for server type
   */
  private getClient(server: ServerType): AuthHttpClient {
    return server === 'auth' ? this.authClient : this.resourceClient;
  }

  /**
   * Execute API request with routing and circuit breaker
   */
  public async request<T>(
    endpointKey: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: any,
    config: RequestConfig = {},
    pathParams?: Record<string, string>
  ): Promise<FrontendApiResponse<T>> {
    const endpoint = this.apiConfig.getEndpoint(endpointKey);
    
    if (!endpoint) {
      return {
        success: false,
        error: `Endpoint '${endpointKey}' not found`,
        status: 404
      };
    }

    const context: RequestContext = {
      endpoint: endpointKey,
      server: endpoint.server,
      requiresAuth: endpoint.requiresAuth || false,
      operation: `${method} ${endpointKey}`,
      pathParams
    };

    // Check circuit breaker
    if (this.isCircuitOpen(context.server)) {
      return {
        success: false,
        error: `${context.server} server circuit breaker is open`,
        status: 503
      };
    }

    // Handle offline scenario
    if (!this.isOnline) {
      return this.handleOfflineRequest<T>(context, method, body, config);
    }

    try {
      const response = await this.executeRequest<T>(context, method, body, config);
      this.recordSuccess(context.server);
      return response;

    } catch (error) {
      this.recordFailure(context.server);
      throw error;
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    context: RequestContext,
    method: string,
    body?: any,
    config: RequestConfig = {}
  ): Promise<FrontendApiResponse<T>> {
    const client = this.getClient(context.server);
    let path = this.apiConfig.getEndpoint(context.endpoint)!.path;

    // Replace path parameters
    if (context.pathParams) {
      Object.entries(context.pathParams).forEach(([param, value]) => {
        path = path.replace(`:${param}`, value);
      });
    }

    console.log(`📡 API: ${method} ${context.endpoint} -> ${context.server}:${path}`);

    switch (method.toUpperCase()) {
      case 'GET':
        return client.publicGet<T>(path, config);
      case 'POST':
        return client.publicPost<T>(path, body, config);
      case 'PUT':
        return client.publicPut<T>(path, body, config);
      case 'PATCH':
        return client.publicPatch<T>(path, body, config);
      case 'DELETE':
        return client.publicDelete<T>(path, config);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Handle offline requests by queuing
   */
  private handleOfflineRequest<T>(
    context: RequestContext,
    method: string,
    body?: any,
    config?: RequestConfig
  ): FrontendApiResponse<T> {
    // Only queue non-GET requests
    if (method.toUpperCase() !== 'GET') {
      this.offlineQueue.push({
        context,
        method,
        body,
        config,
        timestamp: Date.now(),
        retryCount: 0
      });

      console.log(`📴 Queued offline request: ${context.operation}`);
    }

    return {
      success: false,
      error: 'You are currently offline. Your request has been queued and will be processed when connection is restored.',
      status: 0
    };
  }

  /**
   * Process queued offline requests
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${this.offlineQueue.length} offline requests...`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const request of queue) {
      try {
        await this.executeRequest(request.context, request.method, request.body, request.config);
        console.log(`✅ Offline request processed: ${request.context.operation}`);
      } catch (error) {
        console.error(`❌ Failed to process offline request: ${request.context.operation}`, error);
        
        // Re-queue if retry count is low
        if (request.retryCount < 3) {
          this.offlineQueue.push({
            ...request,
            retryCount: request.retryCount + 1
          });
        }
      }
    }
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitOpen(server: ServerType): boolean {
    const breaker = this.circuitBreakers.get(server);
    if (!breaker) {
      return false;
    }

    const now = Date.now();

    switch (breaker.state) {
      case 'OPEN':
        if (now - breaker.lastFailure > this.TIMEOUT_DURATION) {
          breaker.state = 'HALF_OPEN';
          console.log(`🔄 Circuit breaker for ${server} server: OPEN -> HALF_OPEN`);
          return false;
        }
        return true;

      case 'HALF_OPEN':
        // Allow limited requests in half-open state
        return false;

      case 'CLOSED':
      default:
        return false;
    }
  }

  /**
   * Record successful request for circuit breaker
   */
  private recordSuccess(server: ServerType): void {
    const breaker = this.circuitBreakers.get(server);
    if (breaker) {
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        breaker.failures = 0;
        console.log(`✅ Circuit breaker for ${server} server: HALF_OPEN -> CLOSED`);
      } else if (breaker.state === 'CLOSED') {
        breaker.failures = Math.max(0, breaker.failures - 1);
      }
    }
  }

  /**
   * Record failed request for circuit breaker
   */
  private recordFailure(server: ServerType): void {
    let breaker = this.circuitBreakers.get(server);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, state: 'CLOSED' };
      this.circuitBreakers.set(server, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.FAILURE_THRESHOLD && breaker.state === 'CLOSED') {
      breaker.state = 'OPEN';
      console.warn(`🚨 Circuit breaker for ${server} server: CLOSED -> OPEN (${breaker.failures} failures)`);
    }
  }

  // Convenience methods for common operations

  /**
   * GET request
   */
  public async get<T>(
    endpointKey: string,
    params?: Record<string, string>,
    pathParams?: Record<string, string>
  ): Promise<FrontendApiResponse<T>> {
    return this.request<T>(endpointKey, 'GET', undefined, { params }, pathParams);
  }

  /**
   * POST request
   */
  public async post<T>(
    endpointKey: string,
    body?: any,
    pathParams?: Record<string, string>
  ): Promise<FrontendApiResponse<T>> {
    return this.request<T>(endpointKey, 'POST', body, {}, pathParams);
  }

  /**
   * PUT request
   */
  public async put<T>(
    endpointKey: string,
    body?: any,
    pathParams?: Record<string, string>
  ): Promise<FrontendApiResponse<T>> {
    return this.request<T>(endpointKey, 'PUT', body, {}, pathParams);
  }

  /**
   * DELETE request
   */
  public async delete<T>(
    endpointKey: string,
    pathParams?: Record<string, string>
  ): Promise<FrontendApiResponse<T>> {
    return this.request<T>(endpointKey, 'DELETE', undefined, {}, pathParams);
  }

  /**
   * Health check all servers
   */
  public async healthCheck(): Promise<{
    auth: { healthy: boolean; latency?: number; error?: string };
    resource: { healthy: boolean; latency?: number; error?: string };
    overall: boolean;
  }> {
    const [authHealth, resourceHealth] = await Promise.allSettled([
      this.authClient.healthCheck(),
      this.resourceClient.healthCheck()
    ]);

    const auth = authHealth.status === 'fulfilled' 
      ? authHealth.value 
      : { healthy: false, error: 'Health check failed' };

    const resource = resourceHealth.status === 'fulfilled' 
      ? resourceHealth.value 
      : { healthy: false, error: 'Health check failed' };

    return {
      auth,
      resource,
      overall: auth.healthy && resource.healthy
    };
  }

  /**
   * Get comprehensive statistics
   */
  public getStats(): {
    isOnline: boolean;
    offlineQueueSize: number;
    circuitBreakers: Record<string, CircuitBreakerState>;
    clients: {
      auth: any;
      resource: any;
    };
  } {
    const circuitBreakers: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((state, server) => {
      circuitBreakers[server] = { ...state };
    });

    return {
      isOnline: this.isOnline,
      offlineQueueSize: this.offlineQueue.length,
      circuitBreakers,
      clients: {
        auth: this.authClient.getStats(),
        resource: this.resourceClient.getStats()
      }
    };
  }

  /**
   * Clear offline queue
   */
  public clearOfflineQueue(): void {
    const count = this.offlineQueue.length;
    this.offlineQueue = [];
    console.log(`🗑️ Cleared ${count} offline requests`);
  }

  /**
   * Reset circuit breakers
   */
  public resetCircuitBreakers(): void {
    this.circuitBreakers.clear();
    console.log('🔄 Reset all circuit breakers');
  }

  /**
   * Update configuration
   */
  public updateConfig(): void {
    this.apiConfig = ApiConfig.getInstance();
    this.initializeClients();
    this.setupInterceptors();
    console.log('🔄 UnifiedApiClient: Configuration updated');
  }

  /**
   * Destroy client and cleanup
   */
  public destroy(): void {
    this.clearOfflineQueue();
    this.resetCircuitBreakers();
    window.removeEventListener('online', this.processOfflineQueue);
    window.removeEventListener('offline', () => this.isOnline = false);
    console.log('🧹 UnifiedApiClient: Destroyed');
  }
}