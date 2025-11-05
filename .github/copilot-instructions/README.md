# GitHub Copilot Instructions# Copilot Instructions

**Version:** 2.0.0 This directory contains all AI assistant governance rules and instructions for the Political Sphere project.

**Last Updated:** 2025-11-05

## Overview

This directory contains the GitHub Copilot custom instructions and supporting guidance for the Political Sphere project.

These files guide AI assistants (GitHub Copilot, BlackBox AI, and others) in maintaining code quality, security, and compliance standards throughout the development process.

## 📁 Directory Structure

## Files

````

.github/copilot-instructions/- **`copilot-instructions.md`** - Main governance file with meta-rules, execution modes, and update protocols (pairs with `/.blackboxrules`)

├── copilot-instructions.md          # Main GitHub Copilot instructions (v2.0.0)- **`ai-governance.md`** - AI ethics, safety, and governance principles

├── copilot-instructions.md.v1.7.0.backup  # Backup of previous version- **`compliance.md`** - Legal compliance, GDPR, accessibility, and regulatory requirements

├── README.md                         # This file- **`operations.md`** - CI/CD, deployment, monitoring, and operational standards

└── additional-guidance/              # Path-specific instruction files- **`organization.md`** - File placement, directory structure, and naming conventions

    ├── testing.instructions.md       # Testing standards and patterns- **`quality.md`** - Code quality, testing, and documentation standards

    ├── typescript.instructions.md    # TypeScript coding standards- **`quick-ref.md`** - Quick reference guide for common tasks and patterns

    ├── react.instructions.md         # React component patterns- **`security.md`** - Security practices, threat modeling, and vulnerability management

    ├── backend.instructions.md       # Backend/API development- **`strategy.md`** - Product strategy, roadmap, and architectural decisions

    ├── quick-ref.md                  # Quick reference guide- **`testing.md`** - Testing strategies, coverage requirements, and test patterns

    ├── ai-governance.md              # AI governance requirements- **`ux-accessibility.md`** - UX design principles and accessibility standards

    ├── compliance.md                 # Compliance standards

    ├── operations.md                 # Operational requirements## Usage

    ├── organization.md               # Project organization

    ├── quality.md                    # Quality standardsAI assistants automatically load these files to:

    ├── security.md                   # Security requirements

    ├── testing.md                    # Testing guidelines- Understand project structure and conventions

    └── ux-accessibility.md           # UX and accessibility- Apply appropriate quality gates based on execution mode

```- Maintain consistency across the codebase

- Follow security and compliance requirements

## 🎯 Purpose

## Maintenance

These instructions guide AI assistants (GitHub Copilot, Blackbox AI, etc.) to:

**CRITICAL**: When updating governance rules:

1. **Understand project context** - Political simulation platform with democratic governance

2. **Follow strict standards** - Security (zero-trust), accessibility (WCAG 2.2 AA), neutrality1. Update BOTH `copilot-instructions.md` AND `/.blackboxrules` simultaneously

3. **Produce quality code** - Type-safe, tested, documented, secure2. Increment version numbers in both files

4. **Respect core principles** - Democratic integrity, privacy by design, testing infrastructure3. Add entry to `/CHANGELOG.md` under `Unreleased` section

5. **Navigate the codebase** - Proper file placement, naming conventions, architecture patterns4. Update `/docs/TODO.md` with change details

5. Use the `rule-update` PR template

## 📚 What's New in v2.0.06. Require review from governance team



### Major ImprovementsCI enforces parity via `.github/actions/ci/rule-parity-check.yml`.



1. **Version History Table** - Track changes across versions with impact assessment## Version

2. **Comprehensive Glossary** - 23 acronyms and 5 key process terms defined

3. **Enhanced Table of Contents** - Hierarchical structure with subsections and visual markersCurrent Version: 1.5.0

4. **AI Persona Section** - Clear guidance on tone, interaction style, and behaviorLast Updated: 2025-11-05

5. **High-Risk Patterns** - 8 never-suggest items with rationale
6. **Fail-Gracefully Strategy** - 5-step approach for handling uncertainty
7. **Testing Infrastructure** - Expanded from ~50 to ~200 lines with CI/CD integration
8. **Code Examples** - Accessibility, security, and performance testing examples
9. **Constitutional Citation Requirements** - When and how to cite governance principles
10. **Risk Tier Examples** - Execution mode guidance with required approvals
11. **Quick Reference Appendix** - Checklists, decision trees, and command reference

### Path Updates

All internal references have been updated to reflect the new structure:

- ✅ `.github/instructions/` → `.github/copilot-instructions/additional-guidance/`
- ✅ `docs/CHANGELOG.md` → `CHANGELOG.md` (repository root)
- ✅ `docs/architecture/decisions/` → `docs/adr/` (ADR format)

### File Improvements

- **Cleaner formatting** - Removed excessive emojis, simplified tables
- **Professional presentation** - Optimized for both AI parsing and human readability
- **Accurate paths** - All cross-references verified and corrected
- **Complete coverage** - No gaps in testing, security, accessibility guidance

## 🚀 Quick Start

### For AI Assistants

1. **Read Five Core Rules first** - Non-negotiable principles
2. **Check Glossary** - Understand key terms and acronyms
3. **Review relevant path-specific guidance** - Based on task type
4. **Follow AI Output Validation Checklist** - Before proposing code
5. **Use Quick Reference Appendix** - For fast lookups

### For Developers

1. **Consult when onboarding new AI tools** - Ensure consistency
2. **Reference for code review standards** - Align on expectations
3. **Update as project evolves** - Keep instructions current
4. **Use as teaching material** - Onboard new team members

## 📖 How to Use These Instructions

### GitHub Copilot

GitHub Copilot automatically reads `copilot-instructions.md` when you work in this repository. The instructions guide:

- Code suggestions and completions
- Chat responses and explanations
- PR descriptions and commit messages
- Code review comments

### Blackbox AI

The `.blackboxrules` file in the repository root is optimized for Blackbox AI's interface. It maintains parity with Copilot instructions but in a more concise format.

### Other AI Assistants

Share the `copilot-instructions.md` file as context when working with other AI tools:

- Cursor AI
- Codeium
- Amazon CodeWhisperer
- ChatGPT/Claude (for code review)

## 🔧 Maintenance

### When to Update

Update these instructions when:

1. **Standards change** - New versions of WCAG, OWASP, NIST, etc.
2. **Architecture evolves** - New patterns, tools, or technologies adopted
3. **Governance updates** - Constitutional changes or policy updates
4. **Feedback received** - AI producing incorrect or suboptimal suggestions
5. **New risks identified** - Security vulnerabilities or anti-patterns discovered

### How to Update

1. **Edit both files** - `copilot-instructions.md` AND `.blackboxrules` (maintain parity)
2. **Increment version** - Follow semantic versioning (major.minor.patch)
3. **Update version history** - Add entry to version history table
4. **Document in CHANGELOG** - Add entry to `CHANGELOG.md`
5. **Update TODO** - Track changes in `docs/TODO.md`
6. **Test with AI** - Verify AI assistants understand new guidance
7. **Governance review** - Get approval from Technical Governance Committee

### Versioning Scheme

- **Major (X.0.0)** - Structural changes, new core principles, breaking changes
- **Minor (1.X.0)** - New sections, enhanced guidance, significant additions
- **Patch (1.0.X)** - Corrections, clarifications, minor improvements

## 🎓 Learning Resources

### Internal Documentation

- `docs/standards-overview.md` - Complete standards reference
- `docs/TODO.md` - Current work and priorities
- `docs/adr/` - Architecture Decision Records
- `docs/governance/` - Governance framework
- `docs/security/` - Security policies

### External Standards

- [WCAG 2.2 AA](https://www.w3.org/WAI/WCAG22/quickref/) - Web accessibility
- [OWASP ASVS 4.0.3](https://owasp.org/www-project-application-security-verification-standard/) - Security testing
- [NIST SP 800-53 r5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final) - Security controls
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Language reference
- [React Documentation](https://react.dev/) - UI framework

### Best Practices

- [GitHub Copilot Best Practices](https://docs.github.com/en/copilot/using-github-copilot/best-practices-for-using-github-copilot)
- [Awesome GitHub Copilot](https://github.com/jondot/awesome-copilot) - Community resources

## ✅ Validation

### Pre-Deployment Checklist

Before deploying updated instructions:

- [x] Version number incremented to 2.0.0
- [x] Version history table updated
- [x] All path references verified and corrected
- [x] Both Copilot and Blackbox files updated
- [ ] CHANGELOG.md entry added
- [ ] docs/TODO.md updated
- [x] No broken links
- [x] Glossary terms current
- [x] Code examples tested
- [ ] Governance review completed
- [x] AI assistant testing passed

## 📊 Success Metrics

Track instruction effectiveness:

- **AI suggestion accuracy** - How often suggestions align with standards
- **Code review efficiency** - Reduction in standards-related feedback
- **Security posture** - Decrease in vulnerabilities from AI-suggested code
- **Accessibility compliance** - WCAG conformance of AI-generated UI
- **Test coverage** - Coverage of AI-generated code
- **Developer satisfaction** - Team feedback on AI assistance quality

## 🆘 Support

### Questions or Issues

If you encounter problems with AI assistance:

1. **Check current instructions** - Ensure you have latest version
2. **Review path-specific guidance** - Additional context may be available
3. **Consult TODO.md** - Known issues may be documented
4. **Ask Technical Governance Committee** - For constitutional/governance matters
5. **Submit feedback** - Help improve instructions for everyone

### Contributing

To propose improvements:

1. Create issue with `ai-instructions` label
2. Describe problem and proposed solution
3. Include examples of AI behavior
4. Reference relevant standards
5. Submit PR with changes to both files
6. Request governance review

---

**Maintained by**: Technical Governance Committee
**Last Review**: 2025-11-05
**Next Review**: 2026-05-05 (6 months)
````
