---
description: "User experience, ethical design, and WCAG 2.2 AA+ accessibility requirements"
applyTo: "**/apps/frontend/**/*,**/libs/ui/**/*"
---

# User Experience & Accessibility

**Version:** 2.0.0 | **Last Updated:** 2025-11-05

## User Agency & Transparency

Respect user autonomy: Use plain language (avoid jargon). Progressive disclosure (don't overwhelm). Meaningful, informed consent. Clear privacy notices. Honest, understandable interfaces.

## WCAG 2.2 AA+ Compliance (Mandatory)

Accessibility baseline: WCAG 2.2 AA (mandatory). Where feasible, require selected additional AAA criteria: 1.4.6 Contrast (Enhanced) for body text and 2.3.3 Animation from Interactions (where it improves accessibility).

All UI must be fully accessible: **Perceivable:** Text alternatives for images. Captions for audio/video. Adaptable, responsive layout. Sufficient color contrast (4.5:1 normal, 3:1 large text). **Operable:** Full keyboard navigation support. Clear tab order and focus indicators. No time limits on critical tasks. Skip links for main content. **Understandable:** Readable, clear text. Predictable navigation and behavior. Input assistance and validation. Error identification and suggestions. **Robust:** Semantic HTML5. ARIA labels where needed. Screen reader compatible. Works with assistive technologies. **Additional Requirements:** Respect `prefers-reduced-motion`. Support text scaling up to 200%. Touch targets ≥ 44×44px. Form labels always associated.

## Ethical Design Principles

NO manipulative patterns: ❌ Dark patterns. ❌ Coercive flows. ❌ Hidden costs. ✅ Clear AI-generated content labels. ✅ Provenance for political content. ✅ User control over personalization.

## Inclusive & Global Design

Support diverse users: Internationalization (i18n) from start. Localization (l10n) ready. Fully responsive (mobile, tablet, desktop). Right-to-left (RTL) language support. Cultural sensitivity.

## Error Handling & Feedback

Guide users effectively: Clear, actionable error messages. Specific recovery paths. Contextual help and onboarding. User feedback mechanisms. Measure UX KPIs (task completion rate, error rate, satisfaction).
