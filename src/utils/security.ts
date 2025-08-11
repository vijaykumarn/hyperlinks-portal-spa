// src/utils/security.ts - Security Utilities
// Centralized security functions to prevent vulnerabilities

/**
 * Sanitize data for logging - removes sensitive information
 */
export function sanitizeForLogging(data: unknown, sensitiveKeys = ['password', 'token', 'secret', 'key']): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item, sensitiveKeys));
  }

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, sensitiveKeys);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate required security headers
 */
export function validateSecurityHeaders(headers: Headers): string[] {
  const issues: string[] = [];
  
  if (!headers.get('X-Content-Type-Options')) {
    issues.push('Missing X-Content-Type-Options header');
  }
  
  if (!headers.get('X-Frame-Options')) {
    issues.push('Missing X-Frame-Options header');
  }
  
  return issues;
}

/**
 * Basic XSS prevention for user input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}