/**
 * Accessibility Controls Component
 * Provides user interface for accessibility settings
 * Implements WCAG 2.2 AA compliance
 */

import React from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';
import './AccessibilityControls.css';

const AccessibilityControls = ({ isOpen, onClose }) => {
  const {
    highContrast,
    setHighContrast,
    largeText,
    setLargeText,
    reducedMotion,
    setReducedMotion,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    announce
  } = useAccessibility();

  // Announce when controls open
  React.useEffect(() => {
    if (isOpen) {
      announce('Accessibility controls opened. Use Tab to navigate options.', 'assertive');
    }
  }, [isOpen, announce]);

  const handleHighContrastToggle = () => {
    setHighContrast(!highContrast);
    announce(`${highContrast ? 'High contrast disabled' : 'High contrast enabled'}`, 'polite');
  };

  const handleLargeTextToggle = () => {
    setLargeText(!largeText);
    announce(`${largeText ? 'Large text disabled' : 'Large text enabled'}`, 'polite');
  };

  const handleReducedMotionToggle = () => {
    setReducedMotion(!reducedMotion);
    announce(`${reducedMotion ? 'Motion enabled' : 'Reduced motion enabled'}`, 'polite');
  };

  const handleIncreaseFontSize = () => {
    increaseFontSize();
    announce('Font size increased', 'polite');
  };

  const handleDecreaseFontSize = () => {
    decreaseFontSize();
    announce('Font size decreased', 'polite');
  };

  const handleResetFontSize = () => {
    resetFontSize();
    announce('Font size reset to default', 'polite');
  };

  if (!isOpen) return null;

  return (
    <div
      className="accessibility-controls-overlay"
      role="dialog"
      aria-labelledby="accessibility-title"
      aria-describedby="accessibility-description"
    >
      <div className="accessibility-controls-panel">
        <header className="accessibility-controls-header">
          <h2 id="accessibility-title">Accessibility Settings</h2>
          <p id="accessibility-description">
            Customize your experience to meet your accessibility needs.
          </p>
          <button
            className="accessibility-controls-close"
            onClick={onClose}
            aria-label="Close accessibility controls"
            data-close
          >
            ×
          </button>
        </header>

        <div className="accessibility-controls-content">
          {/* Visual Settings */}
          <section className="accessibility-section">
            <h3>Visual Settings</h3>

            <div className="accessibility-control-group">
              <label className="accessibility-toggle">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={handleHighContrastToggle}
                  aria-describedby="high-contrast-desc"
                />
                <span className="accessibility-toggle-slider"></span>
                <span className="accessibility-toggle-label">High Contrast</span>
              </label>
              <p id="high-contrast-desc" className="accessibility-description">
                Increases contrast between text and background for better visibility.
              </p>
            </div>

            <div className="accessibility-control-group">
              <label className="accessibility-toggle">
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={handleLargeTextToggle}
                  aria-describedby="large-text-desc"
                />
                <span className="accessibility-toggle-slider"></span>
                <span className="accessibility-toggle-label">Large Text</span>
              </label>
              <p id="large-text-desc" className="accessibility-description">
                Increases text size across the application.
              </p>
            </div>
          </section>

          {/* Motion Settings */}
          <section className="accessibility-section">
            <h3>Motion Settings</h3>

            <div className="accessibility-control-group">
              <label className="accessibility-toggle">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={handleReducedMotionToggle}
                  aria-describedby="reduced-motion-desc"
                />
                <span className="accessibility-toggle-slider"></span>
                <span className="accessibility-toggle-label">Reduced Motion</span>
              </label>
              <p id="reduced-motion-desc" className="accessibility-description">
                Minimizes animations and transitions for users sensitive to motion.
              </p>
            </div>
          </section>

          {/* Font Size Controls */}
          <section className="accessibility-section">
            <h3>Text Size</h3>
            <p className="accessibility-description">
              Adjust text size for better readability.
            </p>

            <div className="accessibility-font-controls">
              <button
                className="accessibility-font-button"
                onClick={handleDecreaseFontSize}
                aria-label="Decrease font size"
                disabled={false} // Add logic to disable at minimum
              >
                A-
              </button>

              <button
                className="accessibility-font-button"
                onClick={handleResetFontSize}
                aria-label="Reset font size to default"
              >
                Reset
              </button>

              <button
                className="accessibility-font-button"
                onClick={handleIncreaseFontSize}
                aria-label="Increase font size"
                disabled={false} // Add logic to disable at maximum
              >
                A+
              </button>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="accessibility-section">
            <h3>Keyboard Shortcuts</h3>
            <dl className="accessibility-shortcuts">
              <dt>Tab</dt>
              <dd>Navigate between interactive elements</dd>

              <dt>Shift + Tab</dt>
              <dd>Navigate backwards</dd>

              <dt>Enter/Space</dt>
              <dd>Activate buttons and links</dd>

              <dt>Escape</dt>
              <dd>Close dialogs and menus</dd>

              <dt>Skip Links</dt>
              <dd>Press Tab to show navigation shortcuts</dd>
            </dl>
          </section>

          {/* Help and Support */}
          <section className="accessibility-section">
            <h3>Help & Support</h3>
            <p className="accessibility-description">
              Need additional accessibility support?
            </p>

            <div className="accessibility-support-links">
              <a
                href="/accessibility-statement"
                className="accessibility-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Accessibility Statement
              </a>

              <a
                href="mailto:accessibility@political-sphere.com"
                className="accessibility-link"
              >
                Contact Accessibility Team
              </a>

              <a
                href="https://www.w3.org/WAI/WCAG21/quickref/"
                className="accessibility-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                WCAG Guidelines
              </a>
            </div>
          </section>
        </div>

        <footer className="accessibility-controls-footer">
          <p className="accessibility-disclaimer">
            Settings are saved automatically and apply to all pages.
            Some changes may require refreshing the page.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AccessibilityControls;
