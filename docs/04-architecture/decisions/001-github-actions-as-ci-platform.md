# 001. GitHub Actions as CI Platform

Date: 2025-11-05  
Status: Accepted  
Deciders: Platform Engineering Team, Engineering Leadership  
Technical Story: Foundation for CI/CD infrastructure

## Context and Problem Statement

We need a CI/CD platform that supports our democratic governance simulation project with secure, scalable, and maintainable automation. The platform must integrate with our GitHub-based development workflow while providing enterprise-grade security and compliance features.

Key question: Which CI/CD platform best serves our needs for security, developer experience, and operational efficiency?

## Decision Drivers

- **Security**: Must support OIDC, secrets management, and comprehensive scanning
- **Integration**: Native GitHub integration for PR workflows and status checks
- **Cost**: Sustainable cost model for open-source/civic tech project
- **Developer Experience**: Fast feedback loops, clear error messages, local testing capability
- **Scalability**: Handle parallel workflows, matrix builds, and growing test suite
- **Compliance**: Audit trails, access controls, and tamper-evident logs
- **Ecosystem**: Rich marketplace of actions and integrations
- **Maintenance**: Minimal operational overhead for platform management

## Considered Options

- **Option 1**: GitHub Actions
- **Option 2**: GitLab CI/CD (would require GitLab migration)
- **Option 3**: Jenkins (self-hosted)
- **Option 4**: CircleCI
- **Option 5**: Azure DevOps Pipelines

## Decision Outcome

Chosen option: "GitHub Actions", because it provides the best balance of security, developer experience, and operational efficiency while maintaining zero infrastructure overhead.

### Positive Consequences

- **Native Integration**: Seamless GitHub integration (no context switching)
- **Zero Infrastructure**: No servers to maintain or secure
- **Rich Ecosystem**: 10,000+ actions in GitHub Marketplace
- **Built-in Security**: OIDC, code scanning, secret scanning, Dependabot
- **Familiar YAML**: Developers already know the syntax
- **Free Tier**: Generous free tier for public repositories
- **Audit Trail**: All workflow runs logged and searchable
- **Fast Feedback**: Parallel jobs, matrix builds, caching strategies
- **Compliance Ready**: SOC 2, ISO 27001 certified infrastructure

### Negative Consequences

- **Vendor Lock-in**: Tightly coupled to GitHub ecosystem
- **Runner Limitations**: Limited control over runner environment
- **Cost Scaling**: Can become expensive at scale (though mitigated by free tier)
- **Debugging**: Harder to debug complex workflow issues locally
- **Learning Curve**: Action composition requires YAML expertise

## Pros and Cons of the Options

### GitHub Actions

- Good, because native GitHub integration reduces context switching
- Good, because zero infrastructure to maintain
- Good, because built-in security features (OIDC, scanning, secrets)
- Good, because rich ecosystem of reusable actions
- Good, because excellent documentation and community support
- Bad, because potential vendor lock-in
- Bad, because debugging complex workflows can be challenging
- Bad, because costs can scale with usage (mitigated by caching)

### GitLab CI/CD

- Good, because powerful pipeline syntax with includes and templates
- Good, because can self-host for complete control
- Good, because integrated DevSecOps features
- Bad, because requires migration from GitHub
- Bad, because loss of GitHub-specific integrations
- Bad, because operational overhead of maintaining GitLab instance
- Bad, because smaller ecosystem compared to GitHub Actions

### Jenkins

- Good, because maximum flexibility and customization
- Good, because proven at scale in enterprise environments
- Good, because large plugin ecosystem
- Bad, because significant operational overhead (servers, updates, security)
- Bad, because steeper learning curve
- Bad, because infrastructure costs and maintenance burden
- Bad, because security vulnerabilities in plugins are common
- Bad, because poor developer experience compared to cloud-native solutions

### CircleCI

- Good, because fast build times and efficient caching
- Good, because good Docker support
- Good, because SSH debugging capabilities
- Bad, because separate platform from code repository
- Bad, because additional cost for another service
- Bad, because context switching between GitHub and CircleCI
- Bad, because less integrated with GitHub security features

### Azure DevOps Pipelines

- Good, because powerful pipeline features
- Good, because excellent Azure integration
- Good, because free tier for open source
- Bad, because separate platform requiring context switching
- Bad, because less familiar to developers
- Bad, because smaller ecosystem compared to GitHub Actions
- Bad, because overkill for projects not heavily using Azure

## Implementation Notes

### Migration Strategy

1. ✅ Set up GitHub Actions workflows (completed)
2. ✅ Configure OIDC for AWS authentication (completed)
3. ✅ Implement parallel test sharding (completed)
4. ✅ Add comprehensive security scanning (completed)
5. ✅ Create reusable composite actions (completed)
6. 🟡 Document all workflows with ADRs (in progress)
7. 🟡 Implement SLO monitoring (in progress)

### Key Workflows Implemented

- **CI Pipeline**: Lint, test, build with parallel execution
- **Security**: Multi-layer scanning (Semgrep, Trivy, OWASP, Snyk)
- **Deployment**: Canary deployments with OIDC auth
- **Quality Gates**: Pre-flight checks, boundary validation
- **Automation**: Dependabot, Renovate for dependency management

## Monitoring and Success Criteria

- ✅ CI run success rate ≥ 95%
- ✅ Average build time < 10 minutes (P50)
- ✅ Zero security incidents from CI/CD pipeline
- ✅ Developer satisfaction score ≥ 4.0/5.0
- 🟡 Onboarding time < 30 minutes (target)
- ✅ 100% of PRs have automated checks

## Links

- Refined by [ADR-002](002-parallel-test-sharding.md) - Test execution strategy
- Refined by [ADR-003](003-composite-actions-for-reusability.md) - Action organization
- Refined by [ADR-005](005-multi-layer-security-scanning.md) - Security approach
- Refined by [ADR-006](006-oidc-for-cloud-authentication.md) - Authentication method

## Review Schedule

Next review: 2026-02-05 (Quarterly)

**Review Triggers:**

- Major GitHub Actions platform changes
- Significant cost increases
- Security incidents related to CI/CD
- Developer satisfaction drops below 3.5/5.0
