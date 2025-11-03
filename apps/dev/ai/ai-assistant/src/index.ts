import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface McpRequest {
  params?: Record<string, unknown>;
  userId?: string;
}

type MetricDistribution = { mean: number; std: number };

type MetricsSnapshot = {
  responseTime: MetricDistribution;
  cpuUsage: MetricDistribution;
  memoryUsage: MetricDistribution;
  errorRate: MetricDistribution;
  throughput: MetricDistribution;
};

type MetricsSummary = {
  snapshot: MetricsSnapshot | null;
  derived: {
    responseTimeP95: number;
    efficiencyScore: number;
    throughputDelta: number;
  };
  updatedAt: string;
  alerts: string[];
};

type LanguageVariant = "typescript" | "javascript" | "python" | "unknown";
type SupportedTestType = "unit" | "integration" | "e2e";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, "../../../../../");
const METRICS_FILE_PATH = resolve(REPO_ROOT, "ai-metrics.json");
const METRICS_CACHE_TTL_MS = 60_000;
const DEFAULT_THROUGHPUT_TARGET = 1000;

class PoliticalSphereAIAssistant extends Server {
  private userRequests: Map<string, number[]> = new Map();
  private rateLimitWindow = 60000; // 1 minute
  private maxRequests = 10;
  private metricsCache: { data: MetricsSummary; fetchedAt: number } | null = null;

  constructor() {
    super({
      name: "political-sphere-ai-assistant",
      version: "1.0.0",
    });

    this.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
    this.setRequestHandler(ListResourcesRequestSchema, this.handleListResources.bind(this));
    this.setRequestHandler(ReadResourceRequestSchema, this.handleReadResource.bind(this));
  }

  async handleListTools() {
    return {
      tools: [
        {
          name: "generate_code",
          description: "Generate code based on requirements with Political Sphere standards",
          inputSchema: {
            type: "object",
            properties: {
              requirement: {
                type: "string",
                description: "Code requirement description",
              },
              language: { type: "string", description: "Programming language" },
              context: { type: "string", description: "Additional context" },
            },
            required: ["requirement"],
          },
        },
        {
          name: "review_code",
          description: "Review code for quality, security, and standards compliance",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "Code to review" },
              language: { type: "string", description: "Programming language" },
            },
            required: ["code"],
          },
        },
        {
          name: "optimize_performance",
          description: "Analyze and suggest performance optimizations",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "Code to optimize" },
              context: { type: "string", description: "Performance context" },
            },
            required: ["code"],
          },
        },
        {
          name: "generate_tests",
          description: "Generate comprehensive test cases",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "Code to test" },
              testType: {
                type: "string",
                enum: ["unit", "integration", "e2e"],
              },
            },
            required: ["code"],
          },
        },
        {
          name: "simulate_scenario",
          description: "Simulate scenarios for testing and planning",
          inputSchema: {
            type: "object",
            properties: {
              scenario: { type: "string", description: "Scenario description" },
              parameters: { type: "object", description: "Simulation parameters" },
            },
            required: ["scenario"],
          },
        },
      ],
    };
  }

  async handleCallTool(request: McpRequest & { params?: { name?: string; arguments?: unknown } }) {
    const { name, arguments: args } = (request.params || {}) as {
      name?: string;
      arguments?: unknown;
    };

    // Type guard for args
    if (!args || typeof args !== "object") {
      throw new McpError(ErrorCode.InvalidRequest, "Invalid arguments");
    }

    const typedArgs = args as Record<string, unknown>;

    // Security and safety checks
    if (this.detectAbuse(typedArgs)) {
      throw new McpError(ErrorCode.InvalidRequest, "Abusive content detected");
    }

    if (this.checkRateLimit(request.userId || "anonymous")) {
      throw new McpError(ErrorCode.InvalidRequest, "Rate limit exceeded");
    }

    if (!this.checkFairness(typedArgs)) {
      throw new McpError(ErrorCode.InvalidRequest, "Request may introduce unfair bias");
    }

    if (this.detectConstitutionalViolation(typedArgs)) {
      throw new McpError(ErrorCode.InvalidRequest, "Content violates constitutional safety");
    }

    if (!this.checkCommandSafety(name || "", typedArgs)) {
      throw new McpError(ErrorCode.InvalidRequest, "Command is not safe to execute");
    }

    // Log for audit and causality awareness
    this.logInteraction(request);

    switch (name) {
      case "generate_code":
        return await this.generateCode(
          typedArgs as { requirement: string; language?: string; context?: string },
        );
      case "review_code":
        return await this.reviewCode(typedArgs as { code: string; language?: string });
      case "optimize_performance":
        return await this.optimizePerformance(typedArgs as { code: string; context?: string });
      case "generate_tests":
        return await this.generateTests(
          typedArgs as { code: string; language?: string; testType?: string },
        );
      case "simulate_scenario":
        return await this.simulateScenario(
          typedArgs as { scenario: string; parameters?: Record<string, unknown> },
        );
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  async generateCode(args: { requirement: string; language?: string; context?: string }) {
    const { requirement, language, context } = args;
    const normalizedLanguage = this.normalizeLanguage(language);
    const className = this.toPascalCase(requirement.replace(/\W+/g, " "));
    const documentation = this.buildDocumentation(normalizedLanguage, requirement, context);

    let generatedCode: string;

    switch (normalizedLanguage) {
      case "javascript":
        generatedCode = `${documentation}

export class ${className} {
  constructor(config) {
    this.config = config;
  }

  async execute() {
    try {
      this.validateInput();

      const result = await this.process();

      this.logMetrics(result);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  validateInput() {
    // Add validation logic aligned with Political Sphere standards.
  }

  async process() {
    // Implement the domain-specific business logic.
    return {};
  }

  logMetrics(result) {
    // Emit observability data to the monitoring pipeline.
    void result;
  }

  handleError(error) {
    // Provide structured logging or alerting here.
    console.error("Execution failed", error);
  }
}
`;
        break;

      case "python":
        generatedCode = `${documentation}

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict


@dataclass
class Config:
    \"\"\"Configuration contract for ${className}.\"\"\"
    params: Dict[str, Any] = field(default_factory=dict)


class ${className}:
    def __init__(self, config: Config) -> None:
        self._config = config

    async def execute(self) -> Dict[str, Any]:
        try:
            self._validate_input()

            result = await self._process()

            self._log_metrics(result)

            return {
                "success": True,
                "data": result,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as error:
            self._handle_error(error)
            raise

    def _validate_input(self) -> None:
        # Add validation logic aligned with Political Sphere governance.
        return None

    async def _process(self) -> Dict[str, Any]:
        # Implement the asynchronous business workflow.
        return {}

    def _log_metrics(self, result: Dict[str, Any]) -> None:
        # Send observability data to the monitoring pipeline.
        _ = result

    def _handle_error(self, error: Exception) -> None:
        # Provide structured logging or alerting here.
        print("Execution failed", error)
`;
        break;

      default:
        generatedCode = `${documentation}

export class ${className} {
  constructor(private readonly config: Config) {}

  async execute(): Promise<Result> {
    try {
      this.validateInput();

      const result = await this.process();

      this.logMetrics(result);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private validateInput(): void {
    // Add validation logic aligned with Political Sphere standards.
  }

  private async process(): Promise<Record<string, unknown>> {
    // Implement the domain-specific business logic.
    return {};
  }

  private logMetrics(result: Record<string, unknown>): void {
    // Emit observability data to the monitoring pipeline.
    void result;
  }

  private handleError(error: Error): void {
    // Provide structured logging or alerting here.
    console.error("Execution failed", error);
  }
}

export interface Config {
  // Extend with configuration parameters required by the domain.
}

export interface Result {
  success: boolean;
  data: Record<string, unknown>;
  timestamp: string;
}
`;
        break;
    }

    return {
      content: [{ type: "text", text: generatedCode }],
    };
  }

  async reviewCode(args: { code: string; language?: string }) {
    // args currently not used in the simulated response
    void args;
    // Simulate code review
    const review = {
      score: 8.5,
      issues: [
        {
          type: "style",
          severity: "low",
          message: "Consider using more descriptive variable names",
          line: 15,
        },
        {
          type: "security",
          severity: "medium",
          message: "Input validation could be more comprehensive",
          line: 25,
        },
      ],
      suggestions: [
        "Add JSDoc comments for better documentation",
        "Consider implementing error boundaries",
        "Add unit tests for edge cases",
      ],
      standards: {
        "Political Sphere Code Standards": "✅ Compliant",
        "Security Best Practices": "⚠️ Minor improvements needed",
        "Performance Guidelines": "✅ Compliant",
        "Testing Coverage": "⚠️ Additional tests recommended",
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
    };
  }

  async optimizePerformance(args: { code: string; context?: string }) {
    // args currently not used directly in the simulated response
    void args;

    const optimizations = [
      {
        type: "algorithm",
        suggestion: "Consider using a more efficient sorting algorithm for large datasets",
        impact: "high",
        effort: "medium",
      },
      {
        type: "memory",
        suggestion: "Implement streaming for large file processing to reduce memory usage",
        impact: "medium",
        effort: "high",
      },
      {
        type: "caching",
        suggestion: "Add Redis caching for frequently accessed data",
        impact: "high",
        effort: "low",
      },
    ];

    return {
      content: [{ type: "text", text: JSON.stringify({ optimizations }, null, 2) }],
    };
  }

  async generateTests(args: { code: string; language?: string; testType?: string }) {
    const { code, language, testType } = args;
    const languageVariant = this.normalizeLanguage(language);
    const normalizedTestType = this.normalizeTestType(testType);
    const importPath = this.extractFileName();
    const rawClassName = this.extractClassName(code);
    const targetClassName = rawClassName === "UnknownClass" ? "GeneratedComponent" : rawClassName;

    const testCode =
      languageVariant === "javascript"
        ? this.buildJavascriptTests(targetClassName, importPath, normalizedTestType)
        : languageVariant === "python"
          ? this.buildPythonTests(targetClassName, importPath, normalizedTestType)
          : this.buildTypescriptTests(targetClassName, importPath, normalizedTestType);

    return {
      content: [{ type: "text", text: testCode }],
    };
  }

  async simulateScenario(args: { scenario: string; parameters?: Record<string, unknown> }) {
    const { scenario, parameters = {} } = args;

    // Simulate scenario for planning and testing
    const simulationResult = {
      scenario,
      parameters,
      outcomes: [
        "Successful execution with expected results",
        "Potential failure points identified",
        "Performance bottlenecks simulated",
        "Risk assessment completed",
      ],
      recommendations: [
        "Implement monitoring for critical paths",
        "Add fallback mechanisms",
        "Test edge cases thoroughly",
        "Document assumptions and constraints",
      ],
      riskLevel: "Medium",
      estimatedImpact: "High visibility improvement",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(simulationResult, null, 2) }],
    };
  }

  async handleListResources() {
    return {
      resources: [
        {
          uri: "standards://political-sphere/code-standards",
          name: "Political Sphere Code Standards",
          description: "Comprehensive coding standards and best practices",
          mimeType: "application/json",
        },
        {
          uri: "knowledge://political-sphere/architecture-patterns",
          name: "Architecture Patterns",
          description: "Reusable architectural patterns and templates",
          mimeType: "application/json",
        },
        {
          uri: "metrics://ai/performance",
          name: "AI Performance Metrics",
          description: "Performance metrics for AI operations",
          mimeType: "application/json",
        },
      ],
    };
  }

  async handleReadResource(request: McpRequest & { params?: { uri?: string } }) {
    const { uri } = (request.params || {}) as { uri?: string };

    switch (uri) {
      case "standards://political-sphere/code-standards":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  naming: "camelCase for variables, PascalCase for classes",
                  errorHandling: "Use try/catch with specific error types",
                  testing: "Minimum 80% coverage, integration tests required",
                  security: "Input validation, no hardcoded secrets",
                  performance: "Optimize for O(n) complexity, use caching",
                },
                null,
                2,
              ),
            },
          ],
        };

      case "knowledge://political-sphere/architecture-patterns":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  patterns: [
                    "Repository Pattern for data access",
                    "Observer Pattern for event handling",
                    "Strategy Pattern for algorithm selection",
                    "Factory Pattern for object creation",
                  ],
                },
                null,
                2,
              ),
            },
          ],
        };

      case "metrics://ai/performance": {
        const metrics = await this.getPerformanceMetrics();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toUpperCase() : word.toUpperCase(),
      )
      .replace(/\s+/g, "");
  }

  private extractClassName(code: string): string {
    const match = code.match(/class\s+(\w+)/);
    return match?.[1] ?? "UnknownClass";
  }

  private extractFileName(): string {
    // Simple heuristic - in real implementation, use file path
    return "implementation";
  }

  private normalizeLanguage(language?: string): LanguageVariant {
    if (!language) return "typescript";
    const normalized = language.trim().toLowerCase();
    if (["ts", "typescript"].includes(normalized)) return "typescript";
    if (["js", "javascript", "node", "nodejs"].includes(normalized)) return "javascript";
    if (["py", "python"].includes(normalized)) return "python";
    return "unknown";
  }

  private normalizeTestType(testType?: string): SupportedTestType {
    if (!testType) return "unit";
    const normalized = testType.trim().toLowerCase();
    if (normalized === "integration" || normalized === "integ") {
      return "integration";
    }
    if (normalized === "e2e" || normalized === "end-to-end" || normalized === "endtoend") {
      return "e2e";
    }
    return "unit";
  }

  private describeLabel(testType: SupportedTestType): string {
    switch (testType) {
      case "integration":
        return "integration flow";
      case "e2e":
        return "end-to-end behaviour";
      default:
        return "unit behaviour";
    }
  }

  private testSetupSnippet(testType: SupportedTestType, language: LanguageVariant): string {
    switch (testType) {
      case "integration":
        return this.commentForLanguage(language, "Wire integration fixtures or service doubles.");
      case "e2e":
        return this.commentForLanguage(
          language,
          "Initialise full workflow dependencies or orchestration harness.",
        );
      default:
        return "";
    }
  }

  private testScenarioSnippet(testType: SupportedTestType, language: LanguageVariant): string {
    switch (testType) {
      case "integration":
        return this.commentForLanguage(
          language,
          "Assert side-effects across collaborating services.",
        );
      case "e2e":
        return this.commentForLanguage(
          language,
          "Validate user-visible outcomes and telemetry budgets.",
        );
      default:
        return "";
    }
  }

  private commentForLanguage(language: LanguageVariant, text: string): string {
    if (!text) return "";
    return language === "python" ? `# ${text}` : `// ${text}`;
  }

  private buildDocumentation(
    language: LanguageVariant,
    requirement: string,
    context?: string,
  ): string {
    const lines = [
      "Generated module following Political Sphere standards.",
      `Requirement: ${requirement.trim()}`,
    ];
    if (context?.trim()) {
      lines.push(`Context: ${context.trim()}`);
    }

    if (language === "python") {
      return `\"\"\"${lines.join("\n")}\"\"\"`;
    }

    const commentBody = lines.map((line) => ` * ${line}`);
    return ["/**", ...commentBody, " */"].join("\n");
  }

  private buildTypescriptTests(
    className: string,
    importPath: string,
    testType: SupportedTestType,
  ): string {
    const setupSnippet = this.testSetupSnippet(testType, "typescript");
    const scenarioSnippet = this.testScenarioSnippet(testType, "typescript");
    const setupLine = setupSnippet ? `    ${setupSnippet}\n` : "";
    const scenarioLine = scenarioSnippet ? `    ${scenarioSnippet}\n` : "";

    return `import { beforeEach, describe, expect, it } from "@jest/globals";
import { ${className} } from "./${importPath}";

describe("${className} ${this.describeLabel(testType)}", () => {
  let instance: ${className};

  beforeEach(() => {
    instance = new ${className}({ /* config */ });
${setupLine}  });

  it("returns a success envelope for valid input", async () => {
    const result = await instance.execute();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.timestamp).toMatch(/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z/);
  });

  it("propagates domain errors with context", async () => {
    const failingInstance = new ${className}({ /* config */ });
    Object.assign(failingInstance as Record<string, unknown>, {
      process: async () => {
        throw new Error("boom");
      },
    });

    await expect(failingInstance.execute()).rejects.toThrow("boom");
  });

  it("produces telemetry metadata", async () => {
    const result = await instance.execute();

    expect(result.timestamp).toBeTruthy();
${scenarioLine}  });
});
`;
  }

  private buildJavascriptTests(
    className: string,
    importPath: string,
    testType: SupportedTestType,
  ): string {
    const setupSnippet = this.testSetupSnippet(testType, "javascript");
    const scenarioSnippet = this.testScenarioSnippet(testType, "javascript");
    const setupLine = setupSnippet ? `    ${setupSnippet}\n` : "";
    const scenarioLine = scenarioSnippet ? `    ${scenarioSnippet}\n` : "";

    return `import { beforeEach, describe, expect, it } from "@jest/globals";
import { ${className} } from "./${importPath}";

describe("${className} ${this.describeLabel(testType)}", () => {
  let instance;

  beforeEach(() => {
    instance = new ${className}({ /* config */ });
${setupLine}  });

  it("returns a success envelope for valid input", async () => {
    const result = await instance.execute();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("propagates domain errors with context", async () => {
    const failingInstance = new ${className}({ /* config */ });
    Object.assign(failingInstance, {
      async process() {
        throw new Error("boom");
      },
    });

    await expect(failingInstance.execute()).rejects.toThrow("boom");
  });

  it("produces telemetry metadata", async () => {
    const result = await instance.execute();

    expect(result.timestamp).toBeTruthy();
${scenarioLine}  });
});
`;
  }

  private buildPythonTests(
    className: string,
    importPath: string,
    testType: SupportedTestType,
  ): string {
    const setupSnippet = this.testSetupSnippet(testType, "python");
    const scenarioSnippet = this.testScenarioSnippet(testType, "python");
    const setupLine = setupSnippet ? `    ${setupSnippet}\n` : "";
    const scenarioLine = scenarioSnippet ? `    ${scenarioSnippet}\n` : "";
    const snakeName = this.toSnakeCase(className);

    return `import pytest

from ${importPath} import ${className}, Config


@pytest.mark.asyncio
async def test_${snakeName}_returns_success_envelope():
    subject = ${className}(Config())
${setupLine}    result = await subject.execute()

    assert result["success"] is True
    assert result["data"] is not None


@pytest.mark.asyncio
async def test_${snakeName}_surfaces_errors():
    subject = ${className}(Config())

    async def failing_process():
        raise RuntimeError("boom")

    setattr(subject, "_process", failing_process)

    with pytest.raises(RuntimeError):
        await subject.execute()


@pytest.mark.asyncio
async def test_${snakeName}_produces_telemetry():
    subject = ${className}(Config())
${scenarioLine}    result = await subject.execute()

    assert "timestamp" in result
`;
  }

  private toSnakeCase(value: string): string {
    return value
      .replace(/([A-Z])/g, "_$1")
      .replace(/^_/, "")
      .replace(/\W+/g, "_")
      .toLowerCase() || "target";
  }

  private async getPerformanceMetrics(): Promise<MetricsSummary> {
    const now = Date.now();
    if (this.metricsCache && now - this.metricsCache.fetchedAt < METRICS_CACHE_TTL_MS) {
      return this.metricsCache.data;
    }

    try {
      const raw = await readFile(METRICS_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);

      if (!this.isMetricsSnapshot(parsed)) {
        throw new Error("Invalid metrics schema");
      }

      const summary = this.buildMetricsSummary(parsed);
      this.metricsCache = { data: summary, fetchedAt: now };
      return summary;
    } catch (error) {
      const summary: MetricsSummary = {
        snapshot: null,
        derived: {
          responseTimeP95: 0,
          efficiencyScore: 0,
          throughputDelta: 0,
        },
        updatedAt: new Date().toISOString(),
        alerts: [`Metrics unavailable: ${(error as Error).message}`],
      };
      this.metricsCache = { data: summary, fetchedAt: now };
      return summary;
    }
  }

  private buildMetricsSummary(snapshot: MetricsSnapshot): MetricsSummary {
    const responseTimeP95 = snapshot.responseTime.mean + 1.645 * snapshot.responseTime.std;
    const throughputDelta = snapshot.throughput.mean - DEFAULT_THROUGHPUT_TARGET;
    const efficiencyScore = this.calculateEfficiencyScore(snapshot);

    const alerts: string[] = [];
    if (responseTimeP95 > 200) {
      alerts.push("Response time p95 exceeds 200ms budget.");
    }
    if (snapshot.errorRate.mean > 0.02) {
      alerts.push("Error rate is above the 2% threshold.");
    }
    if (snapshot.cpuUsage.mean > 80) {
      alerts.push("Average CPU usage is above 80%.");
    }
    if (snapshot.memoryUsage.mean > 85) {
      alerts.push("Average memory usage is above 85%.");
    }
    if (throughputDelta < -150) {
      alerts.push("Throughput is below target by more than 150 req/min.");
    }

    return {
      snapshot,
      derived: {
        responseTimeP95: Number(responseTimeP95.toFixed(2)),
        efficiencyScore,
        throughputDelta: Number(throughputDelta.toFixed(2)),
      },
      updatedAt: new Date().toISOString(),
      alerts,
    };
  }

  private calculateEfficiencyScore(snapshot: MetricsSnapshot): number {
    const responseScore = Math.max(0, 100 - snapshot.responseTime.mean / 2);
    const throughputScore = Math.max(
      0,
      Math.min(100, (snapshot.throughput.mean / DEFAULT_THROUGHPUT_TARGET) * 100),
    );
    const cpuScore = Math.max(0, 100 - snapshot.cpuUsage.mean);
    const memoryScore = Math.max(0, 100 - snapshot.memoryUsage.mean);
    const errorScore = Math.max(0, 100 - snapshot.errorRate.mean * 4000);

    const weighted =
      responseScore * 0.3 +
      throughputScore * 0.25 +
      cpuScore * 0.15 +
      memoryScore * 0.1 +
      errorScore * 0.2;

    return Math.max(0, Math.min(100, Math.round(weighted)));
  }

  private isMetricsSnapshot(value: unknown): value is MetricsSnapshot {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    const keys: Array<keyof MetricsSnapshot> = [
      "responseTime",
      "cpuUsage",
      "memoryUsage",
      "errorRate",
      "throughput",
    ];
    return keys.every((key) => this.isMetricDistribution(candidate[key]));
  }

  private isMetricDistribution(value: unknown): value is MetricDistribution {
    if (!value || typeof value !== "object") {
      return false;
    }
    const distribution = value as Record<string, unknown>;
    return typeof distribution.mean === "number" && typeof distribution.std === "number";
  }

  private detectAbuse(args: Record<string, unknown>): boolean {
    const content = JSON.stringify(args).toLowerCase();
    const safePhrases = ["prevent harm", "mitigate harm", "avoid harm"];
    if (safePhrases.some((phrase) => content.includes(phrase))) {
      return false;
    }

    const abusivePatterns = [
      /(encourage|incite|promote|assist|enable)\s+(?:self[-\s]?harm|violence|abuse)/,
      /\b(?:plan|design|build|construct)\b.*\b(?:weapon|explosive|bomb)\b/,
      /\b(?:kill|hurt|harm)\b.*\b(?:myself|yourself|himself|herself|themself|themselves|someone|others)\b/,
    ];

    return abusivePatterns.some((pattern) => pattern.test(content));
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const requests = this.userRequests.get(userId) ?? [];
    // Ensure the map stores the same array instance so future calls see history
    if (!this.userRequests.has(userId)) {
      this.userRequests.set(userId, requests);
    }
    // Remove old requests
    while (requests.length > 0) {
      const oldest = requests[0];
      if (oldest === undefined) break;
      if (now - oldest > this.rateLimitWindow) {
        requests.shift();
      } else {
        break;
      }
    }
    if (requests.length >= this.maxRequests) {
      return true; // exceeded
    }
    requests.push(now);
    return false;
  }

  private checkFairness(args: Record<string, unknown>): boolean {
    const content = JSON.stringify(args).toLowerCase();
    const disallowedPatterns = [
      /\b(?:introduce|add|ensure|maintain|promote|create)\b.*\b(?:bias|biased|unfair)\b/,
      /\b(?:make|render|keep)\b.*\b(?:biased|unfair)\b/,
      /\bdiscriminat(?:e|ion)\b.*\b(?:against|toward|towards)\b/,
      /\bpreferential\b.*\b(?:treatment|handling)\b.*\b(?:race|ethnicity|gender|religion|orientation)\b/,
    ];

    return !disallowedPatterns.some((pattern) => pattern.test(content));
  }

  private detectConstitutionalViolation(args: Record<string, unknown>): boolean {
    const content = JSON.stringify(args).toLowerCase();
    return content.includes("unconstitutional");
  }

  private checkCommandSafety(_name: string, _args: Record<string, unknown>): boolean {
    // For now, allow all
    void _name;
    void _args;
    return true;
  }

  private logInteraction(request: McpRequest) {
    console.log(`Interaction: ${request.params?.name} by ${request.userId || "anonymous"}`);
  }
}

async function main() {
  const server = new PoliticalSphereAIAssistant();
  const transport = new StdioServerTransport();
  await (server as unknown as { connect(t: StdioServerTransport): Promise<void> }).connect(
    transport,
  );
  console.error("Political Sphere AI Assistant MCP server running...");
}

main().catch(console.error);
