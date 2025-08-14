// src/components/ui/FilterSearch.ts

import { Component, type ComponentProps } from '../base/Component';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
}

export interface SortOption {
  key: string;
  label: string;
  value: string;
}

export interface FilterSearchProps extends ComponentProps {
  searchPlaceholder?: string;
  searchValue?: string;
  filterOptions?: FilterOption[];
  selectedFilter?: string;
  sortOptions?: SortOption[];
  selectedSort?: string;
  onSearch?: (value: string) => void;
  onFilterChange?: (value: string) => void;
  onSortChange?: (value: string) => void;
  showClearButton?: boolean;
  onClear?: () => void;
}

export class FilterSearch extends Component<FilterSearchProps> {
  private searchTimeout: NodeJS.Timeout | null = null;

  protected setupEventListeners(): void {
    // Search input
    const searchInput = this.querySelector<HTMLInputElement>('[data-search-input]');
    if (searchInput) {
      this.addEventListener(searchInput, 'input', (e) => {
        const target = e.target as HTMLInputElement;

        // Debounce search
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
          if (this.props.onSearch) {
            this.props.onSearch(target.value);
          }
        }, 300);
      });
    }

    // Filter select
    const filterSelect = this.querySelector<HTMLSelectElement>('[data-filter-select]');
    if (filterSelect) {
      this.addEventListener(filterSelect, 'change', (e) => {
        const target = e.target as HTMLSelectElement;
        if (this.props.onFilterChange) {
          this.props.onFilterChange(target.value);
        }
      });
    }

    // Sort select
    const sortSelect = this.querySelector<HTMLSelectElement>('[data-sort-select]');
    if (sortSelect) {
      this.addEventListener(sortSelect, 'change', (e) => {
        const target = e.target as HTMLSelectElement;
        if (this.props.onSortChange) {
          this.props.onSortChange(target.value);
        }
      });
    }

    // Clear button
    const clearButton = this.querySelector('[data-clear-button]');
    if (clearButton) {
      this.addEventListener(clearButton, 'click', () => {
        if (this.props.onClear) {
          this.props.onClear();
        }

        // Reset form elements
        const searchInput = this.querySelector<HTMLInputElement>('[data-search-input]');
        const filterSelect = this.querySelector<HTMLSelectElement>('[data-filter-select]');
        const sortSelect = this.querySelector<HTMLSelectElement>('[data-sort-select]');

        if (searchInput) searchInput.value = '';
        if (filterSelect) filterSelect.selectedIndex = 0;
        if (sortSelect) sortSelect.selectedIndex = 0;
      });
    }
  }

  protected beforeUnmount(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  public render(): string {
    const {
      searchPlaceholder = 'Search...',
      searchValue = '',
      filterOptions = [],
      selectedFilter = '',
      sortOptions = [],
      selectedSort = '',
      showClearButton = false
    } = this.props;

    return `
      <div data-component="filter-search" class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search Input -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div class="relative">
              <input
                type="text"
                data-search-input
                value="${searchValue}"
                placeholder="${searchPlaceholder}"
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- Filter Dropdown -->
          ${filterOptions.length > 0 ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Filter</label>
              <select
                data-filter-select
                class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                ${filterOptions.map(option => `
                  <option value="${option.value}" ${selectedFilter === option.value ? 'selected' : ''}>
                    ${option.label}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          <!-- Sort Dropdown -->
          ${sortOptions.length > 0 ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                data-sort-select
                class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                ${sortOptions.map(option => `
                  <option value="${option.value}" ${selectedSort === option.value ? 'selected' : ''}>
                    ${option.label}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          <!-- Clear Button -->
          ${showClearButton ? `
            <div class="flex items-end">
              <button
                data-clear-button
                class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}