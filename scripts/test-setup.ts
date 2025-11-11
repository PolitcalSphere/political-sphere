import * as React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vitest";
// Use the canonical jest-dom matchers to provide rich DOM assertions
// (replaces minimal custom expect.extend implementations).
import "@testing-library/jest-dom";

// Ensure React is available as a global for tests that rely on the
// classic JSX transform (some components in the workspace don't import
// the default React binding). Setting global.React is a low-risk, test-only
// compatibility shim so tests run regardless of the local JSX runtime.
// Attach React to the global object with a typed cast to avoid `any`.
(globalThis as unknown as { React?: typeof React }).React = React;

// We import @testing-library/jest-dom above to provide matchers such as
// toBeInTheDocument, toBeDisabled, toHaveAttribute, etc. This is more
// feature-complete and less brittle than custom implementations.

// Ensure a fetch function exists so tests can spy/mock it safely.
const g = globalThis as unknown as Record<string, unknown>;
if (!g.fetch) {
  g.fetch = vi.fn();
}

// Polyfill window.matchMedia for jsdom environments used in tests.
// Some accessibility utilities rely on matchMedia; provide a minimal
// implementation that is safe for tests and returns no matches by default.
type MatchMediaLike = {
  matches: boolean;
  media: string;
  onchange: null | ((this: unknown, ev: Event) => unknown);
  addListener: (cb: () => void) => void;
  removeListener: (cb: () => void) => void;
  addEventListener: (name: string, cb: () => void) => void;
  removeEventListener: (name: string, cb: () => void) => void;
  dispatchEvent: (ev: Event) => boolean;
};

const gAny = globalThis as unknown as {
  matchMedia?: (query: string) => MatchMediaLike;
};
if (typeof gAny.matchMedia !== "function") {
  gAny.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Ensure critical env is present before any module under test is imported
// Set a strong default JWT secret for tests (32+ chars per security checks)
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-secret-key-that-is-at-least-32-characters-long-for-security";
// Also set a strong refresh token secret to satisfy security checks in auth.js
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-refresh-secret-that-is-also-32-characters-minimum-length";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

// Global test setup
beforeAll(() => {
  // Setup global test environment (redundant but harmless)
  process.env.NODE_ENV = process.env.NODE_ENV || "test";
  process.env.FAST_AI = "1"; // Speed up tests
});

afterAll(() => {
  // Cleanup global test environment
});

beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Cleanup after each test
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Provide CJS-friendly mock for @political-sphere/shared used by API route and server tests
// We load the local CJS shim and augment it with security helpers required by server.js
vi.mock("@political-sphere/shared", async () => {
  const mod = await import("../libs/shared/cjs-shared.cjs");
  // When importing CJS with dynamic import, the exports may be under `default`
  const base = (mod as { default?: unknown }).default ?? (mod as unknown);

  // Lightweight in-memory rate limiter for tests
  const rateState = new Map<string, { count: number; first: number }>();
  const DEFAULT_LIMIT = 100;
  const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

  function checkRateLimit(
    key: string,
    opts: { maxRequests?: number; windowMs?: number } = {},
  ): boolean {
    if (!key) return false;
    const max = opts.maxRequests ?? DEFAULT_LIMIT;
    const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
    const now = Date.now();
    const entry = rateState.get(key);
    if (!entry || now - entry.first > windowMs) {
      rateState.set(key, { count: 1, first: now });
      return true;
    }
    if (entry.count < max) {
      entry.count += 1;
      return true;
    }
    return false;
  }

  function getRateLimitInfo(key: string, opts: { maxRequests?: number; windowMs?: number } = {}) {
    const max = opts.maxRequests ?? DEFAULT_LIMIT;
    const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
    const now = Date.now();
    const entry = rateState.get(key) ?? { count: 0, first: now };
    const resetIn = Math.max(0, entry.first + windowMs - now);
    const remaining = Math.max(0, max - entry.count);
    return { remaining, reset: Math.ceil(resetIn / 1000), limit: max };
  }

  const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-XSS-Protection": "0",
    "Permissions-Policy": "geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    // Add security headers required by tests hitting /healthz
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'self'",
  } as Record<string, string>;

  function getCorsHeaders(
    origin?: string | null,
    opts: { exposedHeaders?: string[] } = {},
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "600",
    };
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
    if (opts.exposedHeaders?.length) {
      headers["Access-Control-Expose-Headers"] = opts.exposedHeaders.join(", ");
    }
    return headers;
  }

  function isIpAllowed(ip?: string | null, blocklist: string[] = []) {
    if (!ip || typeof ip !== "string") return false;
    if (blocklist.includes(ip)) return false;
    return true;
  }

  const api = {
    // spread base shim exports (validators, logger, schemas)
    ...(base as object),
    // add security helpers required by server.js
    SECURITY_HEADERS,
    getCorsHeaders,
    checkRateLimit,
    getRateLimitInfo,
    isIpAllowed,
  } as Record<string, unknown>;

  // Ensure a default export is present for ESM import compatibility in Vitest mocks
  // The issue was that the mock wasn't providing the default export correctly
  return { ...api, default: api };
});

// (No global mock for the accessibility hook here.) Tests should register
// their own hoisted mocks using `vi.mock('../../hooks/useAccessibility', ...)`
// so each test can verify calls to the spy functions directly.
