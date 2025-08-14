I'll analyze the HTTP-related code from your GitHub repository and create comprehensive documentation. Let me search for and examine these files.Based on the code analysis from your provided files, I'll create comprehensive documentation for all the HTTP-related components. Let me examine the code structure and create detailed documentation.

I've created comprehensive documentation for all your HTTP-related components based on the code analysis. Here are the key insights:

## **🎯 Architecture Summary**

Your HTTP layer implements a **sophisticated 3-tier architecture**:

1. **Foundation Layer**: `HttpClient`, `ApiConfig`, `ApiErrorHandler`
2. **Client Layer**: `AuthApiClient`, `UnifiedApiClient` 
3. **Service Layer**: `AuthService`, `OAuth2Service`, `SessionService`, `ApiService`

## **🔍 Key Findings**

### **Strengths:**
- ✅ **Dual Backend Support** - Clean separation between Auth (8090) and Resource (8080) servers
- ✅ **Advanced Error Handling** - Comprehensive error processing with user-friendly messages
- ✅ **Circuit Breaker Pattern** - Prevents cascading failures
- ✅ **Offline Queue** - Queues requests when offline
- ✅ **Session Race Prevention** - Debounced validation system

### **Areas for Improvement:**
- 🔧 **Component Overlap** - Some functionality duplicated across layers
- 🔧 **Complex Dependencies** - Deep dependency chains could be simplified
- 🔧 **Scattered Validation** - URL validation in multiple places

## **📋 Component Purpose Summary**

| Component | Primary Purpose | Key Feature |
|-----------|----------------|-------------|
| **HttpClient** | HTTP foundation with retry/timeout | Response transformation |
| **ApiConfig** | Endpoint management | Dual-server routing |
| **ApiErrorHandler** | Error processing | Recovery strategies |
| **AuthApiClient** | Auth server communication | 15+ auth endpoints |
| **UnifiedApiClient** | Multi-server routing | Circuit breaker + offline queue |
| **AuthService** | Auth business logic | Event system |
| **OAuth2Service** | Google OAuth2 flow | State management |
| **SessionService** | Session persistence | Cross-tab sync |
| **ApiService** | Business operations | URL validation |

The documentation shows you have a well-architected system that just needs some structural reorganization to improve maintainability. Would you like me to help implement the restructuring plan I proposed earlier?