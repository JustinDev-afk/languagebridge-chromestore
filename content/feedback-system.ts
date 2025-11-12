/**
 * LanguageBridge - Translation Feedback System
 * Collects user feedback (thumbs up/down) to improve translations
 */

interface TranslationFeedback {
  id: string;
  originalText: string;
  translatedText: string;
  language: string;
  feedback: 'positive' | 'negative';
  comment?: string;
  timestamp: string;
  url: string;
}

/**
 * Feedback Manager Class
 */
class FeedbackManager {
  private feedbackHistory: TranslationFeedback[] = [];
  private maxHistorySize: number = 100;
  private feedbackCounter: number = 0;

  constructor() {
    this.loadFeedbackHistory();
  }

  /**
   * Load feedback history from Chrome storage
   */
  private async loadFeedbackHistory(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(['translationFeedback']);
      if (data.translationFeedback) {
        this.feedbackHistory = data.translationFeedback;
      }
    } catch (error) {
      console.error('Error loading feedback history:', error);
    }
  }

  /**
   * Submit feedback for a translation
   */
  async submitFeedback(
    originalText: string,
    translatedText: string,
    language: string,
    feedback: 'positive' | 'negative',
    comment?: string
  ): Promise<string> {
    const feedbackId = `feedback-${++this.feedbackCounter}-${Date.now()}`;

    const feedbackEntry: TranslationFeedback = {
      id: feedbackId,
      originalText,
      translatedText,
      language,
      feedback,
      comment: comment?.trim(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Add to history
    this.feedbackHistory.unshift(feedbackEntry);

    // Limit history size
    if (this.feedbackHistory.length > this.maxHistorySize) {
      this.feedbackHistory = this.feedbackHistory.slice(0, this.maxHistorySize);
    }

    // Save to Chrome storage
    await chrome.storage.local.set({
      translationFeedback: this.feedbackHistory,
    });

    // Send to backend if available
    this.sendFeedbackToBackend(feedbackEntry).catch((error) => {
      console.warn('Could not send feedback to backend:', error);
    });

    console.log(`👍 Feedback recorded: ${feedback} for translation`);
    return feedbackId;
  }

  /**
   * Send feedback to backend for analysis
   */
  private async sendFeedbackToBackend(feedback: TranslationFeedback): Promise<void> {
    try {
      const apiEndpoint = 'https://languagebridge-api.azurewebsites.net/api/feedback';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: feedback.originalText,
          translatedText: feedback.translatedText,
          language: feedback.language,
          feedback: feedback.feedback,
          comment: feedback.comment,
          timestamp: feedback.timestamp,
          url: feedback.url,
        }),
      });

      if (!response.ok) {
        console.warn(`Feedback submission returned status ${response.status}`);
        return;
      }

      console.log('✓ Feedback sent to backend for analysis');
    } catch (error) {
      // Silently fail - feedback is already saved locally
      console.warn('Feedback backend submission failed (feedback saved locally):', error);
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    positive: number;
    negative: number;
    total: number;
    byLanguage: Record<string, { positive: number; negative: number }>;
  }> {
    await this.loadFeedbackHistory();

    const stats = {
      positive: 0,
      negative: 0,
      total: this.feedbackHistory.length,
      byLanguage: {} as Record<string, { positive: number; negative: number }>,
    };

    this.feedbackHistory.forEach((entry) => {
      if (entry.feedback === 'positive') {
        stats.positive++;
      } else {
        stats.negative++;
      }

      if (!stats.byLanguage[entry.language]) {
        stats.byLanguage[entry.language] = { positive: 0, negative: 0 };
      }

      if (entry.feedback === 'positive') {
        stats.byLanguage[entry.language].positive++;
      } else {
        stats.byLanguage[entry.language].negative++;
      }
    });

    return stats;
  }

  /**
   * Get all feedback entries
   */
  async getAllFeedback(): Promise<TranslationFeedback[]> {
    await this.loadFeedbackHistory();
    return [...this.feedbackHistory];
  }

  /**
   * Clear feedback history
   */
  async clearFeedbackHistory(): Promise<void> {
    this.feedbackHistory = [];
    await chrome.storage.local.set({ translationFeedback: [] });
    console.log('✓ Feedback history cleared');
  }
}

// Create global instance
const feedbackManager = new FeedbackManager();

// Export for use in extension
if (typeof window !== 'undefined') {
  (window as any).feedbackManager = feedbackManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FeedbackManager, feedbackManager };
}
