// Jest setup file for Chrome Extension testing

// Mock Chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
      })
    },
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
      })
    }
  },
  runtime: {
    getManifest: jest.fn(() => ({
      version: '1.1.0',
      name: 'LanguageBridge'
    })),
    onInstalled: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    },
    lastError: null,
    sendMessage: jest.fn((extensionId, message, callback) => {
      if (callback) callback({});
    })
  },
  tabs: {
    query: jest.fn((query, callback) => {
      callback([{ id: 1, url: 'https://example.com' }]);
    }),
    sendMessage: jest.fn((tabId, message, callback) => {
      if (callback) callback({});
    }),
    executeScript: jest.fn((tabId, options, callback) => {
      if (callback) callback([]);
    })
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  },
  tts: {
    speak: jest.fn((utterance, options, callback) => {
      if (callback) callback();
    })
  }
};

// Mock Web Speech API
global.webkitSpeechRecognition = jest.fn(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock Azure Speech SDK (if used in tests)
global.SpeechSDK = {
  AudioConfig: {
    fromDefaultMicrophoneInput: jest.fn(() => ({}))
  },
  SpeechRecognitionEventArgs: jest.fn(),
  ResultReason: {
    RecognizedSpeech: 0,
    NoMatch: 1,
    Canceled: 2
  }
};

// Suppress console errors in tests unless needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: HTMLFormElement.prototype.submit')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
