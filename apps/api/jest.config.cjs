module.exports = {
  displayName: 'api',
  testEnvironment: 'node',
  // Only run ESM test files (.mjs). Project tests use top-level await and ESM syntax.
  testMatch: ['**/tests/**/*.test.mjs'],
  transform: {
    '^.+\\.(js|mjs)$': ['@swc/jest', {
      jsc: {
        target: 'es2022',
        parser: {
          syntax: 'ecmascript',
          jsx: false,
          dynamicImport: true,
          privateMethod: true,
          functionBind: true,
          exportDefaultFrom: true,
          exportNamespaceFrom: true,
          decorators: true,
          decoratorsBeforeExport: true,
          topLevelAwait: true,
          importMeta: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
  moduleFileExtensions: ['js', 'mjs', 'json'],
  coverageDirectory: '../../coverage/apps/api',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.spec.js',
    '!src/**/*.test.js',
  ],
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@political-sphere/shared$': '<rootDir>/../../libs/shared/dist/src/index.js',
  },
  testEnvironmentOptions: {
    env: {
      JWT_SECRET: 'test-jwt-secret-for-testing-purposes-only',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-for-testing-purposes-only',
    },
  },
};
