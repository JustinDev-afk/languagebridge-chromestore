/**
 * LanguageBridge - Simplified Toolbar with Conversation Mode
 * Minimal by default, expands on text highlight
 */

// Global type extensions
declare global {
  interface Window {
    AzureClient: any;
    GoogleDocsAdapter?: {
      isActive(): boolean;
      getSelection(): Selection | null;
      onTextSelected(callback: (text: string) => void): void;
    };
    LanguageBridgeGuide?: {
      show(shouldShow: boolean): void;
    };
    LanguageBridgeToolbar: LanguageBridgeToolbar;
    speechSynthesis: SpeechSynthesis;
    getSelection(): Selection;
  }
}

// Type definitions for toolbar state
interface TranscriptEntry {
  original: string;
  translation: string;
}

interface ToolbarSettings {
  toolbarEnabled?: boolean;
  defaultLanguage?: string;
  speechRate?: number;
  verbosity?: string;
  userLanguage?: string;
  readingSpeed?: number;
}

interface SelectionSettings {
  action: string;
  settings?: ToolbarSettings;
}

/**
 * Main Toolbar Class
 */
class LanguageBridgeToolbar {
  private isActive: boolean = false;
  private isReading: boolean = false;
  private isPaused: boolean = false;
  private currentElement: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private conversationPanel: HTMLElement | null = null;
  private userLanguage: string = 'fa'; // Default to Dari
  private readingSpeed: number = 1.0;
  private verbosity: string = 'balanced';
  private isExpanded: boolean = false;
  private isConversationMode: boolean = false;
  private audioMode: 'auto' | 'speaker' | 'headphone' = 'auto';
  private hasHeadphones: boolean = false;
  private teacherTranscript: TranscriptEntry[] = [];
  private studentTranscript: TranscriptEntry[] = [];
  private selectedText: string = '';
  private currentReadingPromise: Promise<void> | null = null;
  private abortController: AbortController | null = null;
  private lastReadTime: number = 0;
  private cooldownMs: number = 500;

  // Cached translation for pause/resume
  private cachedTranslation: string | null = null;
  private cachedOriginalText: string | null = null;

  // Pause/Resume with position tracking
  private translationSentences: string[] = [];
  private currentSentenceIndex: number = 0;
  private isTranslating: boolean = false;

  // Timeout tracking
  private _selectionTimeout: NodeJS.Timeout | undefined;

  constructor() {
    this.init();
  }

  /**
   * Initialize the toolbar
   */
  async init(): Promise<void> {
    // Load user preferences
    const settings = await chrome.storage.sync.get([
      'toolbarEnabled',
      'defaultLanguage',
      'speechRate',
      'verbosity'
    ]) as ToolbarSettings;

    // Map defaultLanguage to userLanguage for internal use
    if (settings.defaultLanguage) this.userLanguage = settings.defaultLanguage;
    if (settings.speechRate) this.readingSpeed = settings.speechRate;
    if (settings.verbosity) this.verbosity = settings.verbosity;

    if (settings.toolbarEnabled) {
      this.show();
    }

    // Listen for keyboard shortcut and settings updates
    chrome.runtime.onMessage.addListener(
      (request: SelectionSettings, sender, sendResponse) => {
        if (request.action === 'toggle-toolbar') {
          this.toggle();
          sendResponse({ success: true, isActive: this.isActive });
          return true;
        }

        if (request.action === 'settings-updated' && request.settings) {
          console.log('⚙️ Settings updated:', request.settings);

          if (request.settings.userLanguage) {
            console.log(
              `🌐 Language changing from ${this.userLanguage} to ${request.settings.userLanguage}`
            );
            this.userLanguage = request.settings.userLanguage;
          }
          if (request.settings.readingSpeed) this.readingSpeed = request.settings.readingSpeed;
          if (request.settings.verbosity) this.verbosity = request.settings.verbosity;

          this.updateLanguageDisplay();
          console.log('✓ Language display updated');

          sendResponse({ success: true });
          return true;
        }

        return false;
      }
    );

    // Listen for text selection
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));

    // Set up Google Docs adapter if available
    this.setupGoogleDocsIntegration();

    // Detect headphone connection
    this.detectHeadphones();
  }

  /**
   * Create the main toolbar element
   */
  private createToolbar(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'lb-toolbar';
    this.toolbar.className = 'lb-toolbar collapsed';

    this.toolbar.innerHTML = `
      <!-- Minimal View (Default) -->
      <div class="lb-toolbar-minimal">
        <img src="${chrome.runtime.getURL('assets/icon32.png')}" alt="LanguageBridge" class="lb-toolbar-logo">
        <span class="lb-toolbar-minimal-text">LanguageBridge</span>
        <span class="lb-status-dot" aria-hidden="true"></span>
      </div>

      <!-- Full View (On Text Highlight) -->
      <div class="lb-toolbar-inner">
        <div class="lb-toolbar-brand">
          <img src="${chrome.runtime.getURL('assets/icon32.png')}" alt="LanguageBridge" class="lb-toolbar-logo">
          <span class="lb-toolbar-title">LanguageBridge</span>
        </div>

        <div class="lb-toolbar-controls">
          <!-- Text Input for Manual Translation -->
          <div class="lb-control-group" style="flex: 1; max-width: 350px; margin-right: 12px;">
            <input
              type="text"
              id="lb-text-input"
              class="lb-text-input"
              placeholder="Paste or type text to translate..."
              title="Paste text from Google Docs or PDFs here"
              dir="auto"
              style="width: 100%; padding: 8px 12px; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: white; border-radius: 8px; font-size: 14px; outline: none; text-align: start;"
            />
          </div>

          <!-- Reading Controls - Play/Pause and Book -->
          <div class="lb-control-group">
            <button id="lb-play-pause" class="lb-toolbar-btn" title="Play audio translation">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button id="lb-show-translation" class="lb-toolbar-btn" title="Show written translation">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
              </svg>
            </button>
          </div>

          <!-- Talk with Teacher Button -->
          <div class="lb-control-group">
            <button id="lb-talk-teacher" class="lb-toolbar-btn" title="Talk with Teacher" style="width: auto; padding: 6px 16px; gap: 6px; display: flex; align-items: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              <span style="font-size: 13px; white-space: nowrap;">Talk with Teacher</span>
            </button>
          </div>

          <!-- Current Language Display -->
          <div class="lb-control-group">
            <span class="lb-control-label" id="lb-lang-display">Dari (دری)</span>
          </div>

          <!-- Status Indicator -->
          <div class="lb-status" id="lb-status" style="margin-left: auto;">
            <span class="lb-status-dot"></span>
            <span class="lb-status-text">Active</span>
          </div>

          <!-- Report Problem Button -->
          <button id="lb-report-problem" class="lb-toolbar-btn" title="Report a problem" style="color: #ef4444;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
            </svg>
          </button>

          <!-- Help/Tutorial Button -->
          <button id="lb-help-guide" class="lb-toolbar-btn" title="Open tutorial guide" style="color: #fbbf24;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
          </button>

          <!-- Collapse -->
          <button id="lb-collapse" class="lb-toolbar-btn" title="Collapse toolbar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.toolbar);

    // Create conversation panel
    this.createConversationPanel();

    // Adjust page content
    this.adjustPageLayout();

    this.attachEventListeners();
    this.updateLanguageDisplay();
  }

  /**
   * Create the conversation panel
   */
  private createConversationPanel(): void {
    this.conversationPanel = document.createElement('div');
    this.conversationPanel.className = 'lb-conversation-panel';

    this.conversationPanel.innerHTML = `
      <div class="lb-conversation-header" id="lb-conv-header">
        <div class="lb-conversation-title">
          ⋮⋮ 💬 Talk with Teacher
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button class="lb-conv-settings-btn" id="lb-conv-settings" title="Quick Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <div class="lb-audio-mode-toggle" id="lb-audio-toggle">
            <span id="lb-audio-mode-icon">🔊</span>
            <span id="lb-audio-mode-text">Speaker</span>
          </div>
          <button class="lb-conversation-close" id="lb-conv-close">×</button>
        </div>
      </div>

      <!-- Quick Settings Panel (Hidden by default) -->
      <div class="lb-conv-quick-settings" id="lb-conv-quick-settings" style="display: none;">
        <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 13px; font-weight: 600;">Student Language:</label>
            <select id="lb-conv-lang-select" style="padding: 6px 10px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: white; font-size: 13px; cursor: pointer;">
              <option value="fa">🇦🇫 Dari (دری)</option>
              <option value="fa-IR-formal">🇮🇷 Persian (فارسی - Formal)</option>
              <option value="ps">🇦🇫 Pashto (پښتو)</option>
              <option value="ar">🇸🇦 Arabic (العربية)</option>
              <option value="ur">🇵🇰 Urdu (اردو)</option>
              <option value="uz">🇺🇿 Uzbek (O'zbek)</option>
              <option value="uk">🇺🇦 Ukrainian (Українська)</option>
              <option value="es">🇪🇸 Spanish (Español)</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 13px; font-weight: 600;">Speech Speed:</label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="range" id="lb-conv-speed-slider" min="0.5" max="1.5" step="0.1" value="1.0" style="width: 100px;">
              <span id="lb-conv-speed-display" style="font-size: 12px; font-weight: 600; min-width: 35px;">1.0x</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lb-conversation-body">
        <!-- Teacher Side -->
        <div class="lb-conversation-side teacher">
          <div class="lb-side-label">
            👨‍🏫 Teacher (English)
          </div>
          <div class="lb-conversation-transcript" id="lb-teacher-transcript">
            <div style="text-align: center; opacity: 0.6; padding: 20px;">
              Click the button below to speak
            </div>
          </div>
          <button class="lb-mic-button-conv" id="lb-teacher-mic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <span>Teacher Speak</span>
          </button>
        </div>

        <!-- Student Side -->
        <div class="lb-conversation-side student">
          <div class="lb-side-label">
            👦 Student (${this.getLanguageName()})
          </div>
          <div class="lb-conversation-transcript" id="lb-student-transcript">
            <div style="text-align: center; opacity: 0.6; padding: 20px;">
              Click the button below to speak
            </div>
          </div>
          <button class="lb-mic-button-conv" id="lb-student-mic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <span>Student Speak</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.conversationPanel);

    // Make conversation panel draggable
    this.makeConversationPanelDraggable();

    // Attach conversation event listeners
    const closeBtn = this.conversationPanel.querySelector('#lb-conv-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeConversation();
      });
    }

    const audioToggle = this.conversationPanel.querySelector('#lb-audio-toggle');
    if (audioToggle) {
      audioToggle.addEventListener('click', () => {
        this.toggleAudioMode();
      });
    }

    const teacherMic = this.conversationPanel.querySelector('#lb-teacher-mic');
    if (teacherMic) {
      teacherMic.addEventListener('click', () => {
        this.handleTeacherSpeak();
      });
    }

    const studentMic = this.conversationPanel.querySelector('#lb-student-mic');
    if (studentMic) {
      studentMic.addEventListener('click', () => {
        this.handleStudentSpeak();
      });
    }

    // Settings button
    const settingsBtn = this.conversationPanel.querySelector('#lb-conv-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleConversationSettings();
      });
    }

    // Language selector
    const langSelect = this.conversationPanel.querySelector('#lb-conv-lang-select') as HTMLSelectElement;
    if (langSelect) {
      langSelect.value = this.userLanguage;
      langSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.userLanguage = target.value;
        this.updateLanguageDisplay();
        this.updateStudentLabel();
        this.saveSettings();
        console.log(`🌐 Language changed to: ${this.getLanguageName()}`);
      });
    }

    // Speed slider
    const speedSlider = this.conversationPanel.querySelector('#lb-conv-speed-slider') as HTMLInputElement;
    const speedDisplay = this.conversationPanel.querySelector('#lb-conv-speed-display');
    if (speedSlider && speedDisplay) {
      speedSlider.value = this.readingSpeed.toString();
      speedDisplay.textContent = `${this.readingSpeed}x`;

      speedSlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.readingSpeed = parseFloat(target.value);
        speedDisplay.textContent = `${this.readingSpeed}x`;
        this.saveSettings();
      });
    }
  }

  /**
   * Attach event listeners to toolbar buttons
   */
  private attachEventListeners(): void {
    if (!this.toolbar) return;

    // Minimal tab click to expand
    const minimalTab = this.toolbar.querySelector('.lb-toolbar-minimal');
    if (minimalTab) {
      minimalTab.addEventListener('click', () => {
        this.expand();
      });
    }

    // Play/Pause button
    const playPause = this.toolbar.querySelector('#lb-play-pause');
    if (playPause) {
      playPause.addEventListener('click', () => {
        this.toggleReading();
      });
    }

    // Show Translation button
    const showTranslation = this.toolbar.querySelector('#lb-show-translation');
    if (showTranslation) {
      showTranslation.addEventListener('click', () => {
        this.showWrittenTranslation();
      });
    }

    // Talk with Teacher button
    const talkBtn = this.toolbar.querySelector('#lb-talk-teacher');
    if (talkBtn) {
      talkBtn.addEventListener('click', () => {
        this.openConversation();
      });
    }

    // Report Problem button
    const reportBtn = this.toolbar.querySelector('#lb-report-problem');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        this.reportProblem();
      });
    }

    // Help/Tutorial button
    const helpBtn = this.toolbar.querySelector('#lb-help-guide');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.openHelpGuide();
      });
    }

    // Collapse button
    const collapseBtn = this.toolbar.querySelector('#lb-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        this.collapse();
      });
    }

    // Text input for manual translation
    const textInput = this.toolbar.querySelector('#lb-text-input') as HTMLInputElement;
    if (textInput) {
      // Handle Enter key
      textInput.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          const text = textInput.value.trim();
          if (text) {
            console.log(`📝 Manual text input: "${text.substring(0, 50)}..."`);
            this.selectedText = text;
            this.showStatus('Text ready - Click ▶ for audio or 📖 to read', 'info');
          }
        }
      });

      // Handle paste event
      textInput.addEventListener('paste', () => {
        setTimeout(() => {
          const text = textInput.value.trim();
          if (text) {
            console.log(`📋 Text pasted: "${text.substring(0, 50)}..."`);
            this.selectedText = text;
            this.showStatus('Text ready - Click ▶ for audio or 📖 to read', 'info');
          }
        }, 10);
      });

      // Focus styles
      textInput.addEventListener('focus', () => {
        textInput.style.borderColor = 'rgba(255,255,255,0.6)';
        textInput.style.background = 'rgba(255,255,255,0.25)';
      });

      textInput.addEventListener('blur', () => {
        textInput.style.borderColor = 'rgba(255,255,255,0.3)';
        textInput.style.background = 'rgba(255,255,255,0.15)';
      });
    }
  }

  /**
   * Detect if headphones are connected
   */
  private async detectHeadphones(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.hasHeadphones = devices.some(
        (device) =>
          device.kind === 'audiooutput' &&
          (device.label.toLowerCase().includes('headphone') ||
            device.label.toLowerCase().includes('headset'))
      );

      if (this.audioMode === 'auto') {
        this.updateAudioModeDisplay();
      }
    } catch (error) {
      console.log('Could not detect audio devices:', error);
      this.hasHeadphones = false;
    }
  }

  /**
   * Update audio mode display
   */
  private updateAudioModeDisplay(): void {
    const icon = this.conversationPanel?.querySelector('#lb-audio-mode-icon');
    const text = this.conversationPanel?.querySelector('#lb-audio-mode-text');

    if (!icon || !text) return;

    if (this.audioMode === 'auto') {
      if (this.hasHeadphones) {
        icon.textContent = '🎧';
        text.textContent = 'Headphone';
      } else {
        icon.textContent = '🔊';
        text.textContent = 'Speaker';
      }
    } else if (this.audioMode === 'speaker') {
      icon.textContent = '🔊';
      text.textContent = 'Speaker';
    } else {
      icon.textContent = '🎧';
      text.textContent = 'Headphone';
    }
  }

  /**
   * Toggle audio mode
   */
  private toggleAudioMode(): void {
    if (this.audioMode === 'auto') {
      this.audioMode = 'speaker';
    } else if (this.audioMode === 'speaker') {
      this.audioMode = 'headphone';
    } else {
      this.audioMode = 'auto';
    }
    this.updateAudioModeDisplay();
  }

  /**
   * Toggle conversation settings visibility
   */
  private toggleConversationSettings(): void {
    const settingsPanel = this.conversationPanel?.querySelector(
      '#lb-conv-quick-settings'
    ) as HTMLElement;
    if (settingsPanel) {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Update student label with current language
   */
  private updateStudentLabel(): void {
    const studentLabel = this.conversationPanel?.querySelector(
      '.lb-conversation-side.student .lb-side-label'
    );
    if (studentLabel) {
      studentLabel.textContent = `👦 Student (${this.getLanguageName()})`;
    }
  }

  /**
   * Make conversation panel draggable
   */
  private makeConversationPanelDraggable(): void {
    if (!this.conversationPanel) return;

    const header = this.conversationPanel.querySelector('#lb-conv-header') as HTMLElement;
    if (!header) return;

    let isDragging = false;
    let currentX: number;
    let currentY: number;
    let initialX: number;
    let initialY: number;
    let xOffset = 0;
    let yOffset = 0;

    const dragStart = (e: MouseEvent) => {
      // Don't drag if clicking on buttons or settings
      if (
        (e.target as HTMLElement).closest('.lb-conversation-close') ||
        (e.target as HTMLElement).closest('.lb-audio-mode-toggle') ||
        (e.target as HTMLElement).closest('.lb-conv-settings-btn')
      ) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      const target = e.target as HTMLElement;
      if (target === header || target.closest('.lb-conversation-title')) {
        isDragging = true;

        // Change to fixed positioning if not already
        if (this.conversationPanel!.style.position !== 'fixed') {
          const rect = this.conversationPanel!.getBoundingClientRect();
          this.conversationPanel!.style.position = 'fixed';
          this.conversationPanel!.style.bottom = 'auto';
          this.conversationPanel!.style.right = 'auto';
          this.conversationPanel!.style.left = rect.left + 'px';
          this.conversationPanel!.style.top = rect.top + 'px';
        } else {
          const currentLeft = parseInt(this.conversationPanel!.style.left) || 0;
          const currentTop = parseInt(this.conversationPanel!.style.top) || 0;
          xOffset = currentLeft;
          yOffset = currentTop;
          initialX = e.clientX - xOffset;
          initialY = e.clientY - yOffset;
        }
      }
    };

    const drag = (e: MouseEvent) => {
      if (isDragging && this.conversationPanel) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        // Constrain to viewport
        const rect = this.conversationPanel.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        this.conversationPanel.style.left = currentX + 'px';
        this.conversationPanel.style.top = currentY + 'px';
      }
    };

    const dragEnd = () => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    };

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  }

  /**
   * Get localized language name
   */
  private getLanguageName(): string {
    const names: Record<string, string> = {
      fa: 'دری Dari',
      'fa-IR-formal': 'فارسی Persian',
      ps: 'پښتو Pashto',
      ar: 'العربية Arabic',
      ur: 'اردو Urdu',
      uz: "O'zbek Uzbek",
      uk: 'Українська Ukrainian',
      es: 'Español',
      en: 'English'
    };
    return names[this.userLanguage] || 'Unknown';
  }

  /**
   * Update language display in toolbar
   */
  private updateLanguageDisplay(): void {
    const langDisplay = this.toolbar?.querySelector('#lb-lang-display');
    if (langDisplay) {
      langDisplay.textContent = this.getLanguageName();
    }
  }

  /**
   * Set up Google Docs integration
   */
  private setupGoogleDocsIntegration(): void {
    if (window.GoogleDocsAdapter && window.GoogleDocsAdapter.isActive()) {
      console.log('📄 Integrating with Google Docs');

      window.GoogleDocsAdapter.onTextSelected((text: string) => {
        console.log(`📄 Google Docs text selected: "${text.substring(0, 50)}..."`);

        this.selectedText = text;
        this.expand();
        this.showStatus('Text selected - Click ▶ for audio or 📖 to read', 'info');
      });

      console.log('✓ Google Docs integration active');
    }
  }

  /**
   * Handle text selection on page
   */
  private handleTextSelection(event: MouseEvent): void {
    // Ignore clicks on our own UI elements
    if (
      (event.target as HTMLElement).closest('.lb-toolbar') ||
      (event.target as HTMLElement).closest('.lb-translation-tooltip') ||
      (event.target as HTMLElement).closest('.lb-conversation-panel')
    ) {
      return;
    }

    // Debounce text selection
    clearTimeout(this._selectionTimeout);

    this._selectionTimeout = setTimeout(() => {
      const selection = window.getSelection();
      const newSelectedText = selection?.toString().trim() || '';

      if (!newSelectedText || newSelectedText.length === 0) {
        return;
      }

      // Limit selection size
      const MAX_CHARS = 1500;
      if (newSelectedText.length > MAX_CHARS) {
        this.selectedText = newSelectedText.substring(0, MAX_CHARS);
        this.showStatus('Selection too large - limited to ~5 paragraphs', 'error');
      } else {
        this.selectedText = newSelectedText;
      }

      // Check cooldown
      const now = Date.now();
      const timeSinceLastRead = now - this.lastReadTime;

      if (this.isReading && timeSinceLastRead < this.cooldownMs) {
        this.showStatus('Please wait - translation in progress', 'info');
        return;
      }

      // Expand toolbar when text is selected
      this.expand();

      // Show status
      this.showStatus('Text selected - Click ▶ for audio or 📖 to read', 'info');
    }, 300);
  }

  /**
   * Expand toolbar
   */
  private expand(): void {
    if (!this.toolbar) return;
    this.toolbar.classList.remove('collapsed');
    this.toolbar.classList.add('expanded');
    this.isExpanded = true;
    this.adjustPageLayout();
  }

  /**
   * Collapse toolbar
   */
  private collapse(): void {
    if (!this.toolbar) return;
    this.toolbar.classList.remove('expanded');
    this.toolbar.classList.add('collapsed');
    this.isExpanded = false;
    this.adjustPageLayout();

    if (this.isReading) {
      this.pauseReading();
    }
  }

  /**
   * Open conversation mode
   */
  private openConversation(): void {
    if (this.conversationPanel) {
      this.conversationPanel.classList.add('active');
      this.isConversationMode = true;
      this.teacherTranscript = [];
      this.studentTranscript = [];
    }
  }

  /**
   * Close conversation mode
   */
  private closeConversation(): void {
    if (this.conversationPanel) {
      this.conversationPanel.classList.remove('active');
      this.isConversationMode = false;
    }
  }

  /**
   * Handle teacher speaking
   */
  private async handleTeacherSpeak(): Promise<void> {
    if (!this.conversationPanel) return;

    const button = this.conversationPanel.querySelector('#lb-teacher-mic') as HTMLButtonElement;
    const transcript = this.conversationPanel.querySelector('#lb-teacher-transcript');

    button.classList.add('listening');
    const spanEl = button.querySelector('span');
    if (spanEl) spanEl.textContent = 'Listening...';

    let recognitionController = null;

    try {
      // Speech recognition for English
      recognitionController = await window.AzureClient.startSpeechRecognition('en');

      // Wait for final result
      const recognizedText = await new Promise<string>((resolve, reject) => {
        let finalText = '';

        recognitionController.onResult = (text: string, isFinal: boolean) => {
          if (isFinal && text) {
            finalText = text;
            resolve(finalText);
          }
        };

        recognitionController.onError = (error: string) => {
          reject(new Error(error));
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!finalText) {
            reject(new Error('Speech recognition timeout'));
          }
        }, 10000);
      });

      // Stop recognition
      await window.AzureClient.stopSpeechRecognition();

      // Translate to student's language
      const translatedText = await window.AzureClient.translateText(
        recognizedText,
        'en',
        this.userLanguage
      );

      // Add to transcript
      const entry = document.createElement('div');
      entry.className = 'lb-transcript-entry';
      entry.innerHTML = `
        <div class="lb-transcript-original">${recognizedText}</div>
        <div class="lb-transcript-translation">${translatedText}</div>
      `;
      if (transcript) {
        transcript.innerHTML = '';
        transcript.appendChild(entry);
      }

      // Speak translation
      const shouldPlayAudio =
        this.audioMode === 'speaker' ||
        (this.audioMode === 'auto' && !this.hasHeadphones) ||
        this.audioMode === 'headphone';

      if (shouldPlayAudio) {
        await window.AzureClient.speakText(translatedText, this.userLanguage);
      }
    } catch (error) {
      console.error('Teacher speech error:', error);
      if (transcript) {
        transcript.innerHTML = '<div style="color: #ef4444;">Error: Could not recognize speech</div>';
      }

      try {
        await window.AzureClient.stopSpeechRecognition();
      } catch (e) {
        // Ignore cleanup errors
      }
    } finally {
      button.classList.remove('listening');
      const spanEl = button.querySelector('span');
      if (spanEl) spanEl.textContent = 'Teacher Speak';
    }
  }

  /**
   * Handle student speaking
   */
  private async handleStudentSpeak(): Promise<void> {
    if (!this.conversationPanel) return;

    const button = this.conversationPanel.querySelector('#lb-student-mic') as HTMLButtonElement;
    const transcript = this.conversationPanel.querySelector('#lb-student-transcript');

    button.classList.add('listening');
    const spanEl = button.querySelector('span');
    if (spanEl) spanEl.textContent = 'Listening...';

    let recognitionController = null;

    try {
      // Speech recognition for student's language
      recognitionController = await window.AzureClient.startSpeechRecognition(this.userLanguage);

      // Wait for final result
      const recognizedText = await new Promise<string>((resolve, reject) => {
        let finalText = '';

        recognitionController.onResult = (text: string, isFinal: boolean) => {
          if (isFinal && text) {
            finalText = text;
            resolve(finalText);
          }
        };

        recognitionController.onError = (error: string) => {
          reject(new Error(error));
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!finalText) {
            reject(new Error('Speech recognition timeout'));
          }
        }, 10000);
      });

      // Stop recognition
      await window.AzureClient.stopSpeechRecognition();

      // Translate to English
      const translatedText = await window.AzureClient.translateText(
        recognizedText,
        this.userLanguage,
        'en'
      );

      // Add to transcript
      const entry = document.createElement('div');
      entry.className = 'lb-transcript-entry';
      entry.innerHTML = `
        <div class="lb-transcript-original">${recognizedText}</div>
        <div class="lb-transcript-translation">${translatedText}</div>
      `;
      if (transcript) {
        transcript.innerHTML = '';
        transcript.appendChild(entry);
      }

      // Speak translation
      const shouldPlayAudio =
        this.audioMode === 'speaker' || (this.audioMode === 'auto' && !this.hasHeadphones);

      if (shouldPlayAudio) {
        await window.AzureClient.speakText(translatedText, 'en');
      }
    } catch (error) {
      console.error('Student speech error:', error);
      if (transcript) {
        transcript.innerHTML = '<div style="color: #ef4444;">Error: Could not recognize speech</div>';
      }

      try {
        await window.AzureClient.stopSpeechRecognition();
      } catch (e) {
        // Ignore cleanup errors
      }
    } finally {
      button.classList.remove('listening');
      const spanEl = button.querySelector('span');
      if (spanEl) spanEl.textContent = 'Student Speak';
    }
  }

  /**
   * Show written translation
   */
  private async showWrittenTranslation(): Promise<void> {
    if (!this.selectedText) {
      this.showStatus('Please select some text first', 'error');
      return;
    }

    console.log('📖 Showing written translation (no audio)');

    try {
      // Translate the text
      let translatedText = this.selectedText;
      if (this.userLanguage !== 'en') {
        this.showStatus('Translating...', 'info');
        translatedText = await window.AzureClient.translateText(
          this.selectedText,
          'en',
          this.userLanguage
        );
      }

      // Get the current selection for positioning
      let selection = window.GoogleDocsAdapter?.isActive()
        ? window.GoogleDocsAdapter.getSelection()
        : window.getSelection();

      if (selection && selection.rangeCount > 0) {
        this.showTranslationTooltip(translatedText, selection);
        this.showStatus('Translation shown', 'info');
      } else {
        this.showTranslationTooltipCentered(translatedText);
        this.showStatus('Translation shown', 'info');
      }
    } catch (error) {
      console.error('Error showing translation:', error);
      this.showStatus('Error translating text', 'error');
    }
  }

  /**
   * Read text with translation and audio
   */
  private async readText(text: string, selection: Selection | null = null): Promise<void> {
    if (!text || text.length === 0) return;

    // MUTEX: Prevent concurrent translations
    if (this.isTranslating) {
      console.log('⚠️ Already translating - ignoring new request');
      this.showStatus('Please wait - translation in progress', 'info');
      return;
    }

    // If currently reading or paused, stop it
    if (this.isReading || this.isPaused) {
      console.log('📖 New text selected - stopping previous reading');
      await this.stopReading();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('📖 Starting new reading');
    this.isTranslating = true;
    this.isReading = true;
    this.isPaused = false;
    this.lastReadTime = Date.now();
    this.updatePlayPauseButton(true);

    // Create abort controller for this reading session
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      if (signal.aborted) {
        throw new Error('Reading cancelled');
      }

      // Translate to user's chosen language
      let translatedText = text;
      if (this.userLanguage !== 'en') {
        translatedText = await window.AzureClient.translateText(text, 'en', this.userLanguage);

        // Cache for pause/resume
        this.cachedOriginalText = text;
        this.cachedTranslation = translatedText;

        // Split into sentences for pause/resume support
        this.translationSentences = this.splitIntoSentences(translatedText);
        this.currentSentenceIndex = 0;

        // Show visual tooltip with translated text
        if (selection) {
          if (window.GoogleDocsAdapter?.isActive()) {
            this.showTranslationTooltipCentered(translatedText);
          } else {
            this.showTranslationTooltip(translatedText, selection);
          }
        }
      } else {
        // English text - split into sentences for pause/resume
        this.translationSentences = this.splitIntoSentences(text);
        this.currentSentenceIndex = 0;
      }

      if (signal.aborted) {
        throw new Error('Reading cancelled');
      }

      // Speak sentence by sentence
      await this.speakFromCurrentPosition(signal);
    } catch (error: any) {
      // Ignore errors from intentional stops/pauses
      if (
        error.message !== 'Reading cancelled' &&
        error.message !== 'Speech stopped' &&
        error.message !== 'Speech paused'
      ) {
        console.error('Error reading text:', error);
        this.showStatus('Error reading text', 'error');
      }
    } finally {
      this.isReading = false;
      this.isTranslating = false;
      this.abortController = null;
      this.updatePlayPauseButton(false);
    }
  }

  /**
   * Split text into sentences for pause/resume support
   */
  private splitIntoSentences(text: string): string[] {
    const sentenceRegex = /[^.!?؟؛۔¿]+[.!?؟؛۔¿]+/g;
    const sentences = text.match(sentenceRegex) || [text];
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Speak sentences sequentially from current position
   */
  private async speakFromCurrentPosition(signal: AbortSignal): Promise<void> {
    const remainingSentences = this.translationSentences.slice(this.currentSentenceIndex);

    if (remainingSentences.length === 0) {
      console.log('✓ No sentences to speak');
      return;
    }

    console.log(
      `🔊 Speaking ${remainingSentences.length} sentence(s) starting from index ${this.currentSentenceIndex}`
    );

    for (let i = 0; i < remainingSentences.length; i++) {
      const globalIndex = this.currentSentenceIndex + i;

      // Check if paused or cancelled BEFORE starting next sentence
      if (signal.aborted || this.isPaused) {
        console.log(`⏸️ Paused at sentence ${globalIndex}/${this.translationSentences.length}`);
        this.currentSentenceIndex = globalIndex;
        throw new Error('Speech paused');
      }

      const sentence = remainingSentences[i];
      console.log(
        `🔊 Speaking sentence ${globalIndex + 1}/${this.translationSentences.length}: "${sentence.substring(
          0,
          50
        )}..."`
      );

      try {
        await this.speakSentenceWithPlaybackWait(sentence, signal);

        console.log(`✓ Sentence ${globalIndex + 1} playback completed`);

        // Update current position
        this.currentSentenceIndex = globalIndex + 1;

        // Add a small natural pause between sentences
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Check again after speaking completes
        if (signal.aborted || this.isPaused) {
          console.log(
            `⏸️ Paused after sentence ${globalIndex + 1}/${this.translationSentences.length}`
          );
          throw new Error('Speech paused');
        }
      } catch (error: any) {
        if (error.message === 'Speech stopped' || error.message === 'Speech paused') {
          throw error;
        }
        console.warn(`⚠️ Error speaking sentence ${globalIndex + 1}:`, error);
        this.currentSentenceIndex = globalIndex + 1;
      }
    }

    console.log('✓ Finished speaking all sentences');
    this.currentSentenceIndex = 0;
  }

  /**
   * Speak a single sentence and wait for playback to complete
   */
  private async speakSentenceWithPlaybackWait(
    sentence: string,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await window.AzureClient.speakText(sentence, this.userLanguage, {
          rate: this.readingSpeed
        });

        // Check if cancelled during playback
        if (signal.aborted) {
          reject(new Error('Speech paused'));
          return;
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Toggle reading playback
   */
  private toggleReading(): void {
    console.log(
      `🎵 toggleReading - isReading: ${this.isReading}, isPaused: ${this.isPaused}, hasCached: ${!!this.cachedTranslation}`
    );

    if (this.isReading) {
      console.log('🎵 -> Calling pauseReading()');
      this.pauseReading();
    } else if (this.isPaused && this.cachedTranslation) {
      console.log('🎵 -> Calling resumeReading()');
      this.resumeReading();
    } else if (this.selectedText) {
      console.log('🎵 -> Calling readText() with audio');
      const selection = window.getSelection();
      this.readText(this.selectedText, selection);

      // Clear text input after starting playback
      const textInput = this.toolbar?.querySelector('#lb-text-input') as HTMLInputElement;
      if (textInput && textInput.value.trim() === this.selectedText) {
        setTimeout(() => {
          textInput.value = '';
        }, 500);
      }
    } else {
      console.log('🎵 -> No action (no selected text)');
      this.showStatus('Please select some text first', 'error');
    }
  }

  /**
   * Pause reading
   */
  private pauseReading(): void {
    console.log(
      `⏸️ pauseReading called - pausing at sentence ${this.currentSentenceIndex}/${this.translationSentences.length}`
    );

    if (window.AzureClient) {
      window.AzureClient.pauseSpeaking();
    }

    this.isReading = false;
    this.isPaused = true;
    this.isTranslating = false;
    this.updatePlayPauseButton(false);

    const remaining = this.translationSentences.length - this.currentSentenceIndex;
    this.showStatus(
      `Paused (${remaining} sentence${remaining !== 1 ? 's' : ''} remaining)`,
      'info'
    );

    console.log(`⏸️ Will resume from sentence ${this.currentSentenceIndex}`);
  }

  /**
   * Resume reading
   */
  private async resumeReading(): Promise<void> {
    if (!this.cachedTranslation || this.translationSentences.length === 0) {
      console.log('⏯️ Cannot resume - no cached translation');
      return;
    }

    console.log(
      `⏯️ Resuming from sentence ${this.currentSentenceIndex}/${this.translationSentences.length}`
    );
    this.isReading = true;
    this.isPaused = false;
    this.isTranslating = true;
    this.lastReadTime = Date.now();
    this.updatePlayPauseButton(true);
    this.showStatus('Resuming...', 'info');

    // Create new abort controller for resume
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      await this.speakFromCurrentPosition(signal);
      console.log('✓ Resume completed');
      this.showStatus('Completed', 'info');
    } catch (error: any) {
      if (error.message !== 'Speech paused' && error.message !== 'Speech stopped') {
        console.error('Error resuming:', error);
        this.showStatus('Error resuming', 'error');
      }
    } finally {
      this.isReading = false;
      this.isTranslating = false;
      this.abortController = null;
      this.updatePlayPauseButton(false);
    }
  }

  /**
   * Stop reading completely
   */
  private async stopReading(): Promise<void> {
    console.log('🛑 stopReading called');

    // Cancel any pending operations FIRST
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Stop Azure TTS immediately
    if (window.AzureClient) {
      window.AzureClient.stopSpeaking();
    }

    // Stop Azure STT if active
    try {
      await window.AzureClient.stopSpeechRecognition();
    } catch (e) {
      // Ignore if not active
    }

    // Clear all state
    this.isReading = false;
    this.isPaused = false;
    this.isTranslating = false;
    this.cachedTranslation = null;
    this.cachedOriginalText = null;
    this.translationSentences = [];
    this.currentSentenceIndex = 0;

    // Hide tooltip
    this.hideTranslationTooltip();

    // Reset button to play icon
    this.updatePlayPauseButton(false);

    // Update status
    this.showStatus('Active', 'info');

    console.log('✓ stopReading complete');
  }

  /**
   * Update play/pause button appearance
   */
  private updatePlayPauseButton(isPlaying: boolean): void {
    const button = this.toolbar?.querySelector('#lb-play-pause');
    if (!button) return;

    const svg = isPlaying
      ? '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>'
      : '<path d="M8 5v14l11-7z"/>';

    const svgEl = button.querySelector('svg');
    if (svgEl) {
      svgEl.innerHTML = svg;
    }
  }

  /**
   * Show translation tooltip at selection
   */
  private showTranslationTooltip(translatedText: string, selection: Selection): void {
    this.hideTranslationTooltip();

    const rtlLanguages = ['fa', 'ps', 'ar', 'ur'];
    const isRTL = rtlLanguages.includes(this.userLanguage);

    const tooltip = document.createElement('div');
    tooltip.className = 'lb-translation-tooltip';
    tooltip.id = 'lb-translation-tooltip';
    tooltip.setAttribute('data-lang', this.userLanguage);

    const textDir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';

    tooltip.innerHTML = `
      <div class="lb-tooltip-header" style="cursor: move; user-select: none; display: flex; justify-content: space-between; align-items: center;">
        <span class="lb-tooltip-drag-handle" style="font-size: 14px; opacity: 0.6; margin-right: 8px;">⋮⋮</span>
        <span class="lb-tooltip-language" style="flex: 1;">${this.getLanguageName()}</span>
        <button class="lb-tooltip-close">×</button>
      </div>
      <div class="lb-tooltip-text" dir="${textDir}" style="text-align: ${textAlign};">${translatedText}</div>
    `;

    // Position tooltip near selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 10;

    if (left + 500 > window.innerWidth) {
      left = window.innerWidth - 520;
    }

    tooltip.style.left = `${Math.max(10, left)}px`;
    tooltip.style.top = `${top}px`;

    document.body.appendChild(tooltip);

    this.makeTooltipDraggable(tooltip);

    const closeBtn = tooltip.querySelector('.lb-tooltip-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.hideTranslationTooltip();
      });
    }
  }

  /**
   * Hide translation tooltip
   */
  private hideTranslationTooltip(): void {
    const tooltip = document.getElementById('lb-translation-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Make tooltip draggable
   */
  private makeTooltipDraggable(tooltip: HTMLElement): void {
    const header = tooltip.querySelector('.lb-tooltip-header') as HTMLElement;
    if (!header) return;

    let isDragging = false;
    let currentX: number;
    let currentY: number;
    let initialX: number;
    let initialY: number;
    let xOffset = 0;
    let yOffset = 0;

    const dragStart = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('lb-tooltip-close')) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      const target = e.target as HTMLElement;
      if (
        target === header ||
        target.classList.contains('lb-tooltip-language') ||
        target.classList.contains('lb-tooltip-drag-handle')
      ) {
        isDragging = true;

        if (tooltip.style.position !== 'fixed') {
          const rect = tooltip.getBoundingClientRect();
          tooltip.style.position = 'fixed';
          tooltip.style.left = rect.left + 'px';
          tooltip.style.top = rect.top + 'px';
          tooltip.style.transform = 'none';
        } else {
          const currentLeft = parseInt(tooltip.style.left) || 0;
          const currentTop = parseInt(tooltip.style.top) || 0;
          xOffset = currentLeft;
          yOffset = currentTop;
          initialX = e.clientX - xOffset;
          initialY = e.clientY - yOffset;
        }
      }
    };

    const drag = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        const rect = tooltip.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        tooltip.style.left = currentX + 'px';
        tooltip.style.top = currentY + 'px';
        tooltip.style.transform = 'none';
      }
    };

    const dragEnd = () => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    };

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  }

  /**
   * Show centered translation tooltip
   */
  private showTranslationTooltipCentered(translatedText: string): void {
    this.hideTranslationTooltip();

    const rtlLanguages = ['fa', 'ps', 'ar', 'ur'];
    const isRTL = rtlLanguages.includes(this.userLanguage);

    const tooltip = document.createElement('div');
    tooltip.className = 'lb-translation-tooltip';
    tooltip.id = 'lb-translation-tooltip';
    tooltip.setAttribute('data-lang', this.userLanguage);

    const textDir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';

    tooltip.innerHTML = `
      <div class="lb-tooltip-header" style="cursor: move; user-select: none; display: flex; justify-content: space-between; align-items: center;">
        <span class="lb-tooltip-drag-handle" style="font-size: 14px; opacity: 0.6; margin-right: 8px;">⋮⋮</span>
        <span class="lb-tooltip-language" style="flex: 1;">${this.getLanguageName()}</span>
        <button class="lb-tooltip-close">×</button>
      </div>
      <div class="lb-tooltip-text" dir="${textDir}" style="text-align: ${textAlign};">${translatedText}</div>
    `;

    tooltip.style.position = 'fixed';
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.zIndex = '10000';

    document.body.appendChild(tooltip);

    this.makeTooltipDraggable(tooltip);

    const closeBtn = tooltip.querySelector('.lb-tooltip-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.hideTranslationTooltip();
      });
    }
  }

  /**
   * Show status message
   */
  private showStatus(message: string, type: string = 'info'): void {
    const statusText = this.toolbar?.querySelector('.lb-status-text');
    const statusDot = this.toolbar?.querySelector('.lb-status-dot');

    if (!statusText || !statusDot) return;

    statusText.textContent = message;
    statusDot.className = `lb-status-dot ${type}`;

    if (type === 'error') {
      setTimeout(() => {
        statusText.textContent = 'Active';
        statusDot.className = 'lb-status-dot';
      }, 3000);
    }
  }

  /**
   * Adjust page layout for toolbar
   */
  private adjustPageLayout(): void {
    if (!this.toolbar) return;
    const toolbarHeight = this.toolbar.offsetHeight;
    document.body.style.paddingBottom = `${toolbarHeight}px`;
    document.body.style.transition = 'padding-bottom 0.3s ease';
  }

  /**
   * Report a problem
   */
  private reportProblem(): void {
    const message = `
🚩 Report a Problem

To report an issue with LanguageBridge:

1. Press F12 to open Developer Tools
2. Click the "Console" tab
3. Take a screenshot of any errors (red text)
4. Email to: support@languagebridge.edu

Or use keyboard shortcut:
• Alt+Shift+L - Toggle toolbar
• Alt+Shift+T - Toggle translator

These shortcuts work even in locked test mode!
    `.trim();

    alert(message);

    // Log helpful debug info to console
    console.log('🚩 LanguageBridge Debug Info:');
    console.log('Language:', this.userLanguage);
    console.log('Reading Speed:', this.readingSpeed);
    console.log('Is Reading:', this.isReading);
    console.log('Is Paused:', this.isPaused);
    console.log('Current URL:', window.location.href);
    console.log('Extension Version: 1.1.0');
  }

  /**
   * Open help guide
   */
  private openHelpGuide(): void {
    if (window.LanguageBridgeGuide) {
      console.log('📖 Opening help guide');
      window.LanguageBridgeGuide.show(true);
    } else {
      console.warn('⚠️ Welcome guide not loaded');
      this.showStatus('Help guide loading...', 'info');
    }
  }

  /**
   * Save settings to chrome storage
   */
  private async saveSettings(): Promise<void> {
    await chrome.storage.sync.set({
      userLanguage: this.userLanguage,
      readingSpeed: this.readingSpeed,
      verbosity: this.verbosity
    });
  }

  /**
   * Show toolbar
   */
  private show(): void {
    if (!this.toolbar) {
      this.createToolbar();
    }
    if (this.toolbar) {
      this.toolbar.style.display = 'block';
    }
    this.isActive = true;
    chrome.storage.sync.set({ toolbarEnabled: true });
  }

  /**
   * Hide toolbar
   */
  private hide(): void {
    if (this.toolbar) {
      this.toolbar.style.display = 'none';
      document.body.style.paddingBottom = '0';
    }
    if (this.conversationPanel) {
      this.conversationPanel.style.display = 'none';
    }
    this.isActive = false;

    if (this.isReading) {
      this.pauseReading();
    }

    chrome.storage.sync.set({ toolbarEnabled: false });
  }

  /**
   * Toggle toolbar visibility
   */
  private toggle(): void {
    if (this.isActive) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize toolbar
if (typeof window.LanguageBridgeToolbar === 'undefined') {
  window.LanguageBridgeToolbar = new LanguageBridgeToolbar();
}
