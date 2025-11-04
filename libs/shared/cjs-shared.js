// CommonJS-friendly shim for @political-sphere/shared used in tests
// Exposes logger utilities from the JS implementation and provides
// minimal schema stubs for API route validation used in tests.

const logger = require("./src/logger.js");

const schemaStub = {
	parse: (input) => input,
	safeParse: (input) => ({ success: true, data: input }),
};

// Basic validators used by API services (simplified test-safe versions)
const ALLOWED_CATEGORIES = new Set([
	"politics",
	"economy",
	"social",
	"technology",
	"environment",
	"health",
	"finance",
	"governance",
	"policy",
	"general",
]);

function sanitizeHtml(input) {
	if (typeof input !== "string") return "";
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;")
		.replace(/\//g, "&#x2F;");
}

function isValidInput(input) {
	if (typeof input !== "string") return false;
	const dangerousPatterns = [
		/<script/i,
		/javascript:/i,
		/on\w+\s*=/i,
		/eval\(/i,
		/expression\(/i,
		/vbscript:/i,
		/\.\.\//,
		/SELECT.*FROM/i,
		/UNION.*SELECT/i,
		/INSERT.*INTO/i,
		/DROP.*TABLE/i,
		/DELETE.*FROM/i,
		/UPDATE.*SET/i,
		/\bOR\b\s+['"]?\s*1\s*=\s*1/i,
		/['"]\s*OR\s*['"]?1['"]?\s*=\s*['"]?1/i,
		/\bor\b\s+1\s*=\s*1/i,
	];
	return !dangerousPatterns.some((p) => p.test(input));
}

function isValidLength(input, min, max) {
	if (typeof input !== "string") return false;
	const len = input.trim().length;
	return len >= (min ?? 0) && len <= (max ?? Infinity);
}

function validateCategory(category) {
	if (typeof category !== "string") return false;
	const c = category.trim().toLowerCase();
	return ALLOWED_CATEGORIES.has(c) ? c : false;
}

function validateTag(tag) {
	if (typeof tag !== "string") return false;
	const t = tag.trim();
	if (!t) return false;
	// allow letters, numbers, hyphen and underscore
	return /^[a-zA-Z0-9-_]+$/.test(t) ? t : false;
}

function isValidUrl(url, allowedProtocols = ["https"]) {
	try {
		const u = new URL(url);
		const proto = u.protocol.replace(":", "");
		return allowedProtocols.includes(proto);
	} catch {
		return false;
	}
}

module.exports = {
	// Re-export logger APIs used across tests
	createLogger: logger.createLogger,
	getLogger: logger.getLogger,

	// Provide validation schema stubs for API routes
	CreateUserSchema: schemaStub,
	CreateBillSchema: schemaStub,
	CreateVoteSchema: schemaStub,
	CreatePartySchema: schemaStub,

	// Security/validation helpers
	sanitizeHtml,
	isValidInput,
	isValidLength,
	validateCategory,
	validateTag,
	isValidUrl,
};
