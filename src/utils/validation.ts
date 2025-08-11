// src/utils/validation.ts - Runtime Validation Utilities
// Provides runtime validation for better type safety

import { VALIDATION, ERROR_CODES } from '../config/constants';
import type { AppError, AppUser } from '../types/unified';

/**
 * Create validation error
 */
function createValidationError(field: string, message: string): AppError {
  return {
    type: 'VALIDATION',
    code: ERROR_CODES.INVALID_EMAIL, // Will be made more specific
    message,
    details: { field },
    timestamp: Date.now(),
    context: 'validation'
  };
}

/**
 * Email validation
 */
export function validateEmail(email: string): AppError | null {
  if (!email) {
    return createValidationError('email', 'Email is required');
  }
  
  if (email.length > VALIDATION.EMAIL_MAX_LENGTH) {
    return createValidationError('email', `Email cannot exceed ${VALIDATION.EMAIL_MAX_LENGTH} characters`);
  }
  
  if (!VALIDATION.EMAIL_PATTERN.test(email)) {
    return createValidationError('email', 'Please enter a valid email address');
  }
  
  return null;
}

/**
 * Password validation
 */
export function validatePassword(password: string): AppError | null {
  if (!password) {
    return createValidationError('password', 'Password is required');
  }
  
  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return createValidationError('password', `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
    return createValidationError('password', `Password cannot exceed ${VALIDATION.PASSWORD_MAX_LENGTH} characters`);
  }
  
  const { LOWERCASE, UPPERCASE, DIGIT, SPECIAL } = VALIDATION.PASSWORD_REQUIRED_PATTERNS;
  
  if (!LOWERCASE.test(password)) {
    return createValidationError('password', 'Password must contain at least one lowercase letter');
  }
  
  if (!UPPERCASE.test(password)) {
    return createValidationError('password', 'Password must contain at least one uppercase letter');
  }
  
  if (!DIGIT.test(password)) {
    return createValidationError('password', 'Password must contain at least one number');
  }
  
  if (!SPECIAL.test(password)) {
    return createValidationError('password', 'Password must contain at least one special character (@$!%*?&)');
  }
  
  return null;
}

/**
 * Username validation
 */
export function validateUsername(username: string): AppError | null {
  if (!username) {
    return createValidationError('username', 'Username is required');
  }
  
  if (username.length < VALIDATION.USERNAME_MIN_LENGTH) {
    return createValidationError('username', `Username must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters long`);
  }
  
  if (username.length > VALIDATION.USERNAME_MAX_LENGTH) {
    return createValidationError('username', `Username cannot exceed ${VALIDATION.USERNAME_MAX_LENGTH} characters`);
  }
  
  if (!VALIDATION.USERNAME_PATTERN.test(username)) {
    return createValidationError('username', 'Username can only contain letters, numbers, dots, underscores and hyphens');
  }
  
  return null;
}

/**
 * Validation utilities object
 */
export const ValidationUtils = {
  email: validateEmail,
  password: validatePassword,
  username: validateUsername,
  
  /**
   * Validate multiple fields at once
   */
  validateFields(data: Record<string, string>, rules: Record<string, (value: string) => AppError | null>): AppError[] {
    const errors: AppError[] = [];
    
    for (const [field, validator] of Object.entries(rules)) {
      const value = data[field];
      const error = validator(value);
      if (error) {
        errors.push(error);
      }
    }
    
    return errors;
  }
} as const;