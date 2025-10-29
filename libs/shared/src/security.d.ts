// Type definitions for security.js

export function sanitizeHtml(input: string): string;
export function isValidInput(input: string): boolean;
export function isValidEmail(email: string): boolean;
export function isValidUrl(url: string, allowedProtocols?: string[]): boolean;
export function isValidLength(input: string, min?: number, max?: number): boolean;
export function generateSecureToken(length?: number): string;
export function hashValue(value: string): string;
export function validateCategory(category: string): string | null;
export function validateTag(tag: string): string | null;
export function checkRateLimit(key: string, maxRequests?: number, windowMs?: number): boolean;
export function getRateLimitInfo(key: string): { remaining: number; reset: number; limit: number };
export function cleanupRateLimitStore(): void;
export function generateCsrfToken(sessionId: string): string;
export function validateCsrfToken(token: string, sessionId: string, maxAge?: number): boolean;
export const SECURITY_HEADERS: Record<string, string>;
export function getCorsHeaders(origin: string): Record<string, string>;
export function isIpAllowed(ip: string, blocklist?: string[]): boolean;
