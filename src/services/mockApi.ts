// src/services/mockApi.ts

/**
 * Mock URL data structure
 */
export interface UrlData {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: number;
  clicks: number;
  userId?: string;
  expiresAt?: number;
}

/**
 * Mock user data structure
 */
export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
}

/**
 * Mock API service for testing the URL shortener without a backend
 */
export class MockApiService {
  private static readonly STORAGE_KEY = 'url_shortener_data';
  private static instance: MockApiService;

  public static getInstance(): MockApiService {
    if (!MockApiService.instance) {
      MockApiService.instance = new MockApiService();
    }
    return MockApiService.instance;
  }

  /**
   * Initialize mock data
   */
  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize some sample data if none exists
   */
  private initializeMockData(): void {
    const data = this.getStoredData();
    if (!data.urls.length) {
      const sampleUrls: UrlData[] = [
        {
          id: '1',
          shortCode: 'abc123',
          originalUrl: 'https://www.google.com',
          createdAt: Date.now() - 86400000, // 1 day ago
          clicks: 25,
          userId: '1'
        },
        {
          id: '2',
          shortCode: 'xyz789',
          originalUrl: 'https://www.github.com',
          createdAt: Date.now() - 3600000, // 1 hour ago
          clicks: 10,
          userId: '1'
        },
        {
          id: '3',
          shortCode: 'test',
          originalUrl: 'https://www.example.com',
          createdAt: Date.now() - 1800000, // 30 minutes ago
          clicks: 5
        }
      ];

      const sampleUsers: UserData[] = [
        {
          id: '1',
          email: 'john@example.com',
          name: 'John Doe',
          role: 'user',
          createdAt: Date.now() - 2592000000 // 30 days ago
        }
      ];

      this.saveData({ urls: sampleUrls, users: sampleUsers });
    }
  }

  /**
   * Get stored data from localStorage
   */
  private getStoredData(): { urls: UrlData[], users: UserData[] } {
    try {
      const data = localStorage.getItem(MockApiService.STORAGE_KEY);
      return data ? JSON.parse(data) : { urls: [], users: [] };
    } catch {
      return { urls: [], users: [] };
    }
  }

  /**
   * Save data to localStorage
   */
  private saveData(data: { urls: UrlData[], users: UserData[] }): void {
    try {
      localStorage.setItem(MockApiService.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save mock data:', error);
    }
  }

  /**
   * Generate a random short code
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
   * Simulate API delay
   */
  private async delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mock login API
   */
  public async login(email: string, password: string): Promise<{
    success: boolean;
    user?: UserData;
    token?: string;
    message?: string;
  }> {
    await this.delay(1000);

    const data = this.getStoredData();
    const user = data.users.find(u => u.email === email);

    if (user && password === 'password') { // Simple mock auth
      return {
        success: true,
        user,
        token: 'mock-jwt-token-' + Date.now()
      };
    }

    return {
      success: false,
      message: 'Invalid email or password'
    };
  }

  /**
   * Mock URL shortening API
   */
  public async shortenUrl(originalUrl: string, userId?: string): Promise<{
    success: boolean;
    shortCode?: string;
    fullShortUrl?: string;
    message?: string;
  }> {
    await this.delay();

    try {
      new URL(originalUrl); // Validate URL
    } catch {
      return {
        success: false,
        message: 'Invalid URL format'
      };
    }

    const data = this.getStoredData();
    
    // Check if URL already exists
    const existing = data.urls.find(url => 
      url.originalUrl === originalUrl && url.userId === userId
    );
    
    if (existing) {
      return {
        success: true,
        shortCode: existing.shortCode,
        fullShortUrl: `${window.location.origin}/u/${existing.shortCode}`
      };
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

    return {
      success: true,
      shortCode,
      fullShortUrl: `${window.location.origin}/u/${shortCode}`
    };
  }

  /**
   * Mock URL resolution API
   */
  public async resolveUrl(shortCode: string): Promise<{
    success: boolean;
    originalUrl?: string;
    message?: string;
  }> {
    await this.delay(200);

    const data = this.getStoredData();
    const url = data.urls.find(u => u.shortCode === shortCode);

    if (!url) {
      return {
        success: false,
        message: 'Short URL not found'
      };
    }

    // Check if expired
    if (url.expiresAt && Date.now() > url.expiresAt) {
      return {
        success: false,
        message: 'Short URL has expired'
      };
    }

    // Increment click count
    url.clicks++;
    this.saveData(data);

    return {
      success: true,
      originalUrl: url.originalUrl
    };
  }

  /**
   * Mock get user URLs API
   */
  public async getUserUrls(userId: string): Promise<{
    success: boolean;
    urls?: UrlData[];
    message?: string;
  }> {
    await this.delay();

    const data = this.getStoredData();
    const userUrls = data.urls.filter(url => url.userId === userId);

    return {
      success: true,
      urls: userUrls
    };
  }

  /**
   * Mock analytics API
   */
  public async getAnalytics(userId?: string): Promise<{
    success: boolean;
    data?: {
      totalUrls: number;
      totalClicks: number;
      topUrls: Array<{ shortCode: string; originalUrl: string; clicks: number }>;
      recentActivity: Array<{ date: string; clicks: number }>;
    };
  }> {
    await this.delay();

    const data = this.getStoredData();
    const urls = userId 
      ? data.urls.filter(url => url.userId === userId)
      : data.urls;

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

    // Generate some mock recent activity data
    const recentActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        clicks: Math.floor(Math.random() * 20)
      };
    }).reverse();

    return {
      success: true,
      data: {
        totalUrls,
        totalClicks,
        topUrls,
        recentActivity
      }
    };
  }

  /**
   * Clear all mock data (useful for testing)
   */
  public clearData(): void {
    localStorage.removeItem(MockApiService.STORAGE_KEY);
    this.initializeMockData();
  }

  /**
   * Get all stored data (for debugging)
   */
  public getAllData(): { urls: UrlData[], users: UserData[] } {
    return this.getStoredData();
  }
}