/**
 * LanguageBridge - Localized Error Messages
 * Support for multiple languages including Arabic, Dari, Pashto, etc.
 */

const MESSAGES = {
  // Language lookup object
  languages: {
    'en': 'English',
    'fa': 'Dari',
    'ps': 'Pashto',
    'ar': 'Arabic',
    'ur': 'Urdu',
    'uz': 'Uzbek',
    'uk': 'Ukrainian',
    'es': 'Spanish'
  },

  // Error messages in multiple languages
  errors: {
    // Microphone errors
    'MICROPHONE_NOT_SUPPORTED': {
      'en': 'Microphone not supported in this browser',
      'fa': 'میکروفون در این مرورگر پشتیبانی نمی‌شود',
      'ar': 'الميكروفون غير مدعوم في هذا المتصفح',
      'ps': 'میکروفون په دې براوزر کې ملاتړ نکیږي',
      'ur': 'اس براؤزر میں مائیکروفون سپورٹ نہیں کیا جاتا',
    },

    'MICROPHONE_PERMISSION_DENIED': {
      'en': 'Microphone permission denied. Please enable microphone access in settings.',
      'fa': 'دسترسی میکروفون رد شد. لطفا دسترسی میکروفون را در تنظیمات فعال کنید.',
      'ar': 'تم رفض إذن الميكروفون. يرجى تفعيل وصول الميكروفون في الإعدادات.',
      'ps': 'میکروفون اجازت رد شو. براه کړئ میکروفون رسائي په ترتیباتو کې فعال کړئ.',
      'ur': 'مائیکروفون کی اجازت سے انکار کر دیا گیا۔ براہ کرم سیٹنگز میں مائیکروفون رسائی فعال کریں۔',
    },

    'SPEECH_RECOGNITION_ERROR': {
      'en': 'Speech recognition error. Please try again.',
      'fa': 'خطا در تشخیص گفتار. لطفا دوباره سعی کنید.',
      'ar': 'خطأ في التعرف على الكلام. يرجى المحاولة مرة أخرى.',
      'ps': 'د مکتب پیژندنې خرابي. براه کړئ دوباره کوشش کړئ.',
      'ur': 'گفتار کی شناخت میں خرابی۔ براہ کرم دوبارہ کوشش کریں۔',
    },

    'SPEECH_TIMEOUT': {
      'en': 'No speech detected. Please speak clearly into the microphone.',
      'fa': 'هیچ گفتاری شناسایی نشد. لطفا واضح به میکروفون صحبت کنید.',
      'ar': 'لم يتم الكشف عن أي كلام. يرجى التحدث بوضوح في الميكروفون.',
      'ps': 'هیچ مکتب شناخت نشو. براه کړئ په مکتب مفصل خبرې وکړئ.',
      'ur': 'کوئی گفتار معلوم نہیں ہوا۔ براہ کرم مائیکروفون میں واضح طریقے سے بولیں۔',
    },

    // Translation errors
    'TRANSLATION_ERROR': {
      'en': 'Translation failed. Please check your internet connection.',
      'fa': 'ترجمه ناموفق شد. لطفا اتصال اینترنت خود را بررسی کنید.',
      'ar': 'فشل الترجمة. يرجى التحقق من اتصالك بالإنترنت.',
      'ps': 'ژباړې کسې شکسته. براه کړئ خپل انټرنت تړون چک کړئ.',
      'ur': 'ترجمہ ناکام ہو گیا۔ براہ کرم اپنی انٹرنیٹ کنکشن چیک کریں۔',
    },

    'UNSUPPORTED_LANGUAGE': {
      'en': 'Unsupported language code: {language}. Using English instead.',
      'fa': 'کد زبان پشتیبانی‌نشده: {language}. استفاده از انگلیسی در عوض.',
      'ar': 'رمز لغة غير مدعوم: {language}. استخدام الإنجليزية بدلاً من ذلك.',
      'ps': 'نپشتیبانې شوې ژبې کوډ: {language}. په عوض انګریزي وکاروړئ.',
      'ur': 'غیر سپورٹ شدہ زبان کوڈ: {language}۔ بجائے اس کے انگریزی استعمال کریں۔',
    },

    'API_KEY_MISSING': {
      'en': 'API key not configured. Please enter demo password in Settings.',
      'fa': 'کلید API پیکربندی نشده است. لطفا کلمه عبور نمایشی را در تنظیمات وارد کنید.',
      'ar': 'لم يتم تكوين مفتاح API. يرجى إدخال كلمة المرور التجريبية في الإعدادات.',
      'ps': 'API کلید پیکربندی شو نه. براه کړئ نمایشي پټنوم په ترتیباتو کې داخل کړئ.',
      'ur': 'API کلید ترتیب نہیں دی گئی۔ براہ کرم سیٹنگز میں ڈیمو پاس ورڈ درج کریں۔',
    },

    'USAGE_LIMIT_EXCEEDED': {
      'en': 'Usage limit exceeded. Please contact support for more access.',
      'fa': 'حد استفاده از حد بیشتر است. لطفا برای دسترسی بیشتر با پشتیبانی تماس بگیرید.',
      'ar': 'تم تجاوز حد الاستخدام. يرجى الاتصال بالدعم للحصول على المزيد من الوصول.',
      'ps': 'د کارونې محدودیت تجاوز شو. براه کړئ د ډیری رسائي لپاره د ملاتړ سره په تماس کې شئ.',
      'ur': 'استعمال کی حد سے تجاوز ہو گیا۔ براہ کرم مزید رسائی کے لیے سپورٹ سے رابطہ کریں۔',
    },

    'SESSION_EXPIRED': {
      'en': 'Session expired. Please re-enter demo password in Settings.',
      'fa': 'جلسه منقضی شده است. لطفا کلمه عبور نمایشی را دوباره در تنظیمات وارد کنید.',
      'ar': 'انتهت الجلسة. يرجى إعادة إدخال كلمة المرور التجريبية في الإعدادات.',
      'ps': 'جلسه منقضي شوه. براه کړئ نمایشي پټنوم دوباره په ترتیباتو کې داخل کړئ.',
      'ur': 'سیشن ختم ہو گیا۔ براہ کرم سیٹنگز میں ڈیمو پاس ورڈ دوبارہ درج کریں۔',
    },
  },

  // Status messages
  status: {
    'LISTENING': {
      'en': 'Listening...',
      'fa': 'گوش فرا دهنده...',
      'ar': 'استماع...',
      'ps': 'اوریدنې...',
      'ur': 'سن رہا ہے...',
    },

    'TRANSLATING': {
      'en': 'Translating...',
      'fa': 'ترجمه...',
      'ar': 'جاري الترجمة...',
      'ps': 'ژباړنه...',
      'ur': 'ترجمہ کر رہا ہے...',
    },

    'SPEAKING': {
      'en': 'Speaking...',
      'fa': 'صحبت کنندگی...',
      'ar': 'يتحدث...',
      'ps': 'خبرې کونې...',
      'ur': 'بول رہا ہے...',
    },

    'READY': {
      'en': 'Ready',
      'fa': 'آماده',
      'ar': 'جاهز',
      'ps': 'دې ته چمتو',
      'ur': 'تیار',
    },

    'ERROR': {
      'en': 'Error',
      'fa': 'خطا',
      'ar': 'خطأ',
      'ps': 'خرابي',
      'ur': 'خرابی',
    },
  },

  /**
   * Get localized message
   * @param {string} category - Message category (errors, status, etc.)
   * @param {string} key - Message key
   * @param {string} language - Language code
   * @param {Object} variables - Variables to interpolate in message
   * @returns {string} Localized message
   */
  getMessage(category, key, language = 'en', variables = {}) {
    const message = this[category]?.[key]?.[language] ||
                    this[category]?.[key]?.['en'] ||
                    key; // Fallback to key name if translation not found

    // Interpolate variables if any
    return Object.entries(variables).reduce((msg, [var_name, var_value]) => {
      return msg.replace(`{${var_name}}`, var_value);
    }, message);
  }
};

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MESSAGES;
}
