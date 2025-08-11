// src/types/index.ts - Central Type Exports
// Single point of import for all types

import type { AppUser, BackendApiResponse } from './unified';

// Re-export unified types as primary exports
export type {
  AppUser,
  AppError,
  AuthState,
  LoadingState,
  BackendApiResponse,
  ErrorType,
  UserRole
} from './unified';

export { TypeGuards, TypeConverters } from './unified';

// Re-export app types for compatibility
export type {
  AppConfig,
  UrlData,
  AnalyticsData,
  PageComponent,
  AppLifecycle,
  SessionData,
  AppState,
  DOMManager
} from './app';

// Re-export router types
export type {
  RouteParams,
  QueryParams,
  RouteContext,
  RouteGuardContext,
  RouteHandler,
  RouteGuard,
  Route,
  NavigationOptions,
  RouterConfig,
  MatchedRoute,
  NavigationFailureType
} from './router';

export { NavigationFailure } from './router';

// Backward compatibility - will be removed in Phase 2
/** @deprecated Use AppUser instead */
export type UserData = AppUser;

/** @deprecated Use BackendApiResponse instead */
export type ApiResponse<T = any> = BackendApiResponse<T>;