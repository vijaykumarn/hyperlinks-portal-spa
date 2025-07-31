// src/core/router/utils.ts

import type { RouteParams, QueryParams, MatchedRoute, Route } from '../../types/router';

/**
 * Converts a route path pattern to a regular expression
 * Supports :param and *wildcard patterns
 */
export function pathToRegexp(path: string): { regexp: RegExp; keys: string[] } {
  const keys: string[] = [];
  
  // Escape special regex characters except our param markers
  let pattern = path
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '*'); // Restore * for wildcard processing
  
  // Handle wildcard routes (*)
  pattern = pattern.replace(/\*/g, '(.*)');
  
  // Handle named parameters (:param)
  pattern = pattern.replace(/:([^/]+)/g, (match, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  
  // Ensure exact match
  pattern = `^${pattern}$`;
  
  return {
    regexp: new RegExp(pattern),
    keys
  };
}

/**
 * Extracts parameters from a matched route
 */
export function extractParams(keys: string[], matches: RegExpMatchArray): RouteParams {
  const params: RouteParams = {};
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = matches[i + 1];
    params[key] = value ? decodeURIComponent(value) : '';
  }
  
  return params;
}

/**
 * Parses query string into an object
 */
export function parseQuery(search: string): QueryParams {
  const query: QueryParams = {};
  
  if (!search || search.length <= 1) {
    return query;
  }
  
  // Remove leading ? or #
  const queryString = search.replace(/^[?#]/, '');
  
  if (!queryString) {
    return query;
  }
  
  const pairs = queryString.split('&');
  
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('=');
    
    if (key) {
      const decodedKey = decodeURIComponent(key);
      const decodedValue = value ? decodeURIComponent(value) : '';
      
      // Handle multiple values for the same key
      if (query[decodedKey]) {
        if (Array.isArray(query[decodedKey])) {
          (query[decodedKey] as string[]).push(decodedValue);
        } else {
          query[decodedKey] = [query[decodedKey] as string, decodedValue];
        }
      } else {
        query[decodedKey] = decodedValue;
      }
    }
  }
  
  return query;
}

/**
 * Converts query object back to string
 */
export function stringifyQuery(query: QueryParams): string {
  const pairs: string[] = [];
  
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      }
    } else if (value !== null && value !== undefined) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

/**
 * Matches a path against registered routes
 */
export function matchRoute(path: string, routes: Route[]): MatchedRoute | null {
  for (const route of routes) {
    const { regexp, keys } = pathToRegexp(route.path);
    const matches = path.match(regexp);
    
    if (matches) {
      const params = extractParams(keys, matches);
      return {
        route,
        params,
        path
      };
    }
    
    // Check nested routes
    if (route.children && route.children.length > 0) {
      const childMatch = matchRoute(path, route.children);
      if (childMatch) {
        // Merge parent params with child params
        const { regexp: parentRegexp, keys: parentKeys } = pathToRegexp(route.path);
        const parentMatches = path.match(parentRegexp);
        
        if (parentMatches) {
          const parentParams = extractParams(parentKeys, parentMatches);
          childMatch.params = { ...parentParams, ...childMatch.params };
        }
        
        return childMatch;
      }
    }
  }
  
  return null;
}

/**
 * Resolves a route path with parameters
 */
export function resolvePath(path: string, params: RouteParams = {}): string {
  let resolved = path;
  
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(value));
  }
  
  return resolved;
}

/**
 * Normalizes a path by removing trailing slashes and ensuring leading slash
 */
export function normalizePath(path: string): string {
  if (!path || path === '/') {
    return '/';
  }
  
  // Ensure leading slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Remove trailing slash
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  return path;
}