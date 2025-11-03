# Architecture Overview for AI Assistants

## Overview
Political Sphere is a democratically-governed multiplayer political simulation game built as a monorepo using Nx. This document provides AI assistants with the essential architectural knowledge needed for effective collaboration.

## Core Architecture Principles

### Monorepo Structure
- **Nx Workspace**: All projects managed in single repository
- **Module Federation**: Frontend applications share modules dynamically
- **Strict Boundaries**: Import rules enforced between apps/libs
- **Shared Libraries**: Common code extracted to `/libs` directory

### Technology Stack
```
Frontend: React + TypeScript + Tailwind CSS + Module Federation
Backend:  Node.js + NestJS + TypeScript + REST APIs
Database: SQLite/PostgreSQL with Prisma ORM
Infrastructure: Docker + Kubernetes + Terraform
CI/CD: GitHub Actions + Security Scanning + SLSA Provenance
Testing: Jest + Playwright + Accessibility Testing
AI: Custom assistants with governance boundaries
```

## Directory Structure (Critical for Navigation)

### Applications (`/apps`)
```
apps/
├── api/           # NestJS REST API server
├── frontend/      # React SPA with Module Federation
├── worker/        # Background job processing
├── dev/           # Development tools and services
├── docs/          # Documentation site
├── infrastructure/# Infrastructure as Code
└── remote/        # Module Federation remotes
```

### Libraries (`/libs`)
```
libs/
├── shared/        # Core utilities (logger, types, validation)
├── ui/            # React components and design system
├── platform/      # Business logic and domain models
├── ci/            # CI/CD utilities and scripts
└── infrastructure/# Infrastructure utilities
```

### AI Knowledge Base (`/ai`)
```
ai/
├── ai-knowledge/  # This documentation directory
├── ai-index/      # Codebase search index
├── ai-learning/   # Learned patterns and metrics
├── ai-metrics/    # Performance and quality metrics
├── patterns/      # Reusable code patterns
└── prompts/       # AI prompt templates
```

### Documentation (`/docs`)
```
docs/
├── architecture/  # ADRs and architectural decisions
├── controls.yml   # Governance controls
├── TODO.md        # Single source of truth for tasks
├── SECURITY.md    # Security guidelines
└── CONTRIBUTING.md# Development workflow
```

## Key Architectural Patterns

### 1. Module Federation
- **Host Application**: `apps/frontend` loads remote modules
- **Remote Modules**: `apps/remote/*` expose components
- **Shared Dependencies**: Common libraries loaded once
- **Dynamic Loading**: Modules loaded on-demand

### 2. API Architecture
- **NestJS Controllers**: RESTful endpoints with validation
- **Prisma ORM**: Type-safe database access
- **Result<T,E> Pattern**: Consistent error handling
- **OpenAPI/Swagger**: API documentation generation

### 3. State Management
- **Local State**: React hooks for component state
- **Server State**: React Query for API state
- **Global State**: Context API for app-wide state (minimal)
- **Persistence**: Local storage with encryption

### 4. Security Architecture
- **Zero-Trust**: All requests authenticated and authorized
- **Input Validation**: Zod schemas for all inputs
- **Rate Limiting**: API protection against abuse
- **Audit Logging**: All security events logged
- **CSP Headers**: Content Security Policy enforcement

### 5. Testing Strategy
- **Unit Tests**: Jest with 80%+ coverage
- **Integration Tests**: API and service interactions
- **E2E Tests**: Playwright for critical user journeys
- **Accessibility Tests**: Automated WCAG validation
- **Performance Tests**: k6 smoke tests with budgets

## Data Flow Patterns

### API Request Flow
```
Client Request → Validation (Zod) → Controller → Service → Repository → Database
                      ↓
                Error Handling (Result<T,E>)
                      ↓
                Logging (Structured JSON)
                      ↓
                Response (Typed)
```

### Component Data Flow
```
User Interaction → Event Handler → API Call (React Query) → Loading State
                       ↓
                 Success: Update UI
                       ↓
                 Error: Show Error Message + Retry Option
```

### Background Job Flow
```
Trigger → Queue (Redis/Bull) → Worker → Processing → Result Storage
     ↓                                        ↓
Logging                                Notification/Webhook
```

## Critical Files for AI Reference

### Configuration Files
- `nx.json`: Monorepo configuration and task running
- `package.json`: Dependencies and scripts
- `tsconfig.base.json`: TypeScript configuration
- `jest.preset.cjs`: Testing configuration
- `.blackboxrules`: AI governance rules

### Governance Files
- `docs/controls.yml`: Machine-checkable controls
- `docs/TODO.md`: Task tracking
- `.lefthook.yml`: Git hooks configuration
- `.github/workflows/`: CI/CD pipelines

### Domain Files
- `libs/shared/src/types/`: Core type definitions
- `libs/platform/src/models/`: Domain models
- `apps/api/src/controllers/`: API endpoints
- `libs/ui/src/components/`: UI components

## Development Workflow Integration

### AI-Assisted Development
1. **Context Loading**: Read project-context.md and relevant docs
2. **Pattern Matching**: Check ai/patterns/ for established approaches
3. **Governance Check**: Validate against governance-checklist.md
4. **Implementation**: Follow development-workflow.md
5. **Verification**: Run controls and tests per execution mode

### Code Generation Guidelines
- **Import Boundaries**: Respect Nx module boundaries
- **Type Safety**: Strict TypeScript, no `any` types
- **Error Handling**: Result<T,E> pattern consistently
- **Testing**: Tests written alongside implementation
- **Documentation**: JSDoc/TSDoc for public APIs

## Performance Considerations

### Frontend
- **Bundle Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Components loaded on-demand
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Service worker for static assets
- **CDN**: Static assets served from CDN

### Backend
- **Connection Pooling**: Database connection optimization
- **Caching**: Redis for frequently accessed data
- **Rate Limiting**: API protection and fair usage
- **Background Jobs**: Long-running tasks offloaded
- **Monitoring**: OpenTelemetry instrumentation

### Database
- **Indexing**: Proper indexes for query performance
- **Pagination**: Cursor-based pagination for large datasets
- **Connection Limits**: Prevent connection pool exhaustion
- **Query Optimization**: N+1 query prevention
- **Backup Strategy**: Automated backups with retention

## Deployment Architecture

### Development
- **Local Development**: Docker Compose for full stack
- **Hot Reload**: Frontend and backend hot reloading
- **Database**: Local SQLite with migrations
- **Debugging**: VS Code debugger integration

### Staging
- **Infrastructure**: Kubernetes cluster
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis cluster
- **Monitoring**: Full observability stack

### Production
- **High Availability**: Multi-zone deployment
- **Auto-scaling**: Horizontal pod autoscaling
- **Disaster Recovery**: Multi-region failover
- **Security**: Network policies and secrets management
- **Performance**: CDN and edge caching

## Security Boundaries

### Network Security
- **API Gateway**: Centralized request routing and authentication
- **CORS Policy**: Strict cross-origin request policies
- **Rate Limiting**: Distributed rate limiting
- **WAF**: Web Application Firewall protection

### Data Security
- **Encryption**: Data encrypted at rest and in transit
- **Access Control**: Role-based access control (RBAC)
- **Audit Logging**: All data access logged
- **Data Minimization**: Only collect necessary data
- **Retention Policies**: Automated data cleanup

### Application Security
- **Input Validation**: All inputs validated and sanitized
- **Authentication**: JWT with refresh token rotation
- **Authorization**: Permission-based access control
- **Session Management**: Secure session handling
- **Error Handling**: No sensitive information in errors

## Monitoring & Observability

### Application Metrics
- **Response Times**: p50, p95, p99 latency tracking
- **Error Rates**: Application and API error monitoring
- **Throughput**: Requests per second tracking
- **Resource Usage**: CPU, memory, disk monitoring

### Business Metrics
- **User Engagement**: Session duration, feature usage
- **Conversion Rates**: Goal completion tracking
- **Performance Budgets**: Core Web Vitals monitoring
- **Accessibility Scores**: Automated accessibility auditing

### Infrastructure Monitoring
- **System Health**: Service availability and responsiveness
- **Resource Utilization**: Infrastructure capacity planning
- **Security Events**: Threat detection and alerting
- **Compliance Monitoring**: Regulatory requirement tracking

## Scaling Strategy

### Horizontal Scaling
- **Stateless Services**: All services horizontally scalable
- **Load Balancing**: Request distribution across instances
- **Session Storage**: External session storage (Redis)
- **Database Scaling**: Read replicas and sharding

### Vertical Scaling
- **Resource Allocation**: CPU and memory optimization
- **Database Optimization**: Query optimization and indexing
- **Caching Strategy**: Multi-level caching implementation
- **CDN Integration**: Global content delivery

### Operational Scaling
- **Auto-scaling**: Kubernetes HPA configuration
- **Capacity Planning**: Resource usage forecasting
- **Performance Testing**: Load testing and bottleneck identification
- **Cost Optimization**: Resource usage optimization

## Disaster Recovery

### Backup Strategy
- **Database Backups**: Automated daily backups with 30-day retention
- **File Backups**: Static assets and user uploads
- **Configuration Backups**: Infrastructure as Code versioning
- **Log Archiving**: Structured log retention and archiving

### Recovery Procedures
- **RTO/RPO Targets**: 4-hour recovery time, 1-hour data loss maximum
- **Failover Process**: Automated failover to backup region
- **Data Restoration**: Point-in-time recovery capability
- **Service Restoration**: Blue-green deployment for updates

### Business Continuity
- **Communication Plan**: Stakeholder notification procedures
- **Alternative Workspaces**: Backup development environments
- **Vendor Dependencies**: Third-party service redundancy
- **Regulatory Compliance**: Incident reporting requirements

## Compliance Requirements

### Accessibility (WCAG 2.2 AA+)
- **Perceivable**: Text alternatives, captions, adaptable layout
- **Operable**: Keyboard navigation, timing controls, seizures
- **Understandable**: Readable text, predictable navigation, input assistance
- **Robust**: Compatible with current and future tools

### Privacy (GDPR/CCPA)
- **Data Minimization**: Collect only necessary data
- **Consent Management**: Clear consent for data processing
- **Data Subject Rights**: Access, deletion, portability, objection
- **Breach Notification**: 72-hour breach reporting requirement

### Security (ISO 27001)
- **Information Security**: Confidentiality, integrity, availability
- **Risk Management**: Threat identification and mitigation
- **Access Control**: Authentication and authorization
- **Incident Response**: Security incident handling procedures

## AI Integration Points

### Development Assistance
- **Code Review**: Automated code quality and security checks
- **Documentation**: API documentation generation
- **Testing**: Test case generation and execution
- **Performance**: Bottleneck identification and optimization

### Governance Enforcement
- **Policy Compliance**: Automated governance rule checking
- **Security Scanning**: Vulnerability detection and remediation
- **Accessibility Validation**: WCAG compliance verification
- **Quality Gates**: Automated quality assurance

### Learning & Improvement
- **Pattern Recognition**: Successful pattern identification
- **Failure Analysis**: Error pattern detection and prevention
- **Performance Tracking**: AI performance and accuracy monitoring
- **Continuous Learning**: Model improvement through usage data

---

This architecture overview provides the foundation for AI assistants to understand and effectively contribute to Political Sphere. All implementations must align with these architectural principles and governance requirements.

_Last updated: 2025-01-10_
_Version: 1.0.0_
