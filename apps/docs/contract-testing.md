# Contract Testing Implementation Plan

## Overview

Contract testing ensures that API interactions between services remain compatible. We'll implement Pact for consumer-driven contract testing.

## Implementation Steps

### 1. Install Pact

```bash
npm install --save-dev @pact-foundation/pact @pact-foundation/pact-node
```

### 2. Consumer Contract (Frontend/API Consumer)

Create pact tests that define expected API responses:

```javascript
// tests/contract/api-consumer.pact.js
const { Pact } = require('@pact-foundation/pact');
const { like, term } = require('@pact-foundation/pact').Matchers;

describe('API Consumer Contract', () => {
  const provider = new Pact({
    consumer: 'frontend',
    provider: 'api',
    port: 1234,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'INFO',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  describe('GET /health', () => {
    beforeAll(() => {
      const interaction = {
        state: 'server is healthy',
        uponReceiving: 'a request for health status',
        withRequest: {
          method: 'GET',
          path: '/health',
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: like({
            status: 'ok',
            timestamp: term({
              generate: '2023-01-01T00:00:00Z',
              matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z',
            }),
          }),
        },
      };
      return provider.addInteraction(interaction);
    });

    it('returns health status', () => {
      return provider.executeTest(async (mockserver) => {
        const response = await fetch(`${mockserver.url}/health`);
        expect(response.status).toBe(200);
      });
    });
  });
});
```

### 3. Provider Verification (API)

Verify that the API honors the contracts:

```javascript
// tests/contract/api-provider.pact.js
const { Verifier } = require('@pact-foundation/pact');

describe('API Provider Verification', () => {
  it('validates the expectations of frontend', () => {
    const opts = {
      provider: 'api',
      providerBaseUrl: 'http://localhost:4000',
      pactUrls: [path.resolve(process.cwd(), 'pacts', 'frontend-api.json')],
      publishVerificationResult: process.env.CI || false,
      providerVersion: process.env.GIT_COMMIT || '1.0.0',
    };

    return new Verifier(opts).verifyProvider();
  });
});
```

### 4. CI Integration

Add to GitHub Actions:

```yaml
- name: Run contract tests
  run: npm run test:contract

- name: Publish pacts
  run: |
    npm install -g @pact-foundation/pact-cli
    pact-broker publish pacts --consumer-app-version=$GITHUB_SHA --tag=$GITHUB_REF_NAME
```

### 5. Pact Broker Setup

For production, set up a Pact Broker to store and verify contracts between deployments.

## Benefits

- **Early Detection**: Catch API breaking changes before deployment
- **Documentation**: Contracts serve as living API documentation
- **Parallel Development**: Teams can work independently with confidence

## Next Steps

1. Install Pact dependencies
2. Implement consumer contracts for key API endpoints
3. Add provider verification tests
4. Set up CI pipeline integration
5. Deploy Pact Broker for contract storage
