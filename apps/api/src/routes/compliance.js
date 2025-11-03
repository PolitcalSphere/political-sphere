/**
 * Compliance API Routes
 * Provides endpoints for compliance monitoring, reporting, and alerts
 * Supports DSA, GDPR, and ISO 27001 compliance requirements
 */

const express = require('express');
const router = express.Router();
const complianceService = require('../complianceService');
const { authenticate, requireRole } = require('../middleware/auth');
const logger = require('../logger');

// Rate limiting for compliance endpoints
const rateLimit = require('express-rate-limit');
const complianceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many compliance requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
router.use(complianceLimiter);

/**
 * GET /api/compliance/dashboard
 * Get compliance dashboard data
 * Requires moderator or admin role
 */
router.get('/dashboard', authenticate, requireRole('moderator'), async (req, res) => {
  try {
    const dashboard = complianceService.getComplianceDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Failed to fetch compliance dashboard', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Dashboard fetch failed',
      message: 'Unable to retrieve compliance dashboard at this time'
    });
  }
});

/**
 * GET /api/compliance/transparency
 * Get DSA transparency report
 * Public endpoint (aggregated data only)
 */
router.get('/transparency', async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    const filters = {
      period,
      startDate,
      endDate
    };

    const report = complianceService.generateDSATransparencyReport(filters);

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
 * GET /api/compliance/alerts
 * Get compliance alerts
 * Requires moderator or admin role
 */
router.get('/alerts', authenticate, requireRole('moderator'), async (req, res) => {
  try {
    const { status, framework, severity, limit = 50, offset = 0 } = req.query;

    const filters = {
      status,
      framework,
      severity
    };

    const alerts = complianceService.getComplianceAlerts(filters);

    // Apply pagination
    const paginatedAlerts = alerts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        total: alerts.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch compliance alerts', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Alerts fetch failed',
      message: 'Unable to retrieve compliance alerts at this time'
    });
  }
});

/**
 * PUT /api/compliance/alerts/:alertId/resolve
 * Resolve a compliance alert
 * Requires admin role
 */
router.put('/alerts/:alertId/resolve', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution } = req.body;

    if (!resolution || resolution.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Resolution required',
        message: 'Please provide a resolution description'
      });
    }

    complianceService.resolveComplianceAlert(alertId, resolution, req.user.id);

    logger.audit('Compliance alert resolved via API', {
      alertId,
      resolvedBy: req.user.id,
      resolution: resolution.substring(0, 100) + '...'
    });

    res.json({
      success: true,
      message: 'Compliance alert resolved successfully'
    });
  } catch (error) {
    logger.error('Failed to resolve compliance alert', { error: error.message, alertId: req.params.alertId });
    res.status(500).json({
      success: false,
      error: 'Alert resolution failed',
      message: 'Unable to resolve compliance alert at this time'
    });
  }
});

/**
 * POST /api/compliance/events
 * Log a compliance event
 * Internal endpoint for services to log compliance events
 */
router.post('/events', authenticate, async (req, res) => {
  try {
    const eventData = req.body;

    // Validate required fields
    const requiredFields = ['category', 'action'];
    const missingFields = requiredFields.filter(field => !eventData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // Add request context
    eventData.userId = req.user.id;
    eventData.ip = req.ip;
    eventData.userAgent = req.get('User-Agent');

    const eventId = complianceService.logComplianceEvent(eventData);

    res.json({
      success: true,
      data: { eventId }
    });
  } catch (error) {
    logger.error('Failed to log compliance event', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Event logging failed',
      message: 'Unable to log compliance event at this time'
    });
  }
});

/**
 * GET /api/compliance/audit-log
 * Export audit log (filtered)
 * Requires admin role
 */
router.get('/audit-log', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      category,
      userId,
      limit = 1000,
      format = 'json'
    } = req.query;

    const filters = {
      startDate,
      endDate,
      category,
      userId
    };

    const auditLog = complianceService.exportAuditLog(filters);

    // Apply limit
    const limitedLog = auditLog.slice(0, parseInt(limit));

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(limitedLog);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: {
          entries: limitedLog,
          total: auditLog.length,
          exported: limitedLog.length,
          filters
        }
      });
    }

    logger.audit('Audit log exported via API', {
      exportedBy: req.user.id,
      entriesCount: limitedLog.length,
      format,
      filters
    });
  } catch (error) {
    logger.error('Failed to export audit log', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Audit log export failed',
      message: 'Unable to export audit log at this time'
    });
  }
});

/**
 * POST /api/compliance/breach-notification
 * Generate GDPR breach notification
 * Requires admin role
 */
router.post('/breach-notification', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const breachDetails = req.body;

    // Validate required breach details
    const requiredFields = ['date', 'time', 'categories', 'approximateNumber'];
    const missingFields = requiredFields.filter(field => !breachDetails[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required breach details',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    const notification = complianceService.generateBreachNotification(breachDetails);

    logger.audit('GDPR breach notification generated via API', {
      breachId: notification.breachId,
      generatedBy: req.user.id,
      categories: breachDetails.categories
    });

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Failed to generate breach notification', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Breach notification generation failed',
      message: 'Unable to generate breach notification at this time'
    });
  }
});

/**
 * POST /api/compliance/admin/cleanup-audit
 * Clean up old audit entries
 * Requires admin role
 */
router.post('/admin/cleanup-audit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;

    complianceService.cleanupAuditLog(parseInt(daysOld));

    logger.audit('Audit log cleaned up via API', {
      cleanedBy: req.user.id,
      daysOld: parseInt(daysOld)
    });

    res.json({
      success: true,
      message: `Audit log cleaned up. Removed entries older than ${daysOld} days.`
    });
  } catch (error) {
    logger.error('Failed to cleanup audit log', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Audit cleanup failed',
      message: 'Unable to cleanup audit log at this time'
    });
  }
});

/**
 * GET /api/compliance/metrics
 * Get compliance metrics for monitoring
 * Requires moderator role
 */
router.get('/metrics', authenticate, requireRole('moderator'), async (req, res) => {
  try {
    const metrics = {
      complianceScore: complianceService.calculateComplianceScore(),
      activeAlerts: complianceService.getComplianceAlerts({ status: 'active' }).length,
      recentEvents: complianceService.auditLog.slice(-10), // Last 10 events
      frameworkCoverage: complianceService.getFrameworkCoverage()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to fetch compliance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Metrics fetch failed',
      message: 'Unable to retrieve compliance metrics at this time'
    });
  }
});

// Helper function to convert audit log to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

module.exports = router;
