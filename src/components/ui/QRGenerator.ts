// src/components/ui/QRGenerator.ts

import { Component, type ComponentProps } from '../base/Component';

export interface QRGeneratorProps extends ComponentProps {
  url: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  onGenerate?: (qrCodeDataUrl: string) => void;
  onDownload?: (filename: string) => void;
  onShare?: (url: string) => void;
  showControls?: boolean;
}

export class QRGenerator extends Component<QRGeneratorProps> {
  private canvas: HTMLCanvasElement | null = null;
  private currentQRData: string | null = null;

  protected setupEventListeners(): void {
    // Download button
    const downloadBtn = this.querySelector('[data-action="download"]');
    if (downloadBtn) {
      this.addEventListener(downloadBtn, 'click', () => {
        this.downloadQRCode();
      });
    }

    // Share button
    const shareBtn = this.querySelector('[data-action="share"]');
    if (shareBtn) {
      this.addEventListener(shareBtn, 'click', () => {
        this.shareQRCode();
      });
    }

    // Copy button
    const copyBtn = this.querySelector('[data-action="copy"]');
    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        this.copyQRCode();
      });
    }

    // Regenerate button
    const regenerateBtn = this.querySelector('[data-action="regenerate"]');
    if (regenerateBtn) {
      this.addEventListener(regenerateBtn, 'click', () => {
        this.generateQRCode();
      });
    }

    // Size slider
    const sizeSlider = this.querySelector<HTMLInputElement>('[data-size-slider]');
    if (sizeSlider) {
      this.addEventListener(sizeSlider, 'input', () => {
        this.generateQRCode();
      });
    }

    // Color picker
    const colorPicker = this.querySelector<HTMLInputElement>('[data-color-picker]');
    if (colorPicker) {
      this.addEventListener(colorPicker, 'change', () => {
        this.generateQRCode();
      });
    }
  }

  protected onMounted(): void {
    this.canvas = this.querySelector<HTMLCanvasElement>('[data-qr-canvas]');
    this.generateQRCode();
  }

  private async generateQRCode(): Promise<void> {
    if (!this.canvas) return;

    const {
      url,
      size = 300,
      color = '#000000',
      backgroundColor = '#ffffff',
      errorCorrectionLevel = 'M',
      margin = 4
    } = this.props;

    try {
      // Use QR Server API as fallback (in production, you'd use a proper QR library)
      const qrUrl = this.buildQRServerUrl(url, {
        size: size,
        color: color.replace('#', ''),
        bgcolor: backgroundColor.replace('#', ''),
        ecc: errorCorrectionLevel,
        margin: margin
      });

      // Load QR code image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const ctx = this.canvas!.getContext('2d');
        if (ctx) {
          this.canvas!.width = size;
          this.canvas!.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          
          // Get data URL for sharing/downloading
          this.currentQRData = this.canvas!.toDataURL('image/png');
          
          if (this.props.onGenerate) {
            this.props.onGenerate(this.currentQRData);
          }
        }
      };

      img.onerror = () => {
        this.showError('Failed to generate QR code');
      };

      img.src = qrUrl;

    } catch (error) {
      console.error('QR generation error:', error);
      this.showError('Failed to generate QR code');
    }
  }

  private buildQRServerUrl(data: string, options: {
    size: number;
    color: string;
    bgcolor: string;
    ecc: string;
    margin: number;
  }): string {
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const params = new URLSearchParams({
      size: `${options.size}x${options.size}`,
      data: data,
      color: options.color,
      bgcolor: options.bgcolor,
      ecc: options.ecc,
      margin: options.margin.toString()
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  private downloadQRCode(): void {
    if (!this.currentQRData) return;

    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = this.currentQRData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (this.props.onDownload) {
      this.props.onDownload(link.download);
    }
  }

  private async shareQRCode(): Promise<void> {
    if (!this.currentQRData) return;

    if (navigator.share && navigator.canShare) {
      try {
        // Convert data URL to blob
        const response = await fetch(this.currentQRData);
        const blob = await response.blob();
        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        await navigator.share({
          title: 'QR Code',
          text: `QR Code for: ${this.props.url}`,
          files: [file]
        });
      } catch (error) {
        console.log('Share failed:', error);
        this.fallbackShare();
      }
    } else {
      this.fallbackShare();
    }
  }

  private fallbackShare(): void {
    // Fallback: copy URL to clipboard
    navigator.clipboard.writeText(this.props.url).then(() => {
      this.showSuccess('URL copied to clipboard');
    }).catch(() => {
      this.showError('Failed to copy URL');
    });

    if (this.props.onShare) {
      this.props.onShare(this.props.url);
    }
  }

  private async copyQRCode(): Promise<void> {
    if (!this.currentQRData) return;

    try {
      // Convert data URL to blob
      const response = await fetch(this.currentQRData);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      this.showSuccess('QR code copied to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError('Failed to copy QR code');
    }
  }

  private showSuccess(message: string): void {
    // You could integrate with your notification system here
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded z-50';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }

  private showError(message: string): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded z-50';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }

  public render(): string {
    const {
      url,
      size = 300,
      color = '#000000',
      showControls = true
    } = this.props;

    return `
      <div data-component="qr-generator" class="text-center">
        <!-- QR Code Display -->
        <div class="inline-block p-4 bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
          <canvas
            data-qr-canvas
            width="${size}"
            height="${size}"
            class="max-w-full h-auto"
          ></canvas>
        </div>

        <!-- URL Display -->
        <div class="mb-4">
          <p class="text-sm text-gray-600 break-all bg-gray-50 p-2 rounded">
            ${url}
          </p>
        </div>

        <!-- Controls -->
        ${showControls ? `
          <div class="space-y-4">
            <!-- Size Control -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <input
                type="range"
                data-size-slider
                min="200"
                max="800"
                value="${size}"
                class="w-full"
              />
              <div class="text-xs text-gray-500 mt-1">${size}px</div>
            </div>

            <!-- Color Control -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <input
                type="color"
                data-color-picker
                value="${color}"
                class="w-full h-10 cursor-pointer"
              />
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                data-action="download"
                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download
              </button>
              
              <button
                data-action="copy"
                class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Copy
              </button>
              
              <button
                data-action="share"
                class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
                Share
              </button>
              
              <button
                data-action="regenerate"
                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>
        ` : `
          <!-- Simple Action Buttons -->
          <div class="flex justify-center space-x-2">
            <button
              data-action="download"
              class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Download
            </button>
            <button
              data-action="share"
              class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Share
            </button>
          </div>
        `}
      </div>
    `;
  }
}