/**
 * Deprecated duplicate test file. The ESM version `auth.test.mjs` is the source of truth.
 * Keeping this as a skipped suite in CommonJS syntax to avoid ESM parse errors in some runners.
 */
// eslint-disable-next-line no-undef
describe.skip('auth.test.js (deprecated duplicate) — see auth.test.mjs', () => {
  // eslint-disable-next-line no-undef
  test('noop placeholder', () => {
    // Intentionally empty
  });
});
