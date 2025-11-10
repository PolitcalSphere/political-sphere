# JSON Schema Documentation

**Version:** 1.0.0  
**Last Updated:** 2025-01-15  
**Status:** ✅ OPERATIONAL

## Overview

This directory contains JSON Schema definitions for Political Sphere's core data models. These schemas serve as:

- **Single source of truth** for data structure documentation
- **Type generation** source for TypeScript interfaces
- **API contract validation** for request/response payloads
- **Test data generation** guidance for factories
- **Documentation** for external integrations

## Directory Structure

```
schemas/
├── json-schema/          # JSON Schema definitions (source)
│   ├── user.schema.json
│   ├── party.schema.json
│   ├── bill.schema.json
│   └── vote.schema.json
└── README.md             # This file
```

Generated TypeScript types are located in:

```
libs/shared/types/generated/
├── user.generated.ts
├── party.generated.ts
├── bill.generated.ts
├── vote.generated.ts
└── index.ts
```

## Schemas

### User Schema (`user.schema.json`)

Defines user account structure with authentication and role information.

**Key Properties:**

- `id` - Unique identifier (pattern: `user-{number}`)
- `username` - 3-50 chars, lowercase alphanumeric with hyphens/underscores
- `email` - Valid email format
- `role` - Enum: `user`, `moderator`, `admin`
- `isActive` - Boolean indicating account status

**Security Note:** `passwordHash` field should NEVER be sent to clients.

### Party Schema (`party.schema.json`)

Defines political party structure with membership tracking.

**Key Properties:**

- `id` - Unique identifier (pattern: `party-{number}`)
- `name` - Full party name (1-200 chars)
- `abbreviation` - Short code (1-10 chars, e.g., "PDA", "LAB")
- `foundedAt` - ISO 8601 date format
- `memberCount` - Non-negative integer

### Bill Schema (`bill.schema.json`)

Defines legislative bill structure with voting workflow.

**Key Properties:**

- `id` - Unique identifier (pattern: `bill-{number}`)
- `title` - Bill title (5-500 chars)
- `status` - Enum: `draft`, `proposed`, `active_voting`, `passed`, `rejected`, `withdrawn`
- `category` - Policy area (environment, healthcare, education, etc.)
- `votesFor/Against/Abstain` - Vote tallies (non-negative integers)

**Workflow States:**

1. `draft` → Bill being authored
2. `proposed` → Submitted but voting not started
3. `active_voting` → Currently accepting votes
4. `passed` → Voting complete, bill passed
5. `rejected` → Voting complete, bill failed
6. `withdrawn` → Bill withdrawn by proposer

### Vote Schema (`vote.schema.json`)

Defines individual vote records on bills.

**Key Properties:**

- `id` - Unique identifier (pattern: `vote-{number}`)
- `position` - Enum: `for`, `against`, `abstain`
- `weight` - Vote weight (0-10, default 1.0)
- `isPublic` - Visibility flag (default true)

**Democratic Integrity:**

- Each user can cast ONE vote per bill
- Votes are immutable once cast (cannot be changed)
- All vote manipulation is logged for audit trails

## Usage

### Generate TypeScript Types

After modifying any JSON Schema file, regenerate TypeScript types:

```bash
npm run schemas:generate
```

This creates/updates files in `libs/shared/types/generated/` with:

- TypeScript interfaces matching schema structure
- JSDoc comments with descriptions
- Type-safe enums for constrained values

**Example Generated Type:**

```typescript
// libs/shared/types/generated/user.generated.ts

/**
 * A user account in the Political Sphere platform
 */
export interface User {
  /** Unique identifier for the user */
  id: string;

  /** Unique username for the user */
  username: string;

  /** User's email address */
  email: string;

  /** User's role in the system */
  role: "user" | "moderator" | "admin";

  /** Whether the user account is active */
  isActive: boolean;

  // ... additional properties
}
```

### Validate Schemas

Ensure schemas are valid JSON Schema Draft 07:

```bash
npm run schemas:validate
```

### Use in Code

Import generated types:

```typescript
import { User, Bill, Vote } from "@political-sphere/shared/types/generated";

// Type-safe function
function createBill(bill: Bill): Promise<Bill> {
  // TypeScript validates structure
  return billRepository.create(bill);
}
```

### Integrate with Test Factories

Factories in `libs/testing/factories/` are aligned with these schemas:

```typescript
import { UserFactory } from "@political-sphere/testing/factories";
import type { User } from "@political-sphere/shared/types/generated";

// Generated user matches User type exactly
const user: User = UserFactory.build();
```

## Schema Conventions

### Required Fields

Mark ALL essential fields as `required`. Fields can be optional only if:

- They are computed/derived values
- They represent optional metadata
- They have sensible defaults

### ID Patterns

All entity IDs follow the pattern: `{entityType}-{number}`

Examples:

- Users: `user-1`, `user-42`
- Bills: `bill-1`, `bill-100`
- Parties: `party-5`
- Votes: `vote-1234`

### Timestamps

Use ISO 8601 format for all timestamps:

- **Date only**: `2025-01-15` (format: `date`)
- **Date + time**: `2025-01-15T10:30:00.000Z` (format: `date-time`)

### Enums

Define explicit enum values for constrained fields:

```json
{
  "status": {
    "type": "string",
    "enum": [
      "draft",
      "proposed",
      "active_voting",
      "passed",
      "rejected",
      "withdrawn"
    ]
  }
}
```

This ensures:

- API validation catches invalid values
- Generated TypeScript types are union types
- Documentation is self-describing

### String Constraints

Apply appropriate constraints:

- `minLength`/`maxLength` for text fields
- `pattern` for formatted strings (IDs, usernames)
- `format` for standard types (email, date, uri)

### Examples

Include realistic examples in schemas:

```json
{
  "examples": [
    {
      "id": "user-1",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

These examples:

- Serve as inline documentation
- Can be used for testing
- Help AI assistants understand data structure

## Maintenance

### When to Update Schemas

Update schemas when:

- Adding new fields to data models
- Changing validation rules
- Modifying enum values
- Adjusting constraints (min/max, patterns)

### Update Process

1. **Edit schema file** in `schemas/json-schema/`
2. **Validate schema**: `npm run schemas:validate`
3. **Regenerate types**: `npm run schemas:generate`
4. **Update factories** in `libs/testing/factories/` if needed
5. **Run tests**: `npm run test:changed`
6. **Update documentation** if adding new schemas

### Version Control

- **Commit schemas and generated types together** in the same PR
- **Document breaking changes** in `CHANGELOG.md`
- **Use semantic versioning** for API contract changes:
  - MAJOR: Breaking changes (removed fields, changed types)
  - MINOR: Additive changes (new optional fields)
  - PATCH: Documentation or constraint clarifications

## Integration Points

### API Validation

Use schemas to validate API requests/responses:

```typescript
import Ajv from "ajv";
import userSchema from "../../../schemas/json-schema/user.schema.json";

const ajv = new Ajv();
const validate = ajv.compile(userSchema);

app.post("/users", (req, res) => {
  if (!validate(req.body)) {
    return res.status(400).json({ errors: validate.errors });
  }
  // Process valid user data
});
```

### OpenAPI Specification

Reference schemas in OpenAPI specs:

```yaml
components:
  schemas:
    User:
      $ref: "../../../schemas/json-schema/user.schema.json"
```

### Database Migrations

Use schemas as reference when creating database migrations:

- Field types should align with schema types
- Constraints should match (min/max, patterns)
- Indexes should cover frequently queried fields

## Standards Compliance

All schemas follow:

- **JSON Schema Draft 07** specification
- **Security**: No sensitive data in examples, password fields clearly marked
- **Accessibility**: Clear descriptions for screen reader compatibility
- **Privacy**: GDPR-compliant field documentation (PII marked)
- **Democratic Neutrality**: No political bias in examples or descriptions

## Troubleshooting

### Type Generation Fails

**Error:** `Cannot find module 'json-schema-to-typescript'`

**Solution:**

```bash
npm install --save-dev json-schema-to-typescript
```

### Schema Validation Fails

**Error:** `Schema is invalid`

**Solution:**

- Check JSON syntax (use a JSON validator)
- Ensure all required fields are present (`$schema`, `type`)
- Verify enum values are arrays
- Confirm pattern regexes are valid

### Generated Types Don't Match Schema

**Solution:**

- Ensure you ran `npm run schemas:generate` after schema changes
- Clear cache: `rm -rf libs/shared/types/generated/`
- Regenerate: `npm run schemas:generate`

## Related Documentation

- **Test Factories**: `libs/testing/README.md` - Using schemas with test data
- **API Design**: `docs/05-engineering-and-devops/development/backend.md` - API validation patterns
- **Type Safety**: `docs/05-engineering-and-devops/languages/typescript.md` - TypeScript best practices
- **Data Protection**: `docs/03-legal-and-compliance/compliance.md` - GDPR compliance for data models

## References

- [JSON Schema Documentation](https://json-schema.org/)
- [JSON Schema Draft 07 Spec](https://json-schema.org/draft-07/json-schema-release-notes.html)
- [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
