/**
 * LanguageBridge Welcome Guide & Tutorial System
 * Interactive onboarding walkthrough for first-time and returning users
 */

/**
 * Interface for a single step in the welcome guide
 */
interface WelcomeStep {
  title: string;
  content: string;
  icon: string;
  buttonText: string;
}

/**
 * WelcomeGuide class provides an interactive onboarding experience
 */
class WelcomeGuide {
  private currentStep: number;
  private isActive: boolean;
  private overlay: HTMLDivElement | null;
  private modal: HTMLDivElement | null;
  private steps: WelcomeStep[];

  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.overlay = null;
    this.modal = null;

    // Tutorial steps with interactive content
    this.steps = [
      {
        title: 'Welcome to LanguageBridge! 🌉',
        content: `
          <p>Your AI-powered translation assistant for students and educators.</p>
          <p><strong>What LanguageBridge does:</strong></p>
          <ul style="text-align: left; margin: 12px 0; padding-left: 20px;">
            <li>Translates text to Dari, Pashto, Arabic, Spanish & more</li>
            <li>Reads translations aloud with natural voices</li>
            <li>Works on any website, including Google Docs & PDFs</li>
            <li>Pause, resume, and control playback speed</li>
          </ul>
        `,
        icon: '🌉',
        buttonText: "Let's Get Started →",
      },
      {
        title: 'Quick Translation 📝',
        content: `
          <p><strong>On most websites:</strong></p>
          <ol style="text-align: left; margin: 12px 0; padding-left: 20px;">
            <li>Highlight any text on the page</li>
            <li>The LanguageBridge toolbar will expand at the bottom</li>
            <li>Click <strong>▶ Play</strong> for audio translation</li>
            <li>Or click <strong>📖 Read</strong> for written translation only</li>
          </ol>
          <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 13px;">
            💡 <strong>Tip:</strong> The translation appears in a draggable box - click and drag the header to move it!
          </div>
        `,
        icon: '📝',
        buttonText: 'Next: Google Docs →',
      },
      {
        title: 'Google Docs & PDFs 📄',
        content: `
          <p>For documents where selection doesn't work:</p>
          <ol style="text-align: left; margin: 12px 0; padding-left: 20px;">
            <li><strong>Select and Copy</strong> text (Ctrl+C / Cmd+C)</li>
            <li><strong>Paste</strong> into the text input box in the toolbar</li>
            <li>Press <strong>Enter</strong> or click <strong>▶ Play</strong></li>
          </ol>
          <div style="margin-top: 16px; padding: 12px; background: rgba(251, 146, 60, 0.2); border-radius: 8px; font-size: 13px;">
            📋 The text input box is in the toolbar - look for "Paste or type text to translate..."
          </div>
        `,
        icon: '📄',
        buttonText: 'Next: Controls →',
      },
      {
        title: 'Playback Controls 🎵',
        content: `
          <p><strong>Master the audio controls:</strong></p>
          <ul style="text-align: left; margin: 12px 0; padding-left: 20px;">
            <li><strong>⏯ Pause/Resume:</strong> Click play button during playback to pause. Click again to resume from same position</li>
            <li><strong>⏹ Stop:</strong> Completely stop and reset translation</li>
            <li><strong>🎚 Speed Slider:</strong> Adjust reading speed (0.5x - 2.0x)</li>
            <li><strong>🔊 TTS Toggle:</strong> Turn text-to-speech on/off</li>
          </ul>
          <div style="margin-top: 16px; padding: 12px; background: rgba(139, 92, 246, 0.2); border-radius: 8px; font-size: 13px;">
            ⚡ Audio plays sentence-by-sentence and blocks new translations until finished!
          </div>
        `,
        icon: '🎵',
        buttonText: 'Next: Languages →',
      },
      {
        title: 'Language Settings 🌍',
        content: `
          <p><strong>Choose your target language:</strong></p>
          <ul style="text-align: left; margin: 12px 0; padding-left: 20px;">
            <li><strong>Dari (دری)</strong> - Afghan Persian</li>
            <li><strong>Pashto (پښتو)</strong> - Afghan Pashto</li>
            <li><strong>Arabic (العربية)</strong> - Modern Standard Arabic</li>
            <li><strong>Urdu (اردو)</strong> - Pakistani/Indian Urdu</li>
            <li><strong>Uzbek (O'zbek)</strong> - Uzbekistan</li>
            <li><strong>Ukrainian (Українська)</strong></li>
            <li><strong>Spanish (Español)</strong></li>
            <li><strong>English</strong></li>
          </ul>
          <p style="margin-top: 12px;">Use the language dropdown in the toolbar to switch languages anytime.</p>
          <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.2); border-radius: 8px; font-size: 13px;">
            🗣️ Each language uses native AI voices for natural pronunciation
          </div>
        `,
        icon: '🌍',
        buttonText: 'Almost Done →',
      },
      {
        title: "You're All Set! 🎉",
        content: `
          <p><strong>Start using LanguageBridge:</strong></p>
          <ol style="text-align: left; margin: 12px 0; padding-left: 20px;">
            <li>Select your preferred language from the dropdown</li>
            <li>Highlight text anywhere on the web</li>
            <li>Click Play to hear the translation</li>
          </ol>
          <div style="margin-top: 16px; padding: 12px; background: rgba(251, 191, 36, 0.2); border-radius: 8px; font-size: 13px;">
            ❓ <strong>Need help later?</strong> Click the <strong>?</strong> button in the toolbar to reopen this guide.
          </div>
          <p style="margin-top: 16px; font-size: 14px; opacity: 0.9;">
            Happy translating! 🌉
          </p>
        `,
        icon: '🎉',
        buttonText: 'Finish Tutorial ✓',
      },
    ];
  }

  /**
   * Check if user has seen the welcome guide
   * @returns {boolean} True if the guide has been completed
   */
  public hasSeenGuide(): boolean {
    return localStorage.getItem('lb-welcome-guide-completed') === 'true';
  }

  /**
   * Mark guide as completed
   * @returns {void}
   */
  public markCompleted(): void {
    localStorage.setItem('lb-welcome-guide-completed', 'true');
  }

  /**
   * Show the welcome guide (first time or manually triggered)
   * @param {boolean} startFromBeginning - Whether to start from the first step
   * @returns {void}
   */
  public show(startFromBeginning: boolean = false): void {
    if (this.isActive) return;

    this.isActive = true;
    this.currentStep = startFromBeginning ? 0 : 0;

    this.createOverlay();
    this.createModal();
    this.renderStep();
  }

  /**
   * Create dark overlay
   * @returns {void}
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'lb-welcome-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 999999;
      animation: fadeIn 0.3s ease;
    `;

    document.body.appendChild(this.overlay);
  }

  /**
   * Create modal container
   * @returns {void}
   */
  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.id = 'lb-welcome-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 30%, #f97316 70%, #fb923c 100%);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      z-index: 1000000;
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      overflow-y: auto;
      animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: white;
    `;

    document.body.appendChild(this.modal);
  }

  /**
   * Render current step
   * @returns {void}
   */
  private renderStep(): void {
    const step = this.steps[this.currentStep];
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;

    if (!this.modal) return;

    this.modal.innerHTML = `
      <div style="padding: 32px;">
        <!-- Progress bar -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 600; opacity: 0.8;">
              Step ${this.currentStep + 1} of ${this.steps.length}
            </span>
            ${
              this.currentStep > 0
                ? `
              <button id="lb-guide-skip" style="
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                font-weight: 600;
              ">Skip Tutorial</button>
            `
                : ''
            }
          </div>
          <div style="
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            overflow: hidden;
          ">
            <div style="
              width: ${progress}%;
              height: 100%;
              background: white;
              border-radius: 3px;
              transition: width 0.4s ease;
            "></div>
          </div>
        </div>

        <!-- Icon -->
        <div style="text-align: center; font-size: 64px; margin-bottom: 20px;">
          ${step.icon}
        </div>

        <!-- Title -->
        <h2 style="
          text-align: center;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 20px;
          line-height: 1.2;
        ">${step.title}</h2>

        <!-- Content -->
        <div style="
          font-size: 16px;
          line-height: 1.6;
          text-align: center;
        ">
          ${step.content}
        </div>

        <!-- Navigation buttons -->
        <div style="
          display: flex;
          gap: 12px;
          margin-top: 32px;
        ">
          ${
            this.currentStep > 0
              ? `
            <button id="lb-guide-back" style="
              flex: 1;
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.4);
              color: white;
              padding: 14px 24px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">← Back</button>
          `
              : ''
          }
          <button id="lb-guide-next" style="
            flex: ${this.currentStep > 0 ? '2' : '1'};
            background: white;
            border: none;
            color: #7c3aed;
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          ">${step.buttonText}</button>
        </div>
      </div>
    `;

    this.addAnimations();
    this.attachEventListeners();
  }

  /**
   * Add CSS animations to the document
   * @returns {void}
   */
  private addAnimations(): void {
    if (document.getElementById('lb-guide-animations')) return;

    const style = document.createElement('style');
    style.id = 'lb-guide-animations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      #lb-guide-next:hover, #lb-guide-back:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      #lb-guide-skip:hover {
        background: rgba(255,255,255,0.25);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Attach event listeners to guide buttons
   * @returns {void}
   */
  private attachEventListeners(): void {
    const nextBtn = document.getElementById('lb-guide-next') as HTMLButtonElement | null;
    const backBtn = document.getElementById('lb-guide-back') as HTMLButtonElement | null;
    const skipBtn = document.getElementById('lb-guide-skip') as HTMLButtonElement | null;

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextStep());
    }
    if (backBtn) {
      backBtn.addEventListener('click', () => this.previousStep());
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.close());
    }
  }

  /**
   * Go to next step
   * @returns {void}
   */
  public nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      // Finished tutorial - close() will mark as completed
      this.close();
    }
  }

  /**
   * Go to previous step
   * @returns {void}
   */
  public previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }

  /**
   * Close the guide
   * @returns {void}
   */
  public close(): void {
    this.isActive = false;

    // Mark as completed so it won't show again
    // This ensures tutorial only appears once, even if skipped
    this.markCompleted();

    if (this.modal) {
      this.modal.style.animation = 'scaleIn 0.3s ease reverse';
    }
    if (this.overlay) {
      this.overlay.style.animation = 'fadeIn 0.3s ease reverse';
    }

    setTimeout(() => {
      if (this.modal) this.modal.remove();
      if (this.overlay) this.overlay.remove();
      this.modal = null;
      this.overlay = null;
    }, 300);
  }

  /**
   * Initialize guide (but don't auto-show)
   * MVP MODE: Only show when user clicks ? button
   * @returns {WelcomeGuide} The initialized guide instance
   */
  public static init(): WelcomeGuide {
    const guide = new WelcomeGuide();

    // === MVP MODE: Disabled auto-show ===
    // Tutorial only appears when user clicks ? help button
    // This prevents annoying repeated popups during testing

    // if (!guide.hasSeenGuide()) {
    //   setTimeout(() => {
    //     guide.show();
    //   }, 1000);
    // }

    // Make guide accessible globally for toolbar button
    (window as any).LanguageBridgeGuide = guide;

    return guide;
  }
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WelcomeGuide.init());
} else {
  WelcomeGuide.init();
}
