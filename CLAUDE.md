# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

This is a Vite-based TypeScript SPA with TailwindCSS. Use these commands:

- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build (port 4173)

**No linting or testing commands are configured** - the project does not have ESLint, Prettier, or test frameworks set up.

## Architecture Overview

This is a **dual-backend URL shortener SPA** with a sophisticated client-side architecture:

### Backend Architecture
- **Auth Server**: `localhost:8090` - Handles authentication, user management, sessions
- **Resource Server**: `localhost:8080` - Handles URL shortening, analytics, QR codes
- **Proxy Configuration**: Vite dev server routes `/api/auth` and `/api/session` to auth server, all other `/api/*` routes to resource server

### Frontend Architecture

**Core Systems:**
1. **Router** (`src/core/router/`) - History-based SPA router with guards and lazy loading
2. **State Management** (`src/core/state/`) - Centralized state with Redux-like patterns
3. **HTTP Layer** (`src/services/core/`) - Unified API client with dual-server support, circuit breakers, offline queuing

**Authentication Flow:**
- Supports both password and OAuth2 (Google) authentication
- Session management with HttpOnly cookies
- Auto-validation and session restoration
- Comprehensive error handling with retry logic

**Key Components:**
- **App.ts** - Main application class with lifecycle management
- **ComponentManager** - Phase 2 integration system for component composition
- **UnifiedApiClient** - Handles routing between auth/resource servers
- **AuthService** - Complete auth workflow management
- **SessionService** - Session persistence and validation

### File Structure

```
src/
├── core/                    # Core application systems
│   ├── router/             # SPA routing with guards
│   ├── state/              # Centralized state management  
│   ├── dom/                # DOM manipulation utilities
│   └── integration/        # Component integration layer
├── services/               # Business logic and API layers
│   ├── auth/              # Authentication services
│   ├── core/              # HTTP client and API configuration
│   └── business/          # Business logic services
├── components/            # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── forms/            # Form components
│   └── ui/               # Base UI components
├── pages/                # Page-level components
└── types/                # TypeScript type definitions
```

## Development Guidelines

### State Management
- Use StateManager for all application state
- Session state persists in sessionStorage
- UI state is ephemeral and resets on page refresh
- Subscribe to state changes using the observable pattern

### API Communication
- Always use UnifiedApiClient for API calls
- Use endpoint keys from ApiConfig, not hardcoded URLs
- Handle offline scenarios - non-GET requests are queued
- Circuit breaker pattern protects against server failures

### Authentication
- AuthService handles all auth workflows
- Session validation is debounced to prevent races
- OAuth2 callback handling requires special URL processing
- Auto-redirect authenticated users from public pages

### Component Development
- Extend base Component class for lifecycle management
- Use DOMManager for safe DOM manipulation
- Components should be stateless where possible
- Subscribe to relevant state slices, not entire state

### Error Handling
- Use AuthErrorHandler for authentication errors
- API errors include user-friendly messages
- Network errors trigger offline mode
- Unhandled errors are captured globally

## Important Implementation Details

### Dual-Server Communication
- Authentication requests go to port 8090
- Business logic requests go to port 8080
- UnifiedApiClient automatically routes based on endpoint configuration
- Both servers use HttpOnly cookies for session management

### Session Management
- Sessions persist across browser refreshes
- Auto-validation on app startup
- Debounced validation prevents concurrent requests
- Session expiration triggers automatic cleanup

### OAuth2 Integration
- Google OAuth2 is fully implemented
- Callback URL processing includes state validation
- Auto-session establishment after OAuth2 success
- Comprehensive error handling for OAuth2 failures

### Phase 2 Integration
- ComponentManager provides integration layer
- Supports dynamic component loading
- Error isolation prevents cascade failures
- Performance monitoring and statistics

When working with this codebase, always consider the dual-server architecture and use the established patterns for state management, API communication, and component lifecycle.