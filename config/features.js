/**
 * LanguageBridge Feature Flags
 *
 * MVP Mode: Focused on core translation functionality
 * - No subscription friction
 * - Auto-provisioned demo keys
 * - All language features enabled
 * - Zero setup complexity
 */

const FEATURE_FLAGS = {
  // === MVP SETTINGS (Current Phase) ===

  // Subscription & Monetization (ALL DISABLED FOR MVP)
  SHOW_ACTIVATION_MODAL: false,           // Hide subscription prompts
  SHOW_PRICING_UI: false,                 // Hide upgrade/pricing buttons
  SHOW_API_KEY_SETTINGS: false,           // Hide API key configuration
  REQUIRE_SUBSCRIPTION: false,            // No subscription validation
  AUTO_PROVISION_DEMO_KEY: true,          // Silently create demo keys

  // Core Translation Features (ALL ENABLED)
  TOOLBAR_ENABLED: true,                  // Main translation toolbar
  FLOATING_TRANSLATOR_ENABLED: true,      // Conversation widget
  ONBOARDING_TUTORIAL: true,              // First-time user guide

  // UI Features (ALL ENABLED - User needs them)
  ADVANCED_AUDIO_CONTROLS: true,          // Play/pause/resume/speed
  VERBOSITY_LEVELS: true,                 // minimal/balanced/full
  KEYBOARD_SHORTCUTS: true,               // Alt+Shift+L, Alt+Shift+T
  DRAGGABLE_TRANSLATION_POPUP: true,      // Movable translation box
  GOOGLE_DOCS_ADAPTER: true,              // Copy/paste workflow

  // Supported Languages (All 9 for diverse student population)
  SUPPORTED_LANGUAGES: [
    { code: 'fa', name: 'Dari (دری)', voice: 'fa-IR' },
    { code: 'fa-IR-formal', name: 'Persian (فارسی)', voice: 'fa-IR-FaridNeural' },  // More formal Persian option
    { code: 'ps', name: 'Pashto (پښتو)', voice: 'ps-AF' },
    { code: 'ar', name: 'Arabic (العربية)', voice: 'ar-SA' },
    { code: 'ur', name: 'Urdu (اردو)', voice: 'ur-PK' },
    { code: 'uz', name: 'Uzbek (Oʻzbek)', voice: 'uz-UZ' },
    { code: 'uk', name: 'Ukrainian (Українська)', voice: 'uk-UA' },
    { code: 'es', name: 'Spanish (Español)', voice: 'es-US' },
    { code: 'en', name: 'English', voice: 'en-US' }
  ],

  // === FUTURE FEATURES (Post-Funding) ===
  // When funding secured, flip these to true:

  SCHOOL_EMAIL_VERIFICATION: false,       // Check .edu emails
  PAYMENT_INTEGRATION: false,             // Stripe/payment gateway
  USAGE_ANALYTICS_DASHBOARD: false,       // Teacher analytics
  CUSTOM_VOICE_SELECTION: false,          // Per-language voice picker
  OFFLINE_MODE: false,                    // Downloadable dictionaries
  MOBILE_APP: false,                      // React Native app
  LMS_INTEGRATION: false,                 // Canvas/Schoology plugins

  // === DEFAULT SETTINGS ===
  DEFAULT_LANGUAGE: 'fa',                 // Dari (primary Afghan language)
  DEFAULT_VERBOSITY: 'balanced',
  DEFAULT_SPEECH_RATE: 1.0,

  // === API CONFIGURATION ===
  API_ENDPOINT: 'https://languagebridge-api.azurewebsites.net/api',
  DEMO_KEY_DURATION_DAYS: 365,            // Give testers full year
  DEMO_KEY_TRANSLATION_LIMIT: 999999,     // Unlimited for MVP testing
};

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FEATURE_FLAGS;
}
