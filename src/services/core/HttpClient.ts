// src/services/core/HttpClient.ts - PHASE 3: ENHANCED HTTP CLIENT

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  withCredentials?: boolean;
  defaultHeaders?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  params?: Record<string, string>;
  retries?: number;
  skipRetry?: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
  timestamp: number;
  path?: string;
}

/**
 * Enhanced API Response matching backend Java record structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    description?: string;
    timestamp: number;
    fieldErrors?: Record<string, Array<{
      field: string;
      code: string;
      message: string;
      rejectedValue?: any;
    }>>;
  };
  message?: string;
  timestamp: number;
  path?: string;
}

/**
 * Simplified frontend response format
 */
export interface FrontendApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function
 */
export type ResponseInterceptor = <T>(response: FrontendApiResponse<T>) => FrontendApiResponse<T> | Promise<FrontendApiResponse<T>>;

/**
 * Enhanced HTTP Client base class with backend format support
 */
export abstract class HttpClient {
  protected baseUrl: string;
  protected timeout: number;
  protected withCredentials: boolean;
  protected defaultHeaders: Record<string, string>;
  protected retryAttempts: number;
  protected retryDelay: number;
  protected maxRetryDelay: number;
  
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private requestId = 0;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.endsWith('/') 
      ? config.baseUrl.slice(0, -1) 
      : config.baseUrl;
    this.timeout = config.timeout || 10000;
    this.withCredentials = config.withCredentials ?? true;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.maxRetryDelay = config.maxRetryDelay || 10000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'spa',
      'X-Client-Version': '1.0.0',
      ...config.defaultHeaders
    };
  }

  /**
   * Add request interceptor
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${++this.requestId}_${Date.now()}`;
  }

  /**
   * Enhanced request method with retry logic and interceptors
   */
  protected async request<T>(
    method: string,
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<FrontendApiResponse<T>> {
    const requestId = this.generateRequestId();
    const maxRetries = config.retries ?? this.retryAttempts;
    let lastError: Error | null = null;

    // Apply request interceptors
    let processedConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(method, endpoint, processedConfig, requestId, attempt);
        
        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse);
        }

        return processedResponse;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if explicitly disabled
        if (config.skipRetry || attempt >= maxRetries) {
          break;
        }

        // Don't retry for certain error types
        if (this.shouldNotRetry(lastError)) {
          break;
        }

        // Calculate retry delay with exponential backoff
        const delay = Math.min(
          this.retryDelay * Math.pow(2, attempt),
          this.maxRetryDelay
        );

        console.warn(`⚠️ Request ${requestId} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
        
        await this.sleep(delay);
      }
    }

    // All retries failed
    console.error(`❌ Request ${requestId} failed after ${maxRetries + 1} attempts:`, lastError);
    
    return this.handleRequestFailure<T>(lastError!, requestId);
  }

  /**
   * Execute single request attempt
   */
  private async executeRequest<T>(
    method: string,
    endpoint: string,
    config: RequestConfig,
    requestId: string,
    attempt: number
  ): Promise<FrontendApiResponse<T>> {
    const url = this.buildUrl(endpoint, config.params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.timeout);

    try {
      const requestConfig: RequestInit = {
        method,
        headers: {
          ...this.defaultHeaders,
          'X-Request-ID': requestId,
          'X-Request-Attempt': String(attempt + 1),
          ...config.headers
        },
        credentials: this.withCredentials ? 'include' : 'same-origin',
        signal: controller.signal,
        ...config
      };

      // Add body for POST/PUT/PATCH requests
      if (config.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        requestConfig.body = typeof config.body === 'string' 
          ? config.body 
          : JSON.stringify(config.body);
      }

      console.log(`🔄 ${method} ${url} (${requestId}, attempt ${attempt + 1})`);
      console.log('🔍 Request headers:', requestConfig.headers);
      console.log('🔍 Request body type:', typeof requestConfig.body);
      console.log('🔍 Request body:', requestConfig.body);

      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      return await this.parseResponse<T>(response, requestId);

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse fetch response with backend format support
   */
  private async parseResponse<T>(response: Response, requestId: string): Promise<FrontendApiResponse<T>> {
    try {
      const contentType = response.headers.get('content-type');
      let backendResponse: ApiResponse<T>;

      if (contentType && contentType.includes('application/json')) {
        backendResponse = await response.json();
      } else {
        const text = await response.text();
        // Create a mock backend response for non-JSON responses
        backendResponse = {
          success: response.ok,
          status: response.status,
          data: text as any,
          message: text || response.statusText,
          timestamp: Date.now(),
          path: response.url
        };
      }

      // Transform backend format to frontend format
      const frontendResponse = this.transformBackendResponse<T>(backendResponse, response.status);

      if (frontendResponse.success) {
        console.log(`✅ ${response.status} ${response.url} (${requestId})`);
      } else {
        console.warn(`⚠️ ${response.status} ${response.url} (${requestId}):`, frontendResponse.error);
      }

      return frontendResponse;

    } catch (parseError) {
      console.error(`❌ Failed to parse response for ${requestId}:`, parseError);
      
      return {
        success: false,
        error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        status: response.status
      };
    }
  }

  /**
   * Transform backend ApiResponse format to frontend format
   */
  private transformBackendResponse<T>(backendResponse: ApiResponse<T>, httpStatus: number): FrontendApiResponse<T> {
    // Handle successful responses
    if (backendResponse.success && httpStatus >= 200 && httpStatus < 300) {
      return {
        success: true,
        data: backendResponse.data,
        message: backendResponse.message,
        status: backendResponse.status || httpStatus
      };
    }

    // Handle error responses
    let errorMessage = 'Unknown error occurred';
    let fieldErrors: Record<string, string[]> | undefined;

    if (backendResponse.error) {
      errorMessage = backendResponse.error.message || backendResponse.error.description || errorMessage;
      
      // Transform field errors
      if (backendResponse.error.fieldErrors) {
        fieldErrors = {};
        Object.entries(backendResponse.error.fieldErrors).forEach(([field, errors]) => {
          fieldErrors![field] = errors.map(err => err.message);
        });
      }
    } else if (backendResponse.message) {
      errorMessage = backendResponse.message;
    }

    return {
      success: false,
      error: errorMessage,
      message: backendResponse.message,
      status: backendResponse.status || httpStatus,
      fieldErrors
    };
  }

  /**
   * Handle request failure
   */
  private handleRequestFailure<T>(error: Error, _requestId: string): FrontendApiResponse<T> {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout',
        status: 408
      };
    }

    if (!navigator.onLine) {
      return {
        success: false,
        error: 'You appear to be offline. Please check your internet connection.',
        status: 0
      };
    }

    return {
      success: false,
      error: error.message || 'Network error occurred',
      status: 0
    };
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: Error): boolean {
    // Don't retry for client errors (4xx) except authentication
    if (error.message.includes('400') || 
        error.message.includes('404') || 
        error.message.includes('422')) {
      return true;
    }

    // Don't retry for AbortError (timeout handled separately)
    if (error.name === 'AbortError') {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  // HTTP method wrappers
  protected async get<T>(endpoint: string, config: RequestConfig = {}): Promise<FrontendApiResponse<T>> {
    return this.request<T>('GET', endpoint, config);
  }

  protected async post<T>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<FrontendApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...config, body });
  }

  protected async put<T>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<FrontendApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...config, body });
  }

  protected async patch<T>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<FrontendApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...config, body });
  }

  protected async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<FrontendApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, config);
  }

  // Configuration methods
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  public setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  public updateRetryConfig(retryAttempts: number, retryDelay: number, maxRetryDelay: number): void {
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
    this.maxRetryDelay = maxRetryDelay;
  }

  /**
   * Check if client is healthy
   */
  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const response = await this.get('/health', { skipRetry: true, timeout: 5000 });
      const latency = Date.now() - startTime;
      
      return {
        healthy: response.success,
        latency,
        error: response.success ? undefined : response.error
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get client statistics
   */
  public getStats(): {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    interceptors: { request: number; response: number };
  } {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      interceptors: {
        request: this.requestInterceptors.length,
        response: this.responseInterceptors.length
      }
    };
  }
}