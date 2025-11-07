---
description: "React component patterns, hooks, accessibility (WCAG 2.2 AA), and performance best practices"
applyTo: "**/apps/frontend/**/*.tsx,**/libs/ui/**/*.tsx"
---

# React Component Instructions

**Version:** 2.0.0 | **Last Updated:** 2025-11-05

## Component Structure

Organize components consistently:

```typescript
// 1. Imports
import { useState, useEffect } from "react";
import type { ComponentProps } from "./types";

// 2. Types
interface Props {
  title: string;
  onAction: () => void;
}

// 3. Component
export function MyComponent({ title, onAction }: Props) {
  // Hooks
  const [state, setState] = useState(initialState);

  // Effects
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, [dependencies]);

  // Handlers
  const handleClick = () => {
    onAction();
  };

  // Render
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Action</button>
    </div>
  );
}
```

## Accessibility (Mandatory)

Every component must:

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`)
- Include ARIA labels for icons and images
- Provide keyboard navigation
- Support focus management
- Meet contrast requirements (4.5:1 minimum)
- Include loading and error states

```tsx
// Good: Accessible button
<button
  onClick={handleSubmit}
  aria-label="Submit form"
  aria-busy={isSubmitting}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>

// Bad: Inaccessible div click
<div onClick={handleSubmit}>Submit</div>
```

## State Management

- Use `useState` for local component state
- Use `useReducer` for complex state logic
- Lift state only when necessary
- Consider Context for deep prop drilling
- Memoize expensive computations with `useMemo`

## Performance

- Wrap callbacks in `useCallback` to prevent re-renders
- Use React.lazy() for code splitting
- Virtualize long lists
- Debounce user input
- Profile with React DevTools before optimizing

## Props

- Destructure props in function signature
- Provide default values for optional props
- Use TypeScript for prop validation
- Document complex props with JSDoc
- Keep prop drilling to max 2-3 levels

## Hooks Best Practices

- Call hooks at top level (not in conditionals)
- Name custom hooks with `use` prefix
- Extract reusable logic to custom hooks
- Declare dependencies correctly in useEffect
- Use cleanup functions for side effects

## Error Boundaries

Wrap components that might fail:

```tsx
<ErrorBoundary fallback={<ErrorDisplay />}>
  <UserProfile userId={id} />
</ErrorBoundary>
```

## Forms

Use controlled components with validation:

```tsx
function LoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }
    // Submit logic
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "email-error" : undefined}
      />
      {error && (
        <span id="email-error" role="alert">
          {error}
        </span>
      )}
      <button type="submit">Login</button>
    </form>
  );
}
```

## Styling

- Use CSS modules or styled-components
- Follow BEM or consistent naming
- Keep styles co-located with components
- Use CSS variables for theming
- Respect `prefers-reduced-motion`
- Ensure responsive design (mobile-first)

## Testing React Components

Test user interactions, not implementation:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { MyComponent } from "./MyComponent";

it("should call onAction when button clicked", () => {
  const handleAction = vi.fn();
  render(<MyComponent title="Test" onAction={handleAction} />);

  const button = screen.getByRole("button", { name: /action/i });
  fireEvent.click(button);

  expect(handleAction).toHaveBeenCalledTimes(1);
});
```

## Component File Organization

```plaintext
components/
  UserProfile/
    index.ts              # Barrel export
    UserProfile.tsx       # Component
    UserProfile.test.tsx  # Tests
    UserProfile.module.css # Styles
    types.ts              # TypeScript types
    hooks.ts              # Custom hooks
    utils.ts              # Helper functions
```

## Documentation

Include JSDoc for public components:

````typescript
/**
 * Displays user profile information with edit capabilities.
 *
 * @param props - Component properties
 * @param props.userId - Unique identifier for the user
 * @param props.editable - Whether profile can be edited
 * @param props.onSave - Callback when profile is saved
 *
 * @example
 * ```tsx
 * <UserProfile
 *   userId="123"
 *   editable
 *   onSave={handleSave}
 * />
 * ```
 */
export function UserProfile({ userId, editable, onSave }: UserProfileProps) {
  // Implementation
}
````
