// src/services/core/RequestCache.ts - Request Deduplication & Caching
// Prevents duplicate requests and caches responses

import { API_CONFIG } from '../../config/constants';
import { logger } from '../../utils/logger';
import type { ApiResponse } from './HttpClient';

interface CacheEntry<T> {
  response: ApiResponse<T>;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<ApiResponse<T>>;
  timestamp: number;
}

class RequestCache {
  private static instance: RequestCache;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private maxCacheSize = API_CONFIG.CACHE_MAX_SIZE;

  private constructor() {
    // Clean up cache periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  public static getInstance(): RequestCache {
    if (!RequestCache.instance) {
      RequestCache.instance = new RequestCache();
    }
    return RequestCache.instance;
  }

  /**
   * Generate cache key from request parameters
   */
  private generateKey(method: string, url: string, body?: any): string {
    const bodyHash = body ? this.hashObject(body) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Simple object hash for cache keys
   */
  private hashObject(obj: any): string {
    return btoa(JSON.stringify(obj)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Check if request should be cached
   */
  private shouldCache(method: string): boolean {
    return method === 'GET';
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicate(method: string): boolean {
    // Deduplicate all requests except for logout
    return !method.includes('logout');
  }

  /**
   * Get cached response if valid
   */
  public getCached<T>(method: string, url: string, body?: any): ApiResponse<T> | null {
    if (!this.shouldCache(method)) {
      return null;
    }

    const key = this.generateKey(method, url, body);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      logger.api.debug('Cache entry expired', { key });
      return null;
    }

    logger.api.debug('Cache hit', { key, age: Date.now() - entry.timestamp });
    return entry.response;
  }

  /**
   * Set cached response
   */
  public setCached<T>(
    method: string, 
    url: string, 
    response: ApiResponse<T>, 
    body?: any, 
    ttl = API_CONFIG.CACHE_TTL
  ): void {
    if (!this.shouldCache(method) || !response.success) {
      return;
    }

    const key = this.generateKey(method, url, body);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
      logger.api.debug('Evicted oldest cache entry', { key: oldestKey });
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl
    });

    logger.api.debug('Response cached', { key, ttl });
  }

  /**
   * Get or create pending request
   */
  public async getOrCreateRequest<T>(
    method: string,
    url: string,
    requestFn: () => Promise<ApiResponse<T>>,
    body?: any
  ): Promise<ApiResponse<T>> {
    // Check cache first
    const cached = this.getCached<T>(method, url, body);
    if (cached) {
      return cached;
    }

    // Check for pending request
    if (this.shouldDeduplicate(method)) {
      const key = this.generateKey(method, url, body);
      const pending = this.pendingRequests.get(key);

      if (pending) {
        logger.api.debug('Request deduplication - using pending request', { key });
        return pending.promise;
      }

      // Create new request
      const promise = this.executeRequest(requestFn, method, url, body);
      
      this.pendingRequests.set(key, {
        promise,
        timestamp: Date.now()
      });

      // Clean up when done
      promise.finally(() => {
        this.pendingRequests.delete(key);
      });

      return promise;
    }

    // Execute request without deduplication
    return this.executeRequest(requestFn, method, url, body);
  }

  /**
   * Execute request and handle caching
   */
  private async executeRequest<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    method: string,
    url: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response = await requestFn();
      
      // Cache successful responses
      if (response.success && this.shouldCache(method)) {
        this.setCached(method, url, response, body);
      }

      return response;
    } catch (error) {
      logger.api.error('Request execution failed', { error, method, url });
      throw error;
    }
  }

  /**
   * Invalidate cache entries
   */
  public invalidate(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      this.cache.clear();
      logger.api.info('All cache entries cleared');
      return;
    }

    // Clear matching entries
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.includes(pattern));

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.api.info('Cache entries invalidated', { pattern, count: keysToDelete.length });
  }

  /**
   * Clean up expired entries and old pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Clean up expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }

    // Clean up stale pending requests (older than 30 seconds)
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > 30000) {
        this.pendingRequests.delete(key);
      }
    }

    logger.api.debug('Cache cleanup completed', {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    });
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    cacheSize: number;
    pendingRequests: number;
    maxCacheSize: number;
  } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      maxCacheSize: this.maxCacheSize
    };
  }
}

export const requestCache = RequestCache.getInstance();