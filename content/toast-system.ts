/**
 * LanguageBridge - Centralized Toast Notification System
 * Manages all user-facing toast messages across the extension
 */

interface ToastOptions {
  duration?: number; // Auto-dismiss after N milliseconds (0 for no auto-dismiss)
  type?: 'success' | 'error' | 'info' | 'warning';
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * Centralized Toast Notification Manager
 */
class ToastManager {
  private toastContainer: HTMLElement | null = null;
  private activeToasts: Map<string, HTMLElement> = new Map();
  private toastCounter: number = 0;

  constructor() {
    this.createContainer();
  }

  /**
   * Create the toast container if it doesn't exist
   */
  private createContainer(): void {
    if (this.toastContainer) return;

    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'lb-toast-container';
    this.toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
    `;

    // Add styles for RTL support
    const style = document.createElement('style');
    style.textContent = `
      #lb-toast-container {
        direction: ltr;
      }

      .lb-toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        animation: lb-toast-slide-in 0.3s ease-out;
        max-width: 400px;
        word-break: break-word;
      }

      .lb-toast.success {
        border-left: 4px solid #10b981;
      }

      .lb-toast.error {
        border-left: 4px solid #ef4444;
      }

      .lb-toast.info {
        border-left: 4px solid #3b82f6;
      }

      .lb-toast.warning {
        border-left: 4px solid #f59e0b;
      }

      .lb-toast-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .lb-toast-content {
        flex: 1;
        font-size: 14px;
        color: #1f2937;
        line-height: 1.4;
      }

      .lb-toast-action {
        margin-left: 8px;
        padding: 4px 8px;
        background: #f3f4f6;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        white-space: nowrap;
        flex-shrink: 0;
        transition: background 0.2s;
      }

      .lb-toast-action:hover {
        background: #e5e7eb;
      }

      .lb-toast-close {
        margin-left: 8px;
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: color 0.2s;
      }

      .lb-toast-close:hover {
        color: #1f2937;
      }

      @keyframes lb-toast-slide-in {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes lb-toast-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }

      .lb-toast.removing {
        animation: lb-toast-slide-out 0.3s ease-out forwards;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.toastContainer);
  }

  /**
   * Show a toast notification
   */
  show(message: string, options: ToastOptions = {}): string {
    if (!this.toastContainer) {
      this.createContainer();
    }

    const { duration = 3000, type = 'info', action = undefined } = options;

    const toastId = `toast-${++this.toastCounter}`;
    const toast = document.createElement('div');
    toast.className = `lb-toast ${type}`;
    toast.id = toastId;

    // Icons for different toast types
    const icons: Record<string, string> = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠',
    };

    const icon = icons[type] || '•';

    // Build toast content
    let html = `
      <div class="lb-toast-icon">${icon}</div>
      <div class="lb-toast-content">${this.escapeHtml(message)}</div>
    `;

    if (action) {
      html += `<button class="lb-toast-action">${this.escapeHtml(action.label)}</button>`;
    }

    html += '<button class="lb-toast-close">×</button>';

    toast.innerHTML = html;

    // Add to container
    this.toastContainer!.appendChild(toast);
    this.activeToasts.set(toastId, toast);

    // Set up event listeners
    const closeBtn = toast.querySelector('.lb-toast-close') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => this.dismiss(toastId));

    if (action) {
      const actionBtn = toast.querySelector('.lb-toast-action') as HTMLButtonElement;
      actionBtn?.addEventListener('click', () => {
        action.callback();
        this.dismiss(toastId);
      });
    }

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => this.dismiss(toastId), duration);
    }

    return toastId;
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(toastId: string): void {
    const toast = this.activeToasts.get(toastId);
    if (!toast) return;

    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
      this.activeToasts.delete(toastId);
    }, 300);
  }

  /**
   * Show success toast
   */
  success(message: string, duration?: number): string {
    return this.show(message, { type: 'success', duration });
  }

  /**
   * Show error toast
   */
  error(message: string, duration?: number): string {
    return this.show(message, { type: 'error', duration });
  }

  /**
   * Show info toast
   */
  info(message: string, duration?: number): string {
    return this.show(message, { type: 'info', duration });
  }

  /**
   * Show warning toast
   */
  warning(message: string, duration?: number): string {
    return this.show(message, { type: 'warning', duration });
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.activeToasts.forEach((_, toastId) => {
      this.dismiss(toastId);
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

// Create global instance
const toastManager = new ToastManager();

// Export for use in extension
if (typeof window !== 'undefined') {
  (window as any).toastManager = toastManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ToastManager, toastManager };
}
