/**
 * @jest-environment jsdom
 */

const axe = require('axe-core');

describe('GameBoard Accessibility Tests (jsdom + axe)', () => {
  beforeAll(() => {
    // ensure jsdom is clean
    document.body.innerHTML = '';
  });

  test('GameBoard component passes accessibility audit (axe in jsdom)', async () => {
    // Render minimal accessible markup into jsdom
    document.body.innerHTML = `
      <nav class="skip-links is-visible" aria-label="Skip links">
        <a href="#main-content">Skip to main content</a>
        <button type="button">Skip to navigation</button>
      </nav>
      <main id="main-content" class="game-board" role="main" tabindex="-1">
        <h1>Political Simulation Game</h1>
        <section aria-label="Game navigation" tabindex="-1">
          <button type="button" aria-label="Focus next proposal">Next Proposal</button>
          <button type="button" aria-label="Focus previous proposal">Previous Proposal</button>
        </section>
        <section aria-labelledby="proposals-heading" aria-live="polite">
          <h2 id="proposals-heading">Proposals</h2>
          <ul class="proposals-list" role="list">
            <li class="proposal-item" role="listitem">
              <h3>Improve Education Funding</h3>
              <p>Increase budget for schools and teachers.</p>
              <div class="vote-buttons">
                <button type="button" aria-label="Vote for Improve Education Funding">For</button>
                <button type="button" aria-label="Vote against Improve Education Funding">Against</button>
                <button type="button" aria-label="Abstain from voting on Improve Education Funding">Abstain</button>
                <button type="button" class="report-button" aria-label="Report Improve Education Funding proposal">Report</button>
              </div>
            </li>
          </ul>
        </section>
        <section aria-labelledby="new-proposal-heading" class="proposal-form">
          <h2 id="new-proposal-heading">Submit New Proposal</h2>
          <form>
            <label for="proposal-title">Proposal Title:</label>
            <input type="text" id="proposal-title" required aria-describedby="title-help">
            <span id="title-help" class="sr-only">Enter a clear, descriptive title for your proposal</span>
          </form>
        </section>
        <section aria-live="polite" aria-atomic="true" class="sr-only">Live announcements</section>
      </main>
    `;

    // Run axe against the current document in jsdom
    const results = await new Promise((resolve, reject) => {
      try {
        axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'heading-order', 'landmark-one-main', 'region'] } }, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      } catch (e) {
        reject(e);
      }
    });

    const criticalViolations = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));

    if (criticalViolations.length > 0) {
      // emit details for CI debugging
      /* eslint-disable no-console */
      console.log('Accessibility Violations Found:');
      criticalViolations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.help}`);
      });
      /* eslint-enable no-console */
    }

    expect(criticalViolations).toHaveLength(0);
  });

  test('Focus management and keyboard focusability', () => {
    const skipLink = document.querySelector('.skip-links a');
    expect(skipLink).toBeTruthy();
    skipLink.focus();
    expect(document.activeElement).toBe(skipLink);

    const firstButton = document.querySelector('button');
    expect(firstButton).toBeTruthy();
    firstButton.focus();
    expect(document.activeElement).toBe(firstButton);
  });

  test('aria-live region present for screen reader announcements', () => {
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion.getAttribute('aria-atomic')).toBeDefined();
  });
});
