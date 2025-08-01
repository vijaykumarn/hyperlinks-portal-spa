// src/services/SecureMockApi.ts

import type { UserData, UrlData } from '../state/types';
import type { ApiResponse } from './SessionService';

/**
 * Secure Mock API Service - Simulates HttpOnly cookie authentication
 * NO JWT tokens exposed to JavaScript
 */
export class SecureMockApi {
  private static readonly STORAGE_KEY = 'url_shortener_data';
  private static readonly SESSION_KEY = 'mock_session_id';
  private static instance: SecureMockApi;

  // Simulated server-side session storage
  private sessions: Map<string, {
    userId: string;
    createdAt: number;
    lastActivity: number;
    expiresAt: number;
  }> = new Map();

  public static getInstance(): SecureMockApi {
    if (!SecureMockApi.instance) {
      SecureMockApi.instance = new SecureMockApi();
    }
    return SecureMockApi.instance;
  }

  constructor() {
    this.initializeMockData();
    this.loadMockSessions();
  }

  /**
   * Initialize sample data
   */
  private initializeMockData(): void {
    const data = this.getStoredData();
    if (!data.urls.length) {
      const sampleUrls: UrlData[] = [
        {
          id: '1',
          shortCode: 'abc123',
          originalUrl: 'https://www.google.com',
          createdAt: Date.now() - 86400000,
          clicks: 25,
          userId: '1'
        },
        {
          id: '2',
          shortCode: 'xyz789',
          originalUrl: 'https://www.github.com',
          createdAt: Date.now() - 3600000,
          clicks: 10,
          userId: '1'
        },
        {
          id: '3',
          shortCode: 'test',
          originalUrl: 'https://www.example.com',
          createdAt: Date.now() - 1800000,
          clicks: 5
        }
      ];

      const sampleUsers: UserData[] = [
        {
          id: '1',
          email: 'john@example.com',
          name: 'John Doe',
          role: 'user',
          createdAt: Date.now() - 2592000000
        }
      ];

      this.saveData({ urls: sampleUrls, users: sampleUsers });
    }
  }

  /**
   * Load mock sessions from localStorage
   */
  private loadMockSessions(): void {
    try {
      const sessionsData = localStorage.getItem('mock_sessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        this.sessions = new Map(Object.entries(sessions));
      }
    } catch (error) {
      console.warn('Failed to load mock sessions:', error);
    }
  }

  /**
   * Save mock sessions to localStorage
   */
  private saveMockSessions(): void {
    try {
      const sessionsObj = Object.fromEntries(this.sessions);
      localStorage.setItem('mock_sessions', JSON.stringify(sessionsObj));
    } catch (error) {
      console.warn('Failed to save mock sessions:', error);
    }
  }

  /**
   * Get stored data
   */
  private getStoredData(): { urls: UrlData[], users: UserData[] } {
    try {
      const data = localStorage.getItem(SecureMockApi.STORAGE_KEY);
      return data ? JSON.parse(data) : { urls: [], users: [] };
    } catch {
      return { urls: [], users: [] };
    }
  }

  /**
   * Save data
   */
  private saveData(data: { urls: UrlData[], users: UserData[] }): void {
    try {
      localStorage.setItem(SecureMockApi.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save mock data:', error);
    }
  }

  /**
   * Simulate API delay
   */
  private async delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate session ID (simulates server-side session creation)
   */
  private generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get current session from simulated HttpOnly cookie
   */
  private getCurrentSession(): { userId: string } | null {
    const sessionId = localStorage.getItem(SecureMockApi.SESSION_KEY);
    if (!sessionId) return null;

    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      localStorage.removeItem(SecureMockApi.SESSION_KEY);
      this.saveMockSessions();
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    this.saveMockSessions();

    return { userId: session.userId };
  }

  /**
   * Get user by ID
   */
  private getUserById(userId: string): UserData | null {
    const data = this.getStoredData();
    return data.users.find(u => u.id === userId) || null;
  }

  /**
   * Create session data for responses
   */
  private createSessionData(userId: string): ApiResponse<any>['session'] {
    const user = this.getUserById(userId);
    if (!user) return undefined;

    return {
      user,
      isAuthenticated: true,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * Add session data to response (for SPA requests)
   */
  private addSessionToResponse<T>(
    response: Omit<ApiResponse<T>, 'session'>,
    includeSession: boolean = true
  ): ApiResponse<T> {
    if (!includeSession) {
      return response as ApiResponse<T>;
    }

    const currentSession = this.getCurrentSession();
    if (currentSession) {
      return {
        ...response,
        session: this.createSessionData(currentSession.userId)
      };
    }

    return response as ApiResponse<T>;
  }

  /**
   * LOGIN - Creates session (simulates HttpOnly cookie)
   */
  public async login(email: string, password: string): Promise<ApiResponse<{ message: string }>> {
    await this.delay(1000);

    const data = this.getStoredData();
    const user = data.users.find(u => u.email === email);

    if (user && password === 'password') {
      // Create session (simulates HttpOnly cookie)
      const sessionId = this.generateSessionId();
      const session = {
        userId: user.id,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      this.sessions.set(sessionId, session);
      localStorage.setItem(SecureMockApi.SESSION_KEY, sessionId);
      this.saveMockSessions();

      return {
        success: true,
        data: { message: 'Login successful' },
        session: this.createSessionData(user.id)
      };
    }

    return {
      success: false,
      error: 'Invalid email or password'
    };
  }

/**
 * LOGOUT - Destroys session (simulates clearing HttpOnly cookie) - FIXED
 */
public async logout(): Promise<ApiResponse<{ message: string }>> {
  await this.delay(300);

  console.log('🔒 MockApi: Logging out and clearing session data');

  const sessionId = localStorage.getItem(SecureMockApi.SESSION_KEY);
  if (sessionId) {
    // Remove from sessions map
    this.sessions.delete(sessionId);
    console.log('🔒 MockApi: Removed session from memory');
  }

  // Clear ALL session-related localStorage items
  localStorage.removeItem(SecureMockApi.SESSION_KEY); // mock_session_id
  localStorage.removeItem('mock_sessions'); // session storage
  
  // Save updated sessions (should be empty now)
  this.saveMockSessions();
  
  console.log('🔒 MockApi: All session data cleared');

  return {
    success: true,
    data: { message: 'Logout successful' }
  };
}

  /**
   * SHORTEN URL - With session validation
   */
  public async shortenUrl(originalUrl: string): Promise<ApiResponse<{
    shortCode: string;
    fullShortUrl: string;
  }>> {
    await this.delay();

    try {
      new URL(originalUrl); // Validate URL
    } catch {
      return {
        success: false,
        error: 'Invalid URL format'
      };
    }

    const data = this.getStoredData();
    const currentSession = this.getCurrentSession();
    const userId = currentSession?.userId;
    
    // Check if URL already exists for this user
    const existing = data.urls.find(url => 
      url.originalUrl === originalUrl && url.userId === userId
    );
    
    if (existing) {
      const response = {
        success: true,
        data: {
          shortCode: existing.shortCode,
          fullShortUrl: `${window.location.origin}/u/${existing.shortCode}`
        }
      };
      return this.addSessionToResponse(response);
    }

    // Generate unique short code
    let shortCode = this.generateShortCode();
    while (data.urls.some(url => url.shortCode === shortCode)) {
      shortCode = this.generateShortCode();
    }

    const newUrl: UrlData = {
      id: Date.now().toString(),
      shortCode,
      originalUrl,
      createdAt: Date.now(),
      clicks: 0,
      userId,
      expiresAt: userId ? undefined : Date.now() + (24 * 60 * 60 * 1000) // 24h for guests
    };

    data.urls.push(newUrl);
    this.saveData(data);

    const response = {
      success: true,
      data: {
        shortCode,
        fullShortUrl: `${window.location.origin}/u/${shortCode}`
      }
    };

    return this.addSessionToResponse(response);
  }

  /**
   * RESOLVE URL - With click tracking
   */
  public async resolveUrl(shortCode: string): Promise<ApiResponse<{
    originalUrl: string;
  }>> {
    await this.delay(200);

    const data = this.getStoredData();
    const url = data.urls.find(u => u.shortCode === shortCode);

    if (!url) {
      return {
        success: false,
        error: 'Short URL not found'
      };
    }

    // Check if expired
    if (url.expiresAt && Date.now() > url.expiresAt) {
      return {
        success: false,
        error: 'Short URL has expired'
      };
    }

    // Increment click count
    url.clicks++;
    this.saveData(data);

    const response = {
      success: true,
      data: { originalUrl: url.originalUrl }
    };

    return this.addSessionToResponse(response);
  }

  /**
   * GET USER URLS - Requires authentication
   */
  public async getUserUrls(): Promise<ApiResponse<UrlData[]>> {
    await this.delay();

    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      return {
        success: false,
        error: 'Authentication required',
        session: { user: null as any, isAuthenticated: false }
      };
    }

    const data = this.getStoredData();
    const userUrls = data.urls.filter(url => url.userId === currentSession.userId);

    const response = {
      success: true,
      data: userUrls
    };

    return this.addSessionToResponse(response);
  }

  /**
   * GET ANALYTICS - Requires authentication
   */
  public async getAnalytics(): Promise<ApiResponse<{
    totalUrls: number;
    totalClicks: number;
    topUrls: Array<{ shortCode: string; originalUrl: string; clicks: number }>;
    recentActivity: Array<{ date: string; clicks: number }>;
  }>> {
    await this.delay();

    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      return {
        success: false,
        error: 'Authentication required',
        session: { user: null as any, isAuthenticated: false }
      };
    }

    const data = this.getStoredData();
    const urls = data.urls.filter(url => url.userId === currentSession.userId);

    const totalUrls = urls.length;
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);
    const topUrls = urls
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map(url => ({
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        clicks: url.clicks
      }));

    // Generate mock recent activity data
    const recentActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        clicks: Math.floor(Math.random() * 20)
      };
    }).reverse();

    const response = {
      success: true,
      data: {
        totalUrls,
        totalClicks,
        topUrls,
        recentActivity
      }
    };

    return this.addSessionToResponse(response);
  }

  /**
   * Generate random short code
   */
  private generateShortCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Clear all data (for testing)
   */
  public clearData(): void {
    localStorage.removeItem(SecureMockApi.STORAGE_KEY);
    localStorage.removeItem(SecureMockApi.SESSION_KEY);
    localStorage.removeItem('mock_sessions');
    this.sessions.clear();
    this.initializeMockData();
  }

  /**
   * Get all data (for debugging)
   */
  public getAllData(): { 
    urls: UrlData[]; 
    users: UserData[]; 
    sessions: Array<{ id: string; userId: string; expiresAt: number }> 
  } {
    const data = this.getStoredData();
    const sessions = Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      userId: session.userId,
      expiresAt: session.expiresAt
    }));

    return { ...data, sessions };
  }

  /**
   * Check current authentication status (for debugging)
   */
  public getAuthStatus(): {
    isAuthenticated: boolean;
    sessionId: string | null;
    userId: string | null;
    user: UserData | null;
  } {
    const sessionId = localStorage.getItem(SecureMockApi.SESSION_KEY);
    const currentSession = this.getCurrentSession();
    const user = currentSession ? this.getUserById(currentSession.userId) : null;

    return {
      isAuthenticated: !!currentSession,
      sessionId,
      userId: currentSession?.userId || null,
      user
    };
  }
}