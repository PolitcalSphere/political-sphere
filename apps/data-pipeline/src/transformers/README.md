# Data Transformers

Data transformation and normalization logic for sanitizing and validating user inputs.

## Security Best Practices

### SQL Injection Prevention

**IMPORTANT:** This module does NOT handle SQL injection prevention. SQL injection must be prevented at the database layer.

#### Correct Approach (Using Prisma)

✅ **DO: Use Prisma's parameterized queries (default behavior)**

```typescript
// Prisma automatically uses parameterized queries
const user = await prisma.user.findUnique({
  where: { email: userInput },
});

// For raw SQL, use parameterized queries
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

❌ **DON'T: Concatenate user input into SQL strings**

```typescript
// NEVER do this - vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

❌ **DON'T: Try to sanitize SQL input by removing characters**

```typescript
// NEVER do this - ineffective and breaks legitimate input
const sanitized = userInput.replace(/'/g, '');
```

### XSS Prevention

The sanitization methods in this module are designed for preventing XSS attacks when outputting user content in specific contexts:

- `sanitizeString()` - For general HTML output (escapes HTML entities)
- `sanitizeHtml()` - For rich text content (allows safe HTML tags only)
- `sanitizeUrl()` - For URLs (prevents javascript: protocol and open redirects)

### Key Principles

1. **Context-specific sanitization**: Sanitize for the output context (HTML, URL, etc.), not the input
2. **Defense in depth**: Use multiple layers of security (input validation, parameterized queries, output encoding)
3. **Framework features first**: Rely on framework/ORM security features (Prisma's query parameterization)
4. **Validate, don't sanitize**: Where possible, validate inputs against expected formats rather than trying to clean malicious input

## References

- [Prisma - Raw database access](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
- [OWASP - SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP - XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

STATUS: PENDING_IMPLEMENTATION
