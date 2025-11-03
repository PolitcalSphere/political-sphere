/**
 * Compliance Service
 * Manages compliance monitoring, reporting, and audit trails
 * Supports multiple regulatory frameworks (DSA, GDPR, ISO 27001, etc.)
 */

const logger = require('../logger');
const crypto = require('crypto');

class ComplianceService {
  constructor() {
    this.auditLog = []; // In production, use persistent storage
    this.complianceMetrics = new Map();
    this.alerts = [];
    this.reportingPeriod = 30; // days
  }

  /**
   * Log compliance event for audit trail
   * @param {Object} event - Compliance event details
   * @returns {string} - Event ID
   */
  logComplianceEvent(event) {
    const eventId = crypto.randomUUID();
    const auditEntry = {
      id: eventId,
      timestamp: new Date().toISOString(),
      category: event.category || 'general',
      action: event.action,
      userId: event.userId,
      resource: event.resource,
      details: event.details,
      ip: event.ip,
      userAgent: event.userAgent,
      complianceFrameworks: event.complianceFrameworks || []
    };

    this.auditLog.push(auditEntry);

    // Keep only last 1000 entries in memory (production: persistent storage)
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    logger.audit('Compliance event logged', {
      eventId,
      category: auditEntry.category,
      action: auditEntry.action,
      userId: event.userId
    });

    // Check for compliance violations
    this.checkComplianceViolations(auditEntry);

    return eventId;
  }

  /**
   * Check for compliance violations and trigger alerts
   * @param {Object} auditEntry
   */
  checkComplianceViolations(auditEntry) {
    const violations = [];

    // GDPR violations
    if (auditEntry.category === 'data_processing' && !auditEntry.details.lawfulBasis) {
      violations.push({
        framework: 'GDPR',
        rule: 'Article 6 - Lawful Basis',
        severity: 'high',
        description: 'Data processing without documented lawful basis'
      });
    }

    // DSA violations
    if (auditEntry.category === 'content_moderation' && auditEntry.details.responseTime > 24 * 60 * 60 * 1000) { // 24 hours
      violations.push({
        framework: 'DSA',
        rule: 'Content Moderation Timeliness',
        severity: 'medium',
        description: 'Content moderation exceeded 24-hour response time'
      });
    }

    // ISO 27001 violations
    if (auditEntry.category === 'access_control' && auditEntry.details.failedAttempts > 5) {
      violations.push({
        framework: 'ISO 27001',
        rule: 'Access Control',
        severity: 'medium',
        description: 'Multiple failed access attempts detected'
      });
    }

    // Trigger alerts for violations
    violations.forEach(violation => {
      this.createComplianceAlert(violation, auditEntry);
    });
  }

  /**
   * Create compliance alert
   * @param {Object} violation
   * @param {Object} auditEntry
   */
  createComplianceAlert(violation, auditEntry) {
    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      framework: violation.framework,
      rule: violation.rule,
      severity: violation.severity,
      description: violation.description,
      auditEntryId: auditEntry.id,
      status: 'active',
      assignedTo: null,
      resolvedAt: null
    };

    this.alerts.push(alert);

    logger.warn('Compliance alert created', {
      alertId: alert.id,
      framework: violation.framework,
      severity: violation.severity,
      description: violation.description
    });

    // In production: send email/SMS to compliance team
    // this.notifyComplianceTeam(alert);
  }

  /**
   * Get compliance dashboard data
   * @returns {Object} - Dashboard metrics
   */
  getComplianceDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Filter recent audit entries
    const recentEntries = this.auditLog.filter(entry =>
      new Date(entry.timestamp) > thirtyDaysAgo
    );

    // Calculate metrics
    const metrics = {
      totalEvents: recentEntries.length,
      eventsByCategory: this.groupByCategory(recentEntries),
      activeAlerts: this.alerts.filter(alert => alert.status === 'active').length,
      resolvedAlerts: this.alerts.filter(alert => alert.status === 'resolved').length,
      complianceScore: this.calculateComplianceScore(),
      topViolations: this.getTopViolations(),
      frameworkCoverage: this.getFrameworkCoverage()
    };

    return metrics;
  }

  /**
   * Group audit entries by category
   * @param {Array} entries
   * @returns {Object}
   */
  groupByCategory(entries) {
    return entries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Calculate overall compliance score
   * @returns {number} - Score from 0-100
   */
  calculateComplianceScore() {
    // Simplified scoring algorithm
    const activeAlerts = this.alerts.filter(alert => alert.status === 'active').length;
    const resolvedAlerts = this.alerts.filter(alert => alert.status === 'resolved').length;
    const totalAlerts = activeAlerts + resolvedAlerts;

    if (totalAlerts === 0) return 100;

    const alertPenalty = (activeAlerts / totalAlerts) * 20; // Max 20 points penalty
    const baseScore = 85; // Base score from framework implementation

    return Math.max(0, Math.min(100, baseScore - alertPenalty));
  }

  /**
   * Get top compliance violations
   * @returns {Array}
   */
  getTopViolations() {
    const violationCounts = this.alerts.reduce((acc, alert) => {
      const key = `${alert.framework}:${alert.rule}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(violationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([violation, count]) => ({ violation, count }));
  }

  /**
   * Get compliance framework coverage
   * @returns {Object}
   */
  getFrameworkCoverage() {
    // This would be populated based on implemented frameworks
    return {
      GDPR: { implemented: true, score: 85 },
      DSA: { implemented: true, score: 75 },
      'ISO 27001': { implemented: true, score: 70 },
      'Online Safety Act': { implemented: true, score: 80 },
      'WCAG 2.2': { implemented: true, score: 90 },
      'EU AI Act': { implemented: true, score: 85 }
    };
  }

  /**
   * Generate DSA transparency report
   * @param {Object} filters - Date range, content types
   * @returns {Object} - DSA transparency report
   */
  generateDSATransparencyReport(filters = {}) {
    const report = {
      generatedAt: new Date().toISOString(),
      reportingPeriod: filters.period || 'monthly',
      platformName: 'Political Sphere',
      totalUsers: 0, // Would come from user database
      activeUsers: 0,
      contentModeration: {
        totalReportsReceived: 0,
        reportsResolved: 0,
        averageResponseTime: 0,
        contentRemoved: 0,
        contentRestored: 0
      },
      illegalContent: {
        totalDetected: 0,
        categories: {}
      },
      userRights: {
        accessRequests: 0,
        rectificationRequests: 0,
        erasureRequests: 0,
        averageResponseTime: 0
      }
    };

    // Populate with actual data (pseudo-code)
    // const moderationStats = await db.moderationStats.find(filters);
    // Object.assign(report.contentModeration, moderationStats);

    logger.info('DSA transparency report generated', { period: report.reportingPeriod });

    return report;
  }

  /**
   * Generate GDPR Article 33 breach notification
   * @param {Object} breachDetails
   * @returns {Object} - Breach notification data
   */
  generateBreachNotification(breachDetails) {
    const notification = {
      breachId: crypto.randomUUID(),
      reportedAt: new Date().toISOString(),
      breachDetails: {
        date: breachDetails.date,
        time: breachDetails.time,
        categories: breachDetails.categories,
        approximateNumber: breachDetails.approximateNumber,
        consequences: breachDetails.consequences,
        measuresTaken: breachDetails.measuresTaken
      },
      supervisoryAuthority: 'ICO (UK)', // or relevant authority
      status: 'draft'
    };

    logger.audit('GDPR breach notification generated', {
      breachId: notification.breachId,
      categories: breachDetails.categories
    });

    return notification;
  }

  /**
   * Export audit log for external audit
   * @param {Object} filters
   * @returns {Array} - Filtered audit entries
   */
  exportAuditLog(filters = {}) {
    let filteredLog = [...this.auditLog];

    // Apply filters
    if (filters.startDate) {
      filteredLog = filteredLog.filter(entry =>
        new Date(entry.timestamp) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filteredLog = filteredLog.filter(entry =>
        new Date(entry.timestamp) <= new Date(filters.endDate)
      );
    }

    if (filters.category) {
      filteredLog = filteredLog.filter(entry => entry.category === filters.category);
    }

    if (filters.userId) {
      filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
    }

    logger.audit('Audit log exported', {
      filters,
      entriesExported: filteredLog.length
    });

    return filteredLog;
  }

  /**
   * Resolve compliance alert
   * @param {string} alertId
   * @param {string} resolution
   * @param {string} resolvedBy
   */
  resolveComplianceAlert(alertId, resolution, resolvedBy) {
    const alert = this.alerts.find(a => a.id === alertId);

    if (alert) {
      alert.status = 'resolved';
      alert.resolution = resolution;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date().toISOString();

      logger.audit('Compliance alert resolved', {
        alertId,
        resolvedBy,
        resolution: resolution.substring(0, 100) + '...'
      });
    }
  }

  /**
   * Get compliance alerts
   * @param {Object} filters
   * @returns {Array}
   */
  getComplianceAlerts(filters = {}) {
    let filteredAlerts = [...this.alerts];

    if (filters.status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
    }

    if (filters.framework) {
      filteredAlerts = filteredAlerts.filter(alert => alert.framework === filters.framework);
    }

    if (filters.severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === filters.severity);
    }

    return filteredAlerts;
  }

  /**
   * Clean up old audit entries (admin function)
   * @param {number} daysOld - Remove entries older than this
   */
  cleanupAuditLog(daysOld = 90) {
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    const initialLength = this.auditLog.length;

    this.auditLog = this.auditLog.filter(entry =>
      new Date(entry.timestamp) > cutoffDate
    );

    const removedCount = initialLength - this.auditLog.length;

    logger.info('Audit log cleaned up', {
      daysOld,
      removedCount,
      remainingCount: this.auditLog.length
    });
  }
}

/**
 * Types
 * @typedef {Object} ComplianceEvent
 * @property {string} category - Event category
 * @property {string} action - Action performed
 * @property {string} [userId] - User ID
 * @property {string} [resource] - Resource affected
 * @property {Object} [details] - Additional details
 * @property {string} [ip] - IP address
 * @property {string} [userAgent] - User agent
 * @property {string[]} [complianceFrameworks] - Related frameworks
 *
 * @typedef {Object} ComplianceAlert
 * @property {string} id - Alert ID
 * @property {string} timestamp - Alert creation time
 * @property {string} framework - Compliance framework
 * @property {string} rule - Specific rule violated
 * @property {string} severity - Alert severity
 * @property {string} description - Alert description
 * @property {string} auditEntryId - Related audit entry
 * @property {string} status - Alert status
 * @property {string|null} assignedTo - Assigned user
 * @property {string|null} resolvedAt - Resolution time
 */

module.exports = new ComplianceService();
