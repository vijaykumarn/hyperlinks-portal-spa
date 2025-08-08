// src/services/core/HttpClient.ts

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  withCredentials?: boolean;
  defaultHeaders?: Record<string, string>;
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  params?: Record<string, string>;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
  timestamp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Generic HTTP Client base class
 * Provides common functionality for all API clients
 */
export abstract class HttpClient {
  protected baseUrl: string;
  protected timeout: number;
  protected withCredentials: boolean;
  protected defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.endsWith('/') 
      ? config.baseUrl.slice(0, -1) 
      : config.baseUrl;
    this.timeout = config.timeout || 10000;
    this.withCredentials = config.withCredentials ?? true;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'spa',
      ...config.defaultHeaders
    };
  }

  /**
   * Generic request method
   */
  protected async request<T>(
    method: string,
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, config.params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.timeout);

    try {
      const requestConfig: RequestInit = {
        method,
        headers: {
          ...this.defaultHeaders,
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

      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      return await this.parseResponse<T>(response);

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          status: 408
        };
      }

      console.error(`HTTP ${method} ${url} failed:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      };
    }
  }

  /**
   * Parse fetch response
   */
  protected async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          message: data.message,
          status: response.status
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
        status: response.status
      };

    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        status: response.status
      };
    }
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
  protected async get<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, config);
  }

  protected async post<T>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...config, body });
  }

  protected async put<T>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...config, body });
  }

  protected async patch<T>(endpoint: string, body?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...config, body });
  }

  protected async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
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
}