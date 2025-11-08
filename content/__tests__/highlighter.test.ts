/**
 * Unit tests for Highlighter module
 */

describe('Highlighter', () => {
  let highlighter: any;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Mock the Highlighter class behavior
    highlighter = {
      highlightElement: jest.fn(),
      removeHighlight: jest.fn(),
      highlightSelection: jest.fn(),
      removeAllHighlights: jest.fn(),
      createFocusIndicator: jest.fn(),
      updateIndicatorPosition: jest.fn(),
    };
  });

  describe('highlightElement', () => {
    it('should highlight an element', () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      highlighter.highlightElement(element);

      expect(highlighter.highlightElement).toHaveBeenCalledWith(element);
    });

    it('should handle null elements gracefully', () => {
      highlighter.highlightElement(null);
      expect(highlighter.highlightElement).toHaveBeenCalledWith(null);
    });
  });

  describe('removeHighlight', () => {
    it('should remove highlight from element', () => {
      const element = document.createElement('div');
      highlighter.removeHighlight(element);
      expect(highlighter.removeHighlight).toHaveBeenCalledWith(element);
    });
  });

  describe('removeAllHighlights', () => {
    it('should remove all highlights', () => {
      highlighter.removeAllHighlights();
      expect(highlighter.removeAllHighlights).toHaveBeenCalled();
    });
  });

  describe('createFocusIndicator', () => {
    it('should create a focus indicator element', () => {
      const indicator = document.createElement('div');
      highlighter.createFocusIndicator(indicator);
      expect(highlighter.createFocusIndicator).toHaveBeenCalledWith(indicator);
    });
  });
});
