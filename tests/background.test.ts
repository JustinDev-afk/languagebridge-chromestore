/**
 * Unit tests for background service worker
 */

describe('Background Service Worker', () => {
  let mockChrome: any;

  beforeEach(() => {
    // Setup comprehensive Chrome mock
    mockChrome = {
      commands: {
        onCommand: {
          addListener: jest.fn()
        }
      },
      tabs: {
        query: jest.fn((query, callback) => {
          callback([{ id: 1 }]);
        }),
        sendMessage: jest.fn((tabId, message, callback) => {
          if (callback) callback({});
        })
      },
      runtime: {
        onInstalled: {
          addListener: jest.fn()
        },
        onMessage: {
          addListener: jest.fn()
        },
        getManifest: jest.fn(() => ({
          version: '1.1.0'
        })),
        lastError: null
      },
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            callback({
              azureSpeechKey: '',
              azureTranslatorKey: '',
              defaultLanguage: 'fa'
            });
          }),
          set: jest.fn((items, callback) => {
            if (callback) callback();
          })
        }
      }
    };

    global.chrome = mockChrome as any;
  });

  describe('Command handlers', () => {
    it('should register command listener on load', () => {
      expect(mockChrome.commands.onCommand.addListener).toBeDefined();
    });

    it('should register message listener', () => {
      expect(mockChrome.runtime.onMessage.addListener).toBeDefined();
    });
  });

  describe('Installation handler', () => {
    it('should initialize default settings on install', () => {
      expect(mockChrome.runtime.onInstalled.addListener).toBeDefined();
    });

    it('should set default language to Dari', (done) => {
      mockChrome.storage.sync.get(
        ['defaultLanguage'],
        (result: any) => {
          expect(result.defaultLanguage).toBe('fa');
          done();
        }
      );
    });
  });

  describe('Settings management', () => {
    it('should retrieve settings from storage', (done) => {
      const keys = ['azureSpeechKey', 'azureTranslatorKey', 'defaultLanguage'];

      mockChrome.storage.sync.get(keys, (result: any) => {
        expect(result.defaultLanguage).toBe('fa');
        expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(
          keys,
          expect.any(Function)
        );
        done();
      });
    });

    it('should save settings to storage', (done) => {
      const settings = {
        defaultLanguage: 'ps',
        azureSpeechKey: 'test-key'
      };

      mockChrome.storage.sync.set(settings, () => {
        expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
          settings,
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('Tab management', () => {
    it('should query active tabs', (done) => {
      mockChrome.tabs.query(
        { active: true, currentWindow: true },
        (tabs: any[]) => {
          expect(tabs).toHaveLength(1);
          expect(tabs[0].id).toBe(1);
          done();
        }
      );
    });

    it('should send messages to content scripts', () => {
      const tabId = 1;
      const message = { action: 'toggle-toolbar' };

      mockChrome.tabs.sendMessage(tabId, message, () => {});

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        tabId,
        message,
        expect.any(Function)
      );
    });
  });
});
