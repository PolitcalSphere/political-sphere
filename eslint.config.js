import js from '@eslint/js';
import nxEslintPlugin from '@nx/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vitest from '@vitest/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import filenames from 'eslint-plugin-filenames';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        es2021: true,
        process: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        React: 'readonly',
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      filenames: filenames,
      '@nx': nxEslintPlugin,
      react: react,
      'react-hooks': reactHooks,
      import: importPlugin,
      prettier: prettier,
      '@vitest': vitest,
    },
    rules: {
      'prettier/prettier': 'error',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['*../..*', '../../**'],
        },
      ],
      'import/order': 'off', // Disabled due to TypeScript resolver issues
      'no-console': 'off',
      '@nx/enforce-module-boundaries': ['error', { enforceBuildableLibDependency: true }],
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
    },
  },

  // Migration-specific overrides
  {
    files: ['**/migrations/**/*.{js,ts}'],
    rules: {
      'filenames/match-regex': 'off',
    },
  },

  // Legacy CommonJS files - allow require() until ESM migration complete
  // See docs/TODO.md for ESM migration tracking
  {
    files: ['apps/api/**/*.js', 'apps/api/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'no-restricted-syntax': 'off',
      'import/order': 'off', // Disable for CommonJS files
    },
  },

  // Test files overrides
  {
    files: [
      '**/tests/**/*.test.{js,mjs}',
      '**/tests/**/*.spec.{js,mjs}',
      '**/*.test.{ts,tsx,js}',
      '**/*.spec.{ts,tsx,js}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'reports/**',
      'logs/**',
      'test-results/**',
      '.nx/**',
      'apps/**/dist/**',
      'libs/**/dist/**',
      'assets/public/**',
      '**/*.min.js',
      'docs/apps/.vitepress/cache/**',
    ],
  },

  // Disable no-console for scripts, tools, and docs
  {
    files: ['scripts/**/*.{js,mjs,ts}', 'tools/**/*.{js,mjs,cjs,ts}', 'docs/**/*.{js,mjs,ts}'],
    rules: {
      'no-console': 'off',
    },
  },
];
