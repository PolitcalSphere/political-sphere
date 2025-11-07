---
description: "TypeScript coding standards including strict mode, type safety, and ESM module guidelines"
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript Code Instructions

**Version:** 2.0.0 | **Last Updated:** 2025-11-05

## Type Safety

- Always use TypeScript strict mode (`strict: true`)
- Avoid `any` type - use `unknown` or proper types
- Prefer interfaces for object shapes, types for unions/intersections
- Use const assertions for literal types
- Enable `noUncheckedIndexedAccess` for array safety

## Code Organization

- Keep files under 300 lines
- One component/class per file
- Co-locate types with implementation
- Use barrel exports (index.ts) for public APIs
- Separate interfaces into `.types.ts` files for large modules

## Naming Patterns

- Prefix interfaces with `I` only when needed to avoid collisions
- Use descriptive generic names (`TData`, `TResult`) over single letters
- Boolean variables: `isActive`, `hasPermission`, `shouldUpdate`
- Event handlers: `handleClick`, `onSubmit`, `handleUserInput`

## Error Handling

- Use custom error classes extending Error
- Include error codes and context
- Log errors with structured data
- Never swallow errors silently
- Validate external data at boundaries

## Async Patterns

- Prefer `async/await` over raw promises
- Handle promise rejections
- Use `Promise.allSettled()` for parallel operations with some failures
- Avoid nested async callbacks
- Cancel operations when components unmount (React)

## Performance

- Lazy load heavy dependencies
- Memoize expensive computations
- Use weak maps for caching with object keys
- Profile before optimizing
- Document performance-critical sections

## Testing

- Co-locate tests: `user-service.ts` → `user-service.test.ts`
- Use descriptive test names: `should return user when ID exists`
- Test edge cases and error paths
- Mock external dependencies
- Aim for 80%+ coverage on critical paths
