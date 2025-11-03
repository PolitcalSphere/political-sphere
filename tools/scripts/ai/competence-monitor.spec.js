/* eslint-env jest */
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";

describe("Competence Monitor", () => {
  const metricsFile = join(process.cwd(), "ai-metrics", "stats.json");

  beforeEach(() => {
    // Clean up any existing metrics
    if (existsSync(metricsFile)) {
      unlinkSync(metricsFile);
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(metricsFile)) {
      unlinkSync(metricsFile);
    }
  });

  it("should assess competence and generate metrics", () => {
    execSync("node scripts/ai/competence-monitor.js assess", { stdio: "pipe" });

    expect(existsSync(metricsFile)).toBe(true);

    const metrics = JSON.parse(readFileSync(metricsFile, "utf8"));
    expect(metrics).toHaveProperty("responseTimes");
    expect(metrics).toHaveProperty("cacheHits");
    expect(metrics).toHaveProperty("qualityGatesPassed");
    expect(metrics).toHaveProperty("userSatisfaction");
  });

  it("should generate valid competence scores", () => {
    execSync("node scripts/ai/competence-monitor.js assess", { stdio: "pipe" });

    const output = execSync("node scripts/ai/competence-monitor.js assess", {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(output).toContain("Competence Score:");
    // Score should be a number between 0 and 1
    const scoreMatch = output.match(/Competence Score: (\d+\.\d+)/);
    expect(scoreMatch).toBeTruthy();
    const score = parseFloat(scoreMatch[1]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should include recommendations when scores are low", () => {
    // Mock low scores by creating fake metrics
    const lowMetrics = {
      responseTimes: [5000, 6000, 7000],
      cacheHits: 10,
      cacheMisses: 90,
      qualityGatesPassed: 20,
      qualityGatesFailed: 80,
      userSatisfaction: [0.2, 0.1, 0.3],
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(metricsFile, JSON.stringify(lowMetrics, null, 2));

    const output = execSync("node scripts/ai/competence-monitor.js assess", {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(output).toContain("Recommendations:");
    expect(output).toContain("Optimize response times");
    expect(output).toContain("Improve cache hit rate");
    expect(output).toContain("Address quality gate failures");
    expect(output).toContain("Improve user satisfaction");
  });

  it("should include context awareness metrics", () => {
    // Create mock metrics with context awareness
    const mockMetrics = {
      responseTimes: [1000, 2000, 1500],
      cacheHits: 80,
      cacheMisses: 20,
      qualityGatesPassed: 90,
      qualityGatesFailed: 10,
      userSatisfaction: [0.8, 0.9, 0.7],
      contextRecallAccuracy: 0.85,
      semanticUnderstandingScore: 0.78,
      patternUsageCorrectness: 0.92,
      modelDriftResistance: 0.88,
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(metricsFile, JSON.stringify(mockMetrics, null, 2));

    const output = execSync("node scripts/ai/competence-monitor.js assess", {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(output).toContain("Competence Score:");
    expect(output).toContain("Enhance context recall");
    expect(output).toContain("Improve semantic understanding");
    expect(output).toContain("Review pattern usage");
    expect(output).toContain("Strengthen model drift resistance");
  });
});
