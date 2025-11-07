// Local shim to access shared helpers and schemas from API code without relying on Vite aliases

import cjsShared from "../../../libs/shared/cjs-shared.cjs";

// Re-export all named exports
export const {
	createLogger,
	getLogger,
	CreateUserSchema,
	CreateBillSchema,
	CreateVoteSchema,
	CreatePartySchema,
	sanitizeHtml,
	isValidInput,
	isValidLength,
	validateCategory,
	validateTag,
	isValidUrl,
	SECURITY_HEADERS,
	getCorsHeaders,
	_rateState,
	checkRateLimit,
	getRateLimitInfo,
	isIpAllowed,
} = cjsShared;
