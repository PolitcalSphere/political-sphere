# AI Development Workflow Guide

## Overview
This document outlines the standardized development workflow that AI assistants must follow when contributing to Political Sphere. All AI-generated code and changes must adhere to this process to ensure quality, security, and governance compliance.

## Execution Modes

### Safe Mode (Default)
- **Scope**: T0 + T1 + T2 (Constitutional + Operational Mandatory + Best-Practice Defaults)
- **Use When**: Production code, security-sensitive changes, user-facing features
- **Requirements**: Full testing, security scanning, accessibility validation, documentation updates

### Fast-Secure Mode
- **Scope**: T0 + T1 only (Constitutional + Operational Mandatory)
- **Use When**: Urgent fixes, experimental features, rapid iteration
- **Requirements**: Deferred gates must be recorded in `/docs/TODO.md`

### Audit Mode
- **Scope**: T0 + T1 + T2 + T3 (Full governance + optimisation)
- **Use When**: Major architectural changes, security audits, compliance reviews
- **Requirements**: Full artefact capture (traces, diffs, SBOMs)

### R&D Mode
- **Scope**: T0 + minimal T1 (Constitutional + critical operational)
- **Use When**: Research, prototyping, non-production experiments
- **Requirements**: Outputs marked `experimental`; no production merges without Safe re-run

## Workflow Steps

### 1. Context Retrieval
**Required Actions:**
- Read nearest README, ADRs, owner files, package configs
- Run code search for relevant terms
- Prefer symbol usage graphs before full-file reads
- Load project-context.md and relevant patterns

**AI-Specific:**
- Check ai/ai-knowledge/ for project context
- Review ai/patterns/ for established patterns
- Consult ai/ai-learning/patterns.json for successful approaches

### 2. Plan Phase
**Required Actions:**
- Produce short plan (approach, risks, tests, affected modules)
- Declare Execution Mode explicitly
- Estimate confidence level (target: >80%)
- Identify required tools and permissions

**AI-Specific:**
- Flag any assumptions requiring human validation
- List alternative approaches with trade-offs
- Document why chosen approach is optimal

### 3. Gate Verification
**Required Actions:**
- Enumerate applicable gates from selected Execution Mode
- Record any deferred gates to `/docs/TODO.md`
- Verify prerequisites (dependencies, environment, permissions)

**AI-Specific:**
- Check governance compliance against .blackboxrules
- Validate against docs/controls.yml requirements
- Confirm accessibility and security implications

### 4. Implementation Phase
**Required Actions:**
- Make small, atomic commits with conventional-commit messages
- Include inline rationale for non-obvious choices
- Follow established patterns from ai/patterns/
- Maintain code quality standards

**AI-Specific:**
- Use patterns from ai/patterns/ directory
- Follow naming conventions (kebab-case files, PascalCase classes, camelCase functions)
- Include JSDoc/TSDoc for public APIs
- Add error handling and validation

### 5. Verification Phase
**Required Actions:**
- Run unit tests, linters, and secret scans per Execution Mode
- Capture smoke runs or targeted tests (not full heavy suites unless required)
- Validate against performance budgets
- Check accessibility compliance

**AI-Specific:**
- Run `npm run controls:run` for governance validation
- Execute `npm run test:a11y` for accessibility
- Verify TypeScript strict mode compliance
- Check Nx boundary compliance

### 6. Documentation Phase
**Required Actions:**
- Update `docs/CHANGELOG.md` with changes
- Update `docs/TODO.md` for completed/incomplete tasks
- Update relevant README files
- Add ADR entries for architectural decisions

**AI-Specific:**
- Update ai/ai-learning/patterns.json with new patterns
- Document any novel approaches in ai/patterns/
- Include change rationale in commit messages

### 7. Self-Review Phase
**Required Actions:**
- Run checklist (security, accessibility, error paths, observability)
- Append results to PR description
- Flag any remaining concerns

**AI-Specific:**
- Review against AI governance boundaries
- Confirm no prohibited actions were taken
- Validate confidence level was maintained

### 8. Exit/Escalation Phase
**Required Actions:**
- If blocked, open draft PR with findings
- Label `blocked` and `requires-governance`
- Add `/docs/TODO.md` entry for follow-up

**AI-Specific:**
- Escalate when confidence <80%
- Flag political manipulation risks immediately
- Document any human judgment requirements

## Quality Gates by Mode

### Safe Mode Gates
- ✅ ESLint zero warnings
- ✅ TypeScript strict typecheck
- ✅ Unit & integration tests (80%+ coverage)
- ✅ Accessibility validation (WCAG 2.2 AA+)
- ✅ Security scanning (secrets, SAST)
- ✅ Documentation updates
- ✅ ADR creation for architectural changes

### Fast-Secure Mode Gates
- ✅ Critical security scanning
- ✅ Basic linting (no blocking errors)
- ✅ Core unit tests
- ✅ Deferred gates recorded in TODO.md

### Audit Mode Gates
- ✅ All Safe Mode gates
- ✅ Performance profiling
- ✅ Dependency vulnerability scan
- ✅ Full artefact capture
- ✅ Architectural review

### R&D Mode Gates
- ✅ Secret scanning
- ✅ Basic type checking
- ✅ Experimental marking
- ✅ No production deployment

## Error Handling & Recovery

### Common Issues
- **Low Confidence**: Escalate with detailed reasoning
- **Pattern Conflicts**: Document deviation rationale
- **Security Concerns**: Block implementation, flag immediately
- **Performance Issues**: Optimize or defer with TODO entry

### Recovery Actions
- **Revert Changes**: If critical issues found post-implementation
- **Partial Implementation**: Complete safe portions, defer risky parts
- **Human Escalation**: When AI cannot resolve conflicts
- **Documentation Updates**: Always update knowledge base with lessons

## Performance Optimization

### Caching Strategy
- Use ai-cache/ for frequent queries
- Implement semantic similarity matching
- Set appropriate TTL (1h for patterns, 24h for docs)
- Invalidate on rule updates

### Response Time Targets
- p50 <500ms for simple queries
- p95 <2s for complex generation
- Cache hit rate >80%

### Resource Management
- Limit concurrent operations
- Implement rate limiting
- Monitor memory usage
- Clean up temporary files

## Continuous Learning

### Pattern Updates
- Add successful approaches to ai/patterns/
- Update ai/ai-learning/patterns.json
- Document failure modes and recoveries
- Share learnings across AI instances

### Competence Monitoring
- Track success rates by operation type
- Monitor confidence vs. actual quality
- Identify improvement areas
- Update thresholds based on performance

## Emergency Procedures

### Security Incidents
1. Immediately halt all operations
2. Log incident details
3. Rotate any exposed credentials
4. Escalate to human governance team
5. Document in incident response plan

### Governance Violations
1. Cease current operation
2. Document violation details
3. Revert any non-compliant changes
4. Update controls and patterns
5. Require human review for resumption

### System Failures
1. Preserve current state
2. Log failure context
3. Attempt graceful degradation
4. Escalate with recovery options
5. Update monitoring and alerting

_Last updated: 2025-01-10_
_Version: 1.0.0_
