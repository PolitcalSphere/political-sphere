# AI Quick Reference Guide

## Essential Commands & Scripts

### Development
```bash
npm run dev:all          # Start all services
npm run dev:api          # Start API server
npm run dev:frontend     # Start frontend
npm run build            # Build all projects
npm run typecheck        # TypeScript validation
```

### Quality & Testing
```bash
npm run lint             # ESLint checking
npm run test             # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:a11y        # Accessibility tests
npm run controls:run     # Governance controls
```

### AI Assistance
```bash
npm run ai:review        # AI code review
npm run ai:blackbox      # Governance compliance
npm run ai:performance   # Performance analysis
```

## File Structure Quick Reference

### Find Files Quickly
```
apps/api/src/controllers/     # API endpoints
apps/frontend/src/components/ # React components
libs/shared/src/types/        # Core types
libs/ui/src/components/       # UI components
docs/architecture/            # ADRs
ai/patterns/                  # Code patterns
```

### Configuration Files
```
nx.json                       # Monorepo config
package.json                  # Dependencies
tsconfig.base.json           # TypeScript
.blackboxrules               # AI governance
docs/controls.yml            # Controls
```

## Common Patterns

### Error Handling
```typescript
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

function handleResult<T>(result: Result<T, Error>) {
  if (!result.success) {
    logger.error('Operation failed', { error: result.error });
    return;
  }
  // Use result.data
}
```

### API Controller
```typescript
@Post('users')
async createUser(@Body() data: CreateUserDto) {
  const result = await this.userService.create(data);
  if (!result.success) {
    throw new BadRequestException(result.error.message);
  }
  return result.data;
}
```

### React Component
```typescript
export const UserForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUser>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} role="form">
      <input {...register('name')} aria-describedby={errors.name ? 'name-error' : undefined} />
      {errors.name && <span id="name-error" role="alert">{errors.name.message}</span>}
    </form>
  );
};
```

### Validation Schema
```typescript
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;
```

## Naming Conventions

### Files & Directories
- `kebab-case`: `user-management.ts`, `api-client/`
- `PascalCase`: `UserProfile.tsx`, `ApiService`
- `camelCase`: `getUserProfile`, `apiClient`

### TypeScript
- Interfaces: `IUser`, `IApiResponse`
- Types: `TUserData`, `TApiError`
- Enums: `UserRole`, `HttpStatus`

## Import Rules (Nx Boundaries)

### Allowed Imports
```typescript
// ✅ Shared utilities
import { logger } from '@libs/shared/logger';

// ✅ UI components in apps
import { Button } from '@libs/ui/components';

// ✅ Platform logic in API
import { UserService } from '@libs/platform/services';
```

### Forbidden Imports
```typescript
// ❌ UI in API
import { Button } from '@libs/ui/components';

// ❌ Platform in frontend
import { UserService } from '@libs/platform/services';

// ❌ Direct external imports
import * as fs from 'fs'; // Use platform abstractions
```

## Testing Patterns

### Unit Test
```typescript
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(mockRepository);
  });

  it('should create user', async () => {
    const result = await service.create(validData);
    expect(result.success).toBe(true);
  });
});
```

### Integration Test
```typescript
describe('User API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('should create user via API', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send(validUserData)
      .expect(201);
  });
});
```

## Logging Standards

### Structured Logging
```typescript
logger.info('User created', {
  userId: user.id,
  email: user.email,
  operation: 'user.create',
  correlationId: generateId(),
  duration: Date.now() - startTime
});
```

### Error Logging
```typescript
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  operation: 'db.connect',
  metadata: { host, port }
});
```

## Security Checklist

### API Security
- [ ] Input validation with Zod
- [ ] Authentication middleware
- [ ] Rate limiting applied
- [ ] CORS properly configured
- [ ] No sensitive data in logs

### Frontend Security
- [ ] XSS prevention (sanitize inputs)
- [ ] CSP headers configured
- [ ] Secure cookie settings
- [ ] No secrets in client code

### Database Security
- [ ] Parameterized queries only
- [ ] Least privilege access
- [ ] Data encryption at rest
- [ ] Audit logging enabled

## Performance Budgets

### API Targets
- p95 response time: <200ms
- Error rate: <1%
- Throughput: >100 RPS

### Frontend Targets
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1

### Bundle Size
- Main bundle: <500KB gzipped
- Vendor bundle: <300KB gzipped
- Total JS: <1MB gzipped

## Accessibility Requirements

### WCAG 2.2 AA Compliance
- Color contrast: 4.5:1 minimum
- Focus indicators: Visible and obvious
- Keyboard navigation: All interactive elements
- Screen reader support: ARIA labels complete
- Touch targets: 44px minimum

### Implementation
```typescript
// Accessible button
<button
  type="button"
  disabled={loading}
  aria-describedby="button-status"
  aria-pressed={active}
>
  {loading ? 'Loading...' : 'Submit'}
</button>
<div id="button-status" aria-live="polite">
  {loading && 'Processing request'}
</div>
```

## Git Workflow

### Commit Messages
```
feat: add user authentication
fix: resolve memory leak in user service
docs: update API documentation
refactor: extract validation logic
test: add integration tests for user API
```

### Branch Naming
```
feature/user-authentication
bugfix/memory-leak-fix
hotfix/security-patch
```

### PR Requirements
- [ ] Tests pass (unit, integration, e2e)
- [ ] Lint passes (ESLint, accessibility)
- [ ] Security scan passes
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] ADR created for architectural changes

## Emergency Contacts

### Security Incidents
- Report to: security@politicalsphere.org
- Response time: <1 hour for critical
- Incident response plan: docs/INCIDENT-RESPONSE-PLAN.md

### System Outages
- Status page: status.politicalsphere.org
- Alert channel: #incidents Slack
- On-call rotation: PagerDuty

### Governance Issues
- Technical Governance Committee
- Email: governance@politicalsphere.org
- Meeting: Weekly governance sync

## Useful Links

- [Architecture Decisions](docs/architecture/)
- [API Documentation](docs/api.md)
- [Contributing Guide](docs/contributing.md)
- [Security Guidelines](docs/SECURITY.md)
- [Performance Budgets](apps/*/budgets.json)

---

**Remember**: When in doubt, check the governance checklist and escalate to human review for critical decisions.

_Last updated: 2025-01-10_
_Version: 1.0.0_
