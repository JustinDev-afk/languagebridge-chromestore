/**
 * LanguageBridge Subscription Activation Modal
 * Shows when user doesn't have a subscription key
 */

/**
 * Response from demo key API endpoint
 */
interface DemoKeyResponse {
  key: string;
}

/**
 * Chrome storage sync object for activation data
 */
interface ActivationStorage {
  demoPassword?: string;
  subscriptionKey?: string;
}

/**
 * ActivationModal class manages subscription activation UI
 */
class ActivationModal {
  private modal: HTMLDivElement | null = null;
  private isShowing: boolean = false;
  private readonly API_ENDPOINT: string = 'https://languagebridge-api.azurewebsites.net/api';

  constructor() {
    this.modal = null;
    this.isShowing = false;
  }

  /**
   * Check if user needs activation and show modal if needed
   * @returns {Promise<boolean>} True if modal was shown, false otherwise
   */
  async checkAndShow(): Promise<boolean> {
    // Check for NEW access code system
    const data = await chrome.storage.sync.get(['demoPassword']);
    const storageData = data as ActivationStorage;

    if (!storageData.demoPassword) {
      console.log('📢 No access code found - show instructions');
      this.show();
      return true;
    }

    // With access code system, no validation needed
    // Teacher entered code in Settings, so they have access
    return false;
  }

  /**
   * Show the activation modal
   */
  show(): void {
    if (this.isShowing) return;

    this.isShowing = true;
    this.createModal();
    if (this.modal) {
      document.body.appendChild(this.modal);

      // Animate in
      requestAnimationFrame(() => {
        if (this.modal) {
          this.modal.style.opacity = '1';
          const content = this.modal.querySelector('.lb-activation-content') as HTMLElement;
          if (content) {
            content.style.transform = 'translateY(0) scale(1)';
          }
        }
      });
    }
  }

  /**
   * Hide the activation modal
   */
  hide(): void {
    if (!this.isShowing || !this.modal) return;

    this.modal.style.opacity = '0';
    const content = this.modal.querySelector('.lb-activation-content') as HTMLElement;
    if (content) {
      content.style.transform = 'translateY(-20px) scale(0.95)';
    }

    setTimeout(() => {
      if (this.modal && this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
      this.isShowing = false;
    }, 300);
  }

  /**
   * Create the modal DOM element
   */
  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'lb-activation-modal';
    this.modal.innerHTML = `
      <div class="lb-activation-overlay"></div>
      <div class="lb-activation-content">
        <div class="lb-activation-header">
          <div class="lb-activation-logo">🌉</div>
          <h2>Welcome to LanguageBridge!</h2>
          <p>Get started with instant translation and text-to-speech</p>
        </div>

        <div class="lb-activation-options">
          <!-- Option 1: Free Demo -->
          <div class="lb-activation-option lb-option-featured">
            <div class="lb-option-badge">🎁 Recommended</div>
            <div class="lb-option-icon">✨</div>
            <h3>Start Free Trial</h3>
            <p>Get 100 free translations for 7 days</p>
            <ul class="lb-option-features">
              <li>✓ 100 translations</li>
              <li>✓ 7 day access</li>
              <li>✓ All 8 languages</li>
              <li>✓ No credit card needed</li>
            </ul>
            <button class="lb-btn lb-btn-primary" id="lb-get-demo-btn">
              Get Free Trial
            </button>
          </div>

          <!-- Option 2: School Email -->
          <div class="lb-activation-option">
            <div class="lb-option-icon">🏫</div>
            <h3>School Account</h3>
            <p>Have a school email? Check for free access</p>
            <input type="email"
                   class="lb-email-input"
                   id="lb-school-email"
                   placeholder="student@school.edu">
            <button class="lb-btn lb-btn-secondary" id="lb-check-school-btn">
              Check Eligibility
            </button>
            <div class="lb-email-hint">
              Ask your teacher if your school has LanguageBridge
            </div>
          </div>

          <!-- Option 3: Premium -->
          <div class="lb-activation-option">
            <div class="lb-option-icon">⭐</div>
            <h3>Go Premium</h3>
            <p>Unlimited translations, priority support</p>
            <div class="lb-pricing">
              <span class="lb-price">$9.99</span>
              <span class="lb-period">/month</span>
            </div>
            <ul class="lb-option-features">
              <li>✓ Unlimited translations</li>
              <li>✓ Priority support</li>
              <li>✓ All features</li>
            </ul>
            <button class="lb-btn lb-btn-premium" id="lb-buy-premium-btn">
              View Plans
            </button>
          </div>
        </div>

        <div class="lb-activation-footer">
          <button class="lb-btn-close" id="lb-activation-close">
            Maybe Later
          </button>
        </div>

        <div class="lb-activation-loading" id="lb-activation-loading" style="display: none;">
          <div class="lb-spinner"></div>
          <p>Activating your subscription...</p>
        </div>
      </div>
    `;

    this.attachStyles();
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to modal buttons
   */
  private attachEventListeners(): void {
    if (!this.modal) return;

    // Get demo key button
    const demoBtn = this.modal.querySelector('#lb-get-demo-btn') as HTMLButtonElement;
    if (demoBtn) {
      demoBtn.addEventListener('click', () => this.getDemoKey());
    }

    // Check school email button
    const schoolBtn = this.modal.querySelector('#lb-check-school-btn') as HTMLButtonElement;
    if (schoolBtn) {
      schoolBtn.addEventListener('click', () => this.checkSchoolEmail());
    }

    // Buy premium button
    const premiumBtn = this.modal.querySelector('#lb-buy-premium-btn') as HTMLButtonElement;
    if (premiumBtn) {
      premiumBtn.addEventListener('click', () => {
        window.open('https://languagebridge.app/pricing', '_blank');
      });
    }

    // Close button
    const closeBtn = this.modal.querySelector('#lb-activation-close') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Click outside to close
    const overlay = this.modal.querySelector('.lb-activation-overlay') as HTMLElement;
    if (overlay) {
      overlay.addEventListener('click', () => this.hide());
    }
  }

  /**
   * Get a free demo key
   */
  private async getDemoKey(): Promise<void> {
    if (!this.modal) return;

    const loading = this.modal.querySelector('#lb-activation-loading') as HTMLElement;
    const demoBtn = this.modal.querySelector('#lb-get-demo-btn') as HTMLButtonElement;

    try {
      demoBtn.disabled = true;
      demoBtn.textContent = 'Generating...';
      loading.style.display = 'flex';

      const response = await fetch(`${this.API_ENDPOINT}/demo-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate demo key');
      }

      const data = (await response.json()) as DemoKeyResponse;

      // Save the demo key
      await chrome.storage.sync.set({ subscriptionKey: data.key });

      // Show success message
      this.showSuccess(`
        <h3>🎉 Free Trial Activated!</h3>
        <p>You have <strong>100 translations</strong> for the next <strong>7 days</strong></p>
        <p>Start translating any text on any webpage!</p>
      `);

      // Close modal after 3 seconds
      setTimeout(() => {
        this.hide();
        // Reload the page to activate the extension
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Error getting demo key:', error);
      this.showError('Failed to activate trial. Please try again or contact support.');
      demoBtn.disabled = false;
      demoBtn.textContent = 'Get Free Trial';
      loading.style.display = 'none';
    }
  }

  /**
   * Check if school email is eligible
   */
  private async checkSchoolEmail(): Promise<void> {
    if (!this.modal) return;

    const emailInput = this.modal.querySelector('#lb-school-email') as HTMLInputElement;
    const schoolBtn = this.modal.querySelector('#lb-check-school-btn') as HTMLButtonElement;
    const email = emailInput.value.trim();

    if (!email) {
      this.showError('Please enter your school email address');
      return;
    }

    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      this.showError('Please enter a valid email address');
      return;
    }

    try {
      schoolBtn.disabled = true;
      schoolBtn.textContent = 'Checking...';

      // TODO: Implement school email validation endpoint
      // For now, show message to contact admin
      const domain = email.split('@')[1];
      this.showInfo(`
        <h3>School Email Verification</h3>
        <p>To check if your school (${domain}) has LanguageBridge:</p>
        <ol style="text-align: left; margin: 1rem 0;">
          <li>Ask your teacher or school admin</li>
          <li>If your school has LanguageBridge, they'll provide an invitation link</li>
          <li>Or start with a free trial while you check!</li>
        </ol>
      `);

      schoolBtn.disabled = false;
      schoolBtn.textContent = 'Check Eligibility';
    } catch (error) {
      console.error('Error checking school email:', error);
      this.showError('Error checking eligibility. Please try again.');
      schoolBtn.disabled = false;
      schoolBtn.textContent = 'Check Eligibility';
    }
  }

  /**
   * Show success message
   * @param {string} html - HTML content to display
   */
  private showSuccess(html: string): void {
    if (!this.modal) return;

    const content = this.modal.querySelector('.lb-activation-content') as HTMLElement;
    content.innerHTML = `
      <div class="lb-activation-message lb-message-success">
        ${html}
      </div>
    `;
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  private showError(message: string): void {
    if (!this.modal) return;

    const existing = this.modal.querySelector('.lb-activation-error');
    if (existing) existing.remove();

    const error = document.createElement('div');
    error.className = 'lb-activation-error';
    error.textContent = message;

    const content = this.modal.querySelector('.lb-activation-content') as HTMLElement;
    content.insertBefore(error, content.firstChild);

    setTimeout(() => error.remove(), 5000);
  }

  /**
   * Show info message
   * @param {string} html - HTML content to display
   */
  private showInfo(html: string): void {
    if (!this.modal) return;

    const content = this.modal.querySelector('.lb-activation-content') as HTMLElement;
    const existing = content.querySelector('.lb-activation-options') as HTMLElement;
    if (existing) {
      existing.innerHTML = `
        <div class="lb-activation-message lb-message-info">
          ${html}
          <button class="lb-btn lb-btn-secondary" onclick="location.reload()">
            Back
          </button>
        </div>
      `;
    }
  }

  /**
   * Attach CSS styles
   */
  private attachStyles(): void {
    if (document.querySelector('#lb-activation-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'lb-activation-modal-styles';
    style.textContent = `
      .lb-activation-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
        opacity: 0;
        transition: opacity 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .lb-activation-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
      }

      .lb-activation-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) translateY(-20px) scale(0.95);
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 900px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 40px;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .lb-activation-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .lb-activation-logo {
        font-size: 64px;
        margin-bottom: 16px;
      }

      .lb-activation-header h2 {
        margin: 0 0 8px 0;
        font-size: 32px;
        color: #1a1a1a;
        background: linear-gradient(135deg, #7c3aed 0%, #f97316 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .lb-activation-header p {
        margin: 0;
        font-size: 16px;
        color: #666;
      }

      .lb-activation-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 24px;
      }

      .lb-activation-option {
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        transition: all 0.2s ease;
        position: relative;
      }

      .lb-activation-option:hover {
        border-color: #a855f7;
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(168, 85, 247, 0.2);
      }

      .lb-option-featured {
        border-color: #a855f7;
        border-width: 3px;
        background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%);
      }

      .lb-option-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
        color: white;
        padding: 4px 16px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      .lb-option-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .lb-activation-option h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        color: #1a1a1a;
      }

      .lb-activation-option p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: #666;
      }

      .lb-option-features {
        list-style: none;
        padding: 0;
        margin: 16px 0;
        text-align: left;
      }

      .lb-option-features li {
        padding: 6px 0;
        font-size: 14px;
        color: #444;
      }

      .lb-pricing {
        margin: 16px 0;
      }

      .lb-price {
        font-size: 32px;
        font-weight: 700;
        color: #7c3aed;
      }

      .lb-period {
        font-size: 16px;
        color: #666;
      }

      .lb-email-input {
        width: 100%;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 12px;
        font-family: inherit;
      }

      .lb-email-input:focus {
        outline: none;
        border-color: #a855f7;
      }

      .lb-email-hint {
        font-size: 12px;
        color: #999;
        margin-top: 8px;
      }

      .lb-btn {
        width: 100%;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .lb-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .lb-btn-primary {
        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
        color: white;
      }

      .lb-btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);
      }

      .lb-btn-secondary {
        background: #f0f0f0;
        color: #333;
      }

      .lb-btn-secondary:hover:not(:disabled) {
        background: #e0e0e0;
      }

      .lb-btn-premium {
        background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
        color: white;
      }

      .lb-btn-premium:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(249, 115, 22, 0.4);
      }

      .lb-activation-footer {
        text-align: center;
        margin-top: 24px;
      }

      .lb-btn-close {
        background: none;
        border: none;
        color: #999;
        font-size: 14px;
        cursor: pointer;
        padding: 8px 16px;
      }

      .lb-btn-close:hover {
        color: #666;
        text-decoration: underline;
      }

      .lb-activation-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }

      .lb-spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #e0e0e0;
        border-top-color: #a855f7;
        border-radius: 50%;
        animation: lb-spin 1s linear infinite;
      }

      @keyframes lb-spin {
        to { transform: rotate(360deg); }
      }

      .lb-activation-error {
        background: #fee2e2;
        color: #991b1b;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
      }

      .lb-activation-message {
        padding: 40px;
        text-align: center;
      }

      .lb-message-success {
        color: #065f46;
      }

      .lb-message-success h3 {
        margin: 0 0 16px 0;
        font-size: 24px;
      }

      .lb-message-info {
        text-align: left;
      }

      .lb-message-info h3 {
        margin: 0 0 16px 0;
        font-size: 20px;
        color: #1a1a1a;
      }

      .lb-message-info ol {
        line-height: 1.8;
      }

      @media (max-width: 768px) {
        .lb-activation-content {
          max-width: 95%;
          padding: 24px;
        }

        .lb-activation-options {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

// Initialize activation modal checker
declare global {
  interface Window {
    LanguageBridgeActivation: ActivationModal;
  }
}

window.LanguageBridgeActivation = new ActivationModal();

// === MVP MODE: Activation modal disabled ===
// Auto-provisioning demo keys instead (see background.js)
// Re-enable this after securing funding and implementing payment system

// Check on page load (after a small delay to not interfere with page load)
// setTimeout(() => {
//   window.LanguageBridgeActivation.checkAndShow();
// }, 2000);
