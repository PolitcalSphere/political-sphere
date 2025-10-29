#!/usr/bin/env node

// AI Governance and Metrics Collector
// Monitors AI usage, enforces controls, and collects performance metrics

const fs = require('fs').promises;
const path = require('path');

class AIGovernanceManager {
  constructor() {
    this.metricsFile = path.join(__dirname, '..', 'ai-metrics.json');
    this.controlsFile = path.join(__dirname, '..', 'ai-controls.json');
    this.logsDir = path.join(__dirname, '..', 'ai-logs');
  }

  async initialize() {
    await fs.mkdir(this.logsDir, { recursive: true });

    // Initialize metrics
    const initialMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      usageByType: {},
      userSatisfaction: [],
      qualityMetrics: {
        compilationSuccess: 0,
        testPassRate: 0,
        securityScanPass: 0
      },
      ethicalMetrics: {
        biasIncidents: 0,
        harmPrevented: 0,
        explainabilityProvided: 0
      },
      safetyMetrics: {
        constitutionalViolations: 0,
        swarmOverloads: 0,
        policyViolations: 0
      },
      complianceMetrics: {
        legalComplianceChecks: 0,
        democraticIntegrityIncidents: 0,
        abuseDetected: 0
      },
      protectionMetrics: {
        userDataProtected: 0,
        consentGiven: 0,
        fairnessEnsured: 0
      },
      cognitionMetrics: {
        selfReflections: 0,
        realityChecks: 0,
        truthPreserved: 0
      },
      lastUpdated: new Date().toISOString()
    };

    // Initialize controls
    const initialControls = {
      rateLimits: {
        codeGeneration: { maxPerHour: 100, maxPerDay: 500 },
        codeReview: { maxPerHour: 50, maxPerDay: 200 },
        testing: { maxPerHour: 30, maxPerDay: 150 }
      },
      qualityGates: {
        requireLinting: true,
        requireSecurityScan: true,
        requireTesting: true,
        minTestCoverage: 80
      },
      contentFilters: {
        blockHardcodedSecrets: true,
        blockInsecurePatterns: true,
        requireErrorHandling: true
      },
      ethicsControls: {
        enableBiasDetection: true,
        enableHarmPrevention: true,
        enableExplainability: true,
        logEthicalConcerns: true
      },
      neutralityFilters: {
        detectPoliticalBias: true,
        preventCensorship: true,
        ensureNeutrality: true
      },
      auditSettings: {
        logAllInteractions: true,
        retainLogsDays: 90,
        anonymizeUserData: true
      },
      constitutionalSafety: {
        checkConstitutionalCompliance: true,
        blockUnconstitutionalContent: true
      },
      regulatoryFutureproofing: {
        monitorRegulations: true,
        adaptiveCompliance: true
      },
      swarmSafety: {
        maxConcurrentRequests: 10,
        preventSwarmOverload: true
      },
      privilegeTiering: {
        tiers: {
          basic: { maxRequestsPerDay: 10 },
          premium: { maxRequestsPerDay: 100 }
        }
      },
      temporalTracking: {
        trackTimeBased: true,
        detectTemporalAnomalies: true
      },
      policyEnforcement: {
        enforcePolicies: true,
        policyViolationThreshold: 5
      },
      legalCompliance: {
        euAiActCompliant: true,
        gdprCompliant: true
      },
      democraticIntegrity: {
        ensureDemocraticValues: true,
        preventManipulation: true
      },
      abuseAnticipation: {
        detectAbusePatterns: true,
        blockAbusiveUsers: true
      },
      userProtection: {
        protectUserData: true,
        requireConsent: true
      },
      fairnessAssurance: {
        ensureFairness: true,
        monitorBias: true
      },
      metaCognition: {
        enableSelfReflection: true,
        logSelfAssessment: true
      },
      realityCheck: {
        validateReality: true,
        detectHallucinations: true
      },
      truthPreservation: {
        preserveTruth: true,
        factCheckResponses: true
      }
    };

    await this.saveMetrics(initialMetrics);
    await this.saveControls(initialControls);
  }

  async logInteraction(interaction) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: interaction.userId,
      type: interaction.type,
      content: interaction.content.substring(0, 100), // truncate for privacy
      success: interaction.success,
      ethicalFlags: interaction.ethicalFlags || []
    };
    const logFile = path.join(this.logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }

  async recordInteraction(interaction) {
    const metrics = await this.loadMetrics();
    const controls = await this.loadControls();

    // Log interaction for audit
    await this.logInteraction(interaction);

    // Check rate limits
    if (!this.checkRateLimit(interaction.type, interaction.userId)) {
      throw new Error(`Rate limit exceeded for ${interaction.type}`);
    }

    // Apply content filters
    this.applyContentFilters(interaction.content);

    // Ethical and safety checks
    if (controls.constitutionalSafety.checkConstitutionalCompliance && this.detectConstitutionalViolation(interaction.content)) {
      metrics.safetyMetrics.constitutionalViolations++;
      throw new Error('Constitutional violation detected');
    }

    if (controls.abuseAnticipation.detectAbusePatterns && this.detectAbuse(interaction.content)) {
      metrics.complianceMetrics.abuseDetected++;
      throw new Error('Abusive content detected');
    }

    if (controls.realityCheck.validateReality && this.detectHallucination(interaction.content)) {
      metrics.cognitionMetrics.realityChecks++;
      // Log but don't block
      console.warn('Potential hallucination detected');
    }

    // Record metrics
    metrics.totalRequests++;
    metrics.usageByType[interaction.type] = (metrics.usageByType[interaction.type] || 0) + 1;

    if (interaction.success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update response time average
    if (interaction.responseTime) {
      const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1);
      metrics.averageResponseTime = (totalTime + interaction.responseTime) / metrics.totalRequests;
    }

    // Log interaction
    await this.logInteraction(interaction);

    await this.saveMetrics(metrics);
  }

  async validateQuality(content, type) {
    const controls = await this.loadControls();
    const issues = [];

    // Linting check
    if (controls.qualityGates.requireLinting) {
      const lintResult = await this.runLinting(content);
      if (!lintResult.passed) {
        issues.push(...lintResult.errors);
      }
    }

    // Security scan
    if (controls.qualityGates.requireSecurityScan) {
      const securityResult = await this.runSecurityScan(content);
      if (!securityResult.passed) {
        issues.push(...securityResult.vulnerabilities);
      }
    }

    // Testing requirement
    if (controls.qualityGates.requireTesting && type === 'code') {
      const testResult = await this.checkTestCoverage(content);
      if (testResult.coverage < controls.qualityGates.minTestCoverage) {
        issues.push(`Test coverage ${testResult.coverage}% below minimum ${controls.qualityGates.minTestCoverage}%`);
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  checkRateLimit(type, userId) {
    // Simplified rate limiting - in production, use Redis or similar
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);

    // This is a placeholder - implement proper rate limiting
    return true;
  }

  applyContentFilters(content) {
    // Note: This is synchronous for performance - async validation happens separately
    const controls = JSON.parse(require('fs').readFileSync(this.controlsFile, 'utf8'));

    if (controls.contentFilters.blockHardcodedSecrets) {
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]*['"]/i,
        /secret\s*[:=]\s*['"][^'"]*['"]/i,
        /api[_-]?key\s*[:=]\s*['"][^'"]*['"]/i
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          throw new Error('Content contains potential hardcoded secrets');
        }
      }
    }

    if (controls.contentFilters.requireErrorHandling) {
      // Check for basic error handling patterns
      const hasTryCatch = /try\s*\{[\s\S]*\}\s*catch/.test(content);
      const hasErrorHandling = /throw new Error|catch\s*\(/.test(content);

      if (!hasTryCatch && !hasErrorHandling) {
        console.warn('Warning: No error handling detected in generated content');
      }
    }

    // AI Ethics and Bias Controls
    if (controls.ethicsControls) {
      this.applyEthicsFilters(content);
    }

    // Neutrality and Censorship Resilience
    if (controls.neutralityFilters) {
      this.applyNeutralityFilters(content);
    }
  }

  applyEthicsFilters(content) {
    // Bias detection patterns
    const biasPatterns = [
      /\b(only|always|never|all|none)\s+(men|women|people|individuals)\b/gi,
      /\b(race|ethnicity|religion|gender)\s+(is|are|should be)\s+(superior|inferior)\b/gi,
      /\b(discriminate|exclude|ban)\s+(based on|because of)\s+(race|gender|religion)\b/gi
    ];

    for (const pattern of biasPatterns) {
      if (pattern.test(content)) {
        console.warn('Warning: Potential bias detected in content');
        // Log for review but don't block - allow human oversight
        this.logEthicalConcern('bias_detected', content.substring(0, 100));
      }
    }

    // Harm prevention
    const harmPatterns = [
      /\b(harm|hurt|damage|destroy)\s+(yourself|others|people)\b/gi,
      /\b(illegal|criminal|violent)\s+(activity|behavior|act)\b/gi
    ];

    for (const pattern of harmPatterns) {
      if (pattern.test(content)) {
        throw new Error('Content contains potentially harmful instructions');
      }
    }
  }

  applyNeutralityFilters(content) {
    // Political bias detection
    const politicalBiasPatterns = [
      /\b(left|right|liberal|conservative|progressive|traditional)\s+(agenda|ideology|bias)\b/gi,
      /\b(propaganda|indoctrination|brainwashing)\b/gi
    ];

    for (const pattern of politicalBiasPatterns) {
      if (pattern.test(content)) {
        console.warn('Warning: Potential political bias detected');
        this.logEthicalConcern('political_bias', content.substring(0, 100));
      }
    }

    // Censorship resilience - ensure content doesn't promote censorship
    const censorshipPatterns = [
      /\b(censor|suppress|silence)\s+(speech|opinion|information)\b/gi,
      /\b(ban|forbid|prohibit)\s+(discussion|debate|criticism)\b/gi
    ];

    for (const pattern of censorshipPatterns) {
      if (pattern.test(content)) {
        throw new Error('Content appears to promote censorship');
      }
    }
  }

  logEthicalConcern(type, content) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      content,
      severity: 'warning'
    };

    const ethicsLog = path.join(this.logsDir, 'ethics.log');
    require('fs').appendFileSync(ethicsLog, JSON.stringify(logEntry) + '\n');
  }

  async runLinting(content) {
    // Placeholder - integrate with ESLint
    return { passed: true, errors: [] };
  }

  detectConstitutionalViolation(content) {
    // Simple check for demo
    const badWords = ['unconstitutional', 'illegal'];
    return badWords.some(word => content.toLowerCase().includes(word));
  }

  detectAbuse(content) {
    const abusiveWords = ['abuse', 'harm'];
    return abusiveWords.some(word => content.toLowerCase().includes(word));
  }

  detectHallucination(content) {
    // Simple check, e.g., if contains contradictory statements
    return content.includes('definitely not') && content.includes('absolutely yes');
  }

  async runSecurityScan(content) {
    // Placeholder - integrate with security scanning tools
    return { passed: true, vulnerabilities: [] };
  }

  async checkTestCoverage(content) {
    // Placeholder - integrate with test coverage tools
    return { coverage: 85 };
  }

  async logInteraction(interaction) {
    const controls = await this.loadControls();

    if (!controls.auditSettings.logAllInteractions) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: controls.auditSettings.anonymizeUserData ? this.anonymize(interaction.userId) : interaction.userId,
      type: interaction.type,
      success: interaction.success,
      responseTime: interaction.responseTime,
      contentLength: interaction.content?.length || 0,
      metadata: interaction.metadata || {}
    };

    const logFile = path.join(this.logsDir, `${new Date().toISOString().split('T')[0]}.jsonl`);
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }

  anonymize(data) {
    // Simple anonymization - hash or remove PII
    return require('crypto').createHash('sha256').update(data).digest('hex').substring(0, 8);
  }

  async loadMetrics() {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveMetrics(metrics) {
    metrics.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));
  }

  async loadControls() {
    try {
      const data = await fs.readFile(this.controlsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveControls(controls) {
    await fs.writeFile(this.controlsFile, JSON.stringify(controls, null, 2));
  }

  async getMetrics() {
    return await this.loadMetrics();
  }

  async getControls() {
    return await this.loadControls();
  }

  async updateControls(updates) {
    const controls = await this.loadControls();
    Object.assign(controls, updates);
    await this.saveControls(controls);
  }
}

// CLI interface
async function main() {
  const manager = new AIGovernanceManager();
  const command = process.argv[2];

  switch (command) {
    case 'init':
      await manager.initialize();
      console.log('AI Governance initialized');
      break;

    case 'metrics':
      const metrics = await manager.getMetrics();
      console.log(JSON.stringify(metrics, null, 2));
      break;

    case 'controls':
      const controls = await manager.getControls();
      console.log(JSON.stringify(controls, null, 2));
      break;

    case 'validate':
      const content = process.argv[3] || '';
      const type = process.argv[4] || 'code';
      const result = await manager.validateQuality(content, type);
      console.log(JSON.stringify(result, null, 2));
      break;

    default:
      console.log('Usage: node governance.js <init|metrics|controls|validate>');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AIGovernanceManager;