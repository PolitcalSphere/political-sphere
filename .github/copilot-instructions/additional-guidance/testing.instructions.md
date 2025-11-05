---
description: "Testing standards and patterns for Vitest, including AAA pattern, mocking, and accessibility testing"
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx"
---

# Testing Instructions

**Version:** 2.0.0 | **Last Updated:** 2025-11-05

## Test Structure

Use the Arrange-Act-Assert pattern:

```typescript
describe("UserService", () => {
  it("should create user with valid data", async () => {
    // Arrange
    const userData = { name: "Test User", email: "test@example.com" };
    const mockRepo = createMockRepository();

    // Act
    const result = await userService.create(userData);

    // Assert
    expect(result.id).toBeDefined();
    expect(result.name).toBe(userData.name);
  });
});
```

## Test Naming

- Use descriptive names: `should [expected behavior] when [condition]`
- Group related tests in `describe` blocks
- Use `it` for individual test cases
- Be specific: "should throw error when email is invalid" not "should validate"

## Test Coverage

- **Happy path**: Normal operation with valid inputs
- **Edge cases**: Boundary values, empty arrays, null/undefined
- **Error cases**: Invalid inputs, network failures, timeouts
- **Integration points**: API contracts, database queries
- **Accessibility**: Keyboard navigation, screen reader text

## Mocking Best Practices

- Mock external dependencies (APIs, databases)
- Don't mock what you're testing
- Use realistic mock data
- Reset mocks between tests
- Verify mock calls when testing interactions

## Vitest Specific

- Use `vi.mock()` for module mocking
- Prefer `vi.fn()` for function mocks
- Clean up with `afterEach(() => vi.clearAllMocks())`
- Use `vi.useFakeTimers()` for time-dependent code
- Leverage `expect.assertions()` for async tests

## Accessibility Testing

Include automated accessibility checks:

```typescript
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

it("should have no accessibility violations", async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Performance Testing

Test performance-critical operations:

```typescript
it("should process large dataset in under 1 second", async () => {
  const start = performance.now();
  await processLargeDataset(data);
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000);
});
```

## Test Data

- Use factories for test data generation
- Keep test data minimal and focused
- Avoid hardcoded IDs or timestamps
- Use descriptive variable names
- Protect against test data leaking to other tests

## Common Patterns

### Setup and Teardown

```typescript
describe("DatabaseTests", () => {
  beforeEach(async () => {
    await database.connect();
    await seedTestData();
  });

  afterEach(async () => {
    await database.clear();
    await database.disconnect();
  });
});
```

### Parameterized Tests

```typescript
const testCases = [
  { input: "valid@email.com", expected: true },
  { input: "invalid.email", expected: false },
  { input: "", expected: false },
];

testCases.forEach(({ input, expected }) => {
  it(`should return ${expected} for ${input}`, () => {
    expect(validateEmail(input)).toBe(expected);
  });
});
```

### Async Testing

```typescript
it("should fetch user data", async () => {
  const promise = fetchUserData(123);
  await expect(promise).resolves.toMatchObject({ id: 123 });
});

it("should handle errors", async () => {
  const promise = fetchUserData(-1);
  await expect(promise).rejects.toThrow("Invalid user ID");
});
```

## ESM Test Files (ES Modules)

For projects using ES modules (`package.json` with `"type": "module"`):

### Configuration

- **Prefer single test runner** configuration across the monorepo (Vitest recommended)
- **Consistency prevents** brittle cross-package issues
- Ensure runner **natively supports ESM** or provide robust transformer (ts-jest, babel)

### File Structure

```typescript
// ✅ Good: Native ESM test file
import { describe, it, expect } from "vitest";
import { processData } from "./data-processor.js"; // Note .js extension

describe("DataProcessor", () => {
  it("should process data correctly", () => {
    expect(processData([1, 2, 3])).toEqual([2, 4, 6]);
  });
});
```

### Common Pitfalls

- ❌ **Avoid mixed CJS/ESM** in the same package
- ❌ **Don't skip .js extensions** in ESM imports
- ✅ **Use `.mjs`** for tests relying on ESM features or top-level await
- ✅ **Keep one authoritative test file** per suite; remove duplicates

### ESM Troubleshooting

If unavoidable CJS/ESM mixing occurs, add a tiny CJS shim:

```javascript
// test-file.cjs (if needed for compatibility)
describe.skip("Skipped CJS placeholder", () => {
  // No imports - prevents parse errors
});
```

## Continuous Improvement

Learn from testing to improve quality:

### Feedback Loop

1. **Feed failures into backlog** - Create tickets for recurring issues
2. **Conduct root-cause analysis** - Document in ADRs when appropriate
3. **Update tests as system evolves** - Refactor tests with code
4. **Learn from production incidents** - Add regression tests
5. **Measure test effectiveness** - Track bug escape rate

### Test Metrics

Monitor these indicators:

- **Code coverage trends** - Track over time, not just point-in-time
- **Test execution time** - Keep under 5 minutes for PR validation
- **Flaky test rate** - Should be < 1%
- **Bug escape rate** - Bugs found in production vs. caught by tests
- **Test maintenance cost** - Time spent fixing/updating tests

### Anti-Patterns to Avoid

```typescript
// ❌ Bad: Testing implementation details
it("should call internal method", () => {
  const spy = vi.spyOn(service, "internalMethod");
  service.publicMethod();
  expect(spy).toHaveBeenCalled(); // Brittle!
});

// ✅ Good: Testing behavior
it("should return correct result", () => {
  const result = service.publicMethod();
  expect(result).toBe(expectedValue); // Robust!
});

// ❌ Bad: Flaky timing
it("should update after delay", () => {
  service.triggerUpdate();
  setTimeout(() => {
    expect(service.state).toBe("updated"); // Flaky!
  }, 100);
});

// ✅ Good: Proper async handling
it("should update after delay", async () => {
  service.triggerUpdate();
  await vi.waitFor(
    () => {
      expect(service.state).toBe("updated");
    },
    { timeout: 1000 }
  );
});
```

### Security Testing Examples

```typescript
describe("Security validations", () => {
  it("should prevent SQL injection", () => {
    const maliciousInput = "'; DROP TABLE users; --";
    expect(() => queryDatabase(maliciousInput)).toThrow("Invalid input");
  });

  it("should sanitize XSS attempts", () => {
    const xssInput = '<script>alert("XSS")</script>';
    const sanitized = sanitizeInput(xssInput);
    expect(sanitized).not.toContain("<script>");
  });

  it("should enforce rate limiting", async () => {
    const requests = Array(101)
      .fill(null)
      .map(() => api.makeRequest());

    await expect(Promise.all(requests)).rejects.toThrow("Rate limit exceeded");
  });
});
```

## Related Documentation

- **High-level guidance**: [testing.md](testing.md) - Testing strategy and doctrine
- **Main documentation**: [../copilot-instructions.md](../copilot-instructions.md#testing-infrastructure-core-principle) - Testing Infrastructure
- **CI/CD integration**: [operations.md](operations.md) - Deployment and monitoring
- **Accessibility**: [ux-accessibility.md](ux-accessibility.md) - WCAG compliance testing
