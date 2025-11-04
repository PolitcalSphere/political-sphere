import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock heavy OpenTelemetry packages to avoid network/IO during tests
vi.mock("@opentelemetry/sdk-node", () => ({
	NodeSDK: class {
		constructor(opts) {
			this.opts = opts;
		}
		async start() {
			this.started = true;
		}
		async shutdown() {
			this.started = false;
		}
	},
}));

vi.mock("@opentelemetry/auto-instrumentations-node", () => ({
	getNodeAutoInstrumentations: () => [],
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
	OTLPTraceExporter: class {},
}));

vi.mock("@opentelemetry/exporter-metrics-otlp-http", () => ({
	OTLPMetricExporter: class {},
}));

vi.mock("@opentelemetry/resources", () => ({
	resourceFromAttributes: (attrs) => ({ attrs }),
}));

vi.mock("@opentelemetry/sdk-metrics", () => ({
	PeriodicExportingMetricReader: class {
		constructor(opts) {
			this.opts = opts;
		}
	},
}));

describe("Telemetry (shared)", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("initTelemetry returns a NodeSDK-like object when called", async () => {
		const { initTelemetry } = await import("../telemetry.ts");
		const sdk = initTelemetry({
			serviceName: "test-service",
			enableAutoInstrumentation: false,
		});
		expect(sdk).toHaveProperty("start");
		expect(sdk).toHaveProperty("shutdown");
	});

	it("startTelemetry starts the SDK without throwing", async () => {
		const { startTelemetry } = await import("../telemetry.ts");
		await expect(
			startTelemetry({
				serviceName: "test-service",
				enableAutoInstrumentation: false,
			}),
		).resolves.toBeUndefined();
	});
});
