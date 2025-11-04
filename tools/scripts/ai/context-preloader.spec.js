/* eslint-env vitest */
import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

describe("Context Preloader", () => {
	const cacheFile = join(process.cwd(), "ai-cache", "context-cache.json");

	beforeEach(() => {
		// Clean up any existing cache
		if (existsSync(cacheFile)) {
			unlinkSync(cacheFile);
		}
	});

	afterEach(() => {
		// Clean up after tests
		if (existsSync(cacheFile)) {
			unlinkSync(cacheFile);
		}
	});

	it("should preload contexts successfully", () => {
		execSync("node tools/scripts/ai/context-preloader.js preload", {
			stdio: "pipe",
		});

		expect(existsSync(cacheFile)).toBe(true);

		const cache = JSON.parse(readFileSync(cacheFile, "utf8"));
		expect(cache).toHaveProperty("contexts");
		expect(typeof cache.contexts).toBe("object");
		expect(cache).toHaveProperty("lastUpdated");
	});

	it("should get cached context", () => {
		// First preload
		execSync("node tools/scripts/ai/context-preloader.js preload", {
			stdio: "pipe",
		});

		// Get a specific context (assuming 'config' exists)
		const output = execSync(
			"node tools/scripts/ai/context-preloader.js get config",
			{
				encoding: "utf8",
				stdio: "pipe",
			},
		);

		expect(output).toContain("config");
		// Should contain context data
	});

	it("should handle non-existent context gracefully", () => {
		// First preload
		execSync("node tools/scripts/ai/context-preloader.js preload", {
			stdio: "pipe",
		});

		// Try to get non-existent context
		const output = execSync(
			"node tools/scripts/ai/context-preloader.js get nonexistent",
			{
				encoding: "utf8",
				stdio: "pipe",
			},
		);

		expect(output).toContain('Context "nonexistent" not found');
	});

	it("should fail gracefully when cache does not exist", () => {
		expect(() => {
			execSync("node tools/scripts/ai/context-preloader.js get config", {
				stdio: "pipe",
			});
		}).toThrow();
	});

	it("should include governance contexts", () => {
		execSync("node tools/scripts/ai/context-preloader.js preload", {
			stdio: "pipe",
		});

		const cache = JSON.parse(readFileSync(cacheFile, "utf8"));
		expect(cache.contexts).toHaveProperty("rules-awareness");
		expect(cache.contexts).toHaveProperty("patterns");

		const rulesContext = cache.contexts["rules-awareness"];
		expect(rulesContext).toHaveProperty("files");
		expect(Object.keys(rulesContext.files).length).toBeGreaterThan(0);
	});
});
