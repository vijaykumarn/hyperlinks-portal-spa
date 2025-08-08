// src/components/auth/PasswordStrength.ts - FIXED TYPE ERRORS

import { Component, type ComponentProps } from '../base/Component';
import type { PasswordStrength } from '../../services/auth/types';

export interface PasswordStrengthProps extends ComponentProps {
  password: string;
  showStrength?: boolean;
  showRequirements?: boolean;
}

export class PasswordStrengthComponent extends Component<PasswordStrengthProps> {
  protected setupEventListeners(): void {
    // No event listeners needed - this is a display-only component
  }

  private calculatePasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0; // Start as number, cast to specific type later

    if (!password) {
      return {
        score: 0,
        feedback: ['Password is required'],
        isValid: false
      };
    }

    const requirements = [
      { test: password.length >= 8, message: 'At least 8 characters' },
      { test: /[a-z]/.test(password), message: 'One lowercase letter' },
      { test: /[A-Z]/.test(password), message: 'One uppercase letter' },
      { test: /\d/.test(password), message: 'One number' },
      { test: /[@$!%*?&]/.test(password), message: 'One special character' }
    ];

    requirements.forEach(req => {
      if (req.test) {
        score++;
      } else {
        feedback.push(req.message);
      }
    });

    // Bonus points for longer passwords - FIXED TYPE ERROR
    if (password.length >= 12) {
      score = Math.min(score + 1, 4);
    }

    const isValid = feedback.length === 0;

    return {
      score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4, // Explicit cast to union type
      feedback: isValid ? ['Password meets all requirements'] : feedback,
      isValid
    };
  }

  public render(): string {
    const { 
      password, 
      showStrength = true, 
      showRequirements = true 
    } = this.props;

    if (!password) {
      return '<div data-component="password-strength" style="display: none;"></div>';
    }

    const strength = this.calculatePasswordStrength(password);
    
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = [
      'bg-red-500',
      'bg-orange-500', 
      'bg-yellow-500',
      'bg-blue-500',
      'bg-green-500'
    ];

    const requirements = [
      { test: password.length >= 8, label: 'At least 8 characters' },
      { test: /[a-z]/.test(password), label: 'One lowercase letter (a-z)' },
      { test: /[A-Z]/.test(password), label: 'One uppercase letter (A-Z)' },
      { test: /\d/.test(password), label: 'One number (0-9)' },
      { test: /[@$!%*?&]/.test(password), label: 'One special character (@$!%*?&)' }
    ];

    return `
      <div data-component="password-strength" class="mt-2">
        ${showStrength ? `
          <div class="mb-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-600">Password strength:</span>
              <span class="text-xs font-medium ${
                strength.isValid ? 'text-green-600' : 'text-gray-600'
              }">
                ${strengthLabels[strength.score]}
              </span>
            </div>
            <div class="flex space-x-1">
              ${Array.from({ length: 5 }, (_, i) => `
                <div class="flex-1 h-2 rounded-full ${
                  i < strength.score 
                    ? strengthColors[strength.score] 
                    : 'bg-gray-200'
                }"></div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${showRequirements ? `
          <div class="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p class="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
            <ul class="space-y-1">
              ${requirements.map(req => `
                <li class="flex items-center text-xs">
                  ${req.test ? `
                    <svg class="w-3 h-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-green-600">${req.label}</span>
                  ` : `
                    <svg class="w-3 h-3 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2a1 1 0 002 0V7zm-1 4a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-600">${req.label}</span>
                  `}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }
}