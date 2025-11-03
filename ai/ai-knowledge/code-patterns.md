# AI Code Patterns & Standards

## Overview
This document contains established code patterns, anti-patterns, and standards that AI assistants must follow when generating code for Political Sphere. These patterns ensure consistency, security, and maintainability across the codebase.

## Naming Conventions

### Files & Directories
- `kebab-case` for files and directories: `user-management.ts`, `api-client/`
- `PascalCase` for React components: `UserProfile.tsx`
- `camelCase` for functions and variables: `getUserProfile`, `apiClient`
- `SCREAMING_SNAKE_CASE` for constants: `MAX_RETRY_COUNT`, `API_BASE_URL`

### TypeScript Specific
- Interfaces: `I` prefix for domain interfaces: `IUser`, `IPolicy`
- Types: `T` prefix for utility types: `TApiResponse`, `TErrorState`
- Enums: `PascalCase` for enum names, `SCREAMING_SNAKE_CASE` for values

## Error Handling Patterns

### Result<T, E> Pattern (Preferred)
```typescript
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

function validateUser(user: unknown): Result<IUser, ValidationError> {
  // Validation logic
  if (!user.name) {
    return { success: false, error: { field: 'name', message: 'Required' } };
  }
  return { success: true, data: user as IUser };
}

// Usage
const result = validateUser(input);
if (!result.success) {
  logger.error('Validation failed', { error: result.error });
  return result;
}
