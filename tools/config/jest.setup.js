// Jest setup file for Political Sphere
// Configure test environment and global test utilities
// Refactored to use imported helpers for better maintainability

import { beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { mockHelpers } from './apps/api/tests/utils/test-helpers.js';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is deprecated')) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities - now imported from dedicated helpers file
global.testUtils = {
  // Helper to wait for async operations
  waitFor: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Helper to create mock data
  createMockData: (overrides = {}) => ({
    id: 'test-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to mock API responses
  mockApiResponse: (data, status = 200) => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {},
  }),

  // Helper to mock errors
  mockApiError: (message, status = 500) => ({
    response: {
      data: { message },
      status,
      statusText: 'Internal Server Error',
    },
  }),

  // Mock helpers from test-helpers.js
  ...mockHelpers,
};

// Configure Jest timeouts (increased for integration tests)
jest.setTimeout(15000);

// Mock environment variables (security: use env vars, fallback to test values)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'sqlite://:memory:';

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test hooks for setup and teardown
beforeEach(() => {
  // Setup code that runs before each test
  // Add any common test setup here
});

afterEach(() => {
  // Cleanup code that runs after each test
  // Add any common test cleanup here
});
