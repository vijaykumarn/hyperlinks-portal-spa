// src/pages/UrlsPage.ts - FIXED VERSION

import type { DOMManager, PageComponent, UrlData } from "../types/app";
import type { RouteContext } from "../types/router";
import { SessionService } from '../services/SessionService';
import { ApiService } from '../services/ApiService';
import { 
  Table, 
  FilterSearch, 
  Modal, 
  Button, 
  StatsCard,
  QRGenerator,
  type TableColumn,
  type TableAction,
  type FilterOption,
  type SortOption
} from '../components/ui';
import { UrlManagementForm } from '../components/forms';

interface UrlsPageState {
  urls: UrlData[];
  filteredUrls: UrlData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filterBy: string;
  sortBy: string;
  currentPage: number;
  pageSize: number;
  selectedUrls: string[];
  showCreateModal: boolean;
  showEditModal: boolean;
  showQRModal: boolean;
  showDeleteModal: boolean;
  editingUrl: UrlData | null;
  qrUrl: UrlData | null;
  deletingUrls: UrlData[];
}

export class UrlsPage implements PageComponent {
  private domManager: DOMManager;
  private sessionService: SessionService;
  private apiService: ApiService;
  private eventListeners: Array<() => void> = [];

  // Component instances
  private statsCards: StatsCard[] = [];
  private filterSearch: FilterSearch | null = null;
  private urlsTable: Table | null = null;
  private createButton: Button | null = null;
  private createModal: Modal | null = null;
  private editModal: Modal | null = null;
  private qrModal: Modal | null = null;
  private deleteModal: Modal | null = null;
  private urlManagementForm: UrlManagementForm | null = null;
  private qrGenerator: QRGenerator | null = null;

    // Page state
  private state: UrlsPageState = {
    urls: [],
    filteredUrls: [],
    loading: false,
    error: null,
    searchQuery: '',
    filterBy: '',
    sortBy: 'createdAt',
    currentPage: 1,
    pageSize: 10,
    selectedUrls: [],
    showCreateModal: false,
    showEditModal: false,
    showQRModal: false,
    showDeleteModal: false,
    editingUrl: null,
    qrUrl: null,
    deletingUrls: []
  };

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
    this.sessionService = SessionService.getInstance();
    this.apiService = ApiService.getInstance();
  }

  public async beforeEnter(_context: RouteContext): Promise<boolean> {
    if (!this.sessionService.isAuthenticated()) {
      const app = (window as any).__APP__;
      if (app) {
        const router = app.getRouter();
        if (router) {
          router.replace('/');
          return false;
        }
      }
    }
    return true;
  }

  public async render(_context: RouteContext): Promise<void> {
    const html = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-6">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">URL Management</h1>
                <p class="text-gray-600 mt-1">Create, manage, and track your shortened URLs</p>
              </div>
              <div class="flex items-center space-x-4">
                <div id="create-button-container"></div>
                <button 
                  id="back-btn"
                  class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>
        <!-- Main Content -->
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="px-4 py-6 sm:px-0">
            
            <!-- Stats Cards -->
            <div id="stats-section" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div id="total-urls-card"></div>
              <div id="total-clicks-card"></div>
              <div id="active-urls-card"></div>
              <div id="expired-urls-card"></div>
            </div>
            <!-- Filter and Search -->
            <div id="filter-search-container"></div>
            <!-- URLs Table -->
            <div id="urls-table-container"></div>
            <!-- Error State -->
            <div id="error-container" class="hidden">
              <div class="bg-red-50 border border-red-200 rounded-md p-4">
                <p class="text-red-800 text-sm" id="error-message"></p>
              </div>
            </div>
          </div>
        </main>
        <!-- Modals -->
        <div id="create-modal-container"></div>
        <div id="edit-modal-container"></div>
        <div id="qr-modal-container"></div>
        <div id="delete-modal-container"></div>
      </div>
    `;

    this.domManager.setContent(html);
    this.setupBasicEventListeners();
    await this.initializeComponents();
    await this.loadUrls();
  }

  private setupBasicEventListeners(): void {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      const listener = this.domManager.addEventListener(backBtn, 'click', () => {
        const app = (window as any).__APP__;
        if (app) {
          const router = app.getRouter();
          if (router) router.push('/dashboard');
        }
      });
      this.eventListeners.push(listener);
    }
  }

  private async initializeComponents(): Promise<void> {
    try {
      console.log('🎨 Initializing UrlsPage components...');

      this.initializeStatsCards();
      this.initializeFilterSearch();
      this.initializeCreateButton();
      this.initializeTable();
      this.initializeModals();

      this.mountComponents();

      console.log('✅ UrlsPage components initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing UrlsPage components:', error);
      this.showError('Failed to initialize page components');
    }
  }

   private initializeStatsCards(): void {
    const stats = this.calculateStats();

    this.statsCards = [
      new StatsCard({
        props: {
          title: 'Total URLs',
          value: stats.totalUrls,
          color: 'blue',
          icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>`,
          onClick: () => this.handleStatsCardClick('total')
        }
      }),
      new StatsCard({
        props: {
          title: 'Total Clicks',
          value: stats.totalClicks,
          color: 'green',
          icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`,
          onClick: () => this.handleStatsCardClick('clicks')
        }
      }),
      new StatsCard({
        props: {
          title: 'Active URLs',
          value: stats.activeUrls,
          color: 'purple',
          onClick: () => this.handleStatsCardClick('active')
        }
      }),
      new StatsCard({
        props: {
          title: 'Expired URLs',
          value: stats.expiredUrls,
          color: 'red',
          onClick: () => this.handleStatsCardClick('expired')
        }
      })
    ];
  }

  private initializeFilterSearch(): void {
    const filterOptions: FilterOption[] = [
      { key: 'all', label: 'All URLs', value: '' },
      { key: 'active', label: 'Active', value: 'active' },
      { key: 'expired', label: 'Expired', value: 'expired' },
      { key: 'custom', label: 'Custom Code', value: 'custom' }
    ];

    const sortOptions: SortOption[] = [
      { key: 'created', label: 'Recently Added', value: 'createdAt' },
      { key: 'clicks', label: 'Most Clicks', value: 'clicks' },
      { key: 'alphabetical', label: 'Alphabetical', value: 'shortCode' }
    ];

    this.filterSearch = new FilterSearch({
      props: {
        searchPlaceholder: 'Search URLs...',
        searchValue: this.state.searchQuery,
        filterOptions,
        selectedFilter: this.state.filterBy,
        sortOptions,
        selectedSort: this.state.sortBy,
        showClearButton: true,
        onSearch: (value: string) => this.handleSearch(value),
        onFilterChange: (value: string) => this.handleFilterChange(value),
        onSortChange: (value: string) => this.handleSortChange(value),
        onClear: () => this.handleClearFilters()
      }
    });
  }

  private initializeCreateButton(): void {
    this.createButton = new Button({
      props: {
        variant: 'primary',
        children: '+ Create URL',
        onClick: () => this.handleCreateClick()
      }
    });
  }

  private initializeTable(): void {
    const columns: TableColumn[] = [
      {
        key: 'shortCode',
        title: 'Short Code',
        width: '200px',
        render: (value: string) => `
          <div class="flex items-center">
            <div class="text-sm font-medium text-gray-900">${value}</div>
            <div class="text-xs text-gray-500 mt-1">/${value}</div>
          </div>
        `
      },
      {
        key: 'originalUrl',
        title: 'Original URL',
        render: (value: string) => `
          <div class="text-sm text-gray-900 truncate max-w-xs" title="${value}">
            ${value.length > 50 ? value.substring(0, 50) + '...' : value}
          </div>
        `
      },
      {
        key: 'clicks',
        title: 'Clicks',
        width: '100px',
        align: 'center',
        sortable: true,
        render: (value: number) => `<span class="text-sm font-medium">${value.toLocaleString()}</span>`
      },
      {
        key: 'createdAt',
        title: 'Created',
        width: '120px',
        sortable: true,
        render: (value: number) => `<span class="text-sm text-gray-500">${new Date(value).toLocaleDateString()}</span>`
      },
      {
        key: 'expiresAt',
        title: 'Status',
        width: '100px',
        render: (value: number | undefined) => {
          if (!value) return '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>';

          const now = Date.now();
          if (value < now) {
            return '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Expired</span>';
          } else if (value - now < 7 * 24 * 60 * 60 * 1000) {
            return '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Expiring Soon</span>';
          }
          return '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>';
        }
      }
    ];

    const actions: TableAction[] = [
      {
        key: 'qr',
        title: 'QR Code',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
        </svg>`,
        variant: 'secondary',
        onClick: (record: UrlData) => this.handleQRClick(record)
      },
      {
        key: 'edit',
        title: 'Edit',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>`,
        variant: 'primary',
        onClick: (record: UrlData) => this.handleEditClick(record)
      },
      {
        key: 'delete',
        title: 'Delete',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>`,
        variant: 'danger',
        onClick: (record: UrlData) => this.handleDeleteClick(record)
      }
    ];

    this.urlsTable = new Table({
      props: {
        columns,
        data: this.state.filteredUrls,
        actions,
        loading: this.state.loading,
        emptyMessage: 'No URLs found. Create your first URL to get started!',
        pagination: {
          current: this.state.currentPage,
          total: this.state.filteredUrls.length,
          pageSize: this.state.pageSize,
          onPageChange: (page: number) => this.handlePageChange(page)
        },
        onSort: (column: string, direction: 'asc' | 'desc') => this.handleTableSort(column, direction)
      }
    });
  }

  private initializeModals(): void {
    // Create Modal
    this.createModal = new Modal({
      props: {
        isOpen: this.state.showCreateModal,
        title: 'Create New URL',
        onClose: () => this.handleCloseCreateModal(),
        children: '<div id="create-form-container"></div>'
      }
    });

    // Edit Modal
    this.editModal = new Modal({
      props: {
        isOpen: this.state.showEditModal,
        title: 'Edit URL',
        onClose: () => this.handleCloseEditModal(),
        children: '<div id="edit-form-container"></div>'
      }
    });

    // QR Modal
    this.qrModal = new Modal({
      props: {
        isOpen: this.state.showQRModal,
        title: 'QR Code',
        onClose: () => this.handleCloseQRModal(),
        children: '<div id="qr-generator-container"></div>'
      }
    });

    // Delete Modal
    this.deleteModal = new Modal({
      props: {
        isOpen: this.state.showDeleteModal,
        title: 'Delete URL',
        onClose: () => this.handleCloseDeleteModal(),
        children: `
          <div class="text-center">
            <p class="text-gray-700 mb-6">Are you sure you want to delete this URL? This action cannot be undone.</p>
            <div class="flex justify-center space-x-4">
              <button id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">
                Delete
              </button>
              <button id="cancel-delete-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md">
                Cancel
              </button>
            </div>
          </div>
        `
      }
    });
  }

  private mountComponents(): void {
    // Mount stats cards
    const statsContainers = [
      'total-urls-card',
      'total-clicks-card', 
      'active-urls-card',
      'expired-urls-card'
    ];

    this.statsCards.forEach((card, index) => {
      const container = document.getElementById(statsContainers[index]);
      if (container) {
        card.mount(container);
      }
    });

    // Mount other components
    const containers = {
      filterSearch: document.getElementById('filter-search-container'),
      createButton: document.getElementById('create-button-container'),
      urlsTable: document.getElementById('urls-table-container'),
      createModal: document.getElementById('create-modal-container'),
      editModal: document.getElementById('edit-modal-container'),
      qrModal: document.getElementById('qr-modal-container'),
      deleteModal: document.getElementById('delete-modal-container')
    };

    if (containers.filterSearch && this.filterSearch) {
      this.filterSearch.mount(containers.filterSearch);
    }

    if (containers.createButton && this.createButton) {
      this.createButton.mount(containers.createButton);
    }

    if (containers.urlsTable && this.urlsTable) {
      this.urlsTable.mount(containers.urlsTable);
    }

    if (containers.createModal && this.createModal) {
      this.createModal.mount(containers.createModal);
    }

    if (containers.editModal && this.editModal) {
      this.editModal.mount(containers.editModal);
    }

    if (containers.qrModal && this.qrModal) {
      this.qrModal.mount(containers.qrModal);
    }

    if (containers.deleteModal && this.deleteModal) {
      this.deleteModal.mount(containers.deleteModal);
    }
  }

  // CRUD Operations
  private async loadUrls(): Promise<void> {
    try {
      this.setState({ loading: true, error: null });

      const result = await this.apiService.getUserUrls();

      if (result.success && result.data) {
        this.setState({ 
          urls: result.data,
          loading: false
        });
        this.applyFiltersAndSort();
      } else {
        throw new Error(result.error || 'Failed to load URLs');
      }

    } catch (error) {
      console.error('❌ Error loading URLs:', error);
      this.setState({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load URLs'
      });
      this.showError(this.state.error!);
    }
  }

  private async createUrl(data: {
    originalUrl: string;
    customCode?: string;
    expiresAt?: number;
    description?: string;
  }): Promise<void> {
    try {
      const result = await this.apiService.shortenUrl(data.originalUrl);

      if (result.success && result.data) {
        // In a real implementation, you'd also send the other fields
        await this.loadUrls(); // Reload the list
        this.handleCloseCreateModal();
        this.showSuccess('URL created successfully!');
      } else {
        throw new Error(result.error || 'Failed to create URL');
      }

    } catch (error) {
      console.error('❌ Error creating URL:', error);
      throw error;
    }
  }

  private async updateUrl(id: string, updates: {
    originalUrl?: string;
    customCode?: string;
  }): Promise<void> {
    try {
      const result = await this.apiService.updateUrl(id, updates);

      if (result.success) {
        await this.loadUrls(); // Reload the list
        this.handleCloseEditModal();
        this.showSuccess('URL updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update URL');
      }

    } catch (error) {
      console.error('❌ Error updating URL:', error);
      throw error;
    }
  }

  private async deleteUrl(id: string): Promise<void> {
    try {
      const result = await this.apiService.deleteUrl(id);

      if (result.success) {
        await this.loadUrls(); // Reload the list
        this.handleCloseDeleteModal();
        this.showSuccess('URL deleted successfully!');
      } else {
        throw new Error(result.error || 'Failed to delete URL');
      }

    } catch (error) {
      console.error('❌ Error deleting URL:', error);
      throw error;
    }
  }

  // Event Handlers
  private handleCreateClick(): void {
    this.setState({ showCreateModal: true });

    if (this.createModal) {
      this.createModal.update({ isOpen: true });

      setTimeout(() => {
        const formContainer = document.getElementById('create-form-container');
        if (formContainer) {
          this.urlManagementForm = new UrlManagementForm({
            props: {
              mode: 'create',
              onSave: (data) => this.createUrl(data)
            }
          });
          this.urlManagementForm.mount(formContainer);
        }
      }, 50);
    }
  }

  private handleEditClick(url: UrlData): void {
    this.setState({ showEditModal: true, editingUrl: url });

    if (this.editModal) {
      this.editModal.update({ isOpen: true });

      setTimeout(() => {
        const formContainer = document.getElementById('edit-form-container');
        if (formContainer && this.state.editingUrl) {
          this.urlManagementForm = new UrlManagementForm({
            props: {
              mode: 'edit',
              url: this.state.editingUrl,
              onSave: (data) => this.updateUrl(this.state.editingUrl!.id, data)
            }
          });
          this.urlManagementForm.mount(formContainer);
        }
      }, 50);
    }
  }

  private handleQRClick(url: UrlData): void {
    this.setState({ showQRModal: true, qrUrl: url });

    if (this.qrModal) {
      this.qrModal.update({ isOpen: true });

      setTimeout(() => {
        const qrContainer = document.getElementById('qr-generator-container');
        if (qrContainer && this.state.qrUrl) {
          this.qrGenerator = new QRGenerator({
            props: {
              url: `https://short.ly/${this.state.qrUrl.shortCode}`,
              showControls: true
            }
          });
          this.qrGenerator.mount(qrContainer);
        }
      }, 50);
    }
  }

  private handleDeleteClick(url: UrlData): void {
    this.setState({ showDeleteModal: true, deletingUrls: [url] });

    if (this.deleteModal) {
      this.deleteModal.update({ isOpen: true });

      setTimeout(() => {
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const cancelBtn = document.getElementById('cancel-delete-btn');

        if (confirmBtn) {
          confirmBtn.addEventListener('click', () => {
            this.deleteUrl(url.id);
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            this.handleCloseDeleteModal();
          });
        }
      }, 50);
    }
  }

  private handleCloseCreateModal(): void {
    this.setState({ showCreateModal: false });
    if (this.createModal) {
      this.createModal.update({ isOpen: false });
    }
    if (this.urlManagementForm) {
      this.urlManagementForm.unmount();
      this.urlManagementForm = null;
    }
  }

  private handleCloseEditModal(): void {
    this.setState({ showEditModal: false, editingUrl: null });
    if (this.editModal) {
      this.editModal.update({ isOpen: false });
    }
    if (this.urlManagementForm) {
      this.urlManagementForm.unmount();
      this.urlManagementForm = null;
    }
  }

  private handleCloseQRModal(): void {
    this.setState({ showQRModal: false, qrUrl: null });
    if (this.qrModal) {
      this.qrModal.update({ isOpen: false });
    }
    if (this.qrGenerator) {
      this.qrGenerator.unmount();
      this.qrGenerator = null;
    }
  }

  private handleCloseDeleteModal(): void {
    this.setState({ showDeleteModal: false, deletingUrls: [] });
    if (this.deleteModal) {
      this.deleteModal.update({ isOpen: false });
    }
  }

  private handleSearch(query: string): void {
    this.setState({ searchQuery: query, currentPage: 1 });
    this.applyFiltersAndSort();
  }

  private handleFilterChange(filter: string): void {
    this.setState({ filterBy: filter, currentPage: 1 });
    this.applyFiltersAndSort();
  }

  private handleSortChange(sort: string): void {
    this.setState({ sortBy: sort });
    this.applyFiltersAndSort();
  }

  private handleClearFilters(): void {
    this.setState({ 
      searchQuery: '', 
      filterBy: '', 
      sortBy: 'createdAt',
      currentPage: 1 
    });
    this.applyFiltersAndSort();
  }

  private handlePageChange(page: number): void {
    this.setState({ currentPage: page });
    this.updateTable();
  }

  private handleTableSort(column: string, direction: 'asc' | 'desc'): void {
    this.setState({ sortBy: `${column}_${direction}` });
    this.applyFiltersAndSort();
  }

  private handleStatsCardClick(type: string): void {
    // Filter based on stats card clicked
    let filterValue = '';
    switch (type) {
      case 'active':
        filterValue = 'active';
        break;
      case 'expired':
        filterValue = 'expired';
        break;
      default:
        filterValue = '';
    }

    this.setState({ filterBy: filterValue, currentPage: 1 });
    this.applyFiltersAndSort();

    if (this.filterSearch) {
      this.filterSearch.update({ selectedFilter: filterValue });
    }
  }

  // Helper Methods
  private setState(newState: Partial<UrlsPageState>): void {
    this.state = { ...this.state, ...newState };
  }

  private applyFiltersAndSort(): void {
    let filtered = [...this.state.urls];

    // Apply search filter
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(url => 
        url.shortCode.toLowerCase().includes(query) ||
        url.originalUrl.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.state.filterBy) {
      const now = Date.now();
      filtered = filtered.filter(url => {
        switch (this.state.filterBy) {
          case 'active':
            return !url.expiresAt || url.expiresAt > now;
          case 'expired':
            return url.expiresAt && url.expiresAt <= now;
          case 'custom':
            return url.shortCode.length > 8; // Assuming generated codes are 8 chars
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const [field, direction] = this.state.sortBy.split('_');
      const sortField = field || this.state.sortBy;
      const sortDirection = direction || 'desc';

      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'createdAt':
        case 'clicks':
        case 'expiresAt':
          aValue = a[sortField as keyof UrlData] || 0;
          bValue = b[sortField as keyof UrlData] || 0;
          break;
        case 'shortCode':
        case 'originalUrl':
          aValue = (a[sortField as keyof UrlData] as string).toLowerCase();
          bValue = (b[sortField as keyof UrlData] as string).toLowerCase();
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    this.setState({ filteredUrls: filtered });
    this.updateTable();
    this.updateStatsCards();
  }

  private updateTable(): void {
    if (this.urlsTable) {
      const startIndex = (this.state.currentPage - 1) * this.state.pageSize;
      const endIndex = startIndex + this.state.pageSize;
      const paginatedData = this.state.filteredUrls.slice(startIndex, endIndex);

      this.urlsTable.update({
        data: paginatedData,
        loading: this.state.loading,
        pagination: {
          current: this.state.currentPage,
          total: this.state.filteredUrls.length,
          pageSize: this.state.pageSize,
          onPageChange: (page: number) => this.handlePageChange(page)
        }
      });
    }
  }

  private updateStatsCards(): void {
    const stats = this.calculateStats();

    if (this.statsCards.length >= 4) {
      this.statsCards[0].update({ value: stats.totalUrls });
      this.statsCards[1].update({ value: stats.totalClicks });
      this.statsCards[2].update({ value: stats.activeUrls });
      this.statsCards[3].update({ value: stats.expiredUrls });
    }
  }

  private calculateStats(): {
    totalUrls: number;
    totalClicks: number;
    activeUrls: number;
    expiredUrls: number;
  } {
    const now = Date.now();

    return {
      totalUrls: this.state.urls.length,
      totalClicks: this.state.urls.reduce((sum, url) => sum + url.clicks, 0),
      activeUrls: this.state.urls.filter(url => !url.expiresAt || url.expiresAt > now).length,
      expiredUrls: this.state.urls.filter(url => url.expiresAt && url.expiresAt <= now).length
    };
  }

  private showError(message: string): void {
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    if (errorContainer && errorMessage) {
      errorMessage.textContent = message;
      errorContainer.classList.remove('hidden');

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorContainer.classList.add('hidden');
      }, 5000);
    }
  }

  private showSuccess(message: string): void {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50';
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  public async afterEnter(_context: RouteContext): Promise<void> {
    // Focus search input after page loads
    setTimeout(() => {
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 200);
  }

  public cleanup(): void {
    console.log('🧹 Cleaning up UrlsPage components...');

    try {
      // Cleanup event listeners
      this.eventListeners.forEach(cleanup => cleanup());
      this.eventListeners = [];

      // Cleanup component instances
      if (this.filterSearch) {
        this.filterSearch.unmount();
        this.filterSearch = null;
      }

      if (this.urlsTable) {
        this.urlsTable.unmount();
        this.urlsTable = null;
      }

      if (this.createButton) {
        this.createButton.unmount();
        this.createButton = null;
      }

      // Cleanup stats cards
      this.statsCards.forEach(card => card.unmount());
      this.statsCards = [];

      // Cleanup modals
      if (this.createModal) {
        this.createModal.unmount();
        this.createModal = null;
      }

      if (this.editModal) {
        this.editModal.unmount();
        this.editModal = null;
      }

      if (this.qrModal) {
        this.qrModal.unmount();
        this.qrModal = null;
      }

      if (this.deleteModal) {
        this.deleteModal.unmount();
        this.deleteModal = null;
      }

      // Cleanup form components
      if (this.urlManagementForm) {
        this.urlManagementForm.unmount();
        this.urlManagementForm = null;
      }

      if (this.qrGenerator) {
        this.qrGenerator.unmount();
        this.qrGenerator = null;
      }

      // Reset state
      this.state = {
        urls: [],
        filteredUrls: [],
        loading: false,
        error: null,
        searchQuery: '',
        filterBy: '',
        sortBy: 'createdAt',
        currentPage: 1,
        pageSize: 10,
        selectedUrls: [],
        showCreateModal: false,
        showEditModal: false,
        showQRModal: false,
        showDeleteModal: false,
        editingUrl: null,
        qrUrl: null,
        deletingUrls: []
      };

      console.log('✅ UrlsPage cleanup completed');

    } catch (error) {
      console.error('❌ Error during UrlsPage cleanup:', error);
    }
  }
}