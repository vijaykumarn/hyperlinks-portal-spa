// src/types/router.ts

export interface RouteParams {
  [key: string]: string;
}

export interface QueryParams {
  [key: string]: string | string[];
}

export interface RouteContext {
  params: RouteParams;
  query: QueryParams;
  path: string;
  fullPath: string;
}

export interface RouteGuardContext extends RouteContext {
  from?: Route;
  to: Route;
}

export type RouteHandler = (context: RouteContext) => Promise<void> | void;
export type RouteGuard = (context: RouteGuardContext) => Promise<boolean | string> | boolean | string;

export interface Route {
  path: string;
  handler: RouteHandler;
  name?: string;
  meta?: Record<string, any>;
  guards?: RouteGuard[];
  children?: Route[];
}

export interface NavigationOptions {
  replace?: boolean;
  state?: any;
}

export interface RouterConfig {
  mode: 'hash' | 'history';
  base?: string;
  fallback?: string;
  guards?: RouteGuard[];
}

export interface MatchedRoute {
  route: Route;
  params: RouteParams;
  path: string;
}

export type NavigationFailureType = 
  | 'aborted' 
  | 'cancelled' 
  | 'duplicated' 
  | 'redirected';

export class NavigationFailure extends Error {
  public readonly type: NavigationFailureType;
  public readonly from: string;
  public readonly to: string;

  constructor(type: NavigationFailureType, from: string, to: string, message?: string) {
    super(message || `Navigation ${type}: from ${from} to ${to}`);
    this.name = 'NavigationFailure';
    this.type = type;
    this.from = from;
    this.to = to;
  }
}