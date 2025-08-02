
// ========================================
// src/components/forms/UrlShortenForm.ts - FIXED
// ========================================

import { FormComponent, type FormComponentProps } from '../base';
import { Input, Button } from '../ui';

export interface UrlShortenFormProps extends FormComponentProps {
  onShorten?: (url: string) => Promise<{ shortCode: string; fullShortUrl: string }>;
  isLoading?: boolean;
  result?: { shortCode: string; fullShortUrl: string } | null;
}

export class UrlShortenForm extends FormComponent<UrlShortenFormProps> {
  private urlInput: Input | null = null;
  private submitButton: Button | null = null;

  protected setupEventListeners(): void {
    const form = this.querySelector('form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
    }

    // Copy button for result
    const copyBtn = this.querySelector('[data-copy-btn]');
    if (copyBtn && this.props.result) {
      this.addEventListener(copyBtn, 'click', () => {
        this.copyToClipboard(this.props.result!.fullShortUrl);
      });
    }
  }

  protected onMounted(): void {
    this.createChildComponents();
    this.mountChildComponents();
  }

  protected onUpdated(): void {
    // Re-create and mount child components after update
    this.unmountChildComponents();
    this.createChildComponents();
    this.mountChildComponents();
  }

  private createChildComponents(): void {
    this.urlInput = new Input({
      props: {
        type: 'url',
        id: 'url',
        name: 'url',
        placeholder: 'Enter your long URL here...',
        required: true,
        error: this.state.errors.url
      }
    });

    this.submitButton = new Button({
      props: {
        type: 'submit',
        variant: 'primary',
        loading: this.props.isLoading || this.state.isSubmitting,
        disabled: this.props.isLoading || this.state.isSubmitting,
        children: this.state.isSubmitting ? 'Shortening...' : 'Shorten URL'
      }
    });
  }

  private mountChildComponents(): void {
    const urlContainer = this.querySelector('#url-container');
    const buttonContainer = this.querySelector('#button-container');

    if (urlContainer && this.urlInput) {
      this.urlInput.mount(urlContainer);
      this.addChildComponent(this.urlInput);
    }

    if (buttonContainer && this.submitButton) {
      this.submitButton.mount(buttonContainer);
      this.addChildComponent(this.submitButton);
    }
  }

  private unmountChildComponents(): void {
    this.childComponents.forEach(child => child.unmount());
    this.childComponents = [];
    this.urlInput = null;
    this.submitButton = null;
  }

  protected async handleSubmit(event: Event): Promise<void> {
    await super.handleSubmit(event);

    if (Object.keys(this.state.errors).length === 0 && this.props.onShorten) {
      const data = this.getFormData();
      try {
        // FIXED: Don't assign to unused variable
        await this.props.onShorten(data.url as string);
        // Result will be handled by parent component through props update
      } catch (error) {
        this.setState({
          errors: { general: 'Failed to shorten URL. Please try again.' },
          isSubmitting: false
        });
      }
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopySuccess();
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showCopySuccess();
    }
  }

  private showCopySuccess(): void {
    const copyBtn = this.querySelector('[data-copy-btn]');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }
  }

  public render(): string {
    const { errors } = this.state;
    const { result } = this.props;

    return `
      <div data-component="url-shorten-form" class="max-w-2xl mx-auto">
        <form class="space-y-4">
          ${errors.general ? `
            <div class="bg-red-50 border border-red-200 rounded-md p-4">
              <p class="text-red-800 text-sm">${errors.general}</p>
            </div>
          ` : ''}

          <div class="flex flex-col sm:flex-row gap-4">
            <div id="url-container" class="flex-1"></div>
            <div id="button-container"></div>
          </div>
        </form>

        ${result ? `
          <div class="mt-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p class="text-sm text-gray-600 mb-2">Your shortened URL:</p>
            <div class="flex items-center gap-3">
              <input
                type="text"
                value="${result.fullShortUrl}"
                readonly
                class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-blue-600 font-mono text-sm"
              />
              <button
                data-copy-btn
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        ` : ''}

        <p class="text-sm text-gray-500 mt-4 text-center">
          <span class="inline-flex items-center">
            ℹ️ Guest mode: URLs expire in 24 hours. 
            <button class="text-blue-600 hover:text-blue-700 ml-1 underline">
              Sign up
            </button> 
            for permanent links and analytics.
          </span>
        </p>
      </div>
    `;
  }
}