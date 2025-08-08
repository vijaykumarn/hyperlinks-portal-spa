// src/components/ui/Table.ts

import { Component, type ComponentProps } from '../base/Component';

export interface TableColumn {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: any, index: number) => string;
  sortable?: boolean;
}

export interface TableAction {
  key: string;
  title: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: (record: any, index: number) => void;
}

export interface TableProps extends ComponentProps {
  columns: TableColumn[];
  data: any[];
  actions?: TableAction[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

export class Table extends Component<TableProps> {
  private currentSort: { column: string; direction: 'asc' | 'desc' } | null = null;

  protected setupEventListeners(): void {
    // Handle action button clicks
    const actionButtons = this.querySelectorAll('[data-action]');
    actionButtons.forEach((button: HTMLElement) => {
      this.addEventListener(button, 'click', (e) => {
        e.preventDefault();
        const action = button.dataset.action;
        const recordIndex = parseInt(button.dataset.recordIndex || '0');
        const record = this.props.data[recordIndex];
        
        const actionConfig = this.props.actions?.find(a => a.key === action);
        if (actionConfig && record) {
          actionConfig.onClick(record, recordIndex);
        }
      });
    });

    // Handle sorting
    const sortableHeaders = this.querySelectorAll('[data-sortable]');
    sortableHeaders.forEach((header: HTMLElement) => {
      this.addEventListener(header, 'click', () => {
        const column = header.dataset.column;
        if (column && this.props.onSort) {
          const direction = this.currentSort?.column === column && this.currentSort.direction === 'asc' 
            ? 'desc' : 'asc';
          this.currentSort = { column, direction };
          this.props.onSort(column, direction);
        }
      });
    });

    // Handle pagination
    const paginationButtons = this.querySelectorAll('[data-page]');
    paginationButtons.forEach((button: HTMLElement) => {
      this.addEventListener(button, 'click', () => {
        const page = parseInt(button.dataset.page || '1');
        if (this.props.pagination?.onPageChange) {
          this.props.pagination.onPageChange(page);
        }
      });
    });
  }

  private renderTableHeader(): string {
    return `
      <thead class="bg-gray-50">
        <tr>
          ${this.props.columns.map(column => `
            <th 
              scope="col" 
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}"
              ${column.sortable ? `data-sortable data-column="${column.key}"` : ''}
              ${column.width ? `style="width: ${column.width}"` : ''}
            >
              <div class="flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}">
                ${column.title}
                ${column.sortable ? `
                  <svg class="w-4 h-4 ml-1 ${this.currentSort?.column === column.key ? 'text-gray-900' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                  </svg>
                ` : ''}
              </div>
            </th>
          `).join('')}
          ${this.props.actions && this.props.actions.length > 0 ? `
            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          ` : ''}
        </tr>
      </thead>
    `;
  }

  private renderTableBody(): string {
    if (this.props.loading) {
      return `
        <tbody class="bg-white">
          <tr>
            <td colspan="${this.props.columns.length + (this.props.actions ? 1 : 0)}" class="px-6 py-12 text-center">
              <div class="flex items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600">Loading...</span>
              </div>
            </td>
          </tr>
        </tbody>
      `;
    }

    if (!this.props.data || this.props.data.length === 0) {
      return `
        <tbody class="bg-white">
          <tr>
            <td colspan="${this.props.columns.length + (this.props.actions ? 1 : 0)}" class="px-6 py-12 text-center text-gray-500">
              ${this.props.emptyMessage || 'No data available'}
            </td>
          </tr>
        </tbody>
      `;
    }

    return `
      <tbody class="bg-white divide-y divide-gray-200">
        ${this.props.data.map((record, index) => `
          <tr class="hover:bg-gray-50 transition-colors">
            ${this.props.columns.map(column => {
              const value = record[column.key];
              const displayValue = column.render ? column.render(value, record, index) : value;
              return `
                <td class="px-6 py-4 whitespace-nowrap text-sm ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}">
                  ${displayValue || '-'}
                </td>
              `;
            }).join('')}
            ${this.props.actions && this.props.actions.length > 0 ? `
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                  ${this.props.actions.map(action => `
                    <button
                      data-action="${action.key}"
                      data-record-index="${index}"
                      class="text-${this.getActionColor(action.variant)}-600 hover:text-${this.getActionColor(action.variant)}-900 p-1 rounded transition-colors"
                      title="${action.title}"
                    >
                      ${action.icon || action.title}
                    </button>
                  `).join('')}
                </div>
              </td>
            ` : ''}
          </tr>
        `).join('')}
      </tbody>
    `;
  }

  private renderPagination(): string {
    if (!this.props.pagination) return '';

    const { current, total, pageSize } = this.props.pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (current - 1) * pageSize + 1;
    const endItem = Math.min(current * pageSize, total);

    return `
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            data-page="${current - 1}"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${current <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
            ${current <= 1 ? 'disabled' : ''}
          >
            Previous
          </button>
          <button
            data-page="${current + 1}"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${current >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}"
            ${current >= totalPages ? 'disabled' : ''}
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing <span class="font-medium">${startItem}</span> to <span class="font-medium">${endItem}</span> of{' '}
              <span class="font-medium">${total}</span> results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                data-page="${current - 1}"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${current <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                ${current <= 1 ? 'disabled' : ''}
              >
                <span class="sr-only">Previous</span>
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              ${this.renderPageNumbers(current, totalPages)}
              <button
                data-page="${current + 1}"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${current >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}"
                ${current >= totalPages ? 'disabled' : ''}
              >
                <span class="sr-only">Next</span>
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    `;
  }

  private renderPageNumbers(current: number, totalPages: number): string {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map(page => {
      if (page === '...') {
        return `<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>`;
      }
      
      const isActive = page === current;
      return `
        <button
          data-page="${page}"
          class="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
            isActive 
              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }"
        >
          ${page}
        </button>
      `;
    }).join('');
  }

  private getActionColor(variant?: string): string {
    switch (variant) {
      case 'danger': return 'red';
      case 'secondary': return 'gray';
      default: return 'blue';
    }
  }

  public render(): string {
    return `
      <div data-component="table" class="flex flex-col">
        <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                ${this.renderTableHeader()}
                ${this.renderTableBody()}
              </table>
            </div>
          </div>
        </div>
        ${this.renderPagination()}
      </div>
    `;
  }
}