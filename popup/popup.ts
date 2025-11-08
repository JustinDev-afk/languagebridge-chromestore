/**
 * LanguageBridge - Popup Script
 * Controls the extension popup UI
 */

/**
 * Usage statistics interface
 */
interface UsageStats {
  translations: number;
  speechRecognitions: number;
}

/**
 * Settings interface
 */
interface Settings {
  toolbarEnabled?: boolean;
  floatingTranslatorEnabled?: boolean;
}

/**
 * Message interface for tab communication
 */
interface TabMessage {
  action: 'toggle-toolbar' | 'toggle-floating-translator';
}

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  try {
    // Load current settings
    const settings = await chrome.storage.sync.get([
      'toolbarEnabled',
      'floatingTranslatorEnabled'
    ]) as Settings;

    const stats = await chrome.storage.local.get(['usageStats']) as { usageStats?: UsageStats };
    const usageStats: UsageStats = stats.usageStats || { translations: 0, speechRecognitions: 0 };

    // Initialize toggle switches
    const toolbarSwitch = document.getElementById('toolbar-switch') as HTMLElement;
    const translatorSwitch = document.getElementById('translator-switch') as HTMLElement;

    if (settings.toolbarEnabled) {
      toolbarSwitch.classList.add('active');
    }

    if (settings.floatingTranslatorEnabled) {
      translatorSwitch.classList.add('active');
    }

    // Display usage stats
    const translationsCountElement = document.getElementById('translations-count');
    const speechCountElement = document.getElementById('speech-count');

    if (translationsCountElement) {
      translationsCountElement.textContent = usageStats.translations.toString();
    }

    if (speechCountElement) {
      speechCountElement.textContent = usageStats.speechRecognitions.toString();
    }

    // Toolbar toggle
    const toolbarToggleBtn = document.getElementById('toolbar-toggle');
    if (toolbarToggleBtn) {
      toolbarToggleBtn.addEventListener('click', async (): Promise<void> => {
        const isActive = toolbarSwitch.classList.contains('active');
        toolbarSwitch.classList.toggle('active');

        await chrome.storage.sync.set({ toolbarEnabled: !isActive });

        // Send message to active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const [tab] = tabs;
        if (tab && tab.id) {
          const message: TabMessage = { action: 'toggle-toolbar' };
          chrome.tabs.sendMessage(tab.id, message);
        }
      });
    }

    // Floating translator toggle
    const translatorToggleBtn = document.getElementById('translator-toggle');
    if (translatorToggleBtn) {
      translatorToggleBtn.addEventListener('click', async (): Promise<void> => {
        const isActive = translatorSwitch.classList.contains('active');
        translatorSwitch.classList.toggle('active');

        await chrome.storage.sync.set({ floatingTranslatorEnabled: !isActive });

        // Send message to active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const [tab] = tabs;
        if (tab && tab.id) {
          const message: TabMessage = { action: 'toggle-floating-translator' };
          chrome.tabs.sendMessage(tab.id, message);
        }
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (): void => {
        chrome.runtime.openOptionsPage();
        window.close();
      });
    }

    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', (): void => {
        chrome.tabs.create({
          url: chrome.runtime.getURL('docs/help.html')
        });
        window.close();
      });
    }

    // Privacy link
    const privacyLink = document.getElementById('privacy-link');
    if (privacyLink) {
      privacyLink.addEventListener('click', (e: MouseEvent): void => {
        e.preventDefault();
        chrome.tabs.create({
          url: chrome.runtime.getURL('docs/privacy.html')
        });
        window.close();
      });
    }

    // Support link
    const supportLink = document.getElementById('support-link');
    if (supportLink) {
      supportLink.addEventListener('click', (e: MouseEvent): void => {
        e.preventDefault();
        chrome.tabs.create({
          url: chrome.runtime.getURL('docs/support.html')
        });
        window.close();
      });
    }
  } catch (error: unknown) {
    console.error('Error initializing popup:', error);
  }
});
