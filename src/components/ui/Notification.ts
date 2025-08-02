// ========================================
// src/components/ui/Notification.ts - Notification Component
// ========================================

import { Component, type ComponentProps } from '../base/Component';
/**
 * Props for the Notification component
 */
export interface NotificationProps extends ComponentProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  autoClose?: boolean;
  duration?: number;
  onClose?: () => void;
}

export class Notification extends Component<NotificationProps> {
  private autoCloseTimer?: number;

  protected setupEventListeners(): void {
    const closeBtn = this.querySelector('[data-notification-close]');
    if (closeBtn && this.props.onClose) {
      this.addEventListener(closeBtn, 'click', this.props.onClose);
    }

    // Auto close
    if (this.props.autoClose !== false) {
      const duration = this.props.duration || 5000;
      this.autoCloseTimer = window.setTimeout(() => {
        if (this.props.onClose) {
          this.props.onClose();
        }
      }, duration);
    }
  }

  protected beforeUnmount(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }

  public render(): string {
    const {
      type = 'info',
      message = ''
    } = this.props;

    const typeConfig = {
      success: {
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        iconColor: 'text-green-400',
        icon: '✓'
      },
      error: {
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        iconColor: 'text-red-400',
        icon: '✕'
      },
      warning: {
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-400',
        icon: '⚠'
      },
      info: {
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-400',
        icon: 'ℹ'
      }
    };

    const config = typeConfig[type];

    return `
      <div data-component="notification" class="${config.bgColor} border border-${type}-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <span class="${config.iconColor} text-lg">${config.icon}</span>
          </div>
          <div class="ml-3 flex-1">
            <p class="${config.textColor} text-sm font-medium">
              ${message}
            </p>
          </div>
          <div class="ml-auto pl-3">
            <button 
              data-notification-close
              class="${config.iconColor} hover:${config.textColor} focus:outline-none"
            >
              <span class="sr-only">Close</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
