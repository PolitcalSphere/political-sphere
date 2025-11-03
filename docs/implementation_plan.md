# Implementation Plan

Implement a minimal viable product (MVP) for the Political Sphere domain with User, Party, Bill, and Vote entities, including REST API endpoints, data persistence, and automated tests to enable the basic end-to-end demo flow (create user → propose bill → vote).

[Types]
No new types required - existing domain models (User, Party, Bill, Vote) with Zod schemas are already defined in libs/shared/src/domain/.

[Files]
New files to be created:

- apps/api/src/server.ts: Main Express server setup with route registration
- apps/api/src/routes/votes.js: Vote API endpoints (missing from current implementation)
- scripts/build-shared.mjs: Build script for the shared library to resolve TypeScript compilation errors

Existing files to be modified:

- libs/shared/src/index.ts: Add proper exports for all domain types and schemas
- apps/api/src/routes/bills.js: Convert to TypeScript (.ts) and fix imports
- apps/api/src/routes/parties.js: Convert to TypeScript (.ts) and fix imports
- apps/api/src/routes/users.js: Convert to TypeScript (.ts) and fix imports
- apps/api/src/routes/votes.js: Convert to TypeScript (.ts) and fix imports
- apps/api/src/stores/bill-store.ts: Fix method signatures to match service expectations
- apps/api/src/stores/party-store.ts: Fix method signatures to match service expectations
- apps/api/src/stores/vote-store.ts: Fix method signatures to match service expectations
- apps/api/src/stores/user-store.ts: Fix method signatures to match service expectations
- apps/api/tsconfig.json: Update to properly resolve @political-sphere/shared imports
- package.json: Add build script for shared library

Configuration file updates:

- tsconfig.base.json: Add path mapping for @political-sphere/shared workspace reference

[Functions]
New functions:

- startServer(): Initialize and start the Express server with all routes
- buildSharedLibrary(): Build the shared TypeScript library with proper exports

Modified functions:

- Existing store methods: Update to return proper types and handle errors consistently
- Route handlers: Add proper TypeScript typing and error handling
- Database initialization: Ensure proper migration and connection handling

[Classes]
New classes:

- Server: Main application server class with route setup and middleware

[Dependencies]
New packages:

- express: Web framework for API server
- supertest: HTTP endpoint testing for integration tests

Version updates:

- @types/express: Latest compatible version for TypeScript support

[Testing]
Unit tests for new/modified files:

- apps/api/tests/server.test.mjs: Server startup and route registration
- apps/api/tests/routes/votes.test.mjs: Vote API endpoint tests

Integration tests:

- apps/api/tests/integration/demo-flow.test.mjs: End-to-end demo flow (already exists, needs fixes)
- API smoke tests: Basic connectivity and response validation

Existing test modifications:

- Update all route tests to use TypeScript and proper imports
- Fix integration test to work with corrected API endpoints

[Implementation Order]

1. Build and export the shared library properly
2. Fix TypeScript configuration and imports
3. Convert route files from .js to .ts with proper typing
4. Fix store method signatures and implementations
5. Create missing votes API routes
6. Create main server setup file
7. Update and fix all tests
8. Run integration tests and verify demo flow works
9. Add any missing API endpoints (vote counts, etc.)
10. Final validation and documentation updates
