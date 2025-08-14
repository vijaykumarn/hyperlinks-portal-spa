# HTTP Layer Architecture Documentation

## 🏗️ **ARCHITECTURE OVERVIEW**

Your URL Shortener SPA implements a sophisticated **3-layer HTTP architecture** to handle communication with your dual backend system:

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  AuthService  │  OAuth2Service  │  SessionService  │ ApiService │
├─────────────────────────────────────────────────────────────┤
│                     API CLIENTS                             │
├─────────────────────────────────────────────────────────────┤
│     AuthApiClient     │     UnifiedApiClient                │
├─────────────────────────────────────────────────────────────┤
│                    HTTP FOUNDATION                          │
├─────────────────────────────────────────────────────────────┤
│  HttpClient  │  ApiConfig  │  ApiErrorHandler               │
└─────────────────────────────────────────────────────────────┘
         ↓                           ↓
   Auth Server                 Resource Server
   (Port 8090)                 (Port 8080)
```

---

## 📋 **COMPONENT DOCUMENTATION**

### **1. HttpClient** 📦
**File:** `src/services/core/HttpClient.ts`  
**Purpose:** Foundation HTTP client with advanced features

```typescript
abstract class HttpClient {
  // Core functionality
  protected async request<T>(method: string, endpoint: string, config: RequestConfig)
  protected async get<T>, post<T>, put<T>, delete<T>()
}
```

**Key Features:**
- ✅ **Request/Response Interceptors** - Modify requests and responses globally
- ✅ **Automatic Retry Logic** - Configurable retry with exponential backoff
- ✅ **Timeout Handling** - Per-request and global timeout support
- ✅ **Backend Format Support** - Transforms Java record responses to frontend format
- ✅ **Error Transformation** - Converts backend errors to user-friendly messages
- ✅ **AbortController Integration** - Proper request cancellation

**Backend Response Transformation:**
```typescript
// Backend Java Record Format
interface ApiResponse<T> {
  success: boolean;
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, Array<FieldError>>;
  };
}

// Transformed to Frontend Format  
interface FrontendApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
```

**Usage Example:**
```typescript
const client = new CustomHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  retryAttempts: 3
});

// Automatic retry, error handling, and response transformation
const response = await client.post('/users', userData);
```

---

### **2. ApiConfig** ⚙️
**File:** `src/services/core/ApiConfig.ts`  
**Purpose:** Centralized endpoint and configuration management

```typescript
class ApiConfig {
  private endpointRegistry: Map<string, EndpointInfo>
  
  getEndpoint(key: string): EndpointInfo | null
  getEndpointUrl(key: string, pathParams?: Record<string, string>): string
}
```

**Key Features:**
- ✅ **Dual Server Support** - Routes endpoints to Auth (8090) or Resource (8080) servers
- ✅ **Environment Configuration** - Development vs Production endpoint management
- ✅ **Endpoint Registry** - Centralized endpoint definitions with metadata
- ✅ **Path Parameter Support** - Dynamic URL building with `:param` placeholders
- ✅ **Validation System** - Ensures all endpoints are properly configured

**Endpoint Registry Structure:**
```typescript
interface EndpointInfo {
  path: string;
  server: 'auth' | 'resource';
  requiresAuth?: boolean;
  timeout?: number;
}

// Example Registry Entries
{
  'auth.login': { path: '/api/auth/login', server: 'auth', requiresAuth: false },
  'auth.me': { path: '/api/auth/me', server: 'auth', requiresAuth: true },
  'resource.shortenUrl': { path: '/api/urls/shorten', server: 'resource', requiresAuth: true },
  'resource.getUrlAnalytics': { path: '/api/analytics/url/:shortCode', server: 'resource', requiresAuth: true }
}
```

**Environment-Based Configuration:**
```typescript
// Development
authServerUrl: 'http://localhost:8090'
resourceServerUrl: 'http://localhost:8080'

// Production  
authServerUrl: 'https://auth.yourapp.com'
resourceServerUrl: 'https://api.yourapp.com'
```

---

### **3. ApiErrorHandler** 🛡️
**File:** `src/services/core/ApiErrorHandler.ts`  
**Purpose:** Comprehensive error processing and user experience

```typescript
class ApiErrorHandler {
  processError(error: any, context: ApiErrorContext): ApiError
  getRecoveryStrategy(error: ApiError): ErrorRecoveryStrategy
  shouldRetry(error: ApiError, operationId: string): boolean
}
```

**Key Features:**
- ✅ **Error Classification** - Categorizes errors by type (network, validation, server, etc.)
- ✅ **User-Friendly Messages** - Converts technical errors to user-readable messages
- ✅ **Recovery Strategies** - Defines how to handle different error types
- ✅ **Retry Logic** - Smart retry with backoff for recoverable errors
- ✅ **Error Statistics** - Tracks error patterns for monitoring
- ✅ **Severity Assessment** - Classifies errors by impact level

**Error Processing Flow:**
```typescript
// Input: Raw error from API/Network
{
  status: 401,
  message: "Authentication failed: Invalid credentials"
}

// Output: Processed ApiError
{
  id: "api_err_123_1234567890",
  type: "authentication",
  code: "INVALID_CREDENTIALS", 
  message: "Authentication failed: Invalid credentials",
  userMessage: "Invalid email or password. Please try again.",
  severity: "high",
  recoverable: true,
  retryable: true,
  context: {
    operation: "login",
    server: "auth",
    endpoint: "auth.login"
  }
}
```

**Recovery Strategies:**
```typescript
{
  'NETWORK_ERROR': { action: 'retry', delay: 2000, maxRetries: 3 },
  'SESSION_EXPIRED': { action: 'login', redirectUrl: '/' },
  'RATE_LIMITED': { action: 'retry', delay: 5000, maxRetries: 2 },
  'VALIDATION_ERROR': { action: 'none' }
}
```

---

### **4. AuthApiClient** 🔐
**File:** `src/services/auth/AuthApiClient.ts`  
**Purpose:** Auth server communication layer

```typescript
class AuthApiClient {
  async login(credentials: LoginRequest): Promise<FrontendApiResponse<LoginResponse>>
  async register(data: RegistrationRequest): Promise<FrontendApiResponse<RegistrationResponse>>
  async validateSession(): Promise<FrontendApiResponse<SessionValidation>>
  // ... 15+ auth endpoints
}
```

**Key Features:**
- ✅ **Complete Auth API Coverage** - All authentication, registration, and session endpoints
- ✅ **OAuth2 Integration** - Google OAuth2 authorization URL generation
- ✅ **Session Management** - Session validation, info, and invalidation
- ✅ **Password Management** - Reset, forgot password, token validation
- ✅ **Account Verification** - Email confirmation and resend verification
- ✅ **CSRF Protection** - Security token management

**Endpoint Categories:**
```typescript
// Authentication Endpoints
- login(credentials) → LoginResponse
- logout() → LogoutResponse  
- getCurrentUser() → User

// Registration & Verification
- register(data) → RegistrationResponse
- confirmAccount(token) → ConfirmAccountResponse
- resendVerification(email) → ResendResponse

// Password Management
- forgotPassword(email) → ForgotPasswordResponse
- resetPassword(data) → ResetResponse
- confirmPasswordToken(token) → TokenValidation

// Session Management
- validateSession() → SessionValidation
- getSessionInfo() → SessionInfo
- getAllSessions() → SessionInfo[]
- invalidateAllSessions() → InvalidationResponse

// OAuth2
- getGoogleAuthUrl(redirectUrl?) → OAuth2AuthUrlResponse

// Security
- getCsrfToken() → CSRFTokenResponse
```

**Response Transformation Example:**
```typescript
// Backend response from Java
{
  "success": true,
  "data": {
    "userId": "123",
    "username": "john_doe", 
    "email": "john@example.com",
    "role": "USER"
  }
}

// Transformed to User object
{
  success: true,
  data: {
    id: "123",
    name: "john_doe",
    email: "john@example.com", 
    role: "USER",
    emailVerified: true,
    createdAt: 1640995200000
  }
}
```

---

### **5. UnifiedApiClient** 🔄
**File:** `src/services/core/UnifiedApiClient.ts`  
**Purpose:** Intelligent request routing and advanced features

```typescript
class UnifiedApiClient {
  async request<T>(endpointKey: string, method: string, body?: any): Promise<FrontendApiResponse<T>>
  async get<T>, post<T>, put<T>, delete<T>()
  async healthCheck(): Promise<HealthCheckResult>
}
```

**Key Features:**
- ✅ **Intelligent Routing** - Automatically routes requests to correct server (Auth/Resource)
- ✅ **Circuit Breaker Pattern** - Prevents cascading failures when servers are down
- ✅ **Offline Queue** - Queues non-GET requests when offline, processes when online
- ✅ **Request Deduplication** - Prevents duplicate concurrent requests
- ✅ **Health Monitoring** - Tracks server health and response times
- ✅ **Load Balancing Ready** - Can be extended for multiple server instances

**Circuit Breaker Implementation:**
```typescript
interface CircuitBreakerState {
  failures: number;           // Current failure count
  lastFailure: number;        // Timestamp of last failure
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// Circuit Breaker States
- CLOSED: Normal operation, requests pass through
- OPEN: Circuit breaker tripped, requests fail fast  
- HALF_OPEN: Testing if service recovered, limited requests allowed
```

**Request Routing Logic:**
```typescript
// Endpoint mapping determines server routing
'auth.login' → Auth Server (http://localhost:8090)
'resource.shortenUrl' → Resource Server (http://localhost:8080)
'session.validate' → Auth Server (session endpoints route to auth)

// Path parameter replacement
'resource.getUrlAnalytics' + { shortCode: 'abc123' }
→ '/api/analytics/url/abc123'
```

**Offline Queue Management:**
```typescript
// Only non-GET requests are queued when offline
POST /api/urls/shorten { url: "..." } → Queued
GET /api/urls/user → Fails immediately (not queued)

// When connection restored
→ Process queue in order
→ Handle failures with retry logic
→ Update UI with results
```

---

### **6. AuthService** 💼
**File:** `src/services/auth/AuthService.ts`  
**Purpose:** High-level authentication business logic

```typescript
class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResult>
  async register(data: RegistrationData): Promise<RegistrationResult>
  async validateSession(): Promise<SessionValidationResult>
  // Event system for auth state changes
}
```

**Key Features:**
- ✅ **Business Logic Layer** - Coordinates between UI and API clients
- ✅ **Session Race Condition Prevention** - Debounced validation with queue system
- ✅ **Event System** - Pub/sub pattern for auth state changes
- ✅ **Comprehensive Error Handling** - User-friendly error processing
- ✅ **Validation Logic** - Email, password, and form validation
- ✅ **State Management Integration** - Updates StateManager with auth changes

**Event System:**
```typescript
// Available Events
'login:success' | 'login:failed'
'registration:success' | 'registration:failed'  
'verification:required' | 'verification:success'
'oauth2:success' | 'oauth2:failed'
'session:expired' | 'logout:success'

// Usage
authService.addEventListener('login:success', (data) => {
  console.log('User logged in:', data.user.email);
});
```

**Session Validation Queue:**
```typescript
// Prevents race conditions from multiple concurrent validation calls
class SessionValidationQueue {
  private isValidating = false;
  private pendingCallbacks = [];

  async enqueue(validationFn) {
    // Only one validation runs at a time
    // All concurrent calls get the same result
  }
}
```

---

### **7. OAuth2Service** 🔗
**File:** `src/services/auth/OAuth2Service.ts`  
**Purpose:** Google OAuth2 flow management

```typescript
class OAuth2Service {
  async initiateGoogleLogin(redirectUrl?: string): Promise<OAuth2InitResult>
  async handleCallback(callbackUrl: string): Promise<OAuth2CallbackResult>
  isOAuth2Callback(url?: string): boolean
}
```

**Key Features:**
- ✅ **Google OAuth2 Integration** - Complete authorization flow handling
- ✅ **State Management** - CSRF protection with state parameter validation
- ✅ **Flow State Tracking** - Manages OAuth2 flow state with cleanup
- ✅ **Callback Processing** - Handles various callback scenarios and errors
- ✅ **Session Validation** - Ensures session establishment after OAuth2 success
- ✅ **Error Recovery** - Comprehensive error handling for OAuth2 failures

**OAuth2 Flow:**
```typescript
// 1. Initiate Login
await oauth2Service.initiateGoogleLogin('/dashboard')
→ Gets authorization URL from backend
→ Stores flow state in sessionStorage  
→ Redirects to Google

// 2. Google Callback
→ User grants/denies permission
→ Google redirects to /auth/callback?code=...&state=...

// 3. Handle Callback  
await oauth2Service.handleCallback(window.location.href)
→ Validates state parameter
→ Backend processes authorization code
→ Validates session establishment
→ Redirects to intended destination
```

**State Management:**
```typescript
interface OAuth2FlowState {
  state: string;              // CSRF protection
  provider: 'google';         // OAuth2 provider
  redirectUrl?: string;       // Post-auth destination
  timestamp: number;          // For cleanup/expiry
}

// Stored in sessionStorage during flow
// Validated on callback to prevent CSRF
// Cleaned up after completion/failure
```

---

### **8. SessionService** 👤
**File:** `src/services/SessionService.ts`  
**Purpose:** Session state and persistence management

```typescript
class SessionService {
  setSession(user: User, source: AuthSource): void
  clearSession(): void
  validateSessionDebounced(validationFn: Function): Promise<SessionValidationResult>
  isAuthenticated(): boolean
}
```

**Key Features:**
- ✅ **Session Persistence** - sessionStorage management with validation
- ✅ **Race Condition Prevention** - Debounced validation with queue system
- ✅ **Cross-Tab Synchronization** - Storage events for multi-tab consistency
- ✅ **Source Tracking** - Tracks how session was established (password/oauth2)
- ✅ **Automatic Cleanup** - Session expiry and error handling
- ✅ **State Integration** - Updates StateManager with session changes

**Session Data Structure:**
```typescript
// Stored in sessionStorage
{
  user: User;                    // User object
  sessionSource: 'password' | 'oauth2' | 'session-restore';
  timestamp: number;             // Last validation time
  version: '1.0';               // For migration compatibility
}

// Session metadata tracking
{
  isAuthenticated: boolean;
  lastValidated: number;
  source: string;
  ageMinutes: number;
}
```

**Cross-Tab Synchronization:**
```typescript
// Tab 1: User logs out
sessionService.clearSession()
→ localStorage.setItem('session_cleared', timestamp)

// Tab 2: Detects logout
window.addEventListener('storage', (event) => {
  if (event.key === 'session_cleared') {
    sessionService.clearSessionState();
  }
});
```

---

### **9. ApiService** 🔧
**File:** `src/services/ApiService.ts`  
**Purpose:** High-level business API operations

```typescript
class ApiService {
  // URL Management
  async shortenUrl(url: string): Promise<ShortenUrlResult>
  async getUserUrls(): Promise<UrlData[]>
  async deleteUrl(urlId: string): Promise<DeleteResult>
  
  // QR Code & Barcode Generation
  async generateQrCode(url: string, options?: QROptions): Promise<QRResult>
  async generateBarcode(data: string, options?: BarcodeOptions): Promise<BarcodeResult>
  
  // Analytics
  async getAnalytics(options?: AnalyticsOptions): Promise<AnalyticsData>
  async getUrlAnalytics(shortCode: string): Promise<UrlAnalytics>
}
```

**Key Features:**
- ✅ **Business Logic Layer** - High-level API operations using UnifiedApiClient
- ✅ **Input Validation** - Client-side validation before API calls
- ✅ **Response Processing** - Transforms API responses for UI consumption
- ✅ **Error Handling** - Business-specific error processing
- ✅ **Utility Methods** - URL validation, health checks, connectivity tests

**URL Validation Example:**
```typescript
public validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const urlObj = new URL(url);
    
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }
    
    // Production localhost check
    if (import.meta.env.PROD && urlObj.hostname === 'localhost') {
      return { isValid: false, error: 'Localhost URLs are not allowed in production' };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
```

---

## 🔄 **DATA FLOW EXAMPLE**

### **Complete URL Shortening Flow**

```typescript
// 1. User Input → UI Layer
const userUrl = "https://example.com/very-long-url";

// 2. UI → ApiService (Business Logic)
const result = await apiService.shortenUrl(userUrl);

// 3. ApiService → Input Validation
const validation = apiService.validateUrl(userUrl);
if (!validation.isValid) throw new Error(validation.error);

// 4. ApiService → UnifiedApiClient
const response = await unifiedApiClient.post('resource.shortenUrl', { originalUrl: userUrl });

// 5. UnifiedApiClient → Endpoint Resolution
const endpoint = apiConfig.getEndpoint('resource.shortenUrl');
// → { path: '/api/urls/shorten', server: 'resource' }

// 6. UnifiedApiClient → ResourceClient (HTTP)
const httpResponse = await resourceClient.post('/api/urls/shorten', data);

// 7. ResourceClient → Resource Server (Port 8080)
POST http://localhost:8080/api/urls/shorten
{ "originalUrl": "https://example.com/very-long-url" }

// 8. Response Processing Chain
Backend Response → HttpClient → UnifiedApiClient → ApiService → UI
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "fullShortUrl": "https://short.ly/abc123"
  }
}
```

---

## 🚀 **ARCHITECTURE BENEFITS**

### **1. Separation of Concerns**
- **HttpClient**: Raw HTTP communication
- **ApiClients**: Server-specific API calls  
- **Services**: Business logic and state management
- **UnifiedApiClient**: Request routing and advanced features

### **2. Dual Backend Support**
- Seamless routing between Auth and Resource servers
- Environment-specific configuration
- Independent scaling and deployment

### **3. Reliability Features**
- Circuit breaker prevents cascading failures
- Offline queue ensures no data loss
- Retry logic handles transient failures
- Session race condition prevention

### **4. Developer Experience**
- Type-safe API calls with TypeScript
- Centralized error handling
- Comprehensive logging and monitoring
- Clear separation of authentication vs business logic

### **5. Production Ready**
- Health monitoring and metrics
- Error recovery strategies
- Performance optimization
- Security best practices (CSRF, validation)

---

## 📊 **COMPONENT RELATIONSHIP MATRIX**

| Component | Depends On | Used By | Purpose |
|-----------|------------|---------|---------|
| **HttpClient** | - | AuthApiClient, UnifiedApiClient | HTTP foundation |
| **ApiConfig** | - | UnifiedApiClient, AuthApiClient | Configuration |
| **ApiErrorHandler** | AuthErrorHandler | All HTTP components | Error processing |
| **AuthApiClient** | HttpClient, ApiConfig | AuthService, OAuth2Service | Auth server communication |
| **UnifiedApiClient** | HttpClient, ApiConfig | ApiService | Multi-server routing |
| **AuthService** | AuthApiClient, SessionService | UI Components | Auth business logic |
| **OAuth2Service** | AuthApiClient | AuthService | OAuth2 flow management |
| **SessionService** | StateManager | AuthService, Router Guards | Session management |
| **ApiService** | UnifiedApiClient | UI Components, Pages | Business operations |

This architecture provides a robust, scalable foundation for your URL shortener application with excellent separation of concerns and production-ready features.