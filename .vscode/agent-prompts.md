# Agent wrapper prompts (VS Code)

These lightweight prompts are intended to be prepended by automated agents (Copilot/Blackbox/etc.) when constructing or sending multi-turn prompts from within VS Code. They are intentionally short, machine-friendly, and designed to help enforce governance and traceability.

## 1. Safety prefix (must be prepended unless explicitly overridden)

"Act in Safe mode unless explicitly instructed otherwise; obey change budgets; never add deps without ADR; redact secrets."

- **Purpose**: Force a conservative default execution posture.
- **Behavioural requirements**: If the agent is asked to switch modes, it must include an explicit justification and the requested Execution Mode in the `AI-EXECUTION` header of the output.
- **Risk Mitigation**: Prevents unauthorized dependency additions and ensures secret handling compliance.

## 2. Output contract (agents must follow this structure in their reply)

"Return: plan → minimal diff → tests → risks → rollback. Include AI-EXECUTION header, list deferred gates."

- **Purpose**: Enforce a predictable, machine-parseable response shape so reviewers and automation can validate outputs and extract metadata automatically.
- **Expectations**:
  - **plan**: 1–3 bullet summary of what will change
  - **minimal diff**: unified-diff or file/line list (minimal surface area)
  - **tests**: short list of new/updated tests and how to run them
  - **risks**: 2-3 likely risks or security/privacy concerns
  - **rollback**: one-line rollback guidance
  - **AI-EXECUTION header**: must list mode, controls, and any deferred gates (see governance rules)
- **Risk Mitigation**: Structured output prevents incomplete or ambiguous responses that could lead to security oversights.

## 3. Political neutrality check (apply when content touches politics / policy UX)

"If content touches politics/policy UX, run neutrality checklist + bias note; otherwise block & escalate."

- **Purpose**: Enforce political neutrality guardrails for political simulation features and UX.
- **Behaviour**:
  - The agent must detect if the change touches policy, political content, or user-facing political UX.
  - If it does, the agent must run a neutrality checklist (brief list of checks) and include a short `bias note` describing any remaining risk or mitigation.
  - If neutrality cannot be reasonably assessed automatically, the agent must block the change and escalate to human reviewers (add an entry to `/docs/TODO.md` with owner and due date).
- **Risk Mitigation**: Prevents political manipulation and ensures fair representation in simulation content.

## Detailed Neutrality Checklist (Level 4 Enhancement)

When political content is detected, agents must evaluate:

1. **Demographic Targeting**: Is content targeted at a demographic group? If yes, justify and limit impact.
2. **Persuasive Framing**: Does content use persuasive language or framing? If yes, propose neutral alternatives.
3. **Verifiability**: Are claims verifiable or clearly labeled as simulation/fictive? If not, add provenance labels.
4. **Manipulation Risk**: Does content enable or encourage persuasion/manipulation? If yes, require governance review.
5. **Bias Assessment**: Could content be interpreted as biased toward political ideologies? Include mitigation strategies.

**Example Implementation**:

```
Neutrality Check Results:
- Demographic targeting: None detected
- Persuasive framing: Minimal, using neutral language
- Verifiability: All claims labeled as simulation data
- Manipulation risk: Low, educational content only
- Bias assessment: Balanced representation maintained

Bias Note: Content maintains political neutrality through balanced framing and clear simulation labeling.
```

## Usage guidance

- These prompts are intentionally short so they can be programmatically prepended by tooling. Put them at the top of the prompt body when invoking an assistant for code changes.
- For convenience, use the snippets file `.vscode/agent-prompts.code-snippets` to insert any of the three blocks quickly in VS Code.

## File hygiene (Level 4 Enhancement)

- **Agents must close any files they open in the editor after finishing edits**. This includes closing buffers/tabs or calling the editor's API to release the handle. Add a short record of files modified to the PR when relevant (or log them in the action output) to aid auditability and avoid leaving sensitive artifacts open.
- **VS Code setting "blackboxai.closeFilesAfterEdit": true is enabled** to automatically close files after edits.
- **File closure is mandatory** after any edit operation to prevent leaving sensitive artifacts open and maintain workspace cleanliness.
- **Risk Mitigation**: Prevents accidental exposure of sensitive code or configuration data.

## Tool usage (Level 4 Enhancement)

- Agents must identify and use the appropriate available tools for the task (for example: workspace search, semantic search, `read_file`, `grep_search`, `file_search`, `run_in_terminal`/`run_task`, test runners, linters, `tools/scripts/ai/guard-change-budget.mjs`, AI indexers). Use the smallest set of tools that fully cover the work and prefer programmatic tool use over manual guesses.

- If a required tool is unavailable or fails (for example, network-restricted CI, missing local binary, or permission error), the agent must:
  1. Document the failure and the reason in the PR description and agent logs.
  2. Add a `/docs/TODO.md` entry with owner and due date to ensure the missing tool or environment is provisioned before merging.

**Rationale**: explicit tool invocation improves reproducibility, reduces guesswork, and helps agents learn to rely on consistent automation and verification steps.

## Accessibility & Documentation (Level 4 Enhancement)

This configuration supports WCAG 2.2 AA+ compliance through:

- **Keyboard Navigation**: Full keyboard access to all features
- **Screen Reader Support**: Semantic markup and ARIA labels
- **High Contrast**: Configurable themes meeting contrast ratios
- **Reduced Motion**: Respects user motion preferences
- **Focus Management**: Clear focus indicators and logical tab order

## Troubleshooting Guide

### Common Issues

1. **Extension Conflicts**: Run "Test: Extension Compatibility" task
2. **Performance Issues**: Check "Monitor: VSCode Health" task output
3. **Security Warnings**: Use "Audit: Security Settings" task
4. **Configuration Validation**: Run "Validate: VSCode Config" task

### Performance Optimization

- Keep `typescript.tsserver.log` at "verbose" only for debugging
- Use file watching exclusions to reduce CPU usage
- Enable GPU acceleration for better rendering
- Monitor memory usage with health tasks

### Security Best Practices

- Never commit sensitive data in configuration files
- Use workspace trust for untrusted repositories
- Keep extensions updated for security patches
- Review AI suggestions for potential security issues

## Change Log

- **2025-01-01**: Initial comprehensive documentation
- **2025-01-15**: Added detailed neutrality checklist (Level 4)
- **2025-01-20**: Enhanced file hygiene and tool usage guidelines
- **2025-01-25**: Added accessibility and troubleshooting sections

Auditability note

- Agents must still include CHANGELOG/TODO updates per the repository Meta-Rule when they modify governance files or rule-influencing behaviours.
- Keep these wrapper prompts stable and small — change them only by updating both `.vscode/agent-prompts.md` and the corresponding snippet file to maintain parity.
