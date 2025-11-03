// Root Jest preset for Political Sphere
// Provides base configuration for all apps, with Nx integration and TypeScript support
const { compilerOptions } = require('./tsconfig.base.json');

module.exports = {
  testEnvironment: 'node',
  // Match test files with various extensions (including .mjs for ESM tests)
  testMatch: ['**/+(*.)+(spec|test).+(ts|js|mjs)?(x)'],
  // SWC transform for TypeScript, JavaScript, and HTML files
  transform: {
    '^.+\\.(ts|js|html)$': ['@swc/jest'],
  },
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'mjs', 'html'],
  // Coverage collection - excludes config files, build outputs, and dependencies
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.config.{ts,js}',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
  ],
  coverageReporters: ['html', 'text', 'lcov'],
  coverageDirectory: 'coverage',
  // Coverage thresholds - lowered to 70% for MVP stage to focus on core functionality
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Module mapping for TypeScript path aliases
  moduleNameMapper: compilerOptions?.paths
    ? Object.fromEntries(
        Object.entries(compilerOptions.paths).map(([key, value]) => [
          key.replace('/*', '/(.*)'),
          `<rootDir>/${value[0].replace('/*', '/$1')}`,
        ])
      )
    : {},
  // Global test setup file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Ignore patterns for test discovery
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/coverage/'],
  // Transform patterns for ESM modules in node_modules
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  // Treat TypeScript files as ESM for proper module resolution
  extensionsToTreatAsEsm: ['.ts'],
  // Performance optimizations
  maxWorkers: '75%', // Parallel test execution (increased for better CI performance)
  cache: true, // Enable Jest caching
  // Increased timeout for integration tests
  testTimeout: 15000,
};
