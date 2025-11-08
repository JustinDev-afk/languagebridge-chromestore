/**
 * Unit tests for ActivationModal module
 */

describe('ActivationModal', () => {
  let mockChrome: any;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Setup Chrome mock
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            callback({ demoPassword: 'test-code' });
          }),
          set: jest.fn((items, callback) => {
            if (callback) callback();
          })
        }
      }
    };

    global.chrome = mockChrome as any;
  });

  describe('checkAndShow', () => {
    it('should show modal when no demo password is set', async () => {
      const mockModal = {
        checkAndShow: jest.fn().mockResolvedValue(true)
      };

      const result = await mockModal.checkAndShow();
      expect(result).toBe(true);
      expect(mockModal.checkAndShow).toHaveBeenCalled();
    });

    it('should not show modal when demo password exists', async () => {
      const mockModal = {
        checkAndShow: jest.fn().mockResolvedValue(false)
      };

      const result = await mockModal.checkAndShow();
      expect(result).toBe(false);
      expect(mockModal.checkAndShow).toHaveBeenCalled();
    });
  });

  describe('show', () => {
    it('should display the activation modal', () => {
      const mockModal = {
        isShowing: false,
        modal: document.createElement('div'),
        show: jest.fn(function(this: any) {
          this.isShowing = true;
        })
      };

      mockModal.show();
      expect(mockModal.isShowing).toBe(true);
    });
  });

  describe('hide', () => {
    it('should hide the activation modal', () => {
      const mockModal = {
        isShowing: true,
        modal: document.createElement('div'),
        hide: jest.fn(function(this: any) {
          this.isShowing = false;
        })
      };

      mockModal.hide();
      expect(mockModal.isShowing).toBe(false);
    });
  });

  describe('Chrome Storage integration', () => {
    it('should read demoPassword from Chrome storage', (done) => {
      mockChrome.storage.sync.get(['demoPassword'], (result: any) => {
        expect(result.demoPassword).toBe('test-code');
        done();
      });
    });

    it('should save demoPassword to Chrome storage', (done) => {
      mockChrome.storage.sync.set({ demoPassword: 'new-code' }, () => {
        expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
          { demoPassword: 'new-code' },
          expect.any(Function)
        );
        done();
      });
    });
  });
});
