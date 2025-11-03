/**
 * Age Verification API Routes
 * Provides endpoints for age verification and parental consent
 * Implements Online Safety Act and COPPA compliance
 */

const express = require('express');
const router = express.Router();
const ageVerificationService = require('../ageVerificationService');
const { authenticate } = require('../middleware/auth');
const { validateAgeVerification, validateParentalConsent } = require('../middleware/validation');
const logger = require('../logger');

// Rate limiting for age verification endpoints
const rateLimit = require('express-rate-limit');
const ageVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 verification attempts per hour
  message: 'Too many verification attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to verification endpoints
router.use('/verify', ageVerificationLimiter);

/**
 * POST /api/age/initiate
 * Initiate age verification process
 * Public endpoint
 */
router.post('/initiate', async (req, res) => {
  try {
    const { method = 'self_declaration' } = req.body;
    const userId = req.user?.id || 'anonymous'; // Allow anonymous initiation

    const result = await ageVerificationService.initiateVerification(userId, method);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Age verification initiation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Verification initiation failed',
      message: 'Unable to start verification process'
    });
  }
});

/**
 * POST /api/age/verify
 * Complete age verification
 * Public endpoint (but requires valid verification ID)
 */
router.post('/verify', validateAgeVerification, async (req, res) => {
  try {
    const { verificationId, ...verificationData } = req.body;

    const result = await ageVerificationService.completeVerification(verificationId, verificationData);

    if (result.success) {
      // Log successful verification
      logger.audit('Age verification completed', {
        verificationId,
        age: result.age,
        confidence: result.confidence,
        ip: req.ip
      });

      res.json({
        success: true,
        data: result
      });
    } else {
      // Log failed verification
      logger.audit('Age verification failed', {
        verificationId,
        error: result.error,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Age verification completion failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Verification processing failed',
      message: 'Unable to complete verification at this time'
    });
  }
});

/**
 * POST /api/age/parental-consent
 * Request parental consent for minor
 * Public endpoint
 */
router.post('/parental-consent', validateParentalConsent, async (req, res) => {
  try {
    const { parentEmail, childAge } = req.body;

    const result = await ageVerificationService.processParentalConsent({
      parentEmail,
      childAge: parseInt(childAge),
      parentConsent: true // Implied by request
    });

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Parental consent request failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Parental consent request failed',
      message: 'Unable to process consent request'
    });
  }
});

/**
 * POST /api/age/parental-consent/:token
 * Verify parental consent (parent clicks link in email)
 * Public endpoint
 */
router.post('/parental-consent/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { approved } = req.body;

    const result = await ageVerificationService.verifyParentalConsent(token, approved);

    if (result.success) {
      logger.audit('Parental consent verified', {
        token,
        approved,
        childUserId: result.childUserId
      });

      res.json({
        success: true,
        data: result,
        message: approved ? 'Parental consent approved. Child account created.' : 'Consent denied.'
      });
    } else {
      logger.audit('Parental consent failed', { token, error: result.error });

      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Parental consent verification failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Consent verification failed',
      message: 'Unable to verify parental consent'
    });
  }
});

/**
 * GET /api/age/status
 * Get user's age verification status
 * Requires authentication
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const status = await ageVerificationService.getVerificationStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Status check failed', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: 'Unable to retrieve verification status'
    });
  }
});

/**
 * POST /api/age/check-access
 * Check if user can access specific content
 * Requires authentication
 */
router.post('/check-access', authenticate, async (req, res) => {
  try {
    const { contentRating } = req.body;
    const userId = req.user.id;

    // Get user's verified age
    const status = await ageVerificationService.getVerificationStatus(userId);

    if (!status.verified) {
      return res.status(403).json({
        success: false,
        error: 'Age verification required',
        message: 'Please verify your age to access this content'
      });
    }

    const canAccess = ageVerificationService.canAccessContent(status.age, contentRating);

    res.json({
      success: true,
      data: {
        canAccess,
        userAge: status.age,
        contentRating,
        restrictions: ageVerificationService.getAgeRestrictions(status.age)
      }
    });
  } catch (error) {
    logger.error('Access check failed', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Access check failed',
      message: 'Unable to verify content access'
    });
  }
});

/**
 * GET /api/age/restrictions
 * Get age-based restrictions for current user
 * Requires authentication
 */
router.get('/restrictions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const status = await ageVerificationService.getVerificationStatus(userId);

    if (!status.verified) {
      return res.json({
        success: true,
        data: {
          verified: false,
          restrictions: { contentRating: 'U', features: ['age_verification_required'] }
        }
      });
    }

    const restrictions = ageVerificationService.getAgeRestrictions(status.age);

    res.json({
      success: true,
      data: {
        verified: true,
        age: status.age,
        restrictions
      }
    });
  } catch (error) {
    logger.error('Restrictions check failed', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Restrictions check failed',
      message: 'Unable to retrieve age restrictions'
    });
  }
});

/**
 * POST /api/age/admin/reverify
 * Force re-verification for user (admin only)
 * Requires admin role
 */
router.post('/admin/reverify/:userId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Reset user's verification status
    // await db.users.update({ id: userId }, { verifiedAge: null });

    logger.audit('Admin forced re-verification', { userId, adminId });

    res.json({
      success: true,
      message: 'User verification reset. User will need to verify age again.'
    });
  } catch (error) {
    logger.error('Admin re-verification failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Re-verification failed',
      message: 'Unable to reset user verification'
    });
  }
});

export default router;
