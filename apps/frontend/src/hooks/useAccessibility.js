/**
 * Accessibility Hook
 * Provides accessibility utilities and state management
 * Implements WCAG 2.2 AA compliance features
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useAccessibility = () => {
  // Accessibility preferences stored in localStorage
  const [highContrast, setHighContrast] = useLocalStorage('accessibility-highContrast', false);
  const [largeText, setLargeText] = useLocalStorage('accessibility-largeText', false);
  const [reducedMotion, setReducedMotion] = useLocalStorage('accessibility-reducedMotion', false);
  const [screenReader, setScreenReader] = useLocalStorage('accessibility-screenReader', false);

  // Focus management state
  const [focusedElement, setFocusedElement] = useState(null);
  const [skipLinksVisible, setSkipLinksVisible] = useState(false);

  // Initialize accessibility features
  useEffect(() => {
    // Apply high contrast mode
    document.documentElement.setAttribute('data-high-contrast', highContrast);

    // Apply large text mode
    document.documentElement.setAttribute('data-large-text', largeText);

    // Apply reduced motion
    document.documentElement.setAttribute('data-reduced-motion', reducedMotion);

    // Detect screen reader usage
    const detectScreenReader = () => {
      // Check for screen reader indicators
      const hasScreenReader = window.navigator.userAgent.includes('NVDA') ||
                             window.navigator.userAgent.includes('JAWS') ||
                             window.navigator.userAgent.includes('VoiceOver') ||
                             window.speechSynthesis !== undefined;

      setScreenReader(hasScreenReader);
    };

    detectScreenReader();

    // Listen for focus changes
    const handleFocus = (event) => {
      setFocusedElement(event.target);
    };

    const handleKeyDown = (event) => {
      // Show skip links on Tab key
      if (event.key === 'Tab') {
        setSkipLinksVisible(true);
      }
    };

    const handleMouseDown = () => {
      // Hide skip links on mouse interaction
      setSkipLinksVisible(false);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [highContrast, largeText, reducedMotion, screenReader]);

  // Keyboard navigation utilities
  const focusNextElement = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);

    if (currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    }
  }, []);

  const focusPreviousElement = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);

    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
    }
  }, []);

  // Skip link functionality
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [reducedMotion]);

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav') || document.querySelector('[role="navigation"]');
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [reducedMotion]);

  // Announcement system for screen readers
  const announce = useCallback((message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Focus trap utility for modals
  const trapFocus = useCallback((container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (event.key === 'Escape') {
        // Close modal or dialog
        const closeButton = container.querySelector('[data-close]');
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Color contrast utilities
  const getContrastRatio = useCallback((color1, color2) => {
    // Simplified contrast calculation
    // In production, use a proper color contrast library
    const getLuminance = (color) => {
      // Convert hex to RGB, then to relative luminance
      // This is a placeholder - implement proper calculation
      return 0.5; // Placeholder
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }, []);

  // Font size utilities
  const increaseFontSize = useCallback(() => {
    const body = document.body;
    const currentSize = parseFloat(window.getComputedStyle(body).fontSize);
    const newSize = Math.min(currentSize * 1.1, 24); // Max 24px
    body.style.fontSize = `${newSize}px`;
    setLargeText(true);
  }, [setLargeText]);

  const decreaseFontSize = useCallback(() => {
    const body = document.body;
    const currentSize = parseFloat(window.getComputedStyle(body).fontSize);
    const newSize = Math.max(currentSize * 0.9, 12); // Min 12px
    body.style.fontSize = `${newSize}px`;
    setLargeText(false);
  }, [setLargeText]);

  const resetFontSize = useCallback(() => {
    document.body.style.fontSize = '';
    setLargeText(false);
  }, [setLargeText]);

  // Motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Return accessibility utilities and state
  return {
    // Preferences
    highContrast,
    setHighContrast,
    largeText,
    setLargeText,
    reducedMotion: reducedMotion || prefersReducedMotion,
    setReducedMotion,
    screenReader,

    // Focus management
    focusedElement,
    skipLinksVisible,

    // Navigation utilities
    focusNextElement,
    focusPreviousElement,
    skipToContent,
    skipToNavigation,

    // Screen reader utilities
    announce,

    // Modal utilities
    trapFocus,

    // Visual utilities
    getContrastRatio,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,

    // Helper functions
    isHighContrastEnabled: highContrast,
    isLargeTextEnabled: largeText,
    isReducedMotionEnabled: reducedMotion || prefersReducedMotion,
    isScreenReaderDetected: screenReader
  };
};

export default useAccessibility;
