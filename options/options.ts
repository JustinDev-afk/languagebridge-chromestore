/**
 * LanguageBridge - Options Page Script
 * Handles settings UI and storage
 */

/**
 * Default settings structure
 */
interface Settings {
  // Access & Authentication
  demoPassword: string;
  demoSessionToken: string;
  demoSessionExpiry: string;

  // Azure Configuration (optional - for advanced users)
  speechKey: string;           // Custom Azure Speech key (optional)
  translatorKey: string;       // Custom Azure Translator key (optional)
  azureRegion: string;

  // Demo Mode Toggle
  demoModeEnabled: boolean;   // Show/hide Azure key inputs

  // User Preferences
  defaultLanguage: string;   // Default: Dari
  speechRate: number;
  verbosity: string;

  // Feature Toggles
  toolbarEnabled: boolean;
  floatingTranslatorEnabled: boolean;
}

/**
 * Demo password configuration
 */
interface DemoPasswordConfig {
  enabled: boolean;
  expiresAt: string;
  usageLimit: number;
  tier: string;
  description: string;
}

/**
 * Session data interface
 */
interface SessionData {
  demoSessionToken?: string;
  demoSessionExpiry?: string;
  expiresAt?: string;
  tier?: string;
  description?: string;
  currentUsage?: number;
  usageLimit?: number;
}

/**
 * Usage data interface
 */
interface UsageData {
  currentUsage?: number;
  usageLimit?: number;
}

/**
 * API response interface for demo key
 */
interface DemoKeyResponse {
  key: string;
  expiresIn?: string;
  limit?: number;
}

/**
 * API response interface for key validation
 */
interface KeyValidationResponse {
  status: string;
  tier: string;
  usage?: {
    used: number;
    limit: number;
  };
  expiresAt?: string;
}

/**
 * Extend window interface for global variables
 */
declare global {
  interface Window {
    usageUpdateInterval?: NodeJS.Timeout;
  }
}

/**
 * Default settings configuration
 */
const DEFAULT_SETTINGS: Settings = {
  // Access & Authentication
  demoPassword: '',
  demoSessionToken: '',
  demoSessionExpiry: '',

  // Azure Configuration (optional - for advanced users)
  speechKey: '',           // Custom Azure Speech key (optional)
  translatorKey: '',       // Custom Azure Translator key (optional)
  azureRegion: 'westus',

  // Demo Mode Toggle
  demoModeEnabled: true,   // Show/hide Azure key inputs

  // User Preferences
  defaultLanguage: 'fa',   // Default: Dari
  speechRate: 1.0,
  verbosity: 'balanced',

  // Feature Toggles
  toolbarEnabled: true,
  floatingTranslatorEnabled: true
};

/**
 * Demo password configuration (local validation - no backend required)
 */
const DEMO_PASSWORDS: { [key: string]: DemoPasswordConfig } = {
  'DEMO-2025-SPRING': {
    enabled: true,
    expiresAt: '2025-12-31T23:59:59Z',
    usageLimit: 1000,
    tier: 'demo',
    description: 'Spring 2025 Demo Access'
  },
  'TEACHER-TRIAL-2025': {
    enabled: true,
    expiresAt: '2025-12-31T23:59:59Z',
    usageLimit: 500,
    tier: 'demo',
    description: 'Teacher Trial Access'
  },
  'SCHOOL-DEMO-KEY': {
    enabled: true,
    expiresAt: '2025-12-31T23:59:59Z',
    usageLimit: 2000,
    tier: 'demo',
    description: 'School Demo Access'
  }
};

// Load settings when page loads
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  attachEventListeners();
});

/**
 * Load settings from storage and populate form
 */
async function loadSettings(): Promise<void> {
  try {
    const settings = (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Partial<Settings>;

    // Demo Password
    const demoPasswordField = document.getElementById('demoPassword') as HTMLInputElement | null;
    if (demoPasswordField) {
      demoPasswordField.value = settings.demoPassword || '';
    }

    // Show session info if active
    if (settings.demoSessionToken && settings.demoSessionExpiry) {
      const expiry = new Date(settings.demoSessionExpiry);
      if (expiry > new Date()) {
        await showSessionInfo(settings as SessionData);
      }
    }

    // Azure Region
    const azureRegionField = document.getElementById('azureRegion') as HTMLSelectElement | null;
    if (azureRegionField) {
      azureRegionField.value = settings.azureRegion || 'westus';
    }

    // Azure Keys (for advanced users)
    const azureSpeechKeyField = document.getElementById('azureSpeechKey') as HTMLInputElement | null;
    if (azureSpeechKeyField) {
      azureSpeechKeyField.value = settings.speechKey || '';
    }

    const azureTranslatorKeyField = document.getElementById('azureTranslatorKey') as HTMLInputElement | null;
    if (azureTranslatorKeyField) {
      azureTranslatorKeyField.value = settings.translatorKey || '';
    }

    // Language settings
    const defaultLanguageField = document.getElementById('defaultLanguage') as HTMLSelectElement | null;
    if (defaultLanguageField) {
      defaultLanguageField.value = settings.defaultLanguage || 'fa';
    }

    // Reading preferences
    const speechRateField = document.getElementById('speechRate') as HTMLInputElement | null;
    const speedValueField = document.getElementById('speedValue') as HTMLSpanElement | null;
    if (speechRateField && speedValueField) {
      speechRateField.value = String(settings.speechRate || 1.0);
      speedValueField.textContent = `${settings.speechRate || 1.0}x`;
    }

    // Verbosity radio buttons
    const verbosityRadio = document.querySelector(`input[name="verbosity"][value="${settings.verbosity || 'balanced'}"]`) as HTMLInputElement | null;
    if (verbosityRadio) {
      verbosityRadio.checked = true;
    }

    // Checkboxes
    const toolbarEnabledField = document.getElementById('toolbarEnabled') as HTMLInputElement | null;
    if (toolbarEnabledField) {
      toolbarEnabledField.checked = settings.toolbarEnabled !== false;
    }

    const floatingTranslatorEnabledField = document.getElementById('floatingTranslatorEnabled') as HTMLInputElement | null;
    if (floatingTranslatorEnabledField) {
      floatingTranslatorEnabledField.checked = settings.floatingTranslatorEnabled !== false;
    }

    // Demo Mode Toggle
    const demoModeCheckbox = document.getElementById('demoModeEnabled') as HTMLInputElement | null;
    if (demoModeCheckbox) {
      demoModeCheckbox.checked = settings.demoModeEnabled !== false;
      // Show/hide Azure keys section based on demo mode
      toggleAzureKeysSection(settings.demoModeEnabled !== false);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

/**
 * Attach event listeners to form elements
 */
function attachEventListeners(): void {
  // Speed slider - update display value
  const speedSlider = document.getElementById('speechRate') as HTMLInputElement | null;
  const speedValue = document.getElementById('speedValue') as HTMLSpanElement | null;
  if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      speedValue.textContent = `${value.toFixed(1)}x`;
    });
  }

  // Demo Mode Toggle - show/hide Azure keys section
  const demoModeCheckbox = document.getElementById('demoModeEnabled') as HTMLInputElement | null;
  if (demoModeCheckbox) {
    demoModeCheckbox.addEventListener('change', (e) => {
      toggleAzureKeysSection((e.target as HTMLInputElement).checked);
    });
  }

  // Save button
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement | null;
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }

  // Close button
  const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement | null;
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.close();
    });
  }

  // Reset button
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement | null;
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSettings);
  }

  // Clear button
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement | null;
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllData);
  }

  // === MVP MODE: Demo/Premium buttons hidden ===
  // Re-enable when implementing paid subscriptions
  // const getDemoKeyBtn = document.getElementById('getDemoKeyBtn') as HTMLButtonElement | null;
  // if (getDemoKeyBtn) {
  //   getDemoKeyBtn.addEventListener('click', getDemoKey);
  // }
  // const upgradePremiumBtn = document.getElementById('upgradePremiumBtn') as HTMLButtonElement | null;
  // if (upgradePremiumBtn) {
  //   upgradePremiumBtn.addEventListener('click', () => {
  //     window.open('https://languagebridge.app/pricing', '_blank');
  //   });
  // }

  // Auto-save on change (optional)
  const autoSaveElements: string[] = [
    'defaultLanguage',
    'speechRate',
    'toolbarEnabled',
    'floatingTranslatorEnabled'
  ];

  autoSaveElements.forEach(id => {
    const element = document.getElementById(id) as HTMLInputElement | null;
    if (element) {
      element.addEventListener('change', () => {
        // Show save reminder
        const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement | null;
        if (saveBtn) {
          saveBtn.style.animation = 'pulse 0.5s';
          setTimeout(() => {
            saveBtn.style.animation = '';
          }, 500);
        }
      });
    }
  });

  // Verbosity radio buttons
  document.querySelectorAll<HTMLInputElement>('input[name="verbosity"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement | null;
      if (saveBtn) {
        saveBtn.style.animation = 'pulse 0.5s';
        setTimeout(() => {
          saveBtn.style.animation = '';
        }, 500);
      }
    });
  });
}

/**
 * Save settings to storage
 */
async function saveSettings(): Promise<void> {
  try {
    const demoPasswordField = document.getElementById('demoPassword') as HTMLInputElement | null;
    const demoPassword = demoPasswordField?.value.trim() || '';

    // If demo password changed, validate it
    const currentSettings = (await chrome.storage.sync.get(['demoPassword'])) as Partial<Settings>;
    if (demoPassword && demoPassword !== currentSettings.demoPassword) {
      const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement | null;
      const originalText = saveBtn?.innerHTML || '';

      try {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '⏳ Validating...';
        }

        const validated = await validateDemoPassword(demoPassword);
        if (!validated) {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
          }
          return;
        }
      } catch (error) {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
        }
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    }

    const azureRegionField = document.getElementById('azureRegion') as HTMLSelectElement | null;
    const demoModeCheckbox = document.getElementById('demoModeEnabled') as HTMLInputElement | null;
    const defaultLanguageField = document.getElementById('defaultLanguage') as HTMLSelectElement | null;
    const speechRateField = document.getElementById('speechRate') as HTMLInputElement | null;
    const verbosityRadio = document.querySelector('input[name="verbosity"]:checked') as HTMLInputElement | null;
    const toolbarEnabledField = document.getElementById('toolbarEnabled') as HTMLInputElement | null;
    const floatingTranslatorEnabledField = document.getElementById('floatingTranslatorEnabled') as HTMLInputElement | null;

    const settings: Partial<Settings> = {
      demoPassword: demoPassword,
      azureRegion: azureRegionField?.value || 'westus',
      demoModeEnabled: demoModeCheckbox?.checked !== false,
      defaultLanguage: defaultLanguageField?.value || 'fa',
      speechRate: parseFloat(speechRateField?.value || '1.0'),
      verbosity: verbosityRadio?.value || 'balanced',
      toolbarEnabled: toolbarEnabledField?.checked || false,
      floatingTranslatorEnabled: floatingTranslatorEnabledField?.checked || false
    };

    // Add optional Azure keys if provided
    const azureSpeechKeyField = document.getElementById('azureSpeechKey') as HTMLInputElement | null;
    const azureTranslatorKeyField = document.getElementById('azureTranslatorKey') as HTMLInputElement | null;

    const azureSpeechKey = azureSpeechKeyField?.value.trim() || '';
    const azureTranslatorKey = azureTranslatorKeyField?.value.trim() || '';

    if (azureSpeechKey) {
      settings.speechKey = azureSpeechKey;
      console.log('✓ Custom Azure Speech Key configured');
    }
    if (azureTranslatorKey) {
      settings.translatorKey = azureTranslatorKey;
      console.log('✓ Custom Azure Translator Key configured');
    }

    // Keep session info from validation
    const sessionData = (await chrome.storage.sync.get(['demoSessionToken', 'demoSessionExpiry'])) as Partial<Settings>;
    if (sessionData.demoSessionToken) {
      settings.demoSessionToken = sessionData.demoSessionToken;
      settings.demoSessionExpiry = sessionData.demoSessionExpiry;
    }

    await chrome.storage.sync.set(settings);

    showStatus('Settings saved successfully!', 'success');

    // Notify content scripts of settings change
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settings-updated',
          settings: {
            userLanguage: settings.defaultLanguage,
            readingSpeed: settings.speechRate,
            verbosity: settings.verbosity
          }
        }).catch(() => {
          // Ignore errors for tabs that don't have the content script
        });
      }
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings. Please try again.', 'error');
  }
}

/**
 * Validate demo password locally (no backend required)
 */
async function validateDemoPassword(password: string): Promise<boolean> {
  try {
    // Check if password exists in local config
    const demoConfig = DEMO_PASSWORDS[password];

    if (!demoConfig) {
      showStatus('Invalid demo password. Please check your password and try again.', 'error');
      return false;
    }

    if (!demoConfig.enabled) {
      showStatus('This demo password has been disabled. Please contact support.', 'error');
      return false;
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(demoConfig.expiresAt);

    if (expiresAt < now) {
      showStatus('This demo password has expired.', 'error');
      return false;
    }

    // Initialize usage tracking for this password
    const usageKey = `demoUsage_${password}`;
    const usageData = (await chrome.storage.local.get([usageKey])) as { [key: string]: number };
    const currentUsage = usageData[usageKey] || 0;

    // Check if usage limit exceeded
    if (currentUsage >= demoConfig.usageLimit) {
      showStatus(`Usage limit reached (${currentUsage}/${demoConfig.usageLimit}). Please contact support for more access.`, 'error');
      return false;
    }

    // Store session info locally
    await chrome.storage.sync.set({
      demoPassword: password,
      demoSessionExpiry: demoConfig.expiresAt
    });

    // Store usage info in local storage
    await chrome.storage.local.set({
      currentUsage: currentUsage,
      usageLimit: demoConfig.usageLimit
    });

    await showSessionInfo({
      demoSessionExpiry: demoConfig.expiresAt,
      tier: demoConfig.tier,
      description: demoConfig.description,
      currentUsage: currentUsage,
      usageLimit: demoConfig.usageLimit
    });

    showStatus('Demo access activated! 🎉', 'success');
    return true;
  } catch (error) {
    console.error('Error validating demo password:', error);
    showStatus('Error validating demo password. Please try again.', 'error');
    return false;
  }
}

/**
 * Show active session information
 */
async function showSessionInfo(sessionData: SessionData): Promise<void> {
  const sessionInfo = document.getElementById('sessionInfo') as HTMLDivElement | null;
  if (!sessionInfo) return;

  const expiry = new Date(sessionData.demoSessionExpiry || sessionData.expiresAt || new Date());
  const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Get latest usage from local storage (updated by azure-client.js after each API call)
  const usageData = (await chrome.storage.local.get(['currentUsage', 'usageLimit'])) as UsageData;
  const currentUsage = usageData.currentUsage || sessionData.currentUsage || 0;
  const usageLimit = usageData.usageLimit || sessionData.usageLimit || 1000;

  const sessionTierElement = document.getElementById('sessionTier') as HTMLDivElement | null;
  if (sessionTierElement) {
    sessionTierElement.textContent = `Tier: ${sessionData.tier || 'Demo'}`;
  }

  const sessionExpiryElement = document.getElementById('sessionExpiry') as HTMLDivElement | null;
  if (sessionExpiryElement) {
    sessionExpiryElement.textContent = `Expires: ${daysLeft} days`;
  }

  const sessionUsageElement = document.getElementById('sessionUsage') as HTMLDivElement | null;
  if (sessionUsageElement) {
    sessionUsageElement.textContent = `Usage: ${currentUsage}/${usageLimit} requests`;
  }

  sessionInfo.style.display = 'block';

  // Update usage every 5 seconds when page is open
  if (!window.usageUpdateInterval) {
    window.usageUpdateInterval = setInterval(async () => {
      const latest = (await chrome.storage.local.get(['currentUsage', 'usageLimit'])) as UsageData;
      if (latest.currentUsage !== undefined) {
        const sessionUsageElement = document.getElementById('sessionUsage') as HTMLDivElement | null;
        if (sessionUsageElement) {
          sessionUsageElement.textContent = `Usage: ${latest.currentUsage}/${latest.usageLimit} requests`;
        }
      }
    }, 5000);
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings(): Promise<void> {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  try {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    await loadSettings();
    showStatus('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings', 'error');
  }
}

/**
 * Clear all data including settings and usage stats
 */
async function clearAllData(): Promise<void> {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    await loadSettings();
    showStatus('All data cleared', 'success');
  } catch (error) {
    console.error('Error clearing data:', error);
    showStatus('Error clearing data', 'error');
  }
}

/**
 * Show status message
 */
function showStatus(message: string, type: 'success' | 'error'): void {
  const statusElement = document.getElementById('statusMessage') as HTMLDivElement | null;
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`;
  statusElement.style.display = 'block';

  // Hide after 3 seconds
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 3000);
}

/**
 * Get a free demo key
 */
async function getDemoKey(): Promise<void> {
  const btn = document.getElementById('getDemoKeyBtn') as HTMLButtonElement | null;
  if (!btn) return;

  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '⏳ Generating...';

    const response = await fetch(`${(window as any).API_ENDPOINT}/demo-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to generate demo key');
    }

    const data = (await response.json()) as DemoKeyResponse;

    // Save the demo key
    const subscriptionKeyField = document.getElementById('subscriptionKey') as HTMLInputElement | null;
    if (subscriptionKeyField) {
      subscriptionKeyField.value = data.key;
    }
    await chrome.storage.sync.set({ subscriptionKey: data.key });

    // Show subscription status
    await validateAndShowSubscriptionStatus(data.key);

    showStatus(`Demo key activated! Valid for ${data.expiresIn || '7 days'} with ${data.limit || 100} translations.`, 'success');
  } catch (error) {
    console.error('Error getting demo key:', error);
    showStatus('Error generating demo key. Please try again later.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/**
 * Validate subscription key and show status
 */
async function validateAndShowSubscriptionStatus(key: string): Promise<void> {
  try {
    const response = await fetch(`${(window as any).API_ENDPOINT}/validate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key
      }
    });

    if (!response.ok) {
      const subscriptionStatus = document.getElementById('subscriptionStatus') as HTMLDivElement | null;
      if (subscriptionStatus) {
        subscriptionStatus.style.display = 'none';
      }
      return;
    }

    const data = (await response.json()) as KeyValidationResponse;

    // Show subscription status
    const statusDiv = document.getElementById('subscriptionStatus') as HTMLDivElement | null;
    if (statusDiv) {
      statusDiv.style.display = 'block';
    }

    // Update status badge
    const badge = document.getElementById('statusBadge') as HTMLDivElement | null;
    if (badge) {
      if (data.status === 'active') {
        badge.textContent = data.tier === 'demo' ? '🎁 Demo' : '⭐ Premium';
        badge.style.background = data.tier === 'demo' ? '#fbbf24' : '#10b981';
        badge.style.color = 'white';
      } else {
        badge.textContent = '❌ Expired';
        badge.style.background = '#ef4444';
        badge.style.color = 'white';
      }
    }

    // Update usage
    const usageCount = document.getElementById('usageCount') as HTMLDivElement | null;
    if (usageCount) {
      usageCount.textContent = `${data.usage?.used || 0} / ${data.usage?.limit || 100}`;
    }

    // Update usage bar
    const usageBar = document.getElementById('usageBar') as HTMLDivElement | null;
    if (usageBar) {
      const percentage = ((data.usage?.used || 0) / (data.usage?.limit || 100)) * 100;
      usageBar.style.width = `${Math.min(percentage, 100)}%`;
    }

    // Update expiry date
    const expiryDate = document.getElementById('expiryDate') as HTMLDivElement | null;
    if (expiryDate) {
      if (data.expiresAt) {
        const date = new Date(data.expiresAt);
        const daysLeft = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        expiryDate.textContent = daysLeft > 0 ? `${daysLeft} days` : 'Expired';
      } else {
        expiryDate.textContent = 'Never';
      }
    }
  } catch (error) {
    console.error('Error validating subscription:', error);
    const subscriptionStatus = document.getElementById('subscriptionStatus') as HTMLDivElement | null;
    if (subscriptionStatus) {
      subscriptionStatus.style.display = 'none';
    }
  }
}

/**
 * Toggle Azure Keys section visibility based on demo mode
 */
function toggleAzureKeysSection(isVisible: boolean): void {
  const azureSection = document.getElementById('azureKeysSection') as HTMLDivElement | null;
  if (azureSection) {
    if (isVisible) {
      azureSection.style.display = 'block';
      console.log('🎬 Demo Mode: Azure key inputs are visible');
    } else {
      azureSection.style.display = 'none';
      console.log('🔐 Production Mode: Azure key inputs are hidden');
    }
  }
}

/**
 * Validate Azure API keys (optional - for when keys are provided)
 */
async function validateAzureKeys(speechKey: string, translatorKey: string): Promise<boolean> {
  // This is a placeholder for future key validation
  // In production, you would test these keys against Azure endpoints
  try {
    if (speechKey) {
      console.log('✓ Azure Speech Key configured (validation skipped in demo)');
    }
    if (translatorKey) {
      console.log('✓ Azure Translator Key configured (validation skipped in demo)');
    }
    return true;
  } catch (error) {
    console.error('Error validating Azure keys:', error);
    return false;
  }
}

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`;
document.head.appendChild(style);
