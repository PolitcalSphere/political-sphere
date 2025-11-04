const compliance = require('../complianceService');

describe('ComplianceService (smoke tests)', () => {
  beforeEach(() => {
    // Reset in-memory stores to a known state
    compliance.auditLog = [];
    compliance.alerts = [];
  });

  it('logs an audit event and returns an id', () => {
    const eventId = compliance.logComplianceEvent({
      category: 'access_control',
      action: 'failed_login',
      userId: 'test-user',
      details: { failedAttempts: 6 }
    });

    expect(typeof eventId).toBe('string');
    const entry = compliance.auditLog.find((e) => e.id === eventId);
    expect(entry).toBeTruthy();
  });

  it('creates alerts for violations and exposes dashboard metrics', () => {
    compliance.logComplianceEvent({
      category: 'access_control',
      action: 'failed_login',
      userId: 'user-2',
      details: { failedAttempts: 7 }
    });

    expect(compliance.alerts.length).toBeGreaterThan(0);

    const dashboard = compliance.getComplianceDashboard();
    expect(dashboard.totalEvents).toBeGreaterThanOrEqual(1);
    expect(typeof dashboard.complianceScore).toBe('number');
  });
});
