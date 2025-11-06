import { beforeEach, describe, expect, it } from "vitest";
import ModerationService from "../moderationService.js";

// The moderationService now uses ESM dynamic imports instead of require,
// so we can import it directly without module patching

describe("ModerationService helper functions (pure)", () => {
	let svc;
	beforeEach(() => {
		// moderationService exports a singleton instance; reuse it for helper tests
		svc = ModerationService;
		if (typeof svc.clearCache === "function") svc.clearCache();
	});

	it("calculates violence score", () => {
		expect(svc.calculateViolenceScore("peaceful discussion here")).toBe(0);
		expect(svc.calculateViolenceScore("kill murder bomb")).toBeGreaterThan(0);
	});

	it("calculates language score", () => {
		expect(svc.calculateLanguageScore("hello friend")).toBe(0);
		expect(svc.calculateLanguageScore("fuck shit damn")).toBeGreaterThan(0);
	});

	it("calculates sexual content score", () => {
		expect(svc.calculateSexualContentScore("this is fine")).toBe(0);
		expect(svc.calculateSexualContentScore("sex porn nude")).toBeGreaterThan(0);
	});

	it("checks custom rules", () => {
		const v = svc.checkCustomRules(
			"this text contains kill and bullying @user",
		);
		expect(Array.isArray(v)).toBe(true);
		expect(v.length).toBeGreaterThanOrEqual(1);
	});

	it("assesses age appropriateness", () => {
		expect(svc.assessAgeAppropriateness("clean text")).toBe("U");
		expect(svc.assessAgeAppropriateness("fuck kill sex bomb")).toBeDefined();
	});
});
