// Ensure deterministic CSRF secret for tests
process.env.CSRF_SECRET = process.env.CSRF_SECRET || "test-csrf-secret";

import { expect } from "vitest";
import {
	checkRateLimit,
	cleanupRateLimitStore,
	createSecurityHeaders,
	generateCsrfToken,
	generateSecureToken,
	getCorsHeaders,
	getRateLimitInfo,
	hashValue,
	isIpAllowed,
	isValidEmail,
	isValidInput,
	isValidLength,
	isValidUrl,
	sanitizeHtml,
	validateCategory,
	validateCsrfToken,
	validateTag,
} from "../security.js";

describe("Security utilities", () => {
	it("sanitizeHtml escapes dangerous characters", () => {
		const raw = `<script>alert('x')</script>`;
		const out = sanitizeHtml(raw);
		expect(out).not.toContain("<script");
		expect(out).toContain("&lt;script");
	});

	it("validates emails and urls", () => {
		expect(isValidEmail("test@example.com")).toBeTruthy();
		expect(isValidEmail("bad@@x")).toBeFalsy();

		expect(isValidUrl("https://example.com")).toBeTruthy();
		expect(isValidUrl("ftp://example.com")).toBeFalsy();
		// Custom allow-list for protocol
		expect(isValidUrl("ftp://example.com", ["ftp"])).toBeTruthy();
	});

	it("isValidUrl returns false for malformed URLs (catch branch)", () => {
		expect(isValidUrl("not-a-url")).toBeFalsy();
	});

	it("validates length", () => {
		expect(isValidLength("ok", 1, 5)).toBeTruthy();
		expect(isValidLength("", 1, 5)).toBeFalsy();
		// Non-string returns false (runtime guard)
		// @ts-expect-error intentional non-string
		expect(isValidLength(123, 1, 5)).toBeFalsy();
	});

	it("generates secure tokens and hashes", () => {
		const tok = generateSecureToken(8);
		expect(typeof tok).toBe("string");
		expect(tok.length).toBeGreaterThan(0);

		const h = hashValue("value");
		expect(/^[0-9a-f]+$/.test(h)).toBeTruthy();

		// invalid token lengths throw
		expect(() => generateSecureToken(0)).toThrow();
	});

	it("validates categories and tags", () => {
		expect(validateCategory("politics")).toBe("politics");
		expect(validateCategory("unknown")).toBeNull();

		expect(validateTag("tag_1")).toBe("tag_1");
		expect(validateTag("!bad")).toBeNull();
	});

	it("generates and validates csrf tokens", () => {
		const sessionId = "s123";
		const token = generateCsrfToken(sessionId);
		expect(typeof token).toBe("string");
		expect(validateCsrfToken(token, sessionId)).toBeTruthy();
		// invalid token
		expect(validateCsrfToken("bogus", sessionId)).toBeFalsy();
		// expired token fails validation
		const [ts, hash] = token.split(".");
		const expired = `${Number(ts) - 10_000}.${hash}`;
		expect(validateCsrfToken(expired, sessionId, 1000)).toBeFalsy();
	});

	it("creates security headers and cors headers", () => {
		const headers = createSecurityHeaders({ scriptNonce: "n1" });
		expect(headers).toHaveProperty("Content-Security-Policy");

		const cors = getCorsHeaders("https://political-sphere.com");
		expect(cors["Access-Control-Allow-Origin"]).toBe(
			"https://political-sphere.com",
		);

		const corsNone = getCorsHeaders("https://not.allowed");
		expect(Object.keys(corsNone)).toContain("Vary");
	});

	it("frame-ancestors 'none' yields X-Frame-Options DENY; can disable credentials in CORS", () => {
		const h = createSecurityHeaders({ frameAncestors: ["'none'"] });
		expect(h["X-Frame-Options"]).toBe("DENY");
		const cors = getCorsHeaders("https://political-sphere.com", {
			allowCredentials: false,
		});
		expect(cors["Access-Control-Allow-Credentials"]).toBeUndefined();
	});

	it("validates IP allowlist/blocklist", () => {
		expect(isIpAllowed("1.2.3.4")).toBeTruthy();
		expect(isIpAllowed("")).toBeFalsy();
		expect(isIpAllowed("1.2.3.4", ["1.2.3.4"])).toBeFalsy();
		// Non-string guarded
		// @ts-expect-error intentional non-string
		expect(isIpAllowed(null)).toBeFalsy();
	});

	it("detects dangerous input patterns", () => {
		expect(isValidInput("DROP TABLE users;")).toBeFalsy();
		expect(isValidInput("normal text")).toBeTruthy();
		expect(isValidInput("<script>alert('x')</script>")).toBeFalsy();
		expect(isValidInput("javascript:alert(1)")).toBeFalsy();
		expect(isValidInput("onload=alert(1)")).toBeFalsy();
		expect(isValidInput("../etc/passwd")).toBeFalsy();
	});

	it("rate limiter numeric and object options behave", () => {
		// numeric options -> treated as maxRequests
		const keyNum = `num-${Date.now()}`;
		expect(checkRateLimit(keyNum, 1)).toBeTruthy();
		expect(checkRateLimit(keyNum, 1)).toBeFalsy(); // second request should be blocked

		// object options
		const keyObj = `obj-${Date.now()}`;
		const opts = { maxRequests: 2, windowMs: 1000, maxKeys: 100 };
		expect(checkRateLimit(keyObj, opts)).toBeTruthy();
		expect(checkRateLimit(keyObj, opts)).toBeTruthy();
		expect(checkRateLimit(keyObj, opts)).toBeFalsy();

		const info = getRateLimitInfo(keyObj, opts);
		expect(info).toHaveProperty("remaining");
		expect(info).toHaveProperty("reset");
		expect(info.limit).toBe(opts.maxRequests);

		// unknown key returns defaults
		const info2 = getRateLimitInfo(`unknown-${Date.now()}`, opts);
		expect(info2.limit).toBe(opts.maxRequests);

		// ensure capacity trimming when maxKeys is tiny
		const tiny = { maxRequests: 1, windowMs: 1000, maxKeys: 1 };
		const k1 = `a-${Date.now()}`;
		const k2 = `b-${Date.now()}`;
		expect(checkRateLimit(k1, tiny)).toBeTruthy();
		expect(checkRateLimit(k2, tiny)).toBeTruthy(); // may evict k1
	});

	it("getCorsHeaders returns only Vary when origin missing", () => {
		const cors = getCorsHeaders(undefined);
		expect(Object.keys(cors)).toEqual(["Vary"]);
	});

	it("cleanupRateLimitStore runs without error when store is empty", () => {
		expect(() => cleanupRateLimitStore()).not.toThrow();
	});

	it("createSecurityHeaders includes nonce and upgrade directives and frame options", () => {
		const h = createSecurityHeaders({
			scriptNonce: "n1",
			upgradeInsecureRequests: true,
			frameAncestors: ["'self'"],
		});
		expect(h).toHaveProperty("Content-Security-Policy");
		expect(h["Content-Security-Policy"]).toContain("'nonce-n1'");
		expect(h["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
		expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
	});

	it("getCorsHeaders respects CORS env allowed origins and defaults", () => {
		const prev = process.env.CORS_ALLOWED_ORIGINS;
		process.env.CORS_ALLOWED_ORIGINS = "https://example.com";
		const cors = getCorsHeaders("https://example.com");
		expect(cors["Access-Control-Allow-Origin"]).toBe("https://example.com");
		// non-allowed origin returns only Vary
		const cors2 = getCorsHeaders("https://not-listed.example");
		expect(Object.keys(cors2)).toContain("Vary");
		process.env.CORS_ALLOWED_ORIGINS = prev;
	});

	it("generateCsrfToken throws in production when CSRF_SECRET is missing", () => {
		const prevNode = process.env.NODE_ENV;
		const prevSecret = process.env.CSRF_SECRET;
		process.env.NODE_ENV = "production";
		delete process.env.CSRF_SECRET;
		expect(() => generateCsrfToken("s1")).toThrow();
		process.env.NODE_ENV = prevNode;
		process.env.CSRF_SECRET = prevSecret;
	});
});
