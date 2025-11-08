/**
 * LanguageBridge - Text Highlighter
 * Visual highlighting for focused elements and selected text
 */

interface HighlightOptions {
  pulse?: boolean;
  scroll?: boolean;
  duration?: number;
}

interface IndicatorWithCleanup extends HTMLDivElement {
  _cleanup?: () => void;
}

class Highlighter {
  private currentHighlight: HTMLElement | null;
  private highlightColor: string;

  constructor() {
    this.currentHighlight = null;
    this.highlightColor = '#fbbf24'; // Amber
    this.init();
  }

  /**
   * Initialize highlighter styles
   */
  private init(): void {
    // Add highlight styles if not already present
    if (!document.getElementById('lb-highlight-styles')) {
      const style = document.createElement('style');
      style.id = 'lb-highlight-styles';
      style.textContent = `
        .lb-text-highlight {
          background-color: rgba(251, 191, 36, 0.3) !important;
          border-radius: 2px !important;
          padding: 2px 0 !important;
          transition: background-color 0.3s ease !important;
        }

        .lb-element-highlight {
          outline: 3px solid #fbbf24 !important;
          outline-offset: 2px !important;
          border-radius: 4px !important;
          position: relative !important;
        }

        .lb-element-highlight::before {
          content: '';
          position: absolute;
          inset: -6px;
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-radius: 6px;
          pointer-events: none;
          animation: highlight-shimmer 2s infinite;
        }

        @keyframes highlight-shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .lb-focus-indicator {
          position: fixed;
          pointer-events: none;
          border: 3px solid #fbbf24;
          border-radius: 8px;
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2);
          z-index: 9997;
          transition: all 0.2s ease;
        }

        @keyframes pulse-border {
          0%, 100% {
            border-color: #fbbf24;
            box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2);
          }
          50% {
            border-color: #f59e0b;
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.1);
          }
        }

        .lb-focus-indicator.pulse {
          animation: pulse-border 1.5s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Highlight an element with visual feedback
   * @param {HTMLElement} element - Element to highlight
   * @param {HighlightOptions} options - Highlighting options
   */
  public highlightElement(element: HTMLElement, options: HighlightOptions = {}): void {
    if (!element) return;

    // Remove previous highlight
    this.removeHighlight();

    const {
      pulse = false,
      scroll = true,
      duration = 0 // 0 = permanent until removed
    } = options;

    // Add highlight class
    element.classList.add('lb-element-highlight');
    this.currentHighlight = element;

    // Create focus indicator
    const indicator = this.createFocusIndicator(element);
    if (pulse) {
      indicator.classList.add('pulse');
    }

    // Scroll into view if needed
    if (scroll) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeHighlight();
      }, duration);
    }
  }

  /**
   * Create a focus indicator that follows the element
   * @param {HTMLElement} element - Element to track
   * @returns {IndicatorWithCleanup} - Indicator element
   */
  private createFocusIndicator(element: HTMLElement): IndicatorWithCleanup {
    // Remove existing indicator
    const existing = document.getElementById('lb-focus-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div') as IndicatorWithCleanup;
    indicator.id = 'lb-focus-indicator';
    indicator.className = 'lb-focus-indicator';

    this.updateIndicatorPosition(indicator, element);
    document.body.appendChild(indicator);

    // Update position on scroll/resize
    const updatePosition = (): void => this.updateIndicatorPosition(indicator, element);
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    // Store cleanup function
    indicator._cleanup = (): void => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };

    return indicator;
  }

  /**
   * Update indicator position to match element
   * @param {IndicatorWithCleanup} indicator - Indicator element
   * @param {HTMLElement} element - Element to track
   */
  private updateIndicatorPosition(indicator: HTMLElement, element: HTMLElement): void {
    if (!element || !indicator) return;

    const rect = element.getBoundingClientRect();
    indicator.style.left = `${rect.left}px`;
    indicator.style.top = `${rect.top}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.height = `${rect.height}px`;
  }

  /**
   * Highlight selected text
   * @param {Selection} selection - Text selection
   */
  public highlightSelection(selection: Selection): void {
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'lb-text-highlight';

    try {
      range.surroundContents(span);
      this.currentHighlight = span;

      // Remove highlight after 3 seconds
      setTimeout(() => {
        if (span.parentNode) {
          const parent = span.parentNode;
          while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
          }
          parent.removeChild(span);
        }
      }, 3000);
    } catch (e) {
      console.warn('Could not highlight selection:', e);
    }
  }

  /**
   * Remove all highlights
   */
  public removeHighlight(): void {
    // Remove element highlight
    if (this.currentHighlight) {
      this.currentHighlight.classList.remove('lb-element-highlight');
      this.currentHighlight = null;
    }

    // Remove all element highlights
    document.querySelectorAll('.lb-element-highlight').forEach((el: Element) => {
      (el as HTMLElement).classList.remove('lb-element-highlight');
    });

    // Remove focus indicator
    const indicator = document.getElementById('lb-focus-indicator') as IndicatorWithCleanup | null;
    if (indicator) {
      if (indicator._cleanup) indicator._cleanup();
      indicator.remove();
    }

    // Remove text highlights
    document.querySelectorAll('.lb-text-highlight').forEach((span: Element) => {
      const spanEl = span as HTMLElement;
      const parent = spanEl.parentNode;
      if (parent) {
        while (spanEl.firstChild) {
          parent.insertBefore(spanEl.firstChild, spanEl);
        }
        parent.removeChild(spanEl);
      }
    });
  }

  /**
   * Highlight multiple elements in sequence
   * @param {HTMLElement[]} elements - Elements to highlight
   * @param {number} interval - Time between highlights (ms)
   */
  public async highlightSequence(elements: HTMLElement[], interval: number = 1000): Promise<void> {
    for (const element of elements) {
      this.highlightElement(element, { pulse: true, duration: interval });
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Flash highlight for brief attention
   * @param {HTMLElement} element - Element to flash
   * @param {number} times - Number of flashes
   */
  public async flashHighlight(element: HTMLElement, times: number = 3): Promise<void> {
    for (let i = 0; i < times; i++) {
      this.highlightElement(element, { pulse: false, scroll: false });
      await new Promise(resolve => setTimeout(resolve, 200));
      this.removeHighlight();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Get all interactive elements on page
   * @returns {HTMLElement[]} - Focusable elements
   */
  public getInteractiveElements(): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    return Array.from(document.querySelectorAll(selectors.join(',')))
      .filter((el: Element) => {
        const htmlEl = el as HTMLElement;
        // Filter out invisible elements
        const style = window.getComputedStyle(htmlEl);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               htmlEl.offsetParent !== null;
      }) as HTMLElement[];
  }

  /**
   * Navigate to next/previous interactive element
   * @param {string} direction - 'next' or 'prev'
   * @returns {HTMLElement | undefined} - Next element
   */
  public navigateInteractive(direction: string = 'next'): HTMLElement | undefined {
    const elements = this.getInteractiveElements();
    const currentIndex = elements.indexOf(this.currentHighlight as HTMLElement);

    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = currentIndex + 1 >= elements.length ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex - 1 < 0 ? elements.length - 1 : currentIndex - 1;
    }

    const nextElement = elements[nextIndex];
    if (nextElement) {
      this.highlightElement(nextElement, { pulse: true });
      return nextElement;
    }
  }
}

// Initialize highlighter globally
declare global {
  interface Window {
    Highlighter: Highlighter;
  }
}

if (typeof window.Highlighter === 'undefined') {
  window.Highlighter = new Highlighter();
}
