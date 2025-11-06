# Political Sphere Custom Copilot Agents

This directory contains custom GitHub Copilot agents tailored to the Political Sphere project. These agents provide specialized expertise in different areas of the codebase.

## Available Agents

### 🏛️ [@governance-agent](./governance-agent.yml)
**Constitutional compliance and democratic principles**

Use when:
- Implementing voting or election features
- Making changes that affect democratic integrity
- Needing constitutional review
- Checking TGC (Technical Governance Council) compliance

Example queries:
```
@governance-agent "Is this voting algorithm constitutional?"
@governance-agent "Does this feature violate democratic principles?"
@governance-agent "Should this be escalated to the TGC?"
```

---

### 🔒 [@security-agent](./security-agent.yml)
**Security, GDPR, and DSA compliance**

Use when:
- Handling user data or authentication
- Implementing API endpoints
- Working with database queries
- Need GDPR/DSA compliance guidance

Example queries:
```
@security-agent "Is this query vulnerable to SQL injection?"
@security-agent "Does this meet GDPR data export requirements?"
@security-agent "How should I sanitize this user input?"
```

---

### 🏗️ [@architecture-agent](./architecture-agent.yml)
**Monorepo structure and module organization**

Use when:
- Adding new features or modules
- Unsure where code should live
- Checking for circular dependencies
- Planning architectural changes

Example queries:
```
@architecture-agent "Where should I put this new feature?"
@architecture-agent "Is this creating a circular dependency?"
@architecture-agent "Should this be in apps/ or libs/?"
```

---

### 🧪 [@testing-agent](./testing-agent.yml)
**Testing strategy and best practices**

Use when:
- Writing new tests
- Improving test coverage
- Testing React components
- Need accessibility test guidance

Example queries:
```
@testing-agent "How should I test this function?"
@testing-agent "What test cases am I missing?"
@testing-agent "How do I test this React component?"
```

---

### 🗄️ [@database-agent](./database-agent.yml)
**SQLite operations and schema management**

Use when:
- Writing database queries
- Creating migrations
- Optimizing database performance
- Need transaction guidance

Example queries:
```
@database-agent "How do I safely query this table?"
@database-agent "Is this vulnerable to SQL injection?"
@database-agent "How should I structure this migration?"
```

## How to Use

### In GitHub Copilot Chat (VS Code - Coming Soon)
```
@governance-agent "Check if this complies with our constitution"
@security-agent "Review this code for GDPR compliance"
@testing-agent "Suggest tests for this function"
```

### In GitHub Copilot CLI (Available Now)
```bash
gh copilot suggest --agent governance-agent "How should I implement ranked-choice voting?"
gh copilot explain --agent database-agent "EXPLAIN this SQL query"
```

### On GitHub.com (Available Now)
When commenting on PRs or issues, you can invoke agents:
```
@governance-agent Please review this voting logic for constitutional compliance
```

## Agent Capabilities

All agents have access to:
- ✅ Project documentation (docs/)
- ✅ Codebase context
- ✅ Configuration files
- ✅ Historical decisions (ADRs)
- ✅ GitHub Copilot instructions

Agents **cannot**:
- ❌ Execute code or commands
- ❌ Access external APIs directly
- ❌ Modify files (they provide guidance only)
- ❌ Access secrets or credentials

## Best Practices

1. **Ask specific questions**: "Is this SQL query safe from injection?" is better than "Check my code"

2. **Provide context**: Include relevant code snippets or file references

3. **Use the right agent**: Each agent specializes in different areas

4. **Combine agents**: Complex questions might need multiple perspectives
   ```
   @security-agent Check GDPR compliance
   @governance-agent Check constitutional compliance
   ```

5. **Reference documentation**: Agents work best when they can reference your docs

## Version History

- **v1.0.0** (2025-11-05): Initial release with 5 specialized agents
  - Governance Agent
  - Security Agent
  - Architecture Agent
  - Testing Agent
  - Database Agent

## Contributing

When updating agents:
1. Update the YAML file in this directory
2. Increment the version number
3. Document changes in this README
4. Test the agent with example queries
5. Update related documentation in docs/

## Future Agents (Planned)

- **@deployment-agent**: CI/CD, Docker, infrastructure
- **@performance-agent**: Optimization, profiling, monitoring
- **@accessibility-agent**: WCAG compliance, screen readers
- **@api-agent**: REST API design, OpenAPI specs

## Feedback

If an agent provides incorrect guidance or you have suggestions for improvement:
1. Open an issue with the `agent-feedback` label
2. Include the agent name and query
3. Describe the expected vs actual response

---

**Note**: Custom agents are a GitHub Copilot feature. Ensure you have access to GitHub Copilot and are using a compatible version of the CLI or IDE.
