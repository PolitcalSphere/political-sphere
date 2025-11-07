# Internationalization and Localization Strategy

<div align="center">

| Classification | Version | Last Updated |       Owner        | Review Cycle |  Status   |
| :------------: | :-----: | :----------: | :----------------: | :----------: | :-------: |
|  🔒 Internal   | `0.1.0` |  2025-10-30  | Documentation Team |  Quarterly   | **Draft** |

</div>

---

## Overview

Political Sphere is designed as a UK-style parliamentary simulation, launching primarily in English with internationalization (i18n) foundations for future global expansion. Localization will prioritize ethical containment, safety, and fictional neutrality, avoiding real-world political imports.

## Core Principles

- **Start Small, Build Right:** Launch in English with i18n-ready architecture; expand gradually to strategy-focused language communities.
- **Ethical Containment:** Maintain fictional political universe; no regional political ideology or real-world associations.
- **Safety First:** Expansion depends on demonstrated moderation and safety at scale.
- **Zero-Budget Mindset:** Community-assisted translations; no outsourced localization initially.

## Target Markets (Phased)

### Phase 1: English-Speaking Strategy/Politics Audience (Launch)

- United Kingdom, Ireland, Canada, Australia/NZ, English-speaking EU, US (niche parliamentary interest).
- Rationale: Shared language reduces barriers; early community from academic/strategy circles.

### Phase 2: High Strategy-Game Engagement Markets (6-18 Months)

- Germany, Netherlands, Scandinavia, France, Singapore/Hong Kong (English bilingual).
- Criteria: Strong strategy-gaming culture, high English comprehension, political civility, low polarization risk.

### Phase 3: Broader Expansion (18+ Months)

- Spanish-speaking markets, Japanese, Korean strategy audiences.
- Conditional on safety and moderation scaling.

## Translation & Localization Approach

### Initial Setup

- Text extraction and string externalization (e.g., /locales/en.json).
- i18n libraries (free/local, e.g., react-i18next).
- English-only UI and content; avoid hard-coded strings.

### Later Phases

- Text bundles per language.
- Community-assisted translation with review and trust rules.
- Tutorial and onboarding translations once core is stable.
- Right-to-left (RTL) support as needed (not MVP).

### Prohibited Elements

- Region-specific political ideology content.
- Local partisan references.
- Real political party localization.

## Cultural & Ethical Adaptation

- **Neutrality:** No culturally sensitive real-world political analogues or symbolism.
- **Tone Consistency:** Rational, procedural, respectful across cultures.
- **Privacy:** Maintain pseudonymity and anonymity standards.
- **Community Norms:** Enforce English norms first; adapt for multilingual moderation.

## Name & Terminology Strategy

- Use fictional political names, titles, and factions to avoid legal issues and regional baggage.
- Generic terms like "Legislature," "Speaker," "Member," "Leader."
- UK parliamentary feel with flexibility for fictional world expansion.

## Technical Requirements

- All UI text externalized.
- Configurable date formats and Unicode fonts.
- Avoid culturally-specific phrases or idioms.
- Local timezone support for scheduled sittings.
- Future RTL capability.

## Community & Moderation Considerations

- **Multilingual Moderation:** Complex; start with English norms.
- **AI Support:** Language-restricted scope; no political inference.
- **Helpers:** Community volunteers for future languages.

## Timeline Reality

| Phase        | Timeline    | Scope                                             |
| ------------ | ----------- | ------------------------------------------------- |
| MVP          | 0–6 months  | English only, i18n foundation                     |
| Early Growth | 6–18 months | European language pack (community-validated)      |
| Scale        | 18+ months  | Asian languages, RTL support, structured pipeline |

**Rule:** Expand only when moderation and safety scale.

## Guiding Principles

- Languages follow community strength, not hype.
- Fictional politics remain universal.
- Safety > scale.
- Player culture > player count.

## Summary

Political Sphere will launch in English with internationalization foundations, expanding gradually to strategy-focused language communities while prioritizing ethical containment, safety, and fictional neutrality.
