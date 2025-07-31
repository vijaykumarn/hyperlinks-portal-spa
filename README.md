# Hyperlinks Portal SPA

# Step1 - Project Structure

The first step should be **establishing your core application architecture and routing system**. Here's the logical progression:

## Step 1: Define Your Application Structure

Start by creating a solid folder structure and defining your core TypeScript interfaces:

```
src/
├── types/           # TypeScript interfaces & types
├── core/           # Core application logic
│   ├── router/     # Routing system
│   ├── state/      # State management
│   └── http/       # API client
├── components/     # Reusable UI components
├── pages/          # Page-level components
├── utils/          # Utility functions
└── styles/         # Additional styles if needed
```

## Step 2: Build Your Router First

The router is the backbone of your SPA. You need this working before anything else because:
- It determines how your app loads and renders content
- Authentication redirects depend on it
- All other components will be rendered through route changes

Key router requirements for your app:
- Handle `/dashboard` vs static home page routing
- Support programmatic navigation for auth redirects
- Route guards for protected pages
- Handle browser back/forward navigation

## Step 3: Create Your State Management System

Since you're using sessionStorage for UI state, you need a centralized way to:
- Store and retrieve session data
- React to state changes across components  
- Handle session expiry and cleanup
- Sync with API responses

## Step 4: Build Your HTTP Client

Create your API communication layer that:
- Handles the HttpOnly cookie authentication automatically
- Manages 401/403 responses (clear session + redirect)
- Provides consistent error handling
- Integrates with your state management

## Why This Order?

1. **Router enables everything else** - You can't build pages or handle auth flows without navigation
2. **State management comes next** - Your router and API client both need to interact with application state
3. **HTTP client depends on both** - It needs to trigger navigation on auth failures and update state on successful responses

Once you have these three core systems working together, you can start building your actual UI components and pages. The authentication flow you described will naturally work once these foundations are in place.

Would you like me to help you implement the router system first, or would you prefer to start with a different piece?