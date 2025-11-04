import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

// Global test setup
beforeAll(() => {
  // Setup global test environment
  process.env.NODE_ENV = "test";
  process.env.FAST_AI = "1"; // Speed up tests
  process.env.JWT_SECRET =
    "test-secret-key-that-is-at-least-32-characters-long-for-security";
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

// Provide CJS-friendly partial mock for shared schemas used by Express route tests
// Import the actual CJS shim which has real implementations
vi.mock("@political-sphere/shared", async () => {
  // Use dynamic import to load the CJS shim
  const shim = await import("../libs/shared/cjs-shared.cjs");
  return shim;
});
