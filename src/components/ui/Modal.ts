// src/components/ui/Modal.ts - FIXED VERSION WITH NO UNUSED VARIABLES

import { Component, type ComponentProps } from '../base/Component';

export interface ModalProps extends ComponentProps {
  isOpen?: boolean;
  title?: string;
  children?: string;
  onClose?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
}

export class Modal extends Component<ModalProps> {
  protected setupEventListeners(): void {
    if (!this.props.isOpen) {
      return; // Don't setup listeners if modal is closed
    }

    const closeBtn = this.querySelector('[data-modal-close]');
    const backdrop = this.querySelector('[data-modal-backdrop]');

    console.log('🔧 Modal setupEventListeners:', {
      closeBtn: !!closeBtn,
      backdrop: !!backdrop,
      onClose: !!this.props.onClose
    });

    if (closeBtn && this.props.onClose) {
      this.addEventListener(closeBtn, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ Modal close button clicked');
        this.props.onClose!();
      });
    }

    if (backdrop && this.props.closeOnBackdrop !== false && this.props.onClose) {
      this.addEventListener(backdrop, 'click', (e) => {
        if (e.target === backdrop) {
          e.preventDefault();
          e.stopPropagation();
          console.log('🌫️ Modal backdrop clicked');
          this.props.onClose!();
        }
      });
    }

    // Handle ESC key
    if (this.props.onClose) {
      this.addEventListener(document, 'keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          console.log('⌨️ ESC key pressed');
          this.props.onClose!();
        }
      });
    }
  }

  public render(): string {
    const {
      isOpen = false,
      title = '',
      children = ''
    } = this.props;

    console.log('🎭 Modal render called, isOpen:', isOpen);

    if (!isOpen) {
      return '<div style="display: none;"></div>';
    }

    return `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;">
        <!-- Background overlay -->
        <div 
          data-modal-backdrop
          style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5);"
        ></div>
        
        <!-- Modal content -->
        <div style="
          position: relative; 
          background: white; 
          border-radius: 8px; 
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          z-index: 10000;
        ">
          ${title ? `
            <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">
                  ${title}
                </h3>
                <button 
                  data-modal-close
                  style="
                    background: none; 
                    border: none; 
                    color: #9ca3af; 
                    cursor: pointer; 
                    padding: 4px;
                    border-radius: 4px;
                  "
                  onmouseover="this.style.color='#6b7280'"
                  onmouseout="this.style.color='#9ca3af'"
                >
                  <svg style="width: 24px; height: 24px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div style="padding: 24px;">
              ${children}
            </div>
          ` : `
            <div style="padding: 24px; position: relative;">
              <button 
                data-modal-close
                style="
                  position: absolute;
                  top: 16px;
                  right: 16px;
                  background: none; 
                  border: none; 
                  color: #9ca3af; 
                  cursor: pointer; 
                  padding: 4px;
                  border-radius: 4px;
                "
                onmouseover="this.style.color='#6b7280'"
                onmouseout="this.style.color='#9ca3af'"
              >
                <svg style="width: 24px; height: 24px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              ${children}
            </div>
          `}
        </div>
      </div>
    `;
  }
}