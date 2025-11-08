/**
 * Google Docs Adapter
 * Handles text selection in Google Docs' special iframe-based editor
 */

/**
 * Callback function type for text selection events
 */
type SelectionCallback = (text: string) => void;

/**
 * Tree walker filter for text node selection
 */
interface TreeWalkerFilter {
  acceptNode(node: Node): number;
}

/**
 * Google Docs Adapter class
 * Monitors and manages text selection in Google Docs documents
 */
class GoogleDocsAdapter {
  private isGoogleDocs: boolean;
  private editorIframe: HTMLIFrameElement | null;
  private lastSelection: string;
  private selectionCallback: SelectionCallback | null;

  constructor() {
    this.isGoogleDocs = this.detectGoogleDocs();
    this.editorIframe = null;
    this.lastSelection = '';
    this.selectionCallback = null;

    if (this.isGoogleDocs) {
      console.log('📄 Google Docs detected - initializing adapter');
      this.init();
    }
  }

  /**
   * Detect if we're in Google Docs
   * @returns {boolean} True if current page is Google Docs
   */
  private detectGoogleDocs(): boolean {
    return (
      window.location.hostname === 'docs.google.com' &&
      window.location.pathname.includes('/document/')
    );
  }

  /**
   * Initialize Google Docs text selection monitoring
   */
  private async init(): Promise<void> {
    // Wait for the editor iframe to load
    await this.waitForEditorIframe();

    if (this.editorIframe) {
      console.log('✓ Google Docs editor iframe found');
      this.setupSelectionMonitoring();
      this.setupClipboardMonitoring();
    } else {
      console.warn('⚠️ Could not find Google Docs editor iframe');
      this.setupClipboardMonitoring(); // Still set up clipboard even if iframe not found
    }

    // Note: Welcome guide is now handled by welcome-guide.js
    // No need for separate Google Docs notification
  }

  /**
   * Show a welcome notification explaining the copy workflow
   */
  private showGoogleDocsWelcome(): void {
    // Only show once per session
    if (sessionStorage.getItem('lb-google-docs-welcome-shown')) {
      return;
    }

    sessionStorage.setItem('lb-google-docs-welcome-shown', 'true');

    // Create notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 9999;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">🌉</span>
        LanguageBridge Active
      </div>
      <div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">
        In Google Docs: <strong>Select text → Copy (Ctrl+C)</strong> → Click Play ▶️
      </div>
      <button style="
        background: white;
        color: #667eea;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
      ">Got it!</button>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Close button
    const closeButton = notification.querySelector('button') as HTMLButtonElement;
    if (closeButton) {
      closeButton.addEventListener('click', (): void => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout((): void => notification.remove(), 300);
      });
    }

    // Auto-close after 10 seconds
    setTimeout((): void => {
      if (notification.parentElement) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout((): void => notification.remove(), 300);
      }
    }, 10000);
  }

  /**
   * Wait for the Google Docs editor iframe to be ready
   */
  private async waitForEditorIframe(): Promise<void> {
    const maxAttempts = 20;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Google Docs uses an iframe with class 'docs-texteventtarget-iframe'
      const iframe = document.querySelector(
        '.docs-texteventtarget-iframe'
      ) as HTMLIFrameElement | null;

      if (iframe && iframe.contentDocument) {
        this.editorIframe = iframe;
        return;
      }

      // Wait 500ms before next attempt
      await new Promise((resolve): number => setTimeout(resolve, 500));
      attempts++;
    }
  }

  /**
   * Set up selection monitoring in Google Docs
   */
  private setupSelectionMonitoring(): void {
    // Monitor selection changes in the main document (where the rendered text appears)
    document.addEventListener('selectionchange', (): void => {
      setTimeout((): void => {
        this.handleSelectionChange();
      }, 50);
    });

    // Also monitor mouseup events on the document
    document.addEventListener('mouseup', (_e: MouseEvent): void => {
      console.log('📝 Mouse up detected in Google Docs');
      // Small delay to let selection settle
      setTimeout((): void => {
        this.handleSelectionChange();
      }, 150);
    });

    // Monitor the Kix editor (Google Docs' internal editor)
    const kixContainer = document.querySelector('.kix-appview-editor') as HTMLElement | null;
    if (kixContainer) {
      console.log('✓ Found Kix editor container, adding mouseup listener');
      kixContainer.addEventListener('mouseup', (_e: MouseEvent): void => {
        console.log('📝 Mouse up in Kix editor');
        setTimeout((): void => {
          this.handleSelectionChange();
        }, 150);
      });
    }

    // Also try the page container
    const pageContainer = document.querySelector(
      '.kix-paginateddocumentplugin'
    ) as HTMLElement | null;
    if (pageContainer) {
      console.log('✓ Found page container, adding mouseup listener');
      pageContainer.addEventListener('mouseup', (_e: MouseEvent): void => {
        console.log('📝 Mouse up in page container');
        setTimeout((): void => {
          this.handleSelectionChange();
        }, 150);
      });
    }

    console.log('✓ Google Docs selection monitoring active');
  }

  /**
   * Set up clipboard monitoring for copy events
   * This is more reliable than selection monitoring in Google Docs
   */
  private setupClipboardMonitoring(): void {
    console.log('📋 Setting up clipboard monitoring for Google Docs');

    // Listen for copy events (Ctrl+C / Cmd+C)
    document.addEventListener('copy', (e: ClipboardEvent): void => {
      console.log('📋 Copy event detected in Google Docs');

      // Small delay to let the clipboard update
      setTimeout(async (): Promise<void> => {
        try {
          // Read from clipboard
          const text = await navigator.clipboard.readText();
          console.log(`📋 Clipboard text: "${text.substring(0, 50)}..."`);

          if (text && text.trim().length > 0) {
            this.lastSelection = text;

            if (this.selectionCallback) {
              console.log('✓ Calling selection callback with clipboard text');
              this.selectionCallback(text.trim());
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not read clipboard:', error);
          // Fallback: try to get text from the copy event itself
          try {
            const clipboardData = e.clipboardData || (window as any).clipboardData;
            const text = clipboardData?.getData('text') || '';
            if (text && text.trim().length > 0) {
              console.log(`📋 Got text from event: "${text.substring(0, 50)}..."`);
              this.lastSelection = text;
              if (this.selectionCallback) {
                this.selectionCallback(text.trim());
              }
            }
          } catch (fallbackError) {
            console.error('❌ Could not get clipboard text:', fallbackError);
          }
        }
      }, 100);
    });

    console.log('✓ Clipboard monitoring active - students can copy text to translate');
  }

  /**
   * Handle selection changes
   */
  private handleSelectionChange(): void {
    console.log('🔍 handleSelectionChange called');

    const selection = this.getSelectedText();
    console.log(`🔍 Selected text: "${selection ? selection.substring(0, 50) : 'none'}..."`);
    console.log(
      `🔍 Last selection: "${this.lastSelection ? this.lastSelection.substring(0, 50) : 'none'}..."`
    );

    if (selection && selection !== this.lastSelection && selection.length > 0) {
      this.lastSelection = selection;
      console.log(`📝 Google Docs selection: "${selection.substring(0, 50)}..."`);

      if (this.selectionCallback) {
        console.log('✓ Calling selection callback');
        this.selectionCallback(selection);
      } else {
        console.warn('⚠️ No selection callback registered');
      }
    } else {
      if (!selection) {
        console.log('⚠️ No selection text extracted');
      } else if (selection === this.lastSelection) {
        console.log('⚠️ Same selection as before, ignoring');
      }
    }
  }

  /**
   * Get selected text from Google Docs
   * Google Docs stores text in special span elements with class 'kix-lineview-text-block'
   * @returns {string} The selected text
   */
  private getSelectedText(): string {
    const selection = window.getSelection();

    console.log(`🔍 getSelectedText - rangeCount: ${selection?.rangeCount || 0}`);

    if (!selection || selection.rangeCount === 0) {
      console.log('⚠️ No selection or no ranges');
      return '';
    }

    try {
      const range = selection.getRangeAt(0);

      // Method 1: Try standard toString
      let text = selection.toString().trim();
      console.log(
        `🔍 Method 1 (toString): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
      );

      // Method 2: Try extracting text content from range
      if (!text) {
        console.log('🔍 Method 2: Extracting from range contents');
        const contents = range.cloneContents();
        text = contents.textContent?.trim() || '';
        console.log(
          `🔍 Method 2 result: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
        );
      }

      // Method 3: Walk through the range and extract text nodes
      if (!text) {
        console.log('🔍 Method 3: Walking through text nodes');
        text = this.extractTextFromRange(range);
        console.log(
          `🔍 Method 3 result: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
        );
      }

      // Method 4: Look for Kix text blocks
      if (!text) {
        console.log('🔍 Method 4: Searching for Kix elements');
        text = this.extractTextFromKix(range);
        console.log(
          `🔍 Method 4 result: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
        );
      }

      return text;
    } catch (error) {
      console.error('Error getting selected text:', error);
      return '';
    }
  }

  /**
   * Extract text by walking through text nodes in the range
   * @param {Range} range - The DOM range to extract text from
   * @returns {string} Extracted text
   */
  private extractTextFromRange(range: Range): string {
    try {
      const textNodes: string[] = [];
      const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node: Node): number => {
            // Check if this text node is within our range
            if (range.intersectsNode(node)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          },
        } as TreeWalkerFilter
      );

      let node = walker.nextNode();
      while (node) {
        const text = node.textContent;
        if (text && text.trim()) {
          textNodes.push(text);
        }
        node = walker.nextNode();
      }

      const result = textNodes.join(' ').trim();
      console.log(`🔍 Found ${textNodes.length} text nodes`);
      return result;
    } catch (error) {
      console.warn('Error walking text nodes:', error);
      return '';
    }
  }

  /**
   * Extract text from Google Docs' Kix editor elements
   * @param {Range} range - The DOM range to extract text from
   * @returns {string} Extracted text
   */
  private extractTextFromKix(range: Range): string {
    try {
      const container = range.commonAncestorContainer;

      // If it's a text node, get parent element
      let searchElement: Element | null =
        container.nodeType === Node.TEXT_NODE
          ? (container as Text).parentElement
          : (container as Element);

      console.log(`🔍 Searching in element:`, searchElement);

      // Look for Kix text blocks in the container
      let kixElements: Element[] = [];

      // Try different selectors
      const selectors = [
        '.kix-lineview-text-block',
        '.kix-wordhtmlgenerator-word-node',
        '[role="textbox"] span',
      ];

      if (searchElement && searchElement.querySelectorAll) {
        for (const selector of selectors) {
          kixElements = Array.from(searchElement.querySelectorAll(selector));
          if (kixElements.length > 0) {
            console.log(`✓ Found ${kixElements.length} elements with selector: ${selector}`);
            break;
          }
        }
      }

      // If we found elements, extract text from those within the range
      if (kixElements.length > 0) {
        const textBlocks = kixElements
          .filter((el): boolean => range.intersectsNode(el))
          .map((el): string => el.textContent || '')
          .filter((text): boolean => text && text.trim() !== '');

        console.log(`✓ Extracted ${textBlocks.length} text blocks from Kix elements`);
        return textBlocks.join(' ').trim();
      }

      // Fallback: get all text from the range container
      const allText = searchElement?.textContent?.trim() || '';
      console.log(`⚠️ Fallback: using container textContent (${allText.length} chars)`);
      return allText;
    } catch (error) {
      console.warn('Error extracting Kix text:', error);
      return '';
    }
  }

  /**
   * Register a callback for when text is selected
   * @param {SelectionCallback} callback - Function to call when text is selected
   */
  public onTextSelected(callback: SelectionCallback): void {
    this.selectionCallback = callback;
  }

  /**
   * Get the current selection object (for positioning tooltips)
   * @returns {Selection | null} The current selection
   */
  public getSelection(): Selection | null {
    return window.getSelection();
  }

  /**
   * Check if currently in Google Docs
   * @returns {boolean} True if Google Docs is active
   */
  public isActive(): boolean {
    return this.isGoogleDocs && this.editorIframe !== null;
  }
}

// Initialize and expose globally
declare global {
  interface Window {
    GoogleDocsAdapter?: GoogleDocsAdapter;
  }
}

if (typeof window.GoogleDocsAdapter === 'undefined') {
  window.GoogleDocsAdapter = new GoogleDocsAdapter();
  console.log('✓ Google Docs Adapter initialized');
}
