/**
 * LanguageBridge - Azure Cognitive Services Client
 * Handles Speech-to-Text, Text-to-Speech, and Translation
 */

// Type definitions for Azure Speech SDK
declare global {
  interface Window {
    SpeechSDK: any;
    speechSynthesis: SpeechSynthesis;
    webkitSpeechRecognition: typeof webkitSpeechRecognition;
    SpeechRecognition: typeof SpeechRecognition;
    Microsoft?: {
      CognitiveServices?: {
        Speech?: {
          SpeechSDK: any;
        };
      };
    };
    AzureClient: AzureClient;
    dispatchEvent(event: CustomEvent): void;
  }
}

// Configuration interface
interface AzureConfig {
  speechKey: string | null;
  translatorKey: string | null;
  speechRegion: string;
  demoPassword: string | null;
  apiEndpoint: string;
}

// Recognition controller interface
interface RecognitionController {
  onResult: ((text: string, isFinal: boolean) => void) | null;
  onError: ((error: string) => void) | null;
}

// Voice options interface
interface VoiceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Language locale map type
type LocaleMap = Record<string, string>;

// Voice map type
type VoiceMap = Record<string, string>;

// Language map type
type LanguageMap = Record<string, string>;

/**
 * Main Azure Client Class
 * Handles all communication with Azure Cognitive Services
 */
class AzureClient {
  private config: AzureConfig;
  private recognizer: any = null;
  private synthesizer: any = null;
  private isInitialized: boolean = false;
  private translationCache: Map<string, string> = new Map();
  private maxCacheSize: number = 100;
  private playbackTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      // Keys are now loaded from Chrome storage (set via backend or secure initialization)
      // No longer embedded in source code for security
      speechKey: null,
      translatorKey: null,
      speechRegion: 'eastus',

      // Demo password tracking
      demoPassword: null,

      // Backend API endpoint
      apiEndpoint: 'https://languagebridge-api.azurewebsites.net/api',
    };

    this.init();
  }

  /**
   * Initialize the Azure Client
   * Load configuration from Chrome storage
   */
  async init(): Promise<void> {
    // Load configuration from Chrome storage (set by secure backend)
    const keys = await chrome.storage.sync.get([
      'demoPassword',
      'azureRegion',
      'speechKey',
      'translatorKey',
      'apiEndpoint',
    ]);

    if (keys.demoPassword) {
      this.config.demoPassword = keys.demoPassword;
      console.log('✓ Demo password active');
    } else {
      console.warn('⚠️ No demo password found - please enter demo password in Settings');
    }

    // Allow custom keys if available (from backend provisioning)
    if (keys.speechKey) {
      this.config.speechKey = keys.speechKey;
    }
    if (keys.translatorKey) {
      this.config.translatorKey = keys.translatorKey;
    }

    // Allow custom region if set
    if (keys.azureRegion) {
      this.config.speechRegion = keys.azureRegion;
    }

    // Allow custom API endpoint
    if (keys.apiEndpoint) {
      this.config.apiEndpoint = keys.apiEndpoint;
    }

    this.isInitialized = true;
  }

  /**
   * Start speech recognition in specified language
   * @param language - Language code (e.g., 'en', 'fa', 'ps')
   * @returns Recognition controller
   */
  async startSpeechRecognition(language: string): Promise<RecognitionController> {
    // Map language codes to Azure locale codes
    const localeMap: LocaleMap = {
      en: 'en-US',
      fa: 'fa-IR', // Dari/Farsi (default)
      'fa-IR-formal': 'fa-IR', // Persian (maps to fa-IR for speech recognition)
      ps: 'ps-AF', // Pashto
      ar: 'ar-SA', // Arabic
      ur: 'ur-PK', // Urdu
      uz: 'uz-UZ', // Uzbek
      uk: 'uk-UA', // Ukrainian
      es: 'es-ES', // Spanish
    };

    // Validate language code
    if (!localeMap[language]) {
      console.warn(`⚠️ Unsupported language code: ${language}. Defaulting to English (en-US)`);
      language = 'en';
    }

    const locale = localeMap[language];

    // Check if Azure SDK is available
    const SDK = window.SpeechSDK || window.Microsoft?.CognitiveServices?.Speech?.SpeechSDK;

    // Use Web Speech API as fallback if Azure not configured or SDK not loaded
    if (!this.config.speechKey || !SDK) {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        console.info('Using browser speech recognition (Azure not configured)');
        return this.startWebSpeechRecognition(locale);
      } else {
        throw new Error('Speech recognition not supported in this browser');
      }
    }

    // Ensure SpeechSDK is available globally
    if (!window.SpeechSDK && SDK) {
      window.SpeechSDK = SDK;
    }

    // Azure Speech SDK implementation
    const speechConfig = SDK.SpeechConfig.fromSubscription(
      this.config.speechKey,
      this.config.speechRegion
    );
    speechConfig.speechRecognitionLanguage = locale;

    const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();
    this.recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);

    return new Promise<RecognitionController>((resolve, reject) => {
      const controller: RecognitionController = {
        onResult: null,
        onError: null,
      };

      this.recognizer.recognizing = (s: any, e: any) => {
        // Interim results
        if (e.result.text && controller.onResult) {
          controller.onResult(e.result.text, false);
        }
      };

      this.recognizer.recognized = (s: any, e: any) => {
        // Final result
        if (e.result.reason === SDK.ResultReason.RecognizedSpeech) {
          if (controller.onResult) {
            controller.onResult(e.result.text, true);
          }
        }
      };

      this.recognizer.canceled = (s: any, e: any) => {
        if (controller.onError) {
          controller.onError(e.errorDetails);
        }
      };

      this.recognizer.startContinuousRecognitionAsync(
        () => resolve(controller),
        (err: any) => reject(err)
      );
    });
  }

  /**
   * Fallback Web Speech API implementation
   */
  private startWebSpeechRecognition(locale: string): Promise<RecognitionController> {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale;

    const controller: RecognitionController = {
      onResult: null,
      onError: null,
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;

      if (controller.onResult) {
        controller.onResult(text, isFinal);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (controller.onError) {
        controller.onError(event.error);
      }
    };

    recognition.start();

    return Promise.resolve(controller);
  }

  /**
   * Stop speech recognition
   */
  async stopSpeechRecognition(): Promise<void> {
    if (this.recognizer) {
      await this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer = null;
    }
  }

  /**
   * Translate text using backend API
   * @param text - Text to translate
   * @param fromLang - Source language code
   * @param toLang - Target language code
   * @returns Translated text
   */
  async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    // Create cache key
    const cacheKey = `${fromLang}-${toLang}-${text}`;

    // Check cache first
    if (this.translationCache.has(cacheKey)) {
      console.log('✓ Translation retrieved from cache (saved API call!)');
      return this.translationCache.get(cacheKey) || text;
    }

    // Check if demo password is active
    if (!this.config.demoPassword) {
      console.warn('⚠️ No demo password active - please enter demo password in Settings');
      return text;
    }

    console.log(`🔐 Translating with demo password: ${this.config.demoPassword}`);
    return await this.translateWithAzureDirect(text, fromLang, toLang, cacheKey);
  }

  /**
   * Translate via backend proxy (SECURE - for demo mode)
   * @param text - Text to translate
   * @param fromLang - Source language code
   * @param toLang - Target language code
   * @param cacheKey - Cache key for storing result
   * @param apiKey - Demo password or subscription key
   * @returns Translated text
   */
  async translateViaBackend(
    text: string,
    fromLang: string,
    toLang: string,
    cacheKey: string,
    apiKey: string
  ): Promise<string> {
    const endpoint = `${this.config.apiEndpoint}/translate`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          from: fromLang,
          to: toLang,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Translation API error:', response.status, errorData);

        // Handle specific error cases
        if (response.status === 403) {
          this.showSubscriptionError(
            'Your session has expired. Please re-enter your demo password.'
          );
          throw new Error('Session expired');
        } else if (response.status === 429) {
          this.showSubscriptionError(
            `Usage limit exceeded. You've reached your translation limit.`
          );
          throw new Error('Usage limit exceeded');
        } else if (response.status === 401) {
          this.showSubscriptionError('Invalid demo password. Please check your settings.');
          throw new Error('Invalid demo password');
        }

        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translation;

      // Store in cache
      this.translationCache.set(cacheKey, translatedText);

      // Limit cache size (remove oldest if too large)
      if (this.translationCache.size > this.maxCacheSize) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      // Update usage in storage if available
      if (data.usage) {
        console.log(`✓ Translation complete. Usage: ${data.usage.used}/${data.usage.limit}`);

        // Store latest usage for display in options page
        await chrome.storage.local.set({
          currentUsage: data.usage.used,
          usageLimit: data.usage.limit,
          lastUpdated: new Date().toISOString(),
        });
      }

      console.log(`✓ Translation cached (${this.translationCache.size}/${this.maxCacheSize})`);
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      // Return original text if translation fails
      console.warn('⚠️ Returning original text due to translation error');
      return text;
    }
  }

  /**
   * Direct Azure Translator API call (MVP mode)
   * @param text - Text to translate
   * @param fromLang - Source language code
   * @param toLang - Target language code
   * @param cacheKey - Cache key for storing result
   * @returns Translated text
   */
  private async translateWithAzureDirect(
    text: string,
    fromLang: string,
    toLang: string,
    cacheKey: string
  ): Promise<string> {
    // Use resource-specific endpoint for newer Azure Translator resources
    const endpoint = `https://micro-tran.cognitiveservices.azure.com/translator/text/v3.0/translate?from=${fromLang}&to=${toLang}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.translatorKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ text: text }]),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure Translator API error details:', errorText);
        throw new Error(`Azure Translator API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const translatedText = data[0]?.translations[0]?.text || text;

      // Store in cache
      this.translationCache.set(cacheKey, translatedText);

      // Limit cache size
      if (this.translationCache.size > this.maxCacheSize) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      // Track usage for demo password
      if (this.config.demoPassword) {
        await this.incrementUsage(this.config.demoPassword);
      }

      console.log(`✓ Translation complete (Azure direct API)`);
      return translatedText;
    } catch (error) {
      console.error('Azure Translator error:', error);
      console.warn('⚠️ Returning original text due to translation error');
      return text;
    }
  }

  /**
   * Simple fallback translation (placeholder)
   * In production, this could use a local dictionary or alternative API
   */
  private async fallbackTranslate(text: string, fromLang: string, toLang: string): Promise<string> {
    console.warn('Using fallback translation - results may be limited');
    // This is a placeholder - real implementation would need a translation library
    return text;
  }

  /**
   * Speak text using Text-to-Speech
   * NOTE: For now, we keep using Azure SDK directly for TTS because:
   * 1. Real-time audio playback requires streaming from browser
   * 2. Backend API would add latency downloading audio first
   * 3. Azure SDK handles audio playback automatically
   *
   * In future, we can proxy TTS through backend for usage tracking.
   * For now, translations are tracked which gives us usage metrics.
   */
  async speakText(text: string, language: string, options: VoiceOptions = {}): Promise<void> {
    // Use Azure Speech SDK if we have the speech key
    if (this.config.speechKey) {
      return this.speakWithAzureSDK(text, language, options);
    }

    // Fallback to browser speech if no Azure key
    console.warn('No Azure Speech key - using browser fallback (robotic voice)');
    return this.fallbackSpeak(text, language, options);
  }

  /**
   * Speak with Azure Speech SDK (natural voice)
   */
  private async speakWithAzureSDK(
    text: string,
    language: string,
    options: VoiceOptions = {}
  ): Promise<void> {
    const SDK = window.SpeechSDK || window.Microsoft?.CognitiveServices?.Speech?.SpeechSDK;

    if (!SDK) {
      console.warn('Azure Speech SDK not loaded - using fallback');
      return this.fallbackSpeak(text, language, options);
    }

    // Ensure SpeechSDK is available globally
    if (!window.SpeechSDK && SDK) {
      window.SpeechSDK = SDK;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const speechConfig = SDK.SpeechConfig.fromSubscription(
          this.config.speechKey,
          this.config.speechRegion
        );

        // Map language codes to Azure voices
        const voiceMap: VoiceMap = {
          fa: 'fa-IR-DilaraNeural', // Dari/Farsi female (natural, conversational)
          'fa-IR-formal': 'fa-IR-FaridNeural', // Persian female (formal, clearer)
          ps: 'ps-AF-LatifaNeural', // Pashto female
          ar: 'ar-SA-ZariyahNeural', // Arabic female
          ur: 'ur-PK-UzmaNeural', // Urdu female
          uk: 'uk-UA-PolinaNeural', // Ukrainian female
          uz: 'uz-UZ-MadinaNeural', // Uzbek female
          es: 'es-US-PalomaNeural', // Spanish female
          en: 'en-US-JennyNeural', // English female
        };

        speechConfig.speechSynthesisVoiceName = voiceMap[language] || 'en-US-JennyNeural';

        // Set speech rate if provided
        if (options.rate) {
          const ratePercent = Math.round((options.rate - 1) * 100);
          speechConfig.speechSynthesisOutputFormat =
            SDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        }

        const audioConfig = SDK.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new SDK.SpeechSynthesizer(speechConfig, audioConfig);

        console.log(`🎤 Speaking with Azure voice: ${speechConfig.speechSynthesisVoiceName}`);

        synthesizer.speakTextAsync(
          text,
          (result: any) => {
            if (result.reason === SDK.ResultReason.SynthesizingAudioCompleted) {
              // Get actual audio duration from the result
              const audioDuration = result.audioDuration / 10000; // Convert from ticks to milliseconds
              console.log(
                `✓ Azure speech synthesis completed. Audio duration: ${Math.round(audioDuration)}ms`
              );

              // Wait for actual playback to finish before resolving
              this.playbackTimeout = setTimeout(() => {
                try {
                  synthesizer.close();
                } catch (error) {
                  console.log('ℹ️ Synthesizer already closed');
                }
                resolve();
              }, audioDuration);
            } else {
              console.error('Azure speech synthesis failed:', result.errorDetails);
              synthesizer.close();
              reject(new Error(result.errorDetails));
            }
          },
          (error: any) => {
            console.error('Azure speech synthesis error:', error);
            synthesizer.close();
            reject(error);
          }
        );

        // Store synthesizer for stop/pause functionality
        this.synthesizer = synthesizer;
      } catch (error) {
        console.error('Error initializing Azure speech:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop current speech synthesis
   */
  stopSpeaking(): void {
    console.log('🛑 stopSpeaking called');

    // Cancel any pending playback timeout
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }

    // Stop Azure synthesizer if active
    if (this.synthesizer) {
      try {
        this.synthesizer.close();
        console.log('✓ Azure speech stopped');
      } catch (error) {
        console.log('ℹ️ Synthesizer already disposed');
      }
      this.synthesizer = null;
    }

    // Stop browser speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('✓ Browser speech cancelled');
    }

    console.log('✓ stopSpeaking complete');
  }

  /**
   * Pause current speech synthesis
   */
  pauseSpeaking(): void {
    console.log('⏸️ pauseSpeaking called');

    // Cancel any pending playback timeout
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }

    // Stop Azure synthesizer if active
    if (this.synthesizer) {
      try {
        this.synthesizer.close();
        console.log('✓ Azure speech stopped (paused)');
      } catch (error) {
        console.log('ℹ️ Synthesizer already disposed (was likely finished playing)');
      }
      this.synthesizer = null;
    }

    // Stop browser speech synthesis (browsers don't support true pause)
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('✓ Browser speech cancelled (paused)');
    }

    console.log('✓ pauseSpeaking complete');
  }

  /**
   * Show subscription error to user
   */
  private showSubscriptionError(message: string): void {
    console.error('❌ Subscription error:', message);

    // Dispatch custom event that can be caught by toolbar or other UI elements
    window.dispatchEvent(
      new CustomEvent('languagebridge-subscription-error', {
        detail: { message },
      })
    );
  }

  /**
   * Increment usage counter for demo password
   * @param demoPassword - The active demo password
   */
  private async incrementUsage(demoPassword: string): Promise<void> {
    try {
      const usageKey = `demoUsage_${demoPassword}`;
      const usageData = await chrome.storage.local.get([usageKey, 'usageLimit']);

      const currentUsage = (usageData[usageKey] || 0) + 1;
      const usageLimit = usageData.usageLimit || 1000;

      // Update usage counter
      await chrome.storage.local.set({
        [usageKey]: currentUsage,
        currentUsage: currentUsage, // Also store globally for display
      });

      console.log(`✓ Usage tracked: ${currentUsage}/${usageLimit} requests`);

      // Check if limit reached
      if (currentUsage >= usageLimit) {
        this.showSubscriptionError(
          `Usage limit reached (${currentUsage}/${usageLimit}). Please contact support for more access.`
        );
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  /**
   * Fallback browser speech synthesis
   */
  private fallbackSpeak(text: string, language: string, options: VoiceOptions = {}): Promise<void> {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Map to BCP 47 language tags
      const langMap: LanguageMap = {
        en: 'en-US',
        fa: 'fa-IR',
        'fa-IR-formal': 'fa-IR',
        ps: 'ps-AF',
        ar: 'ar-SA',
        ur: 'ur-PK',
        es: 'es-ES',
      };

      utterance.lang = langMap[language] || 'en-US';
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Resolve even on error

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Generate UUID for request tracking
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Initialize Azure client globally
window.AzureClient = new AzureClient();
