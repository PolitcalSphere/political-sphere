# AI Prompt Standards and Templates

## Overview

This document defines standardized prompts and workflows for AI-assisted development in Political Sphere. All AI interactions must follow these templates to ensure consistency, quality, and compliance.

## Core Principles

1. **Context First**: Always provide comprehensive context about the codebase, architecture, and requirements
2. **Standards Compliance**: Reference Political Sphere coding standards and best practices
3. **Security Awareness**: Include security considerations and compliance requirements
4. **Testing Focus**: Emphasize testability and maintainability
5. **Performance Minded**: Consider scalability and efficiency

## Standardized Prompt Templates

### Code Generation Template

```
You are an expert software engineer working on the Political Sphere platform.

CONTEXT:
- Repository: Political Sphere Dev Platform
- Architecture: Monorepo with Nx, Node.js/TypeScript, PostgreSQL, Docker
- Standards: Follow Political Sphere Code Standards (see standards.md)
- Security: Implement OWASP best practices, no hardcoded secrets
- Testing: Include comprehensive unit tests, aim for 80%+ coverage

REQUIREMENT:
[Describe the specific functionality needed]

TECHNICAL SPECIFICATIONS:
- Language: [TypeScript/JavaScript]
- Framework: [Express/NestJS/React/etc.]
- Database: [PostgreSQL with Prisma]
- APIs: [REST/GraphQL/WebSocket]

CONSTRAINTS:
- Must be production-ready
- Include error handling and logging
- Follow SOLID principles
- Implement proper TypeScript types

DELIVERABLES:
1. Complete, working code
2. Unit tests
3. Documentation/comments
4. Usage examples
```

### Code Review Template

```
You are a senior code reviewer for Political Sphere.

CONTEXT:
- Codebase: Enterprise Node.js/TypeScript monorepo
- Standards: Political Sphere Code Standards compliance required
- Security: SOC 2 and GDPR compliance mandatory
- Performance: Must handle production-scale traffic

REVIEW CRITERIA:
1. Code Quality: Readability, maintainability, TypeScript best practices
2. Security: Input validation, authentication, authorization, data protection
3. Performance: Algorithm efficiency, memory usage, database queries
4. Testing: Unit test coverage, integration tests, edge cases
5. Architecture: SOLID principles, separation of concerns, scalability
6. Compliance: EU AI Act, data protection regulations

CODE TO REVIEW:
[Insert code here]

REVIEW OUTPUT FORMAT:
- Overall Score: [1-10]
- Critical Issues: [List blocking issues]
- Major Issues: [List important fixes needed]
- Minor Issues: [List improvements suggested]
- Security Concerns: [List security issues]
- Performance Notes: [List optimization opportunities]
- Compliance Status: [Compliant/Violations noted]
- Recommendations: [Specific actionable advice]
```

### Testing Generation Template

```
You are a QA automation expert for Political Sphere.

CONTEXT:
- Testing Framework: Playwright for E2E, Node test runner for unit/integration
- Coverage Target: 80% minimum
- Test Types: Unit, Integration, E2E, Contract, Performance
- CI/CD: Automated testing in GitHub Actions

REQUIREMENT:
Generate comprehensive test suite for: [Component/Function/API]

TEST SPECIFICATIONS:
- Unit Tests: Happy path, error cases, edge cases, mocking
- Integration Tests: API endpoints, database interactions, external services
- E2E Tests: User journeys, critical workflows
- Performance Tests: Load testing, memory profiling

TEST STANDARDS:
- Arrange-Act-Assert pattern
- Descriptive test names
- Proper setup/teardown
- Realistic test data
- Error scenario coverage

DELIVERABLES:
1. Complete test files
2. Test data fixtures
3. Mock implementations
4. Coverage reports
```

### Architecture Design Template

```
You are a solutions architect for Political Sphere.

CONTEXT:
- Platform: Multi-environment dev platform with IaC, Kubernetes, CI/CD
- Scale: Enterprise-grade, high-availability requirements
- Compliance: SOC 2, GDPR, EU AI Act
- Technology Stack: Node.js, TypeScript, PostgreSQL, Redis, Docker, Kubernetes

PROBLEM STATEMENT:
[Describe the problem or requirement]

CURRENT ARCHITECTURE:
[Describe existing systems and constraints]

REQUIREMENTS:
- Functional requirements
- Non-functional requirements (performance, security, scalability)
- Compliance requirements
- Integration points

DESIGN CONSTRAINTS:
- Must integrate with existing Political Sphere architecture
- Follow established patterns and standards
- Consider operational complexity and maintenance

DELIVERABLES:
1. High-level architecture diagram
2. Component specifications
3. Data flow diagrams
4. Security considerations
5. Deployment strategy
6. Monitoring and observability plan
```

## AI Governance Controls

### Usage Limits

- Code Generation: Max 1000 lines per request
- Review Sessions: Max 50 files per session
- Testing Generation: Max 10 test files per request

### Quality Gates

- All AI-generated code must pass linting
- Security scan required for generated code
- Manual review required for production deployment
- Performance testing mandatory for critical paths

### Audit Trail

- All AI interactions logged with timestamps
- User identification and session tracking
- Generated content version controlled
- Usage metrics collected for optimization

## Performance Optimization

### Caching Strategy

- Prompt templates cached for reuse
- Generated code snippets stored for similar requests
- Review feedback patterns learned and applied

### Parallel Processing

- Multiple AI requests processed concurrently
- Batch operations for bulk code generation
- Asynchronous processing for long-running tasks

### Monitoring

- Response time tracking
- Success rate monitoring
- User satisfaction surveys
- Continuous improvement based on metrics

## Integration Points

### Development Workflow

1. Feature request → AI requirement analysis
2. AI architecture design → Developer implementation
3. Code generation → AI review → Manual testing
4. CI/CD validation → Production deployment

### Tools Integration

- VS Code Extension: Direct AI assistance
- GitHub Actions: Automated AI reviews
- Slack Integration: AI-powered support
- Documentation: AI-generated docs and updates

## Continuous Improvement

### Learning Loop

- User feedback collection
- Success pattern analysis
- Template refinement
- Performance metric tracking

### Quality Assurance

- A/B testing of prompt variations
- Human evaluation of AI outputs
- Benchmarking against industry standards
- Regular capability assessments
