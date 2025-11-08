/**
 * API Configuration Template
 *
 * IMPORTANT: This is a TEMPLATE file showing the structure.
 * Never commit actual API keys to source code!
 *
 * For development/testing:
 * 1. Create a copy named "api-config.js" (local, not committed)
 * 2. Fill in your own Azure keys from Azure Portal
 * 3. Add to .gitignore: api-config.js, api-config.local.js
 *
 * For production:
 * - Use environment variables or Azure Key Vault
 * - Never embed keys in source code
 * - Use backend proxy for all API calls
 */

const API_CONFIG = {
  // Azure Cognitive Services Keys
  // IMPORTANT: In production, load these from environment or backend
  // NEVER hardcode keys in source code

  speechKey: process.env.AZURE_SPEECH_KEY || 'YOUR_AZURE_SPEECH_KEY_HERE',
  translatorKey: process.env.AZURE_TRANSLATOR_KEY || 'YOUR_AZURE_TRANSLATOR_KEY_HERE',
  speechRegion: process.env.AZURE_SPEECH_REGION || 'eastus',

  // Backend API endpoint (for secure demo key handling)
  apiEndpoint: process.env.API_ENDPOINT || 'https://languagebridge-api.azurewebsites.net/api',

  // Demo password tracking
  demoPassword: null
};

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}
