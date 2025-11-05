# Nx Configuration Documentation

## Overview

This document provides comprehensive documentation for the Nx workspace configuration used in the Political Sphere project. The configuration is designed to optimize build performance, enforce architectural boundaries, and support scalable development practices.

## Configuration Structure

### Core Settings

- **npmScope**: `political` - Defines the npm scope for published packages
- **useDaemonProcess**: `true` - Enables Nx daemon for faster incremental builds
- **useInferencePlugins**: `false` - Explicit control over plugin behavior for consistency

### Workspace Layout

- **appsDir**: `apps` - Directory containing application projects
- **libsDir**: `libs` - Directory containing shared library projects

### Named Inputs

The configuration defines several named inputs for efficient caching:

- **default**: Includes all project files and shared globals
- **production**: Excludes test files and development-only configurations
- **sharedGlobals**: Excludes AI-generated and temporary files from cache invalidation

### Target Defaults

#### Build Target

- **dependsOn**: `["^build"]` - Ensures dependencies build first
- **inputs**: `["production", "^production"]` - Uses production inputs for caching
- **cache**: `true` - Enables build result caching

#### Test Target

- **inputs**: `["default", "^production", "{workspaceRoot}/jest.preset.js"]`
- **cache**: `true` - Caches test results
- **configurations.ci**: Defines coverage thresholds (80% for branches, functions, lines, statements)

#### Other Targets

- **lint**: Caches linting results
- **test:e2e**: Caches end-to-end test results
- **lint:boundaries**: Caches boundary linting results

### Module Boundary Enforcement

The configuration enforces strict architectural boundaries through dependency constraints:

#### Application Dependencies

- Apps can only depend on UI, feature, data, and utility libraries

#### Library Dependencies

- UI libraries can depend on other UI libs, features, data, and utilities
- Service libraries follow similar patterns with additional library dependencies

#### Scope-Based Rules

- Frontend scope allows all dependencies
- Worker scope allows all dependencies
- Core scope is restricted to core-only dependencies

### Task Runner Configuration

- **Runner**: `nx/tasks-runners/default`
- **Parallel Execution**: 6 concurrent tasks, maximum 8
- **Cacheable Operations**: build, lint, test, e2e, lint:boundaries
- **Runtime Cache Inputs**: Node.js version
- **Analytics**: Enabled for performance monitoring

### Nx Cloud Integration

- **Access Token**: Read-only token for CI/CD pipelines
- **Cloud ID**: Public identifier for collaboration and metrics
- **Analytics**: Enabled for performance insights and continuous improvement

## Performance Optimizations

### Caching Strategy

- Comprehensive caching for all major operations
- Exclusion of AI-generated files to reduce I/O overhead
- Runtime-aware caching based on Node.js version

### Parallel Execution

- Configured for 6 parallel tasks with 8 maximum
- Balances resource usage with build speed

### File Watching

- Ignores dotfiles and AI-generated directories
- Reduces unnecessary file system operations

## Security Considerations

### Access Control

- Read-only Nx Cloud access token
- Boundary enforcement prevents unauthorized dependencies
- GitHub teams control repository access

### Compliance

- Module boundaries enforced per governance rules
- Version tracking for change management
- Audit trails through Nx Cloud

## Maintenance Guidelines

### Version Management

- Track configuration versions in the `installation.version` field
- Update version on significant changes
- Document changes in CHANGELOG.md

### Review Process

- Quarterly configuration reviews
- Performance monitoring via Nx Cloud metrics
- Regular updates based on team feedback

### Troubleshooting

- Check Nx Cloud dashboard for performance metrics
- Review boundary violations in CI logs
- Monitor cache hit rates for optimization opportunities

## Related Documentation

- [Standards Overview](../standards-overview.md)
- [Architecture Decision Records](../architecture/decisions/)
- [CI/CD Pipeline Documentation](../../.github/workflows/)
- [Nx Official Documentation](https://nx.dev)

---

**Last Updated**: 2025-01-01
**Version**: 1.0.0
**Review Cycle**: Quarterly
