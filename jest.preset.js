const { compilerOptions } = require('./tsconfig.base.json');

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
  transform: {
    '^.+\\.(ts|js|html)$': ['@swc/jest'],
  },
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html'],
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
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: compilerOptions?.paths ? Object.fromEntries(
    Object.entries(compilerOptions.paths).map(([key, value]) => [
      key.replace('/*', '/(.*)'),
      `<rootDir>/${value[0].replace('/*', '/$1')}`
    ])
  ) : {},
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$)',
  ],
  extensionsToTreatAsEsm: ['.ts'],

};
