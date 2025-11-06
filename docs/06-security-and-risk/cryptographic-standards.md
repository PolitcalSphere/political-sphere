# Cryptographic Security Guidelines

**Version:** 1.0.0  
**Last Updated:** 2025-11-06  
**Applies To:** All code in the Political Sphere project

## Overview

This document outlines secure cryptographic practices for the Political Sphere project. Following these guidelines prevents the use of broken or weak cryptographic algorithms that could compromise security.

## Prohibited Algorithms

### ❌ MD5 (Message-Digest Algorithm 5)

**Status:** FORBIDDEN  
**Reason:** Cryptographically broken since 2004. Vulnerable to collision attacks.

**Common uses to avoid:**

```javascript
// ❌ NEVER USE
crypto.createHash("md5").update(data).digest("hex");
```

**Replacement:**

```javascript
// ✅ USE INSTEAD
crypto.createHash("sha256").update(data).digest("hex");
```

### ❌ SHA-1 (Secure Hash Algorithm 1)

**Status:** FORBIDDEN  
**Reason:** Cryptographically weak. Collision attacks demonstrated (SHAttered attack, 2017).

**Common uses to avoid:**

```javascript
// ❌ NEVER USE
crypto.createHash("sha1").update(data).digest("hex");
```

**Replacement:**

```javascript
// ✅ USE INSTEAD
crypto.createHash("sha256").update(data).digest("hex");
```

## Approved Algorithms

### ✅ SHA-256 (Minimum Standard)

**Use for:** Checksums, content hashing, non-cryptographic integrity checks

```javascript
const crypto = require("crypto");

// File integrity check
const hash = crypto.createHash("sha256").update(fileContent).digest("hex");

// Content-based cache key
const cacheKey = crypto
  .createHash("sha256")
  .update(JSON.stringify(data))
  .digest("hex")
  .slice(0, 16); // Can truncate for shorter keys
```

### ✅ SHA-384 / SHA-512 (Enhanced Security)

**Use for:** High-security applications, long-term data integrity

```javascript
// Higher security hash
const hash = crypto.createHash("sha512").update(sensitiveData).digest("hex");
```

### ✅ SHA-3 Family (Latest Standard)

**Use for:** Future-proofing, maximum security

```javascript
// SHA-3 (when available in Node.js crypto)
const hash = crypto.createHash("sha3-256").update(data).digest("hex");
```

## Special Use Cases

### Password Hashing

**❌ NEVER use general-purpose hashes for passwords:**

```javascript
// ❌ WRONG - Even SHA-256 is inadequate for passwords
const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
```

**✅ USE password-specific algorithms:**

```javascript
// ✅ CORRECT - Use bcrypt
const bcrypt = require("bcryptjs");
const hash = bcrypt.hashSync(password, 12); // 12 rounds minimum

// ✅ BETTER - Use Argon2 (if available)
const argon2 = require("argon2");
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
});
```

### Random Value Generation

**❌ NEVER use Math.random() for security:**

```javascript
// ❌ WRONG - Predictable
const token = Math.random().toString(36).substring(7);
```

**✅ USE cryptographically secure random:**

```javascript
// ✅ CORRECT - Cryptographically secure
const token = crypto.randomBytes(32).toString("hex");

// ✅ For UUIDs
const { v4: uuidv4 } = require("uuid");
const id = uuidv4(); // Uses crypto.randomBytes internally
```

### HMAC (Message Authentication)

**✅ Always use SHA-256 or higher for HMAC:**

```javascript
// ✅ CORRECT
const hmac = crypto
  .createHmac("sha256", secretKey)
  .update(message)
  .digest("hex");

// ✅ BETTER (for high security)
const hmac = crypto
  .createHmac("sha512", secretKey)
  .update(message)
  .digest("hex");
```

## Migration Guide

If you encounter existing code using weak algorithms:

### Step 1: Identify the Use Case

```javascript
// Example: Old code using MD5
const hash = crypto.createHash("md5").update(content).digest("hex");
```

### Step 2: Determine the Purpose

- **Checksum/Integrity?** → Use SHA-256
- **Password?** → Use bcrypt/argon2
- **HMAC?** → Use SHA-256+ with secret key
- **Random token?** → Use crypto.randomBytes()

### Step 3: Replace and Test

```javascript
// ✅ Replaced with SHA-256
const hash = crypto.createHash("sha256").update(content).digest("hex");
```

### Step 4: Update Any Stored Hashes

If the hash is stored (e.g., in a database), you may need a migration:

```javascript
// Option 1: Rehash on next use (for passwords)
if (user.passwordHash.startsWith("$2b$")) {
  // Already bcrypt, verify normally
} else {
  // Old MD5 hash - force password reset
  sendPasswordResetEmail(user);
}

// Option 2: Regenerate on demand (for content hashes)
if (file.hashAlgorithm === "md5") {
  file.hash = crypto.createHash("sha256").update(content).digest("hex");
  file.hashAlgorithm = "sha256";
  await file.save();
}
```

## Automated Detection

### Pre-commit Hooks

The project uses automated validation to catch weak crypto before commit:

```bash
# Runs automatically on commit
./scripts/validate-crypto.sh
```

### CI/CD Integration

Security scanning runs on every PR:

- **Semgrep rules** detect MD5/SHA-1 usage
- **validate-crypto.sh** scans all source files
- **GitHub Actions** blocks merge if weak crypto detected

### Local Development

Run manually before committing:

```bash
# Check for weak crypto
npm run security:crypto

# Or run the script directly
./scripts/validate-crypto.sh
```

## Quick Reference

| Use Case        | ❌ Don't Use      | ✅ Use Instead              |
| --------------- | ----------------- | --------------------------- |
| Checksums       | MD5, SHA-1        | SHA-256, SHA-512            |
| Passwords       | Any hash          | bcrypt (12+ rounds), argon2 |
| HMAC            | MD5, SHA-1        | SHA-256, SHA-512            |
| Random tokens   | Math.random()     | crypto.randomBytes()        |
| UUIDs           | Custom generators | uuid v4 (uses crypto)       |
| Content hashing | MD5, SHA-1        | SHA-256                     |
| File integrity  | MD5, SHA-1        | SHA-256, SHA-512            |

## References

- [OWASP: Testing for Weak Cryptography](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/04-Testing_for_Weak_Encryption)
- [NIST Hash Functions](https://csrc.nist.gov/projects/hash-functions)
- [SHAttered Attack (SHA-1)](https://shattered.io/)
- [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)

## Enforcement

- **Severity:** ERROR (blocks PR merge)
- **Detection:** Semgrep, validate-crypto.sh, GitHub Actions
- **Exemptions:** None - if you have a legitimate need for MD5/SHA-1 (e.g., integrating with legacy systems), document it in an ADR and add an explicit exemption comment

## Questions?

Contact the Security Team or open an issue in the repository.
