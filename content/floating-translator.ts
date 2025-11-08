/**
 * LanguageBridge - Floating Conversation Translator
 * Real-time bidirectional voice translation
 * Student ↔ Teacher communication
 */

/**
 * Position object for floating translator
 */
interface Position {
  x: number;
  y: number;
}

/**
 * Drag offset tracking
 */
interface DragOffset {
  x: number;
  y: number;
}

/**
 * Speech recognition result callback
 */
interface SpeechRecognitionCallbacks {
  onResult: (text: string) => Promise<void>;
  onError: (error: Error) => void;
}

/**
 * Language code to name mapping
 */
interface LanguageNames {
  [key: string]: string;
}

/**
 * Azure Client window extension
 */
declare global {
  interface Window {
    FloatingTranslator: FloatingTranslator;
    AzureClient: {
      startSpeechRecognition: (language: string) => Promise<SpeechRecognitionCallbacks>;
      stopSpeechRecognition: () => Promise<void>;
      translateText: (text: string, sourceLang: string, targetLang: string) => Promise<string>;
      speakText: (text: string, language: string) => Promise<void>;
    };
    MESSAGES?: {
      getMessage: (category: string, key: string, language: string) => string | undefined;
    };
  }
}

/**
 * Floating translator class for real-time bidirectional voice translation
 */
class FloatingTranslator {
  private isActive: boolean;
  private isListening: boolean;
  private isDragging: boolean;
  private container: HTMLDivElement | null;
  private position: Position;
  private dragOffset: DragOffset;
  private studentLanguage: string;
  private teacherLanguage: string;
  private mode: 'student' | 'teacher';

  constructor() {
    this.isActive = false;
    this.isListening = false;
    this.isDragging = false;
    this.container = null;
    this.position = { x: window.innerWidth - 120, y: window.innerHeight - 120 };
    this.dragOffset = { x: 0, y: 0 };

    // User settings
    this.studentLanguage = 'fa'; // Dari default
    this.teacherLanguage = 'en'; // English default
    this.mode = 'student'; // 'student' or 'teacher'

    this.init();
  }

  /**
   * Initialize the floating translator with settings and event listeners
   */
  private async init(): Promise<void> {
    // Load saved settings
    const settings = await chrome.storage.sync.get([
      'floatingTranslatorEnabled',
      'studentLanguage',
      'teacherLanguage',
      'floatingPosition',
    ]);

    if (settings.studentLanguage) this.studentLanguage = settings.studentLanguage;
    if (settings.teacherLanguage) this.teacherLanguage = settings.teacherLanguage;
    if (settings.floatingPosition) this.position = settings.floatingPosition;
    if (settings.floatingTranslatorEnabled) {
      this.show();
    }

    // Listen for keyboard shortcut and settings updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggle-floating-translator') {
        this.toggle();
        sendResponse({ success: true, isActive: this.isActive });
        return true; // Required for async response
      }

      if (request.action === 'settings-updated' && request.settings) {
        // Update settings from options page
        if (request.settings.studentLanguage)
          this.studentLanguage = request.settings.studentLanguage;
        if (request.settings.teacherLanguage)
          this.teacherLanguage = request.settings.teacherLanguage;
        sendResponse({ success: true });
        return true;
      }

      return false; // No async response needed
    });
  }

  /**
   * Create the UI for the floating translator
   */
  private createUI(): void {
    // Main floating container
    this.container = document.createElement('div');
    this.container.id = 'lb-floating-translator';
    this.container.className = 'lb-floating-translator';

    this.container.innerHTML = `
      <div class="lb-float-header">
        <div class="lb-float-drag-handle">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle cx="6" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="14" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="6" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="14" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="6" cy="15" r="1.5" fill="currentColor"/>
            <circle cx="14" cy="15" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <div class="lb-float-mode-switch">
          <button class="lb-mode-btn active" data-mode="student">
            👨‍🎓 Student
          </button>
          <button class="lb-mode-btn" data-mode="teacher">
            👩‍🏫 Teacher
          </button>
        </div>
        <button class="lb-float-close" title="Close translator">×</button>
      </div>

      <div class="lb-float-body">
        <div class="lb-conversation-display">
          <div class="lb-transcript" id="lb-transcript">
            <div class="lb-transcript-welcome">
              <p>🎤 Press and hold the microphone to speak</p>
              <p class="lb-mode-indicator">
                <span id="lb-mode-text">Student Mode: Speak ${this.getLanguageName(this.studentLanguage)}, hear English</span>
              </p>
            </div>
          </div>
        </div>

        <div class="lb-mic-container">
          <button class="lb-mic-button" id="lb-mic-button">
            <svg class="lb-mic-icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
              <path d="M19 12C19 15.53 16.39 18.44 13 18.93V23H11V18.93C7.61 18.44 5 15.53 5 12H7C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12H19Z" fill="currentColor"/>
            </svg>
            <div class="lb-mic-pulse"></div>
          </button>
          <div class="lb-mic-status">Ready</div>
        </div>

        <div class="lb-quick-actions">
          <button class="lb-action-btn" id="lb-clear-transcript" title="Clear conversation">
            🗑️ Clear
          </button>
          <button class="lb-action-btn" id="lb-settings-btn" title="Settings">
            ⚙️ Settings
          </button>
        </div>
      </div>

      <!-- Settings Panel -->
      <div class="lb-settings-panel" id="lb-settings-panel" style="display: none;">
        <div class="lb-settings-header">
          <h3>Translation Settings</h3>
          <button class="lb-settings-close">×</button>
        </div>
        <div class="lb-settings-body">
          <div class="lb-setting-group">
            <label>Student Language:</label>
            <select id="lb-student-lang">
              <option value="fa">Dari (دری)</option>
              <option value="fa-IR-formal">Persian (فارسی - Formal)</option>
              <option value="ps">Pashto (پښتو)</option>
              <option value="ar">Arabic (العربية)</option>
              <option value="ur">Urdu (اردو)</option>
              <option value="uz">Uzbek (Oʻzbek)</option>
              <option value="uk">Ukrainian (Українська)</option>
              <option value="es">Spanish (Español)</option>
            </select>
          </div>
          <div class="lb-setting-group">
            <label>Teacher Language:</label>
            <select id="lb-teacher-lang">
              <option value="en" selected>English</option>
              <option value="es">Spanish (Español)</option>
            </select>
          </div>
          <div class="lb-setting-group">
            <label>
              <input type="checkbox" id="lb-auto-play">
              Auto-play translations
            </label>
          </div>
          <div class="lb-setting-group">
            <label>
              <input type="checkbox" id="lb-show-transcript" checked>
              Show text transcript
            </label>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.attachEventListeners();
    this.positionFloater();
  }

  /**
   * Attach event listeners to UI elements
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Mode switching
    const modeButtons = this.container.querySelectorAll<HTMLButtonElement>('.lb-mode-btn');
    modeButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        modeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = (btn.dataset.mode as 'student' | 'teacher') || 'student';
        this.updateModeIndicator();
      });
    });

    // Microphone button - Press and hold
    const micButton = this.container.querySelector<HTMLButtonElement>('#lb-mic-button');
    if (micButton) {
      let pressTimer: NodeJS.Timeout;

      micButton.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => {
          this.startListening();
        }, 100);
      });

      micButton.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
        if (this.isListening) {
          this.stopListening();
        }
      });

      micButton.addEventListener('mouseleave', () => {
        clearTimeout(pressTimer);
        if (this.isListening) {
          this.stopListening();
        }
      });

      // Touch events for mobile
      micButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        pressTimer = setTimeout(() => {
          this.startListening();
        }, 100);
      });

      micButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        clearTimeout(pressTimer);
        if (this.isListening) {
          this.stopListening();
        }
      });
    }

    // Dragging functionality
    const dragHandle = this.container.querySelector<HTMLDivElement>('.lb-float-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', this.startDragging.bind(this));
      document.addEventListener('mousemove', this.drag.bind(this));
      document.addEventListener('mouseup', this.stopDragging.bind(this));
    }

    // Close button
    const closeBtn = this.container.querySelector<HTMLButtonElement>('.lb-float-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Clear transcript
    const clearBtn = this.container.querySelector<HTMLButtonElement>('#lb-clear-transcript');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearTranscript();
      });
    }

    // Settings
    const settingsBtn = this.container.querySelector<HTMLButtonElement>('#lb-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.toggleSettings();
      });
    }

    const settingsCloseBtn = this.container.querySelector<HTMLButtonElement>('.lb-settings-close');
    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener('click', () => {
        this.toggleSettings();
      });
    }

    // Settings changes
    const studentLangSelect = this.container.querySelector<HTMLSelectElement>('#lb-student-lang');
    if (studentLangSelect) {
      studentLangSelect.addEventListener('change', (e) => {
        this.studentLanguage = (e.target as HTMLSelectElement).value;
        this.saveSettings();
        this.updateModeIndicator();
      });
    }

    const teacherLangSelect = this.container.querySelector<HTMLSelectElement>('#lb-teacher-lang');
    if (teacherLangSelect) {
      teacherLangSelect.addEventListener('change', (e) => {
        this.teacherLanguage = (e.target as HTMLSelectElement).value;
        this.saveSettings();
        this.updateModeIndicator();
      });
    }
  }

  /**
   * Start dragging the floating translator
   */
  private startDragging(e: MouseEvent): void {
    this.isDragging = true;
    this.dragOffset.x = e.clientX - this.position.x;
    this.dragOffset.y = e.clientY - this.position.y;
    if (this.container) {
      this.container.style.cursor = 'grabbing';
    }
  }

  /**
   * Handle drag movement
   */
  private drag(e: MouseEvent): void {
    if (!this.isDragging) return;

    this.position.x = e.clientX - this.dragOffset.x;
    this.position.y = e.clientY - this.dragOffset.y;

    // Constrain to viewport
    this.position.x = Math.max(0, Math.min(window.innerWidth - 300, this.position.x));
    this.position.y = Math.max(0, Math.min(window.innerHeight - 400, this.position.y));

    this.positionFloater();
  }

  /**
   * Stop dragging
   */
  private stopDragging(): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.container) {
        this.container.style.cursor = 'default';
      }
      this.savePosition();
    }
  }

  /**
   * Position the floating translator on screen
   */
  private positionFloater(): void {
    if (this.container) {
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
    }
  }

  /**
   * Start listening for speech input
   */
  private async startListening(): Promise<void> {
    this.isListening = true;
    const micButton = this.container?.querySelector<HTMLButtonElement>('#lb-mic-button');
    const statusText = this.container?.querySelector<HTMLDivElement>('.lb-mic-status');

    if (micButton) micButton.classList.add('listening');
    if (statusText) statusText.textContent = 'Listening...';

    const sourceLanguage = this.mode === 'student' ? this.studentLanguage : this.teacherLanguage;
    const targetLanguage = this.mode === 'student' ? this.teacherLanguage : this.studentLanguage;

    try {
      // Use Azure Speech SDK for recognition
      const recognition = await window.AzureClient.startSpeechRecognition(sourceLanguage);

      recognition.onResult = async (text: string) => {
        if (text) {
          await this.handleSpeechResult(text, sourceLanguage, targetLanguage);
        }
      };

      recognition.onError = (error: Error) => {
        // Localize error message based on user's language
        const userLang = this.mode === 'student' ? this.studentLanguage : this.teacherLanguage;
        let errorMsg = 'Microphone error. Please check permissions.';

        // Provide specific error messages
        if (error && error.toString().toLowerCase().includes('permission')) {
          errorMsg =
            window.MESSAGES?.getMessage('errors', 'MICROPHONE_PERMISSION_DENIED', userLang) ||
            'Microphone permission denied. Please enable microphone access in settings.';
        } else {
          errorMsg =
            window.MESSAGES?.getMessage('errors', 'SPEECH_RECOGNITION_ERROR', userLang) ||
            'Speech recognition error. Please try again.';
        }

        this.showError(errorMsg);
        console.error('Speech recognition error:', error);
      };
    } catch (error) {
      const userLang = this.mode === 'student' ? this.studentLanguage : this.teacherLanguage;
      const errorMsg =
        window.MESSAGES?.getMessage('errors', 'MICROPHONE_NOT_SUPPORTED', userLang) ||
        'Could not start microphone';
      this.showError(errorMsg);
      console.error('Microphone error:', error);
    }
  }

  /**
   * Stop listening for speech input
   */
  private async stopListening(): Promise<void> {
    this.isListening = false;
    const micButton = this.container?.querySelector<HTMLButtonElement>('#lb-mic-button');
    const statusText = this.container?.querySelector<HTMLDivElement>('.lb-mic-status');

    if (micButton) micButton.classList.remove('listening');
    if (statusText) statusText.textContent = 'Ready';

    await window.AzureClient.stopSpeechRecognition();
  }

  /**
   * Handle speech recognition result and translate
   */
  private async handleSpeechResult(
    originalText: string,
    sourceLang: string,
    targetLang: string
  ): Promise<void> {
    // Add to transcript
    this.addToTranscript(originalText, sourceLang, 'original');

    // Translate
    const translatedText = await window.AzureClient.translateText(
      originalText,
      sourceLang,
      targetLang
    );

    // Add translation to transcript
    this.addToTranscript(translatedText, targetLang, 'translated');

    // Speak translation
    await window.AzureClient.speakText(translatedText, targetLang);
  }

  /**
   * Add text to transcript display
   */
  private addToTranscript(text: string, language: string, type: 'original' | 'translated'): void {
    const transcript = this.container?.querySelector<HTMLDivElement>('#lb-transcript');
    if (!transcript) return;

    // Remove welcome message if present
    const welcome = transcript.querySelector('.lb-transcript-welcome');
    if (welcome) welcome.remove();

    const entry = document.createElement('div');
    entry.className = `lb-transcript-entry ${type}`;

    const icon =
      type === 'original'
        ? this.mode === 'student'
          ? '👨‍🎓'
          : '👩‍🏫'
        : this.mode === 'student'
          ? '👩‍🏫'
          : '👨‍🎓';

    const langName = this.getLanguageName(language);

    entry.innerHTML = `
      <div class="lb-entry-header">
        <span class="lb-entry-icon">${icon}</span>
        <span class="lb-entry-lang">${langName}</span>
        <span class="lb-entry-time">${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="lb-entry-text">${text}</div>
    `;

    transcript.appendChild(entry);
    transcript.scrollTop = transcript.scrollHeight;
  }

  /**
   * Clear transcript and show welcome message
   */
  private clearTranscript(): void {
    const transcript = this.container?.querySelector<HTMLDivElement>('#lb-transcript');
    if (!transcript) return;

    transcript.innerHTML = `
      <div class="lb-transcript-welcome">
        <p>🎤 Press and hold the microphone to speak</p>
        <p class="lb-mode-indicator">
          <span id="lb-mode-text">${this.getModeText()}</span>
        </p>
      </div>
    `;
  }

  /**
   * Update mode indicator text
   */
  private updateModeIndicator(): void {
    const modeText = this.container?.querySelector<HTMLSpanElement>('#lb-mode-text');
    if (modeText) {
      modeText.textContent = this.getModeText();
    }
  }

  /**
   * Get mode indicator text
   */
  private getModeText(): string {
    if (this.mode === 'student') {
      return `Student Mode: Speak ${this.getLanguageName(this.studentLanguage)}, hear ${this.getLanguageName(this.teacherLanguage)}`;
    } else {
      return `Teacher Mode: Speak ${this.getLanguageName(this.teacherLanguage)}, hear ${this.getLanguageName(this.studentLanguage)}`;
    }
  }

  /**
   * Get human-readable language name from language code
   */
  private getLanguageName(code: string): string {
    const names: LanguageNames = {
      en: 'English',
      fa: 'Dari',
      ps: 'Pashto',
      ar: 'Arabic',
      es: 'Spanish',
    };
    return names[code] || code;
  }

  /**
   * Toggle settings panel visibility
   */
  private toggleSettings(): void {
    const panel = this.container?.querySelector<HTMLDivElement>('#lb-settings-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Show error message temporarily
   */
  private showError(message: string): void {
    const statusText = this.container?.querySelector<HTMLDivElement>('.lb-mic-status');
    if (!statusText) return;

    statusText.textContent = message;
    statusText.style.color = '#ef4444';
    setTimeout(() => {
      statusText.textContent = 'Ready';
      statusText.style.color = '';
    }, 3000);
  }

  /**
   * Save language settings to storage
   */
  private async saveSettings(): Promise<void> {
    await chrome.storage.sync.set({
      studentLanguage: this.studentLanguage,
      teacherLanguage: this.teacherLanguage,
    });
  }

  /**
   * Save position to storage
   */
  private async savePosition(): Promise<void> {
    await chrome.storage.sync.set({
      floatingPosition: this.position,
    });
  }

  /**
   * Show the floating translator
   */
  private show(): void {
    if (!this.container) {
      this.createUI();
    }
    if (this.container) {
      this.container.style.display = 'block';
    }
    this.isActive = true;
    chrome.storage.sync.set({ floatingTranslatorEnabled: true });
  }

  /**
   * Hide the floating translator
   */
  private hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.isActive = false;
    chrome.storage.sync.set({ floatingTranslatorEnabled: false });
  }

  /**
   * Toggle the floating translator visibility
   */
  private toggle(): void {
    if (this.isActive) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize floating translator
if (typeof window.FloatingTranslator === 'undefined') {
  window.FloatingTranslator = new FloatingTranslator();
}
