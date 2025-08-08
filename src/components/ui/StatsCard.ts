// src/components/ui/StatsCard.ts

import { Component, type ComponentProps } from '../base/Component';

export interface StatsCardProps extends ComponentProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  loading?: boolean;
  onClick?: () => void;
}

export class StatsCard extends Component<StatsCardProps> {
  protected setupEventListeners(): void {
    if (this.props.onClick) {
      const card = this.el;
      if (card) {
        card.style.cursor = 'pointer';
        this.addEventListener(card, 'click', () => {
          if (this.props.onClick) {
            this.props.onClick();
          }
        });
      }
    }
  }

  private getColorClasses(color: string = 'blue'): { bg: string; text: string; icon: string } {
    const colorMap = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', icon: 'text-blue-500' },
      green: { bg: 'bg-green-500', text: 'text-green-600', icon: 'text-green-500' },
      red: { bg: 'bg-red-500', text: 'text-red-600', icon: 'text-red-500' },
      yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', icon: 'text-yellow-500' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', icon: 'text-purple-500' },
      gray: { bg: 'bg-gray-500', text: 'text-gray-600', icon: 'text-gray-500' }
    };
    return colorMap[color] || colorMap.blue;
  }

  private getDefaultIcon(title: string): string {
    const iconMap: Record<string, string> = {
      'urls': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>`,
      'clicks': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`,
      'views': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`,
      'users': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>`,
      'revenue': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>`,
      'default': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>`
    };

    const key = title.toLowerCase();
    return iconMap[key] || iconMap.default;
  }

  private formatValue(value: string | number): string {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return value;
  }

  public render(): string {
    const {
      title,
      value,
      change,
      icon,
      color = 'blue',
      loading = false,
      onClick
    } = this.props;

    const colors = this.getColorClasses(color);
    const iconPath = icon || this.getDefaultIcon(title);
    const formattedValue = this.formatValue(value);

    return `
      <div data-component="stats-card" class="bg-white overflow-hidden shadow rounded-lg ${onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 ${colors.bg} bg-opacity-10 rounded-md flex items-center justify-center">
                <svg class="w-5 h-5 ${colors.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  ${iconPath}
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">
                  ${title}
                </dt>
                <dd class="flex items-baseline">
                  ${loading ? `
                    <div class="animate-pulse">
                      <div class="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  ` : `
                    <div class="text-2xl font-semibold text-gray-900">
                      ${formattedValue}
                    </div>
                    ${change ? `
                      <div class="ml-2 flex items-baseline text-sm font-semibold ${
                        change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                      }">
                        <svg class="self-center flex-shrink-0 h-4 w-4 ${
                          change.type === 'increase' ? 'text-green-500' : 'text-red-500'
                        }" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          ${change.type === 'increase' ? `
                            <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414 6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                          ` : `
                            <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                          `}
                        </svg>
                        <span class="sr-only">${change.type === 'increase' ? 'Increased' : 'Decreased'} by</span>
                        ${Math.abs(change.value)}%
                      </div>
                      <div class="ml-1 text-sm text-gray-500">
                        ${change.period}
                      </div>
                    ` : ''}
                  `}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        ${onClick ? `
          <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm">
              <span class="${colors.text} font-medium hover:${colors.text} hover:underline">
                View details
              </span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}