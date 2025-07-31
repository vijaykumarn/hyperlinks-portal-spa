// src/pages/SettingsPage.ts

export class SettingsPage implements PageComponent {
  private domManager: DOMManager;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  public async render(context: RouteContext): Promise<void> {
    const html = `
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
            <p class="text-gray-600 mb-8">This page will show your account settings</p>
            <button 
              id="back-btn"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    `;

    this.domManager.setContent(html);

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const router = (window as any).__APP__?.getInstance()?.getRouter();
        if (router) router.push('/dashboard');
      });
    }
  }

  public cleanup(): void {}
}