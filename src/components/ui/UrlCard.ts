// src/components/ui/UrlCard.ts

import { Component, type ComponentProps } from '../base/Component';
import type { UrlData } from '../../types/app';

export interface UrlCardProps extends ComponentProps {
  url: UrlData;
  onCopy?: (shortUrl: string) => void;
  onEdit?: (url: UrlData) => void;
  onDelete?: (url: UrlData) => void;
  onViewQR?: (url: UrlData) => void;
  onViewAnalytics?: (url: UrlData) => void;
  showActions?: boolean;
}

export class UrlCard extends Component<UrlCardProps> {
  protected setupEventListeners(): void {
    // Copy button
    const copyBtn = this.querySelector('[data-action="copy"]');
    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const shortUrl = this.props.url.shortCode;
        if (this.props.onCopy) {
          this.props.onCopy(`https://short.ly/${shortUrl}`);
        }
        this.showCopyFeedback();
      });
    }

    // Edit button
    const editBtn = this.querySelector('[data-action="edit"]');
    if (editBtn) {
      this.addEventListener(editBtn, 'click', () => {
        if (this.props.onEdit) {
          this.props.onEdit(this.props.url);
        }
      });
    }

    // Delete button
    const deleteBtn = this.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      this.addEventListener(deleteBtn, 'click', () => {
        if (this.props.onDelete) {
          this.props.onDelete(this.props.url);
        }
      });
    }

    // QR Code button
    const qrBtn = this.querySelector('[data-action="qr"]');
    if (qrBtn) {
      this.addEventListener(qrBtn, 'click', () => {
        if (this.props.onViewQR) {
          this.props.onViewQR(this.props.url);
        }
      });
    }

    // Analytics button
    const analyticsBtn = this.querySelector('[data-action="analytics"]');
    if (analyticsBtn) {
      this.addEventListener(analyticsBtn, 'click', () => {
        if (this.props.onViewAnalytics) {
          this.props.onViewAnalytics(this.props.url);
        }
      });
    }
  }

  private showCopyFeedback(): void {
    const copyBtn = this.querySelector('[data-action="copy"]');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('bg-green-500', 'text-white');

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('bg-green-500', 'text-white');
      }, 2000);
    }
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  private truncateUrl(url: string, maxLength: number = 50): string {
    return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
  }

  private getStatusBadge(): string {
    const { url } = this.props;
    const now = Date.now();

    if (url.expiresAt && url.expiresAt < now) {
      return '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Expired</span>';
    }

    if (url.expiresAt && url.expiresAt - now < 7 * 24 * 60 * 60 * 1000) {
      return '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Expiring Soon</span>';
    }

    return '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>';
  }

  public render(): string {
    const { url, showActions = true } = this.props;
    const shortUrl = `https://short.ly/${url.shortCode}`;

    return `
      <div data-component="url-card" class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2 mb-1">
              <h3 class="text-lg font-medium text-gray-900 truncate">
                ${url.shortCode}
              </h3>
              ${this.getStatusBadge()}
            </div>
            <p class="text-sm text-blue-600 font-mono break-all">
              ${shortUrl}
            </p>
          </div>
          
          ${showActions ? `
            <div class="flex items-center space-x-1 ml-4">
              <button
                data-action="copy"
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Copy short URL"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </button>
              
              <button
                data-action="qr"
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="View QR Code"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
              </button>
              
              <button
                data-action="analytics"
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="View Analytics"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </button>
              
              <button
                data-action="edit"
                class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit URL"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              
              <button
                data-action="delete"
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete URL"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          ` : ''}
        </div>
        <!-- Original URL -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Original URL</label>
          <p class="text-sm text-gray-600 break-all bg-gray-50 p-2 rounded">
            ${this.truncateUrl(url.originalUrl)}
          </p>
        </div>
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">${url.clicks.toLocaleString()}</div>
            <div class="text-xs text-gray-500">Clicks</div>
          </div>
          <div class="text-center">
            <div class="text-sm font-medium text-gray-900">${this.formatDate(url.createdAt)}</div>
            <div class="text-xs text-gray-500">Created</div>
          </div>
          <div class="text-center">
            <div class="text-sm font-medium text-gray-900">
              ${url.expiresAt ? this.formatDate(url.expiresAt) : 'Never'}
            </div>
            <div class="text-xs text-gray-500">Expires</div>
          </div>
        </div>
        <!-- Quick Actions -->
        ${showActions ? `
          <div class="flex space-x-2 pt-4 border-t border-gray-100">
            <button
              data-action="copy"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Copy Link
            </button>
            <button
              data-action="analytics"
              class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              View Stats
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }
}