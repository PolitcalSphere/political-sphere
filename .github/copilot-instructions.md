# GitHub Copilot Instructions for Political Sphere

This file provides guidance to GitHub Copilot when working in the Political Sphere repository.

## Project Context

Political Sphere is a comprehensive political simulation and engagement platform with:

- **Multi-environment architecture**: Dev, staging, and production environments
- **Monorepo structure**: Using Nx for workspace management
- **Microservices**: API, frontend, worker, and infrastructure components
- **Infrastructure as Code**: Terraform and Kubernetes (Helm charts)
- **CI/CD**: Comprehensive GitHub Actions workflows
- **AI Enhancement Framework**: Standardized AI assistance patterns

## Code Standards

### General Practices

- Follow the existing code style in each application/library
- Use TypeScript for new Node.js code where possible
- Write comprehensive JSDoc comments for functions and classes
- Include error handling and input validation
- Follow the principle of least privilege for security

### Commit Messages

- Use Conventional Commits format: `type(scope): description`
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Examples:
  - `feat(api): add user authentication endpoint`
  - `fix(frontend): resolve null pointer in navigation`
  - `docs: update API documentation`

### Testing

- Write unit tests for new functions and classes
- Place tests in `tests/` directories adjacent to source code
- Use Jest for JavaScript/TypeScript testing
- Include integration tests for API endpoints
- Aim for meaningful test coverage, not just high percentages

### Security

- Never commit secrets, API keys, or credentials
- Use environment variables for configuration
- Sanitize all user inputs
- Follow OWASP security best practices
- Implement proper authentication and authorization
- Use prepared statements for database queries

### Documentation

- Update README.md files when adding new features
- Document API endpoints with examples
- Include architecture diagrams when relevant
- Keep the docs/ directory updated with significant changes
- Follow the documentation structure in `docs/`

## Architecture Guidelines

### API Layer (`apps/api/`)

- RESTful API design principles
- JWT-based authentication
- Rate limiting on endpoints
- Comprehensive error responses
- OpenAPI/Swagger documentation

### Frontend Layer (`apps/frontend/`, `apps/host/`, `apps/remote/`)

- Module federation for micro-frontends
- Responsive design principles
- Accessibility (WCAG 2.1 Level AA)
- Progressive enhancement
- Performance optimization (lazy loading, code splitting)

### Worker Layer (`apps/worker/`)

- Asynchronous job processing
- Idempotent operations
- Proper error handling and retries
- Monitoring and alerting integration

### Infrastructure (`apps/infrastructure/`, `libs/infrastructure/`)

- Infrastructure as Code with Terraform
- Kubernetes manifests for orchestration
- Environment-specific configurations
- Secrets management with Vault
- Resource tagging and cost management

## AI Assistance Best Practices

### When Suggesting Code

1. **Context First**: Consider the existing patterns in the codebase
2. **Security**: Always include security considerations
3. **Testing**: Suggest test cases along with implementation
4. **Documentation**: Include inline comments for complex logic
5. **Error Handling**: Include comprehensive error handling
6. **Performance**: Consider performance implications

### Code Review Focus Areas

- Security vulnerabilities
- Performance bottlenecks
- Code maintainability
- Test coverage
- Documentation completeness
- Compliance with project standards

### Refactoring Suggestions

- Maintain backward compatibility when possible
- Suggest incremental improvements
- Consider the impact on existing tests
- Document breaking changes clearly
- Follow the boy scout rule: leave code better than you found it

## Technology Stack

### Backend

- Node.js with Express.js
- PostgreSQL database
- Redis for caching
- JWT for authentication
- OpenTelemetry for observability

### Frontend

- React
- Webpack Module Federation
- Modern CSS (CSS Modules or styled-components)
- Responsive design patterns

### Infrastructure

- AWS (primary cloud provider)
- Kubernetes (EKS)
- Terraform for IaC
- Helm for Kubernetes package management
- ArgoCD for GitOps

### Development Tools

- Nx for monorepo management
- Jest for testing
- ESLint and Biome for linting
- Prettier for code formatting
- Husky for Git hooks

## Project-Specific Patterns

### Module Organization

```
apps/
  ├── api/           # Backend API service
  ├── frontend/      # Main frontend application
  ├── worker/        # Background job processor
  ├── host/          # Module federation host
  └── remote/        # Module federation remote

libs/
  ├── shared/        # Shared utilities and types
  ├── ui/            # Shared UI components
  └── infrastructure/ # Infrastructure modules
```

### Environment Configuration

- Use `.env.example` files as templates
- Environment-specific configs in `apps/dev/templates/`
- Never commit actual `.env` files
- Document all required environment variables

### Error Handling Pattern

```javascript
try {
  // Operation
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new CustomError('User-friendly message', { cause: error });
}
```

### Logging Pattern

```javascript
logger.info('Operation started', { userId, operation });
// ... operation
logger.info('Operation completed', { userId, operation, duration });
```

## Compliance and Governance

### EU AI Act Compliance

- Document AI usage in `apps/docs/eu-ai-act-compliance.md`
- Include risk assessments for AI features
- Maintain transparency in AI decisions
- Implement human oversight mechanisms

### Data Privacy

- GDPR compliance for EU users
- Data minimization principles
- User consent management
- Right to deletion implementation

### Audit Trail

- Log significant operations
- Maintain change history
- Document decision-making processes
- Regular security audits

## Common Tasks

### Adding a New API Endpoint

1. Define route in `apps/api/src/server.js`
2. Implement handler with validation
3. Add authentication/authorization checks
4. Write unit and integration tests
5. Update API documentation
6. Add monitoring/metrics

### Adding a New Feature Flag

1. Define flag in configuration
2. Implement feature toggle logic
3. Add metrics for feature usage
4. Document flag behavior
5. Plan for flag removal

### Database Migrations

1. Create migration script in `scripts/migrate/`
2. Test migration on development data
3. Include rollback procedure
4. Document breaking changes
5. Update schema documentation

## Questions or Clarifications

- Check `CONTRIBUTING.md` for contribution guidelines
- Review `README.md` for project setup
- See `apps/docs/` for detailed documentation
- Consult `.github/CODEOWNERS` for module ownership
- Check `apps/docs/ai-enhancement-framework.md` for AI usage guidelines
- Review `github/GITHUB_POLICY.md` for GitHub usage policies

## Remember

- **Security first**: Never compromise on security
- **Test thoroughly**: Quality over speed
- **Document clearly**: Code is read more than written
- **Think maintenance**: Code lives longer than you expect
- **Ask questions**: Better to clarify than assume

---

*This file guides AI assistants but doesn't replace human judgment. Always review AI suggestions critically.*
