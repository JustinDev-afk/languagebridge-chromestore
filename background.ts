// LanguageBridge Background Service Worker
// Handles keyboard shortcuts and extension commands

console.log('LanguageBridge background service worker loaded');

// === TYPE DEFINITIONS ===

interface StorageSettings {
  // Access & Authentication
  demoPassword: string;
  demoSessionToken: string;
  demoSessionExpiry: string;

  // Azure Configuration (Optional)
  speechKey: string;
  translatorKey: string;
  azureRegion: string;

  // User Preferences
  defaultLanguage: string;
  verbosity: string;
  speechRate: number;

  // Feature Toggles
  toolbarEnabled: boolean;
  floatingTranslatorEnabled: boolean;

  // Additional fields from chrome.storage.get
  [key: string]: string | number | boolean;
}

interface ToolbarToggleMessage {
  action: 'toggle-toolbar';
}

interface FloatingTranslatorToggleMessage {
  action: 'toggle-floating-translator';
}

interface GetSettingsMessage {
  action: 'getSettings';
}

interface SaveSettingsMessage {
  action: 'saveSettings';
  settings: Partial<StorageSettings>;
}

interface LogErrorMessage {
  action: 'logError';
  error: string;
}

type ContentScriptMessage =
  | ToolbarToggleMessage
  | FloatingTranslatorToggleMessage
  | GetSettingsMessage
  | SaveSettingsMessage
  | LogErrorMessage;

interface MessageResponse {
  success: boolean;
  settings?: StorageSettings;
  error?: string;
}

// === API CONFIGURATION ===

const API_ENDPOINT: string = 'https://languagebridge-api.azurewebsites.net/api';

// Disabled: Auto-provisioning required backend that doesn't exist yet
// Teachers now enter access codes or API keys in Settings page instead
// async function autoProvisionDemoKey() { ... }

// === COMMAND LISTENERS ===

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command: string): void => {
  console.log('Command received:', command);

  // Get the active tab
  chrome.tabs.query(
    { active: true, currentWindow: true },
    (tabs: chrome.tabs.Tab[]): void => {
      if (!tabs[0]?.id) {
        console.error('No active tab found');
        return;
      }

      const tabId: number = tabs[0].id;

      // Send message to content script based on command
      if (command === 'toggle-toolbar') {
        chrome.tabs.sendMessage(
          tabId,
          { action: 'toggle-toolbar' } as ToolbarToggleMessage,
          (response: MessageResponse): void => {
            if (chrome.runtime.lastError) {
              console.error('Error toggling toolbar:', chrome.runtime.lastError);
            } else {
              console.log('Toolbar toggled:', response);
            }
          }
        );
      } else if (command === 'toggle-floating-translator') {
        chrome.tabs.sendMessage(
          tabId,
          { action: 'toggle-floating-translator' } as FloatingTranslatorToggleMessage,
          (response: MessageResponse): void => {
            if (chrome.runtime.lastError) {
              console.error('Error toggling floating translator:', chrome.runtime.lastError);
            } else {
              console.log('Floating translator toggled:', response);
            }
          }
        );
      }
    }
  );
});

// === INSTALLATION & UPDATE HANDLERS ===

// === API KEY MANAGEMENT ===
// Keys are now managed through:
// 1. Access code system (via Settings page)
// 2. Manual key input (via Settings page - Advanced section)
// 3. Backend provisioning (future - when backend implemented)
//
// NO auto-provisioning - teacher must explicitly enter code or keys

// Handle extension installation
chrome.runtime.onInstalled.addListener(
  async (details: chrome.runtime.InstalledDetails): Promise<void> => {
    if (details.reason === 'install') {
      console.log('LanguageBridge installed successfully!');

      // Set default settings (only if not already set)
      const existing: Partial<StorageSettings> = await chrome.storage.sync.get([
        'azureSpeechKey',
        'azureTranslatorKey',
        'azureRegion',
        'defaultLanguage',
        'verbosity',
        'speechRate',
        'toolbarEnabled',
        'floatingTranslatorEnabled'
      ]);

      const defaults: StorageSettings = {
        // === Access & Authentication ===
        demoPassword: existing.demoPassword || '',
        demoSessionToken: existing.demoSessionToken || '',
        demoSessionExpiry: existing.demoSessionExpiry || '',

        // === Azure Configuration (Optional) ===
        speechKey: existing.speechKey || '', // Custom Azure Speech key
        translatorKey: existing.translatorKey || '', // Custom Azure Translator key
        azureRegion: (existing.azureRegion as string) || 'westus',

        // === User Preferences ===
        defaultLanguage: existing.defaultLanguage || 'fa', // Dari as default for Afghan students
        verbosity: existing.verbosity || 'balanced',
        speechRate: (existing.speechRate as number) || 1.0,

        // === Feature Toggles ===
        toolbarEnabled:
          existing.toolbarEnabled !== undefined ? (existing.toolbarEnabled as boolean) : true,
        floatingTranslatorEnabled:
          existing.floatingTranslatorEnabled !== undefined
            ? (existing.floatingTranslatorEnabled as boolean)
            : true
      };

      await chrome.storage.sync.set(defaults);

      console.log('Default settings initialized');
    } else if (details.reason === 'update') {
      console.log('LanguageBridge updated to version', chrome.runtime.getManifest().version);

      // Ensure default language is set for existing users
      const { defaultLanguage }: Partial<StorageSettings> = await chrome.storage.sync.get([
        'defaultLanguage'
      ]);
      if (!defaultLanguage) {
        await chrome.storage.sync.set({ defaultLanguage: 'fa' });
      }
    }
  }
);

// === MESSAGE HANDLERS ===

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener(
  (
    request: ContentScriptMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean | void => {
    console.log('Background received message:', request);

    // Handle different message types
    if (request.action === 'getSettings') {
      // Retrieve settings from storage
      chrome.storage.sync.get(null, (settings: Partial<StorageSettings>): void => {
        sendResponse({ success: true, settings: settings as StorageSettings });
      });
      return true; // Required for async response
    } else if (request.action === 'saveSettings') {
      // Save settings to storage
      const saveRequest = request as SaveSettingsMessage;
      chrome.storage.sync.set(saveRequest.settings, (): void => {
        sendResponse({ success: true });
      });
      return true; // Required for async response
    } else if (request.action === 'logError') {
      // Log errors from content scripts
      const logRequest = request as LogErrorMessage;
      console.error('Content script error:', logRequest.error);
      sendResponse({ success: true });
    }

    return false;
  }
);

// === SERVICE WORKER KEEP-ALIVE ===

// Keep service worker alive with periodic ping
const keepAlive = (): void => {
  chrome.runtime.getPlatformInfo((): void => {
    // This just ensures the service worker doesn't sleep
  });
};

// Ping every 20 seconds to prevent service worker from sleeping
setInterval(keepAlive, 20000);
