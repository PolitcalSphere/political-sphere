export default {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'git add'],
  '*.{json,md,yml,yaml}': ['prettier --write', 'git add'],
};
