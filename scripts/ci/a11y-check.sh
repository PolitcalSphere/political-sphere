#!/usr/bin/env bash
set -euo pipefail

# Accessibility checker using axe-core via Playwright
# Requires apps to be running (or use npm run docker:up first)

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT_DIR"

REPORT_DIR="artifacts"
REPORT_FILE="$REPORT_DIR/accessibility-report.json"
mkdir -p "$REPORT_DIR"

echo "Running accessibility checks..."

# Check if Playwright is available
if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Install Node.js and npm." >&2
  exit 1
fi

# Create a minimal Playwright test for accessibility
cat > /tmp/a11y-test.mjs <<'EOF'
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility checks', () => {
  test('homepage should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto(process.env.BASE_URL || 'http://localhost:3000');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
EOF

# Install axe-core if not present
if ! npm list @axe-core/playwright >/dev/null 2>&1; then
  echo "Installing @axe-core/playwright..."
  npm install --no-save @axe-core/playwright@4.11.0
fi

# Run the test
npx playwright@1.56.1 test /tmp/a11y-test.mjs --reporter=json --output="$REPORT_FILE" || {
  echo "Accessibility violations detected. See $REPORT_FILE for details."
  exit 1
}

echo "Accessibility checks passed."
exit 0
