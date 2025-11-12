/**
 * LanguageBridge - Translation Feedback UI Component
 * Provides thumbs up/down feedback buttons for translations
 */

interface FeedbackUIOptions {
  originalText: string;
  translatedText: string;
  language: string;
  onFeedbackSubmitted?: () => void;
}

/**
 * Feedback UI Component - Displays thumbs up/down buttons
 */
class TranslationFeedbackUI {
  private container: HTMLElement | null = null;
  private originalText: string = '';
  private translatedText: string = '';
  private language: string = '';
  private onFeedbackSubmitted: (() => void) | null = null;

  /**
   * Create and display feedback buttons
   */
  create(options: FeedbackUIOptions): HTMLElement {
    this.originalText = options.originalText;
    this.translatedText = options.translatedText;
    this.language = options.language;
    this.onFeedbackSubmitted = options.onFeedbackSubmitted || null;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'lb-feedback-container';
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      margin-top: 8px;
      justify-content: center;
    `;

    // Add styles if not already present
    this.ensureStyles();

    // Create thumbs up button
    const thumbsUpBtn = document.createElement('button');
    thumbsUpBtn.className = 'lb-feedback-btn lb-feedback-up';
    thumbsUpBtn.title = 'Good translation';
    thumbsUpBtn.innerHTML = '👍';
    thumbsUpBtn.addEventListener('click', () => this.submitFeedback('positive'));

    // Create thumbs down button
    const thumbsDownBtn = document.createElement('button');
    thumbsDownBtn.className = 'lb-feedback-btn lb-feedback-down';
    thumbsDownBtn.title = 'Poor translation';
    thumbsDownBtn.innerHTML = '👎';
    thumbsDownBtn.addEventListener('click', () => this.submitFeedback('negative'));

    // Create label
    const label = document.createElement('span');
    label.className = 'lb-feedback-label';
    label.textContent = 'Was this helpful?';
    label.style.cssText = `
      font-size: 12px;
      color: #6b7280;
      margin-right: 8px;
    `;

    this.container.appendChild(label);
    this.container.appendChild(thumbsUpBtn);
    this.container.appendChild(thumbsDownBtn);

    return this.container;
  }

  /**
   * Submit feedback
   */
  private async submitFeedback(feedback: 'positive' | 'negative'): Promise<void> {
    try {
      // Use global feedback manager if available
      const feedbackMgr = (window as any).feedbackManager;
      const toastMgr = (window as any).toastManager;

      if (feedbackMgr) {
        await feedbackMgr.submitFeedback(
          this.originalText,
          this.translatedText,
          this.language,
          feedback
        );

        if (toastMgr) {
          toastMgr.success('Thank you for your feedback!', 2000);
        }

        // Disable buttons after submission
        this.disableButtons();

        // Call callback if provided
        if (this.onFeedbackSubmitted) {
          this.onFeedbackSubmitted();
        }
      } else {
        console.warn('Feedback manager not available');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const toastMgr = (window as any).toastManager;
      if (toastMgr) {
        toastMgr.error('Could not save feedback', 3000);
      }
    }
  }

  /**
   * Disable feedback buttons
   */
  private disableButtons(): void {
    if (!this.container) return;

    const buttons = this.container.querySelectorAll('.lb-feedback-btn');
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLElement).style.opacity = '0.5';
      (btn as HTMLElement).style.cursor = 'default';
    });

    const label = this.container.querySelector('.lb-feedback-label');
    if (label) {
      label.textContent = 'Thank you!';
    }
  }

  /**
   * Ensure feedback styles are added to the page
   */
  private ensureStyles(): void {
    if (document.getElementById('lb-feedback-styles')) return;

    const style = document.createElement('style');
    style.id = 'lb-feedback-styles';
    style.textContent = `
      .lb-feedback-btn {
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        height: 32px;
      }

      .lb-feedback-btn:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #d1d5db;
      }

      .lb-feedback-btn:active:not(:disabled) {
        background: #e5e7eb;
        transform: scale(0.95);
      }

      .lb-feedback-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .lb-feedback-up:hover:not(:disabled) {
        color: #10b981;
      }

      .lb-feedback-down:hover:not(:disabled) {
        color: #ef4444;
      }

      .lb-feedback-label {
        font-size: 12px;
        color: #6b7280;
        white-space: nowrap;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Destroy the feedback UI
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

// Create global instance
const feedbackUI = new TranslationFeedbackUI();

// Export for use in extension
if (typeof window !== 'undefined') {
  (window as any).TranslationFeedbackUI = TranslationFeedbackUI;
  (window as any).feedbackUI = feedbackUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TranslationFeedbackUI, feedbackUI };
}
