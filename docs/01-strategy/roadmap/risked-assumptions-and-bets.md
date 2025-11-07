# Risked Assumptions and Bets

> **Key assumptions, risks, and mitigation strategies for Political Sphere**

<div align="center">

| Classification | Version | Last Updated |      Owner       | Review Cycle |    Status    |
| :------------: | :-----: | :----------: | :--------------: | :----------: | :----------: |
|  🔒 Internal   | `0.2.0` |  2025-10-30  | Strategy Council |  Quarterly   | **Approved** |

</div>

---

## 🎯 Overview

This document outlines the main challenges and risks facing Political Sphere, along with mitigation strategies. These are the "bets" we're making and the assumptions that could undermine them.

---

## ⚠️ Key Risks and Challenges

### 1. Technical Complexity

**Risk:** The game simulates persistent multiplayer worlds, real-time debate & procedural flow, elections, votes, parties, alliances, moderation systems, and constrained AI NPCs. Building complex core systems before fun is fully visible could lead to delays or scope creep.

**Assumption:** We can build incrementally, starting with small playable loops and testing each mechanic in isolation.

**Mitigation:**

- Incremental build with clear MVP scope.
- Test each mechanic in isolation.
- Use small, testable prototypes.

### 2. Multiplayer Persistence

**Risk:** Persistent online worlds require event consistency, state durability, anti-cheat integrity, timing logic, and concurrency safety. State bugs can break trust fast.

**Assumption:** Deterministic rules and server-authoritative logic can prevent corruption.

**Mitigation:**

- Implement deterministic rules.
- Use server-authoritative logic.
- Maintain audit logs.
- Conduct extensive testing.

### 3. Maintaining Fairness

**Risk:** If one player feels the system isn't fair — the magic dies. Perceived bias, balance flaws, moderation disputes, or AI decisions seen as unfair.

**Assumption:** Transparent rules and human oversight can maintain trust.

**Mitigation:**

- Ensure transparent rules with change logs.
- Implement appeals processes.
- Provide human oversight over AI moderation.

### 4. Toxicity & Social Risk

**Risk:** Political themes attract trolls, culture-war try-hards, bad-faith actors, real-world recruiters, and harassers.

**Assumption:** Strong moderation and community norms can contain this.

**Mitigation:**

- Enforce safe simulation mission.
- Build guardrails against real-world politics.
- Develop strong moderation tools.
- Foster player norms and culture.

### 5. Regulatory & Compliance

**Risk:** Areas to watch include online safety, GDPR/data rights, age access rules, potential "political content" scrutiny, and AI safety considerations. Even as a game, avoiding real-world persuasion or privacy breaches is critical.

**Assumption:** Minimal personal data and internal-world politics will avoid major issues.

**Mitigation:**

- Collect minimal personal data.
- Keep politics internal and fictional.
- Implement content policies.
- Maintain audit trails.
- Follow ethical AI practices.

### 6. Ethical Boundaries Around Politics

**Risk:** Distinguishing simulation from activism could lead to reputational or regulatory pressure.

**Assumption:** Clear disclaimers and containment will clarify the intent.

**Mitigation:**

- Use clear disclaimers.
- Maintain a fictional political universe.
- Prohibit real-world campaigning.
- Moderate ideological importation.

### 7. Market Fit & Education Curve

**Risk:** This is a high-depth, niche strategy game — not mass-market. Requires patience and seriousness, with a learning curve that could intimidate casuals. Slow early community growth.

**Assumption:** The niche is loyal and intellectually invested.

**Mitigation:**

- Target thoughtful strategy gamers.
- Provide good onboarding.
- Develop "learn by playing" tools.
- Include narrative scaffolding for roles.

### 8. Community Management

**Risk:** A persistent political sim can create factionalism, long-term rivalry, group power, and internal politics (ironically meta).

**Assumption:** Structured systems can manage this.

**Mitigation:**

- Implement structured role systems.
- Use reputation consequences.
- Offer new-player mentorship.
- Require party charters and conduct rules.

### 9. Zero Budget Constraint

**Risk:** Building with £0 fixed cost brings limits: slower iteration, limited infra scale, self-hosted systems, no outsourced moderation.

**Assumption:** Internal tooling and gradual expansion can compensate.

**Mitigation:**

- Start with small private test worlds.
- Prioritize internal tooling over external spend.
- Expand players gradually.
- Use community stewards for moderation.

### 10. AI Misuse or Perception Risk

**Risk:** Even local AI brings risks: NPC behaviour misaligned with ethics, perceived "bias," player mistrust if opaque.

**Assumption:** Transparency and constraints will build trust.

**Mitigation:**

- Make AI fully transparent.
- Log all AI decisions.
- Require human override on moderation.
- Limit AI to internal-world behaviour.

### 11. Retention Challenge

**Risk:** Persistent games must prove ongoing meaning, long-term progression, fresh cycles (elections, seasons). New worlds lose momentum if core gameplay isn't sticky early.

**Assumption:** Clear progression and rituals will maintain engagement.

**Mitigation:**

- Implement short initial cycles.
- Provide clear progression feedback.
- Add recurring events and highlights.
- Track history.

---

## 🎲 Underlying Meta-Risk

**Risk:** The game must stay intellectually serious and fair, without becoming boring or stressful.

**Assumption:** Balancing depth with accessibility will achieve this.

**Mitigation:** Regular player feedback and iterative design.

---

## 🛡️ Risk Mitigation Summary

- **Build Incrementally:** Start small, test often.
- **Prioritize Trust:** Transparency, fairness, safety first.
- **Contain Scope:** Fictional, ethical, contained simulation.
- **Community Focus:** Niche but loyal audience.
- **Zero-Cost Mindset:** Self-hosted, gradual growth.

These risks are significant, but the unique positioning of Political Sphere as a fair, persistent, strategy-focused political sim gives it a strong foundation if executed carefully.

---

## 📋 Related References

- [Objectives and Key Results (OKRs)](objectives-and-key-results-okrs.md) (Risk mitigation in execution)
- [Security and Risk](../../06-security-and-risk/README.md) (Detailed risk management)

Risked assumptions guide strategic decisions toward sustainable, ethical political simulation.
