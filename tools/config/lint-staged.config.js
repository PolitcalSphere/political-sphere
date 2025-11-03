// lint-staged.config.js
// Runs linting and formatting on staged files before commit
// Owner: Platform Engineering
// Last updated: 2025-11-01

export default {
  // JavaScript/TypeScript: ESLint for linting, Prettier and Biome for formatting
  '*.{ts,tsx,js,jsx}': ['eslint --fix --cache', 'prettier --write --cache', 'biome format --write'],

  // JSON, Markdown, YAML: Prettier for formatting
  '*.{json,md,yml,yaml}': ['prettier --write --cache'],
};
