/**
 * Content Moderation Service
 * Handles content analysis, filtering, and moderation workflows
 * Implements Online Safety Act and DSA compliance requirements
 */

const logger = require('../logger');
const { OpenAI } = require('openai'); // For AI-based moderation
const { PerspectiveAPI } = require('perspective-api-client'); // For toxicity detection
const { CircuitBreaker } = require('./error-handler');

class ModerationService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.perspective = new PerspectiveAPI(process.env.PERSPECTIVE_API_KEY);
    this.moderationThreshold = 0.7; // Toxicity score threshold
    this.contentCache = new Map(); // Simple in-memory cache for moderation results

    // Circuit breakers for external services
    this.openaiCircuitBreaker = new CircuitBreaker(5, 60000, 60000); // 5 failures, 1min timeout
    this.perspectiveCircuitBreaker = new CircuitBreaker(5, 60000, 60000);
  }

  /**
   * Analyze content for harmful material
   * @param {string} content - Text content to analyze
   * @param {string} type - Content type (text, image, video)
   * @returns {Promise<ModerationResult>}
   */
  async analyzeContent(content, type = 'text', userId = null) {
    try {
      logger.info('Analyzing content', { contentLength: content.length, type, userId });

      // Check cache first
      const cacheKey = `${type}:${content.slice(0, 50)}`; // Simple cache key
      if (this.contentCache.has(cacheKey)) {
        return this.contentCache.get(cacheKey);
      }

      let result = { isSafe: true, scores: {}, reasons: [], category: 'safe' };

      if (type === 'text') {
        result = await this.analyzeText(content);
      } else if (type === 'image') {
        result = await this.analyzeImage(content);
      } // Add video analysis if needed

      // Cache the result for 1 hour
      this.contentCache.set(cacheKey, result);
      setTimeout(() => this.contentCache.delete(cacheKey), 3600000);

      // Log moderation decision
      logger.info('Content analysis complete', { 
        contentId: result.id, 
        isSafe: result.isSafe, 
        category: result.category,
        userId 
      });

      return result;
    } catch (error) {
      logger.error('Content analysis failed', { error: error.message, contentLength: content.length });
      // Fail safe - assume unsafe on error
      return { isSafe: false, scores: {}, reasons: ['Analysis failed'], category: 'blocked' };
    }
  }

  /**
   * Analyze text content for toxicity and harmful content
   * @param {string} text
   * @returns {Promise<ModerationResult>}
   */
  async analyzeText(text) {
    const result = { id: Date.now().toString(), isSafe: true, scores: {}, reasons: [], category: 'safe' };

    // 1. OpenAI Moderation API
    const openaiResponse = await this.openaiCircuitBreaker.execute(
      () => this.openai.moderations.create({
        input: text,
        model: 'text-moderation-latest'
      })
    );

    const openaiFlags = openaiResponse.results[0].flagged;
    if (openaiFlags) {
      result.isSafe = false;
      result.scores.openai = openaiResponse.results[0].categories;
      result.reasons.push('OpenAI flagged content');
      result.category = 'flagged';
    }

    // 2. Perspective API for toxicity
    const perspectiveResponse = await this.perspectiveCircuitBreaker.execute(
      () => this.perspective.analyze(text, {
        attributes: ['TOXICITY', 'SEVERE_TOXICITY', 'IDENTITY_ATTACK', 'INSULT', 'PROFANITY', 'THREAT']
      })
    );

    const toxicityScore = perspectiveResponse.attributeScores.TOXICITY.summaryScore.value;
    result.scores.perspective = perspectiveResponse.attributeScores;

    if (toxicityScore > this.moderationThreshold) {
      result.isSafe = false;
      result.reasons.push(`High toxicity score: ${toxicityScore}`);
      result.category = 'toxic';
    }

    // 3. Custom rule-based checks for Online Safety Act compliance
    const customViolations = this.checkCustomRules(text);
    if (customViolations.length > 0) {
      result.isSafe = false;
      result.reasons.push(...customViolations);
      result.category = 'violation';
    }

    // Age-appropriate content check
    const ageRating = this.assessAgeAppropriateness(text);
    result.ageRating = ageRating;

    return result;
  }

  /**
   * Custom rule-based checks for specific violations
   * @param {string} text
   * @returns {string[]}
   */
  checkCustomRules(text) {
    const violations = [];

    // Hate speech keywords (expand with comprehensive list)
    const hateSpeechPatterns = [
      /hate|racist|sexist|homophobic|transphobic/gi,
      /kill|murder|violence|terror/gi,
      /bomb|explosive|weapon/gi
    ];

    hateSpeechPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        violations.push('Potential hate speech detected');
      }
    });

    // Child exploitation or grooming indicators
    const childSafetyPatterns = [
      /child|kid|minor.*sex|porn|naked/gi,
      /meet.*alone|secret|private/gi
    ];

    childSafetyPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        violations.push('Child safety violation - immediate escalation');
      }
    });

    // Online Safety Act specific: Cyberbullying
    if (/bullying|harass|stalk/gi.test(text) && text.includes('@')) {
      violations.push('Potential cyberbullying');
    }

    return violations;
  }

  /**
   * Assess age appropriateness for content
   * @param {string} text
   * @returns {string} 'U', 'PG', '12', '15', '18'
   */
  assessAgeAppropriateness(text) {
    const violenceScore = this.calculateViolenceScore(text);
    const languageScore = this.calculateLanguageScore(text);
    const sexualContentScore = this.calculateSexualContentScore(text);

    const maxScore = Math.max(violenceScore, languageScore, sexualContentScore);

    if (maxScore < 0.2) return 'U';
    if (maxScore < 0.4) return 'PG';
    if (maxScore < 0.6) return '12';
    if (maxScore < 0.8) return '15';
    return '18';
  }

  /**
   * Simple scoring functions (expand with ML models)
   */
  calculateViolenceScore(text) {
    const violenceWords = ['kill', 'murder', 'fight', 'war', 'bomb'];
    const count = violenceWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(count / 5, 1); // Normalize
  }

  calculateLanguageScore(text) {
    const profanityWords = ['fuck', 'shit', 'damn', 'bitch', 'asshole'];
    const count = profanityWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(count / 5, 1);
  }

  calculateSexualContentScore(text) {
    const sexualWords = ['sex', 'porn', 'nude', 'fuck', 'orgasm'];
    const count = sexualWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(count / 5, 1);
  }

  /**
   * Analyze image content (placeholder - integrate with vision API)
   * @param {string} imageUrl or base64
   * @returns {Promise<ModerationResult>}
   */
  async analyzeImage(image) {
    // Integrate with OpenAI Vision or Google Vision API
    try {
      const visionResponse = await this.openaiCircuitBreaker.execute(
        () => this.openai.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Is this image safe for all ages? Describe any harmful content.' },
                { type: 'image_url', image_url: { url: image } }
              ]
            }
          ]
        })
      );

      const description = visionResponse.choices[0].message.content;
      const isSafe = !description.toLowerCase().includes('harmful') && 
                     !description.toLowerCase().includes('violence') &&
                     !description.toLowerCase().includes('nudity');

      return {
        id: Date.now().toString(),
        isSafe,
        scores: { vision: description },
        reasons: isSafe ? [] : ['Image contains potentially harmful content'],
        category: isSafe ? 'safe' : 'flagged'
      };
    } catch (error) {
      logger.error('Image analysis failed', { error: error.message });
      return { isSafe: false, reasons: ['Image analysis failed'], category: 'blocked' };
    }
  }

  /**
   * Handle user report
   * @param {Object} report - Report details
   * @returns {Promise<ReportResult>}
   */
  async handleReport(report) {
    const { contentId, userId, reason, evidence } = report;

    logger.info('Processing user report', { contentId, userId, reason });

    // Escalate high-priority reports (child safety, threats)
    const priority = this.assessReportPriority(reason);
    const escalationRequired = priority === 'high';

    // Store report in database (pseudo-code)
    const reportId = await this.storeReport({ ...report, priority, escalationRequired });

    if (escalationRequired) {
      await this.notifyModerators(reportId);
      await this.notifyLegal(reportId);
    }

    return { reportId, status: 'received', escalated: escalationRequired };
  }

  assessReportPriority(reason) {
    const highPriority = ['child_safety', 'threat', 'hate_speech', 'harassment'];
    return highPriority.includes(reason) ? 'high' : 'medium';
  }

  async storeReport(report) {
    // Database insertion - pseudo-code
    // await db.reports.insert(report);
    return `report_${Date.now()}`;
  }

  async notifyModerators(reportId) {
    // Send notification to moderation team
    logger.info('Escalated to moderators', { reportId });
    // Integrate with Slack/email/SMS
  }

  async notifyLegal(reportId) {
    // Notify legal team for high-risk reports
    logger.info('Escalated to legal', { reportId });
    // Integrate with legal notification system
  }

  /**
   * Get moderation queue for moderators
   * @param {number} limit
   * @param {string} status
   * @returns {Promise<ModerationQueue>}
   */
  async getModerationQueue(limit = 20, status = 'pending') {
    // Database query - pseudo-code
    // const queue = await db.moderationQueue.find({ status }).limit(limit);
    const queue = []; // Placeholder
    return { items: queue, total: queue.length, page: 1 };
  }

  /**
   * Review and decide on flagged content
   * @param {string} contentId
   * @param {string} decision - 'approve', 'reject', 'escalate'
   * @param {string} moderatorId
   * @returns {Promise<ReviewResult>}
   */
  async reviewContent(contentId, decision, moderatorId, notes = '') {
    logger.info('Content review', { contentId, decision, moderatorId });

    // Update content status in database
    // await db.content.update({ id: contentId }, { status: decision, reviewedBy: moderatorId, notes });

    // Log for audit trail
    logger.audit('Content reviewed', { contentId, decision, moderatorId, notes });

    // Notify user if rejected
    if (decision === 'reject') {
      await this.notifyUser(contentId, 'rejected', notes);
    }

    return { success: true, contentId, decision };
  }

  async notifyUser(contentId, status, message) {
    // Send notification to content owner
    logger.info('Notifying user', { contentId, status, message });
    // Integrate with notification service
  }

  /**
   * Generate transparency report for DSA compliance
   * @param {Object} filters - Date range, content type
   * @returns {Promise<TransparencyReport>}
   */
  async generateTransparencyReport(filters = {}) {
    // Aggregate moderation statistics
    const stats = {
      totalReports: 0,
      resolvedReports: 0,
      averageResponseTime: 0,
      categories: {},
      actionsTaken: {}
    };

    // Database aggregation - pseudo-code
    // stats.totalReports = await db.reports.count();
    // stats.resolvedReports = await db.reports.count({ status: 'resolved' });

    logger.info('Generated transparency report', { filters, stats });

    return {
      generatedAt: new Date().toISOString(),
      period: filters.period || 'monthly',
      ...stats
    };
  }

  /**
   * Clear cache (admin function)
   */
  clearCache() {
    this.contentCache.clear();
    logger.info('Moderation cache cleared');
  }

  /**
   * Get moderation statistics for dashboard
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    try {
      // Aggregate statistics from database (pseudo-implementation)
      // In a real implementation, these would be database queries

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Mock data - replace with actual database queries
      const stats = {
        pendingReviews: await this.getPendingReviewsCount(),
        reportsToday: await this.getReportsCount(today),
        averageResponseTime: await this.getAverageResponseTime(),
        topCategories: await this.getTopCategories()
      };

      logger.info('Retrieved moderation stats', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get moderation stats', { error: error.message });
      throw error;
    }
  }
}

/**
 * Types
 * @typedef {Object} ModerationResult
 * @property {string} id - Unique ID
 * @property {boolean} isSafe - Whether content is safe
 * @property {Object} scores - Analysis scores
 * @property {string[]} reasons - Reasons for flagging
 * @property {string} category - Content category
 * @property {string} ageRating - Age appropriateness rating
 *
 * @typedef {Object} ReportResult
 * @property {string} reportId - Report ID
 * @property {string} status - Processing status
 * @property {boolean} escalated - Whether escalated
 *
 * @typedef {Object} ReviewResult
 * @property {boolean} success - Review success
 * @property {string} contentId - Content ID
 * @property {string} decision - Review decision
 *
 * @typedef {Object} TransparencyReport
 * @property {string} generatedAt - Report generation time
 * @property {string} period - Reporting period
 * @property {number} totalReports - Total reports
 * @property {number} resolvedReports - Resolved reports
 * @property {number} averageResponseTime - Avg response time
 * @property {Object} categories - Content categories
 * @property {Object} actionsTaken - Actions taken
 */

module.exports = new ModerationService();
