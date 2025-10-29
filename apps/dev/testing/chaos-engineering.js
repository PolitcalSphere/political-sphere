#!/usr/bin/env node

/**
 * Chaos Engineering Framework for Resilience Testing
 * Implements controlled experiments to test system resilience
 */

import fs from 'fs/promises';
import path from 'path';

const DEFAULT_CONFIG_PATH = 'apps/dev/testing/config/chaos-plan.json';
const BASELINE_PATH = 'ai-learning/chaos-baselines.json';
const HISTORY_LOG_PATH = 'ai-learning/chaos-history.log';

const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sampleNormal(mean, std) {
  const u = Math.random();
  const v = Math.random();
  const magnitude = Math.sqrt(-2.0 * Math.log(u || Number.EPSILON));
  const theta = 2.0 * Math.PI * v;
  const z = magnitude * Math.cos(theta);
  return mean + std * z;
}

class ChaosEngineering {
  constructor(options = {}) {
    this.experiments = {};
    this.results = [];
    this.baselines = {};
    this.configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
    this.historyLog = HISTORY_LOG_PATH;
  }

  async initialize() {
    console.log('🌀 Initializing Chaos Engineering Framework...');

    // Load existing experiments and results
    try {
      const experimentsData = await fs.readFile('ai-learning/chaos-experiments.json', 'utf8');
      this.experiments = JSON.parse(experimentsData);
    } catch (error) {
      console.log('📊 No existing experiments found, starting fresh...');
      this.experiments = {};
    }

    try {
      const resultsData = await fs.readFile('ai-learning/chaos-results.json', 'utf8');
      this.results = JSON.parse(resultsData);
    } catch (error) {
      console.log('📈 No results found, starting fresh...');
      this.results = [];
    }

    await this.loadBaselinesFromDisk();
  }

  createNetworkLatencyExperiment() {
    return {
      name: 'network-latency-injection',
      description: 'Inject network latency to test resilience',
      type: 'network',
      duration: 300, // 5 minutes
      intensity: 'medium',
      targets: ['api', 'database', 'cache'],
      parameters: {
        latency: {
          min: 100, // ms
          max: 2000, // ms
          distribution: 'normal'
        },
        packetLoss: 0.01 // 1%
      },
      safetyLimits: {
        maxLatency: 5000,
        maxPacketLoss: 0.05,
        autoRollback: true
      },
      metrics: [
        'responseTime',
        'errorRate',
        'throughput',
        'cpuUsage',
        'memoryUsage'
      ]
    };
  }

  createResourceExhaustionExperiment() {
    return {
      name: 'resource-exhaustion',
      description: 'Simulate resource exhaustion scenarios',
      type: 'resource',
      duration: 600, // 10 minutes
      intensity: 'high',
      targets: ['application', 'database'],
      parameters: {
        cpuLoad: 0.9, // 90% CPU usage
        memoryPressure: 0.85, // 85% memory usage
        diskIO: 'high',
        networkIO: 'saturated'
      },
      safetyLimits: {
        maxCpuUsage: 0.95,
        maxMemoryUsage: 0.95,
        autoRollback: true,
        circuitBreaker: true
      },
      metrics: [
        'cpuUsage',
        'memoryUsage',
        'diskIO',
        'networkIO',
        'responseTime',
        'errorRate'
      ]
    };
  }

  createServiceFailureExperiment() {
    return {
      name: 'service-failure-simulation',
      description: 'Simulate service failures and cascading effects',
      type: 'failure',
      duration: 180, // 3 minutes
      intensity: 'critical',
      targets: ['cache', 'queue', 'external-api'],
      parameters: {
        failureMode: 'crash', // crash, hang, slow
        failureRate: 0.1, // 10% of requests fail
        recoveryTime: 30, // seconds
        cascading: true // allow cascading failures
      },
      safetyLimits: {
        maxFailureRate: 0.5,
        autoRollback: true,
        circuitBreaker: true
      },
      metrics: [
        'errorRate',
        'responseTime',
        'availability',
        'recoveryTime',
        'cascadingFailures'
      ]
    };
  }

  createDataCorruptionExperiment() {
    return {
      name: 'data-corruption-test',
      description: 'Test system resilience to data corruption',
      type: 'data',
      duration: 120, // 2 minutes
      intensity: 'medium',
      targets: ['database', 'cache'],
      parameters: {
        corruptionRate: 0.001, // 0.1% of data corrupted
        corruptionType: 'random', // random, systematic
        backupIntegrity: true
      },
      safetyLimits: {
        maxCorruptionRate: 0.01,
        dataBackup: true,
        autoRollback: true
      },
      metrics: [
        'dataIntegrity',
        'errorRate',
        'recoveryTime',
        'backupSuccess'
      ]
    };
  }

  async loadExperimentLibrary(customConfigPath) {
    const defaults = {
      networkLatency: this.createNetworkLatencyExperiment(),
      resourceExhaustion: this.createResourceExhaustionExperiment(),
      serviceFailure: this.createServiceFailureExperiment(),
      dataCorruption: this.createDataCorruptionExperiment()
    };

    const configPath = customConfigPath ?? this.configPath;
    try {
      const resolved = path.resolve(configPath);
      const data = await fs.readFile(resolved, 'utf8');
      const parsed = JSON.parse(data);
      const experimentsArray = Array.isArray(parsed) ? parsed : parsed.experiments ?? [];
      const overrides = {};
      experimentsArray.forEach((experiment) => {
        if (experiment?.name) {
          overrides[experiment.name] = { ...experiment };
        }
      });
      if (Object.keys(overrides).length) {
        console.log(`🧭 Loaded ${Object.keys(overrides).length} experiments from ${configPath}`);
        return { ...defaults, ...overrides };
      }
    } catch (error) {
      // If the file is missing that's ok; we fall back to defaults.
    }

    return defaults;
  }

  async establishBaselines() {
    console.log('📊 Establishing performance baselines...');

    if (!Object.keys(this.baselines).length) {
      // Simulate baseline measurements if none persisted
      this.baselines = {
        responseTime: { mean: 150, std: 25, unit: 'ms' },
        errorRate: { mean: 0.005, std: 0.002, unit: 'percentage' },
        throughput: { mean: 1200, std: 100, unit: 'requests/sec' },
        cpuUsage: { mean: 0.45, std: 0.1, unit: 'percentage' },
        memoryUsage: { mean: 0.6, std: 0.15, unit: 'percentage' },
        availability: { mean: 0.9995, std: 0.0001, unit: 'percentage' }
      };
    }

    console.log('✅ Baselines established');
    await this.persistBaselines();
    return this.baselines;
  }

  async loadBaselinesFromDisk() {
    try {
      const data = await fs.readFile(BASELINE_PATH, 'utf8');
      this.baselines = JSON.parse(data);
      console.log('📂 Loaded persisted baselines');
    } catch (error) {
      this.baselines = {};
    }
  }

  async persistBaselines() {
    await fs.mkdir(path.dirname(BASELINE_PATH), { recursive: true });
    await fs.writeFile(BASELINE_PATH, JSON.stringify(this.baselines, null, 2));
  }

  async runExperiment(experiment) {
    console.log(`🧪 Running experiment: ${experiment.name}`);

    const startTime = new Date();
    const experimentId = `${experiment.name}-${Date.now()}`;

    // Pre-experiment measurements
    const preMetrics = await this.measureSystem();

    // Execute experiment
    const executionResult = await this.executeExperiment(experiment);

    // Post-experiment measurements
    const postMetrics = await this.measureSystem({ phase: 'post', experiment, preMetrics });

    const safety = this.evaluateSafety(experiment, postMetrics);

    // Recovery phase
    const recoveryResult = await this.recoverSystem(experiment);

    // Analysis
    const analysis = this.analyzeExperimentResults(experiment, preMetrics, postMetrics, executionResult, safety);

    const result = {
      id: experimentId,
      experiment: experiment.name,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - startTime.getTime(),
      preMetrics,
      postMetrics,
      safety,
      executionResult,
      recoveryResult,
      analysis,
      status: analysis.resilient ? 'passed' : 'failed'
    };

    this.results.push(result);
    this.updateBaselinesWithObservation(postMetrics);
    await this.logExperimentResult(result);
    console.log(`✅ Experiment ${experiment.name} completed: ${result.status.toUpperCase()}`);

    return result;
  }

  async measureSystem({ phase = 'steady', experiment, preMetrics } = {}) {
    const metrics = {
      timestamp: new Date().toISOString(),
      responseTime: this.sampleMetric('responseTime'),
      errorRate: this.sampleMetric('errorRate'),
      throughput: this.sampleMetric('throughput'),
      cpuUsage: clamp(this.sampleMetric('cpuUsage'), 0, 1),
      memoryUsage: clamp(this.sampleMetric('memoryUsage'), 0, 1),
      availability: clamp(this.sampleMetric('availability'), 0, 1),
      dataIntegrity: clamp(this.sampleMetric('dataIntegrity'), 0, 1),
      backupSuccess: true
    };

    if (phase === 'post' && experiment) {
      this.applyExperimentImpact(metrics, experiment, preMetrics);
    }

    return metrics;
  }

  sampleMetric(metricName) {
    const baseline = this.baselines[metricName];
    if (!baseline) {
      // fall back to sensible defaults
      const defaults = {
        responseTime: { mean: 150, std: 30 },
        errorRate: { mean: 0.01, std: 0.005 },
        throughput: { mean: 1000, std: 200 },
        cpuUsage: { mean: 0.5, std: 0.1 },
        memoryUsage: { mean: 0.6, std: 0.12 },
        availability: { mean: 0.999, std: 0.0005 },
        dataIntegrity: { mean: 1, std: 0.001 }
      };
      const def = defaults[metricName] ?? { mean: 0.5, std: 0.1 };
      return sampleNormal(def.mean, def.std);
    }
    return sampleNormal(baseline.mean, baseline.std ?? baseline.mean * 0.1);
  }

  applyExperimentImpact(metrics, experiment, preMetrics = {}) {
    const applyChange = (metric, deltaFn) => {
      const before = preMetrics[metric] ?? this.baselines[metric]?.mean ?? metrics[metric];
      const changed = deltaFn(before);
      metrics[metric] = changed;
    };

    switch (experiment.type) {
      case 'network':
        applyChange('responseTime', (v) => v * 1.5);
        applyChange('errorRate', (v) => clamp(v * 2.5, 0, 1));
        applyChange('throughput', (v) => v * 0.7);
        break;
      case 'resource':
        applyChange('cpuUsage', (v) => clamp(v + 0.25, 0, 1));
        applyChange('memoryUsage', (v) => clamp(v + 0.2, 0, 1));
        applyChange('responseTime', (v) => v * 1.3);
        applyChange('errorRate', (v) => clamp(v * 1.8, 0, 1));
        break;
      case 'failure':
        applyChange('availability', (v) => clamp(v - 0.05, 0, 1));
        applyChange('errorRate', (v) => clamp(v + 0.02, 0, 1));
        applyChange('responseTime', (v) => v * 1.4);
        break;
      case 'data':
        metrics.dataIntegrity = clamp((preMetrics.dataIntegrity ?? 1) - 0.05, 0, 1);
        metrics.backupSuccess = Math.random() > 0.1;
        applyChange('errorRate', (v) => clamp(v + 0.015, 0, 1));
        break;
      default:
        break;
    }

    return metrics;
  }

  evaluateSafety(experiment, metrics) {
    const incidents = [];

    switch (experiment.type) {
      case 'network':
        if (experiment.safetyLimits?.maxLatency && metrics.responseTime > experiment.safetyLimits.maxLatency) {
          incidents.push({
            metric: 'responseTime',
            action: 'Terminate network latency experiment early',
            priority: 'high',
            reason: `Latency ${metrics.responseTime.toFixed(0)}ms exceeded limit ${experiment.safetyLimits.maxLatency}ms`
          });
        }
        break;
      case 'resource':
        if (experiment.safetyLimits?.maxCpuUsage && metrics.cpuUsage > experiment.safetyLimits.maxCpuUsage) {
          incidents.push({
            metric: 'cpuUsage',
            action: 'Scale up temporarily or rollback resource experiment',
            priority: 'high',
            reason: `CPU usage ${(metrics.cpuUsage * 100).toFixed(1)}% above limit ${(experiment.safetyLimits.maxCpuUsage * 100).toFixed(1)}%`
          });
        }
        if (experiment.safetyLimits?.maxMemoryUsage && metrics.memoryUsage > experiment.safetyLimits.maxMemoryUsage) {
          incidents.push({
            metric: 'memoryUsage',
            action: 'Trigger memory guardrails',
            priority: 'high',
            reason: `Memory usage ${(metrics.memoryUsage * 100).toFixed(1)}% above limit ${(experiment.safetyLimits.maxMemoryUsage * 100).toFixed(1)}%`
          });
        }
        break;
      case 'failure':
        if (metrics.errorRate > (experiment.safetyLimits?.maxFailureRate ?? 0.5)) {
          incidents.push({
            metric: 'errorRate',
            action: 'Invoke circuit breaker to protect downstream services',
            priority: 'critical',
            reason: `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeded allowed ${(experiment.safetyLimits?.maxFailureRate ?? 0.5) * 100}%`
          });
        }
        break;
      case 'data':
        if (experiment.safetyLimits?.maxCorruptionRate && metrics.dataIntegrity < 1 - experiment.safetyLimits.maxCorruptionRate) {
          incidents.push({
            metric: 'dataIntegrity',
            action: 'Restore from backups and halt data corruption experiment',
            priority: 'critical',
            reason: 'Data integrity dropped beyond safety limits'
          });
        }
        if (experiment.safetyLimits?.dataBackup && metrics.backupSuccess === false) {
          incidents.push({
            metric: 'backupSuccess',
            action: 'Validate backup pipeline before next chaos run',
            priority: 'high',
            reason: 'Backup verification failed during chaos experiment'
          });
        }
        break;
      default:
        break;
    }

    return {
      passed: incidents.length === 0,
      incidents
    };
  }

  updateBaselinesWithObservation(metrics) {
    const alpha = 0.05;
    Object.entries(metrics).forEach(([metric, value]) => {
      if (typeof value !== 'number') return;
      const baseline = this.baselines[metric] ?? {
        mean: value,
        std: Math.max(Math.abs(value) * 0.1, 0.0001),
        unit: this.baselines[metric]?.unit ?? null
      };
      const mean = baseline.mean ?? value;
      const std = baseline.std ?? Math.max(Math.abs(value) * 0.1, 0.0001);
      const newMean = mean + alpha * (value - mean);
      const variance = std ** 2;
      const newVariance = (1 - alpha) * variance + alpha * (value - newMean) ** 2;
      this.baselines[metric] = {
        ...baseline,
        mean: newMean,
        std: Math.sqrt(Math.max(newVariance, 0.0000001))
      };
    });
  }

  async logExperimentResult(result) {
    const line = JSON.stringify({
      id: result.id,
      name: result.experiment,
      status: result.status,
      timestamp: result.endTime,
      risk: result.analysis.riskAssessment,
      safetyIncidents: result.safety.incidents.length,
      sloBreaches: result.analysis.sloBreaches.length
    });
    await fs.mkdir(path.dirname(this.historyLog), { recursive: true });
    await fs.appendFile(this.historyLog, `${line}\n`);
  }

  async executeExperiment(experiment) {
    console.log(`⚡ Executing ${experiment.type} experiment...`);

    // Simulate experiment execution
    const result = {
      success: Math.random() > 0.1, // 90% success rate
      duration: experiment.duration * 1000,
      affectedComponents: experiment.targets,
      sideEffects: []
    };

    // Add realistic side effects based on experiment type
    if (experiment.type === 'network') {
      result.sideEffects.push('Increased response times', 'Higher error rates');
    } else if (experiment.type === 'resource') {
      result.sideEffects.push('Degraded performance', 'Potential timeouts');
    } else if (experiment.type === 'failure') {
      result.sideEffects.push('Service unavailability', 'Cascading failures');
    }

    return result;
  }

  async recoverSystem(experiment) {
    console.log('🔄 Recovering system from experiment...');

    // Simulate recovery process
    const recoveryTime = Math.random() * 60 + 30; // 30-90 seconds

    return {
      success: true,
      recoveryTime,
      method: experiment.safetyLimits.autoRollback ? 'auto-rollback' : 'manual',
      verified: true
    };
  }

  analyzeExperimentResults(experiment, preMetrics, postMetrics, executionResult, safety) {
    console.log('📈 Analyzing experiment results...');

    const analysis = {
      resilient: true,
      weaknesses: [],
      strengths: [],
      recommendations: [],
      riskAssessment: 'low',
      sloBreaches: [],
      safetyIncidents: safety?.incidents ?? []
    };

    // Analyze each metric
    Object.keys(preMetrics).forEach(metric => {
      if (typeof preMetrics[metric] === 'number' && typeof postMetrics[metric] === 'number') {
        const baseline = this.baselines[metric];
        const change = postMetrics[metric] - preMetrics[metric];
        const changePercent = Math.abs(preMetrics[metric]) > 0 ? Math.abs(change / preMetrics[metric]) : Math.abs(change);
        let severity = 'low';
        let breached = false;

        if (baseline?.std) {
          const zScore = Math.abs((postMetrics[metric] - baseline.mean) / (baseline.std || 1));
          if (zScore > 3) {
            severity = 'high';
            breached = true;
            analysis.sloBreaches.push({ metric, zScore, baseline: baseline.mean });
          } else if (zScore > 2) {
            severity = 'medium';
            breached = true;
            analysis.sloBreaches.push({ metric, zScore, baseline: baseline.mean });
          }
        }

        if (!breached && changePercent <= 0.5) {
          analysis.strengths.push({
            metric,
            stability: 1 - changePercent
          });
          return;
        }

        analysis.resilient = false;
        analysis.weaknesses.push({
          metric,
          change: changePercent,
          severity: severity === 'low' ? (changePercent > 1 ? 'high' : 'medium') : severity
        });
      }
    });

    // Generate recommendations
    if (safety && !safety.passed) {
      analysis.resilient = false;
    }

    if (!analysis.resilient) {
      analysis.recommendations = this.generateRecommendations(
        experiment,
        analysis.weaknesses,
        analysis.sloBreaches,
        analysis.safetyIncidents
      );
      analysis.riskAssessment = analysis.weaknesses.some(w => w.severity === 'high') ? 'high' : 'medium';
    }

    return analysis;
  }

  generateRecommendations(experiment, weaknesses, sloBreaches = [], safetyIncidents = []) {
    const recommendations = [];

    weaknesses.forEach(weakness => {
      if (weakness.metric === 'responseTime') {
        recommendations.push({
          priority: 'high',
          action: 'Implement response time circuit breakers',
          rationale: 'System response times degraded significantly during chaos experiment'
        });
      } else if (weakness.metric === 'errorRate') {
        recommendations.push({
          priority: 'high',
          action: 'Add retry mechanisms and fallback strategies',
          rationale: 'Error rates increased beyond acceptable thresholds'
        });
      } else if (weakness.metric === 'availability') {
        recommendations.push({
          priority: 'critical',
          action: 'Implement redundant systems and failover mechanisms',
          rationale: 'System availability was compromised during experiment'
        });
      }
    });

    sloBreaches.forEach((breach) => {
      if (breach.metric === 'availability') {
        recommendations.push({
          priority: 'critical',
          action: 'Introduce multi-region failover and chaos alerts',
          rationale: 'Availability SLO breached during chaos experiment'
        });
      }
    });

    safetyIncidents.forEach((incident) => {
      recommendations.push({
        priority: incident.priority ?? 'high',
        action: incident.action,
        rationale: incident.reason ?? 'Safety limit exceeded during experiment'
      });
    });

    return recommendations;
  }

  async generateReport() {
    console.log('📋 Generating chaos engineering report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalExperiments: this.results.length,
        passedExperiments: this.results.filter(r => r.status === 'passed').length,
        failedExperiments: this.results.filter(r => r.status === 'failed').length,
        overallResilience: this.calculateOverallResilience(),
        sloBreaches: this.results.reduce((acc, r) => acc + (r?.analysis?.sloBreaches?.length ?? 0), 0),
        safetyIncidents: this.results.reduce((acc, r) => acc + (r?.safety?.incidents?.length ?? 0), 0)
      },
      experiments: this.experiments,
      results: this.results.slice(-10), // Last 10 results
      recommendations: this.consolidateRecommendations(),
      nextSteps: this.generateNextSteps()
    };

    await fs.mkdir('ai-learning', { recursive: true });
    await fs.writeFile('ai-learning/chaos-report.json', JSON.stringify(report, null, 2));

    return report;
  }

  calculateOverallResilience() {
    if (this.results.length === 0) return 0;

    const passedCount = this.results.filter(r => r.status === 'passed').length;
    return passedCount / this.results.length;
  }

  consolidateRecommendations() {
    const allRecommendations = [];

    this.results.forEach(result => {
      if (result.analysis.recommendations) {
        allRecommendations.push(...result.analysis.recommendations);
      }
    });

    // Group and deduplicate recommendations
    const grouped = {};
    allRecommendations.forEach(rec => {
      const key = rec.action;
      if (!grouped[key]) {
        grouped[key] = { ...rec, count: 0 };
      }
      grouped[key].count++;
    });

    return Object.values(grouped).sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  generateNextSteps() {
    const nextSteps = [];

    const resilience = this.calculateOverallResilience();

    if (resilience < 0.7) {
      nextSteps.push({
        priority: 'high',
        action: 'Address critical resilience issues before proceeding',
        timeline: 'Immediate'
      });
    }

    nextSteps.push({
      priority: 'medium',
      action: 'Run chaos experiments in staging environment',
      timeline: 'Next sprint'
    });

    nextSteps.push({
      priority: 'medium',
      action: 'Implement automated chaos testing in CI/CD pipeline',
      timeline: 'Next release'
    });

    nextSteps.push({
      priority: 'low',
      action: 'Expand chaos experiment coverage to new failure scenarios',
      timeline: 'Future releases'
    });

    return nextSteps;
  }

  async saveState() {
    const state = {
      experiments: this.experiments,
      results: this.results,
      baselines: this.baselines,
      lastUpdated: new Date().toISOString()
    };

    await fs.mkdir('ai-learning', { recursive: true });
    await fs.writeFile('ai-learning/chaos-experiments.json', JSON.stringify(this.experiments, null, 2));
    await fs.writeFile('ai-learning/chaos-results.json', JSON.stringify(this.results, null, 2));
    await fs.writeFile('ai-learning/chaos-state.json', JSON.stringify(state, null, 2));
    await this.persistBaselines();
  }

  async runChaosCampaign(options = {}) {
    try {
      const { experimentName, configPath, stabilizationDelay = 30000 } = options;

      await this.initialize();
      await this.establishBaselines();

      // Define experiments
      this.experiments = await this.loadExperimentLibrary(configPath);

      let experimentEntries = Object.entries(this.experiments);
      if (experimentName) {
        const selection = experimentEntries.find(([key, exp]) => key === experimentName || exp.name === experimentName);
        if (!selection) {
          throw new Error(`Experiment "${experimentName}" not found in configuration`);
        }
        experimentEntries = [selection];
      }

      // Run experiments
      const campaignResults = [];
      for (const [name, experiment] of experimentEntries) {
        console.log(`\n🎯 Starting experiment: ${name}`);
        const result = await this.runExperiment(experiment);
        campaignResults.push(result);

        // Wait between experiments for system stabilization
        if (experimentEntries.length > 1) {
          await new Promise(resolve => setTimeout(resolve, stabilizationDelay));
        }
      }

      // Generate report
      const report = await this.generateReport();
      await this.saveState();

      console.log('✅ Chaos engineering campaign completed');
      console.log(`📊 Resilience score: ${(report.summary.overallResilience * 100).toFixed(1)}%`);
      console.log(`🧪 Experiments run: ${report.summary.totalExperiments}`);

      return report;

    } catch (error) {
      console.error('❌ Chaos engineering campaign failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const cliOptions = parseArgs(process.argv.slice(2));
  const chaos = new ChaosEngineering({ configPath: cliOptions.configPath });

  chaos
    .runChaosCampaign({
      experimentName: cliOptions.experiment,
      configPath: cliOptions.configPath,
      stabilizationDelay: cliOptions.stabilizationDelay
    })
    .then((report) => {
      console.log('\n📋 Chaos Engineering Campaign Summary:');
      console.log(`Resilience Score: ${(report.summary.overallResilience * 100).toFixed(1)}%`);
      console.log(`Passed: ${report.summary.passedExperiments}/${report.summary.totalExperiments}`);

      if (report.recommendations.length > 0) {
        console.log('\n💡 Key Recommendations:');
        report.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.action} (${rec.priority})`);
        });
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to run chaos engineering campaign:', error);
      process.exit(1);
    });
}

export default ChaosEngineering;

function parseArgs(argv) {
  const options = {
    stabilizationDelay: 30000
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--experiment=')) {
      options.experiment = arg.split('=')[1];
    } else if (arg.startsWith('--config=')) {
      options.configPath = arg.split('=')[1];
    } else if (arg.startsWith('--stabilization=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value)) {
        options.stabilizationDelay = value;
      }
    }
  });

  return options;
}
