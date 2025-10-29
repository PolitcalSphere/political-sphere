#!/usr/bin/env node

/**
 * Performance Benchmarking and Regression Testing Framework
 * Automated performance testing with regression detection
 */

import fs from 'fs/promises';

class PerformanceBenchmarking {
  constructor() {
    this.benchmarks = {};
    this.baselines = {};
    this.results = [];
    this.regressions = [];
  }

  async initialize() {
    console.log('⚡ Initializing Performance Benchmarking Framework...');

    // Load existing benchmarks and baselines
    try {
      const benchmarksData = await fs.readFile('ai-learning/performance-benchmarks.json', 'utf8');
      this.benchmarks = JSON.parse(benchmarksData);
    } catch (error) {
      console.log('📊 No existing benchmarks found, starting fresh...');
      this.benchmarks = {};
    }

    try {
      const baselinesData = await fs.readFile('ai-learning/performance-baselines.json', 'utf8');
      this.baselines = JSON.parse(baselinesData);
    } catch (error) {
      console.log('📈 No baselines found, starting fresh...');
      this.baselines = {};
    }
  }

  createAPISpeedBenchmark() {
    return {
      name: 'api-response-speed',
      description: 'Measure API endpoint response times under various loads',
      category: 'api',
      scenarios: [
        {
          name: 'light-load',
          concurrentUsers: 10,
          duration: 60, // seconds
          rampUp: 10
        },
        {
          name: 'medium-load',
          concurrentUsers: 50,
          duration: 120,
          rampUp: 30
        },
        {
          name: 'heavy-load',
          concurrentUsers: 200,
          duration: 180,
          rampUp: 60
        }
      ],
      endpoints: [
        '/api/users',
        '/api/posts',
        '/api/search',
        '/api/analytics'
      ],
      metrics: [
        'responseTime',
        'throughput',
        'errorRate',
        'cpuUsage',
        'memoryUsage'
      ],
      thresholds: {
        responseTime: { p95: 500, p99: 1000 }, // ms
        errorRate: { max: 0.01 }, // 1%
        throughput: { min: 100 } // requests/sec
      }
    };
  }

  createDatabasePerformanceBenchmark() {
    return {
      name: 'database-query-performance',
      description: 'Benchmark database query performance and optimization',
      category: 'database',
      scenarios: [
        {
          name: 'read-heavy',
          readQueries: 1000,
          writeQueries: 100,
          duration: 120
        },
        {
          name: 'write-heavy',
          readQueries: 100,
          writeQueries: 1000,
          duration: 120
        },
        {
          name: 'mixed-workload',
          readQueries: 500,
          writeQueries: 500,
          duration: 120
        }
      ],
      queryTypes: [
        'simple-select',
        'complex-join',
        'aggregation',
        'full-text-search',
        'bulk-insert'
      ],
      metrics: [
        'queryTime',
        'connectionPoolUsage',
        'lockWaitTime',
        'indexHitRate',
        'cacheHitRate'
      ],
      thresholds: {
        queryTime: { p95: 100, p99: 500 }, // ms
        indexHitRate: { min: 0.9 }, // 90%
        cacheHitRate: { min: 0.8 } // 80%
      }
    };
  }

  createFrontendRenderingBenchmark() {
    return {
      name: 'frontend-rendering-performance',
      description: 'Measure frontend rendering and interaction performance',
      category: 'frontend',
      scenarios: [
        {
          name: 'initial-load',
          actions: ['navigate-to-home', 'scroll-content', 'load-dynamic-content']
        },
        {
          name: 'user-interactions',
          actions: ['click-buttons', 'fill-forms', 'navigate-pages', 'search-content']
        },
        {
          name: 'heavy-content',
          actions: ['load-large-dataset', 'render-complex-charts', 'handle-real-time-updates']
        }
      ],
      metrics: [
        'firstContentfulPaint',
        'largestContentfulPaint',
        'firstInputDelay',
        'cumulativeLayoutShift',
        'interactionToNextPaint',
        'bundleSize',
        'runtimeMemoryUsage'
      ],
      thresholds: {
        firstContentfulPaint: { max: 1500 }, // ms
        largestContentfulPaint: { max: 2500 }, // ms
        firstInputDelay: { max: 100 }, // ms
        cumulativeLayoutShift: { max: 0.1 },
        bundleSize: { max: 2048000 } // 2MB
      }
    };
  }

  createMemoryLeakBenchmark() {
    return {
      name: 'memory-leak-detection',
      description: 'Detect memory leaks and excessive memory usage',
      category: 'memory',
      scenarios: [
        {
          name: 'steady-state',
          duration: 300, // 5 minutes
          checkInterval: 30
        },
        {
          name: 'stress-test',
          duration: 600, // 10 minutes
          loadPattern: 'increasing',
          checkInterval: 60
        }
      ],
      metrics: [
        'heapUsed',
        'heapTotal',
        'externalMemory',
        'gcCollections',
        'gcPauseTime',
        'memoryGrowthRate'
      ],
      thresholds: {
        memoryGrowthRate: { max: 0.01 }, // 1% per minute
        gcPauseTime: { p95: 50 }, // ms
        heapGrowth: { max: 0.05 } // 5% growth allowed
      }
    };
  }

  async establishBaselines() {
    console.log('📊 Establishing performance baselines...');

    // Run initial benchmarks to establish baselines
    const benchmarks = {
      apiSpeed: this.createAPISpeedBenchmark(),
      databasePerformance: this.createDatabasePerformanceBenchmark(),
      frontendRendering: this.createFrontendRenderingBenchmark(),
      memoryLeak: this.createMemoryLeakBenchmark()
    };

    for (const [name, benchmark] of Object.entries(benchmarks)) {
      console.log(`🏃 Running baseline for ${name}...`);
      const baselineResult = await this.runBenchmark(benchmark);
      this.baselines[name] = {
        benchmark: benchmark.name,
        established: new Date().toISOString(),
        results: baselineResult,
        thresholds: benchmark.thresholds
      };
    }

    console.log('✅ Baselines established');
    return this.baselines;
  }

  async runBenchmark(benchmark) {
    console.log(`🏃 Running benchmark: ${benchmark.name}`);

    const results = {
      benchmark: benchmark.name,
      timestamp: new Date().toISOString(),
      scenarios: []
    };

    // Run each scenario
    for (const scenario of benchmark.scenarios) {
      console.log(`  📈 Running scenario: ${scenario.name}`);
      const scenarioResult = await this.runScenario(benchmark, scenario);
      results.scenarios.push(scenarioResult);
    }

    // Calculate aggregate metrics
    results.aggregate = this.calculateAggregateMetrics(results.scenarios, benchmark.metrics);

    return results;
  }

  async runScenario(benchmark, scenario) {
    const startTime = Date.now();
    const metrics = {};

    // Initialize metrics collection
    benchmark.metrics.forEach(metric => {
      metrics[metric] = [];
    });

    // Simulate scenario execution
    const duration = scenario.duration || 60;
    const interval = 1000; // 1 second intervals
    const iterations = duration;

    for (let i = 0; i < iterations; i++) {
      // Collect metrics for each benchmark type
      if (benchmark.category === 'api') {
        await this.collectAPIMetrics(metrics, scenario);
      } else if (benchmark.category === 'database') {
        await this.collectDatabaseMetrics(metrics, scenario);
      } else if (benchmark.category === 'frontend') {
        await this.collectFrontendMetrics(metrics, scenario);
      } else if (benchmark.category === 'memory') {
        await this.collectMemoryMetrics(metrics, scenario);
      }

      // Wait for next iteration
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    const endTime = Date.now();

    return {
      name: scenario.name,
      duration: endTime - startTime,
      metrics: this.processMetrics(metrics),
      summary: this.summarizeScenario(metrics, benchmark.thresholds)
    };
  }

  async collectAPIMetrics(metrics, scenario) {
    // Simulate API metrics collection
    const baseLoad = scenario.concurrentUsers / 10; // Normalize load factor

    metrics.responseTime.push(100 + Math.random() * 200 + baseLoad * 50);
    metrics.throughput.push(100 + Math.random() * 50 + baseLoad * 20);
    metrics.errorRate.push(Math.random() * 0.02);
    metrics.cpuUsage.push(0.3 + Math.random() * 0.4 + baseLoad * 0.2);
    metrics.memoryUsage.push(0.5 + Math.random() * 0.3 + baseLoad * 0.1);
  }

  async collectDatabaseMetrics(metrics, scenario) {
    // Simulate database metrics collection
    const readLoad = (scenario.readQueries || 0) / 1000;
    const writeLoad = (scenario.writeQueries || 0) / 1000;

    metrics.queryTime.push(10 + Math.random() * 50 + readLoad * 20 + writeLoad * 30);
    metrics.connectionPoolUsage.push(0.4 + Math.random() * 0.4 + (readLoad + writeLoad) * 0.2);
    metrics.lockWaitTime.push(Math.random() * 20);
    metrics.indexHitRate.push(0.8 + Math.random() * 0.15);
    metrics.cacheHitRate.push(0.7 + Math.random() * 0.25);
  }

  async collectFrontendMetrics(metrics, scenario) {
    // Simulate frontend metrics collection
    metrics.firstContentfulPaint.push(800 + Math.random() * 400);
    metrics.largestContentfulPaint.push(1500 + Math.random() * 800);
    metrics.firstInputDelay.push(20 + Math.random() * 80);
    metrics.cumulativeLayoutShift.push(Math.random() * 0.2);
    metrics.interactionToNextPaint.push(50 + Math.random() * 100);
    metrics.bundleSize.push(1500000 + Math.random() * 500000);
    metrics.runtimeMemoryUsage.push(50 + Math.random() * 100);
  }

  async collectMemoryMetrics(metrics, scenario) {
    // Simulate memory metrics collection
    const timeProgress = Math.random(); // 0 to 1 over time

    metrics.heapUsed.push(100 + timeProgress * 50 + Math.random() * 20);
    metrics.heapTotal.push(200 + Math.random() * 50);
    metrics.externalMemory.push(10 + Math.random() * 20);
    metrics.gcCollections.push(Math.floor(timeProgress * 100) + Math.random() * 10);
    metrics.gcPauseTime.push(Math.random() * 30);
    metrics.memoryGrowthRate.push(Math.random() * 0.02);
  }

  processMetrics(rawMetrics) {
    const processed = {};

    Object.keys(rawMetrics).forEach(metric => {
      const values = rawMetrics[metric];
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        processed[metric] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: sorted[Math.floor(sorted.length / 2)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)],
          std: Math.sqrt(values.reduce((a, b) => a + Math.pow(b - processed[metric]?.mean || 0, 2), 0) / values.length)
        };
      }
    });

    return processed;
  }

  summarizeScenario(metrics, thresholds) {
    const summary = {
      passed: true,
      violations: [],
      score: 100
    };

    // Check thresholds
    Object.keys(thresholds).forEach(metric => {
      const processed = metrics[metric];
      const threshold = thresholds[metric];

      if (processed && threshold) {
        let violated = false;
        let violation;

        if (threshold.max !== undefined && processed.p95 > threshold.max) {
          violated = true;
          violation = `${metric} p95 (${processed.p95.toFixed(2)}) exceeds max (${threshold.max})`;
        } else if (threshold.min !== undefined && processed.p95 < threshold.min) {
          violated = true;
          violation = `${metric} p95 (${processed.p95.toFixed(2)}) below min (${threshold.min})`;
        } else if (threshold.p95 !== undefined && processed.p95 > threshold.p95) {
          violated = true;
          violation = `${metric} p95 (${processed.p95.toFixed(2)}) exceeds threshold (${threshold.p95})`;
        } else if (threshold.p99 !== undefined && processed.p99 > threshold.p99) {
          violated = true;
          violation = `${metric} p99 (${processed.p99.toFixed(2)}) exceeds threshold (${threshold.p99})`;
        }

        if (violated) {
          summary.violations.push(violation);
          summary.passed = false;
          summary.score -= 10; // Deduct 10 points per violation
        }
      }
    });

    summary.score = Math.max(0, summary.score);
    return summary;
  }

  calculateAggregateMetrics(scenarios, metricNames) {
    const aggregate = {};

    metricNames.forEach(metric => {
      const values = scenarios
        .map(s => s.metrics[metric]?.p95)
        .filter(v => v !== undefined);

      if (values.length > 0) {
        aggregate[metric] = {
          average: values.reduce((a, b) => a + b, 0) / values.length,
          best: Math.min(...values),
          worst: Math.max(...values),
          consistency: 1 - (Math.max(...values) - Math.min(...values)) / Math.max(...values)
        };
      }
    });

    return aggregate;
  }

  async detectRegressions(currentResults) {
    console.log('🔍 Detecting performance regressions...');

    this.regressions = [];

    Object.keys(currentResults).forEach(benchmarkName => {
      const current = currentResults[benchmarkName];
      const baseline = this.baselines[benchmarkName];

      if (baseline) {
        const regression = this.compareWithBaseline(benchmarkName, current, baseline);
        if (regression.violations.length > 0) {
          this.regressions.push(regression);
        }
      }
    });

    return this.regressions;
  }

  compareWithBaseline(benchmarkName, current, baseline) {
    const regression = {
      benchmark: benchmarkName,
      timestamp: new Date().toISOString(),
      violations: [],
      severity: 'low',
      impact: 'minor'
    };

    // Compare each scenario
    current.scenarios.forEach((scenario, index) => {
      const baselineScenario = baseline.results.scenarios[index];

      if (baselineScenario) {
        Object.keys(scenario.metrics).forEach(metric => {
          const currentMetric = scenario.metrics[metric];
          const baselineMetric = baselineScenario.metrics[metric];

          if (currentMetric && baselineMetric) {
            const degradation = (currentMetric.p95 - baselineMetric.p95) / baselineMetric.p95;

            // Check for significant degradation (10% or more)
            if (degradation > 0.1) {
              regression.violations.push({
                scenario: scenario.name,
                metric,
                baseline: baselineMetric.p95,
                current: currentMetric.p95,
                degradation: degradation * 100,
                severity: degradation > 0.5 ? 'critical' : degradation > 0.25 ? 'high' : 'medium'
              });

              // Update overall severity
              if (degradation > 0.5 && regression.severity !== 'critical') {
                regression.severity = 'critical';
                regression.impact = 'major';
              } else if (degradation > 0.25 && regression.severity === 'low') {
                regression.severity = 'high';
                regression.impact = 'moderate';
              } else if (regression.severity === 'low') {
                regression.severity = 'medium';
              }
            }
          }
        });
      }
    });

    return regression;
  }

  async generateReport() {
    console.log('📋 Generating performance benchmarking report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        benchmarksRun: Object.keys(this.benchmarks).length,
        regressionsDetected: this.regressions.length,
        overallScore: this.calculateOverallScore(),
        status: this.regressions.length > 0 ? 'regressions-found' : 'stable'
      },
      benchmarks: this.benchmarks,
      baselines: this.baselines,
      regressions: this.regressions,
      recommendations: this.generateRecommendations()
    };

    await fs.mkdir('ai-learning', { recursive: true });
    await fs.writeFile('ai-learning/performance-report.json', JSON.stringify(report, null, 2));

    return report;
  }

  calculateOverallScore() {
    if (Object.keys(this.baselines).length === 0) return 100;

    let totalScore = 0;
    let benchmarkCount = 0;

    Object.values(this.baselines).forEach(baseline => {
      baseline.results.scenarios.forEach(scenario => {
        totalScore += scenario.summary.score;
        benchmarkCount++;
      });
    });

    return benchmarkCount > 0 ? totalScore / benchmarkCount : 100;
  }

  generateRecommendations() {
    const recommendations = [];

    this.regressions.forEach(regression => {
      regression.violations.forEach(violation => {
        if (violation.metric === 'responseTime') {
          recommendations.push({
            priority: 'high',
            category: 'performance',
            action: 'Optimize API response times - consider caching, database indexing, or code profiling',
            benchmark: regression.benchmark,
            impact: `${violation.degradation.toFixed(1)}% degradation in ${violation.scenario}`
          });
        } else if (violation.metric === 'errorRate') {
          recommendations.push({
            priority: 'critical',
            category: 'reliability',
            action: 'Investigate and fix error rate increase - check logs and error handling',
            benchmark: regression.benchmark,
            impact: `${violation.degradation.toFixed(1)}% increase in errors`
          });
        } else if (violation.metric === 'memoryUsage') {
          recommendations.push({
            priority: 'medium',
            category: 'efficiency',
            action: 'Review memory usage patterns - check for memory leaks or inefficient data structures',
            benchmark: regression.benchmark,
            impact: `${violation.degradation.toFixed(1)}% memory usage increase`
          });
        }
      });
    });

    // Sort by priority
    const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  async saveState() {
    const state = {
      benchmarks: this.benchmarks,
      baselines: this.baselines,
      results: this.results,
      regressions: this.regressions,
      lastUpdated: new Date().toISOString()
    };

    await fs.mkdir('ai-learning', { recursive: true });
    await fs.writeFile('ai-learning/performance-benchmarks.json', JSON.stringify(this.benchmarks, null, 2));
    await fs.writeFile('ai-learning/performance-baselines.json', JSON.stringify(this.baselines, null, 2));
    await fs.writeFile('ai-learning/performance-state.json', JSON.stringify(state, null, 2));
  }

  async runBenchmarkingSuite() {
    try {
      await this.initialize();

      // Define benchmarks
      this.benchmarks = {
        apiSpeed: this.createAPISpeedBenchmark(),
        databasePerformance: this.createDatabasePerformanceBenchmark(),
        frontendRendering: this.createFrontendRenderingBenchmark(),
        memoryLeak: this.createMemoryLeakBenchmark()
      };

      // Establish baselines if not exist
      if (Object.keys(this.baselines).length === 0) {
        await this.establishBaselines();
      }

      // Run current benchmarks
      const currentResults = {};
      for (const [name, benchmark] of Object.entries(this.benchmarks)) {
        console.log(`\n🏃 Running current benchmark for ${name}...`);
        currentResults[name] = await this.runBenchmark(benchmark);
      }

      // Detect regressions
      await this.detectRegressions(currentResults);

      // Generate report
      const report = await this.generateReport();
      await this.saveState();

      console.log('✅ Performance benchmarking completed');
      console.log(`📊 Overall score: ${report.summary.overallScore.toFixed(1)}%`);
      console.log(`🔍 Regressions detected: ${report.summary.regressionsDetected}`);

      return report;

    } catch (error) {
      console.error('❌ Performance benchmarking failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmarking = new PerformanceBenchmarking();

  benchmarking.runBenchmarkingSuite()
    .then((report) => {
      console.log('\n📋 Performance Benchmarking Summary:');
      console.log(`Overall Score: ${report.summary.overallScore.toFixed(1)}%`);
      console.log(`Status: ${report.summary.status.toUpperCase()}`);
      console.log(`Regressions: ${report.summary.regressionsDetected}`);

      if (report.recommendations.length > 0) {
        console.log('\n💡 Key Recommendations:');
        report.recommendations.slice(0, 5).forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.action} (${rec.priority})`);
        });
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to run performance benchmarking:', error);
      process.exit(1);
    });
}

export default PerformanceBenchmarking;
