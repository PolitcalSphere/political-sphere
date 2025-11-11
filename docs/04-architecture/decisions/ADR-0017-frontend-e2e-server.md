# ADR-0017: Frontend Server for E2E Testing

<div align="center">

| Classification | Version | Last Updated |      Owner       | Review Cycle |    Status    |
| :------------: | :-----: | :----------: | :--------------: | :----------: | :----------: |
|  🔒 Internal   | `1.0.0` |  2025-11-09  | Engineering Team |  Quarterly   | **Accepted** |

</div>

---

## Status

**Accepted** - Implemented as of 2025-11-09

## Context

Political Sphere requires automated end-to-end (E2E) testing with Playwright to validate the full user experience from frontend to backend. The frontend application (`apps/web`) has two potential server implementations:

1. **Vite Dev Server** (`vite --config apps/web/vite.config.js --port 5173`)

   - Modern development server with HMR (Hot Module Replacement)
   - Serves React application with real-time updates
   - Requires React 19, JSX/TSX compilation
   - Designed for active development workflows

2. **Custom Node.js Server** (`apps/web/server.js`)
   - Lightweight HTTP server (built on Node.js `http` module)
   - Server-side rendering with template injection
   - Pre-configured security headers (CSP, HSTS, X-Frame-Options)
   - Optimized for production-like static serving
   - Port 3002 (avoiding conflict with Grafana on 3000)

The choice impacts:

- **E2E test stability**: Server startup time, deterministic behavior, port conflicts
- **CI/CD performance**: Build/startup overhead in automated pipelines
- **Development ergonomics**: Local testing without separate server management
- **Production parity**: How closely tests mirror real deployment

## Decision

**Use the custom Node.js server (`apps/web/server.js`) for Playwright E2E tests.**

Playwright `webServer` configuration:

```typescript
{
  command: "cd apps/web && node server.js",
  port: 3002,
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
}
```

## Rationale

### Why Custom Server Over Vite Dev Server

1. **Deterministic Startup**: `server.js` starts in ~200ms vs Vite's 2-5 seconds with compilation
2. **No Build Step**: Eliminates dependency on Vite build/compilation pipeline in CI
3. **Production Parity**: Custom server mirrors production deployment (static serving + CSP headers)
4. **Stability**: No HMR, no file watchers, no dynamic recompilation during tests
5. **Port Isolation**: Fixed port 3002 avoids conflicts with other services (API on 3001, Grafana on 3000)
6. **Security Headers**: Pre-configured CSP, HSTS, X-Frame-Options tested in E2E context
7. **Lower Resource Footprint**: Minimal memory/CPU overhead in CI runners

### Trade-offs Accepted

- **No React Component Testing**: Custom server serves static HTML; component-level testing handled by Vitest + Testing Library
- **Separate Dev Workflow**: Developers use Vite (`npm run dev:web`) for active development; E2E uses custom server
- **Template-Based Rendering**: `server.js` uses placeholder injection; not suitable for interactive SPA testing (addressed in Phase 2)

## Consequences

### Positive

- ✅ **Fast E2E Startup**: Tests begin in under 2 seconds (server startup + health check)
- ✅ **CI Efficiency**: No Vite compilation in test pipelines reduces build time by ~30 seconds
- ✅ **Reliable Tests**: Deterministic server behavior eliminates HMR-related flakiness
- ✅ **Security Validation**: CSP and security headers tested automatically in E2E flows
- ✅ **Simple Configuration**: Single-command server start with zero build dependencies

### Negative

- ⚠️ **Limited SPA Testing**: Current setup serves static HTML; full React interactivity testing deferred to Phase 2
- ⚠️ **Dual Server Maintenance**: Must keep both `server.js` (E2E/production) and Vite config (development) aligned
- ⚠️ **No HMR in Tests**: Changes to frontend require manual server restart (mitigated by `reuseExistingServer: true` locally)

### Neutral

- 🔄 **Phase 2 Transition Path**: When React 19 frontend is production-ready, evaluate:
  - Vite SSR build for E2E (`vite build --ssr`)
  - Hybrid approach (Vite for interactive tests, custom server for security/performance tests)
  - Update ADR accordingly

## Implementation

### Playwright Configuration

```typescript
// e2e/playwright.config.ts
const WEB_COMMAND = process.env.WEB_E2E_COMMAND || "cd apps/web && node server.js";
const WEB_PORT = Number(process.env.WEB_PORT || 3002);

webServer: [
  { command: API_COMMAND, port: API_PORT, ... },
  { command: WEB_COMMAND, port: WEB_PORT, reuseExistingServer: !process.env.CI, timeout: 60_000 }
]
```

### Test Environment Variables

- `WEB_BASE_URL`: Defaults to `http://localhost:3002` in smoke tests
- `WEB_PORT`: Overridable for parallel test execution (e.g., sharded CI jobs)
- `WEB_E2E_COMMAND`: Allows switching to alternative server (e.g., Vite SSR build) without code changes

### Validation

- **Smoke Tests**: `e2e/smoke/health-check.spec.ts` validates server responds with 200, renders without errors
- **Accessibility Tests**: `e2e/smoke/accessibility.spec.ts` scans with axe-core (WCAG 2.2 AA)
- **Core Loop**: `e2e/smoke/core-loop.spec.ts` verifies API integration (register → create → join → propose → vote)

## Related Documents

- **Testing Strategy**: `docs/05-engineering-and-devops/development/testing.md`
- **UX Accessibility Standards**: `docs/05-engineering-and-devops/ui/ux-accessibility.md`
- **Frontend Server Implementation**: `apps/web/server.js`
- **Vite Configuration**: `apps/web/vite.config.js`
- **Playwright Configuration**: `e2e/playwright.config.ts`

## Review Notes

- **Next Review**: 2026-02-09 (Quarterly)
- **Trigger for Re-evaluation**: React 19 frontend reaches production readiness, or E2E test coverage expands to require full SPA interactivity
- **Owner**: Engineering Team (DevOps + Frontend leads)

---

**Supersedes**: N/A (initial E2E server decision)  
**Superseded By**: TBD (when React SPA E2E testing implemented)
