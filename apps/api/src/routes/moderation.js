/**
 * Moderation API Routes
 * Provides endpoints for content moderation, reporting, and review
 * Implements DSA and Online Safety Act compliance
 */

const express = require('express');
const router = express.Router();
const moderationService = require('../moderationService');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateContent, validateReport } = require('../middleware/validation');
const logger = require('../logger');

// Rate limiting for moderation endpoints
const rateLimit = require('express-rate-limit');
const moderationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many moderation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
router.use(moderationLimiter);

/**
 * POST /api/moderation/analyze
 * Analyze content for harmful material
 * Public endpoint for content pre-moderation
 */
router.post('/analyze', validateContent, async (req, res) => {
  try {
    const { content, type = 'text', userId } = req.body;

    const result = await moderationService.analyzeContent(content, type, userId);

    // Log for audit trail
    logger.audit('Content analyzed', {
      userId,
      contentType: type,
      isSafe: result.isSafe,
      category: result.category,
      ip: req.ip
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Moderation analysis failed', { error: error.message, userId: req.body.userId });
    res.status(500).json({
      success: false,
      error: 'Content analysis failed',
      message: 'Unable to analyze content at this time'
    });
  }
});

/**
 * POST /api/moderation/report
 * Submit a user report for content
 * Requires authentication
 */
router.post('/report', authenticate, validateReport, async (req, res) => {
  try {
    const { contentId, reason, evidence, category } = req.body;
    const userId = req.user.id;

    const report = {
      contentId,
      userId,
      reason,
      evidence,
      category,
      submittedAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await moderationService.handleReport(report);

    // Log for audit trail
    logger.audit('Report submitted', {
      reportId: result.reportId,
      userId,
      contentId,
      reason,
      escalated: result.escalated
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Report submission failed', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Report submission failed',
      message: 'Unable to submit report at this time'
    });
  }
});

/**
 * GET /api/moderation/queue
 * Get moderation queue for moderators
 * Requires moderator role
 */
router.get('/queue', authenticate, requireRole('moderator'), async (req, res) => {
  try {
    const { limit = 20, status = 'pending', page = 1 } = req.query;

    const queue = await moderationService.getModerationQueue(
      parseInt(limit),
      status,
      parseInt(page)
    );

    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    logger.error('Failed to fetch moderation queue', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moderation queue',
      message: 'Unable to retrieve queue at this time'
    });
  }
});

/**
 * PUT /api/moderation/review/:contentId
 * Review and decide on flagged content
 * Requires moderator role
 */
router.put('/review/:contentId', authenticate, requireRole('moderator'), async (req, res) => {
  try {
    const { contentId } = req.params;
    const { decision, notes } = req.body;
    const moderatorId = req.user.id;

    // Validate decision
    const validDecisions = ['approve', 'reject', 'escalate'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid decision',
        message: 'Decision must be one of: approve, reject, escalate'
      });
    }

    const result = await moderationService.reviewContent(contentId, decision, moderatorId, notes);

    // Log for audit trail
    logger.audit('Content reviewed', {
      contentId,
      decision,
      moderatorId,
      notes: notes ? 'provided' : 'none'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Content review failed', { error: error.message, contentId: req.params.contentId });
    res.status(500).json({
      success: false,
      error: 'Content review failed',
      message: 'Unable to process review at this time'
    });
  }
});

/**
 * GET /api/moderation/transparency
 * Get transparency report for DSA compliance
 * Public endpoint
 */
router.get('/transparency', async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    const filters = {
      period,
      startDate,
      endDate
    };

    const report = await moderationService.generateTransparencyReport(filters);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Transparency report generation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Report generation failed',
      message: 'Unable to generate transparency report at this time'
    });
  }
});

/**
 * POST /api/moderation/admin/clear-cache
 * Clear moderation cache (admin only)
 * Requires admin role
 */
router.post('/admin/clear-cache', authenticate, requireRole('admin'), async (req, res) => {
  try {
    moderationService.clearCache();

    logger.audit('Moderation cache cleared', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Moderation cache cleared successfully'
    });
  } catch (error) {
    logger.error('Cache clear failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Cache clear failed',
      message: 'Unable to clear cache at this time'
    });
  }
});

/**
 * GET /api/moderation/stats
 * Get moderation statistics for dashboard
 * Requires moderator role
 */
router.get('/stats', authenticate, requireRole('moderator'), async (req, res) => {
  try {
    const stats = await moderationService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Stats retrieval failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Stats retrieval failed',
      message: 'Unable to retrieve statistics at this time'
    });
  }
});

module.exports = router;
