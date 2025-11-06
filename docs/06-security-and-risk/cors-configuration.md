# CORS Security Configuration Guide

**Version:** 1.0.0  
**Last Updated:** 2025-11-06  
**Applies To:** All Express.js/HTTP servers in Political Sphere

## Overview

Cross-Origin Resource Sharing (CORS) is a security feature that controls which origins can access your API. Misconfigured CORS is a common vulnerability that can expose sensitive data to malicious websites.

## The Problem

### ❌ Insecure: Default CORS (Wildcard)

```javascript
// DANGEROUS - Allows ANY website to access your API
app.use(cors());

// DANGEROUS - Explicitly allows all origins
app.use(cors({ origin: "*" }));

// DANGEROUS - Reflects the requesting origin
app.use(cors({ origin: true }));
```

**Why this is bad:**

- Any malicious website can make authenticated requests to your API
- User credentials (cookies, tokens) can be stolen
- Sensitive data can be exfiltrated
- CSRF attacks become trivial

### Attack Scenario

1. User visits `evil-site.com` while logged into `your-app.com`
2. Evil site makes AJAX request to `your-api.com/api/user/data`
3. Browser includes authentication cookies
4. API returns sensitive user data
5. Evil site steals the data

## Secure Configuration

### ✅ Option 1: Environment-Driven Allowlist (Recommended)

```javascript
// Production: Set via environment variable
// ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:3000", // Frontend dev
      "http://localhost:3001", // Alternative port
      "http://localhost:5173", // Vite dev server
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true, // Allow cookies/auth headers
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
```

### ✅ Option 2: Pattern-Based Allowlist

For subdomains or dynamic environments:

```javascript
const allowedOriginPatterns = [
  /^https:\/\/.*\.example\.com$/, // All example.com subdomains
  /^http:\/\/localhost:\d+$/, // Any localhost port (dev only)
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOriginPatterns.some((pattern) =>
      pattern.test(origin)
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
```

### ✅ Option 3: Single Trusted Origin

For APIs with a single frontend:

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
```

## Configuration Options Explained

### `origin`

- **Type:** String, Array, Function, or Boolean
- **Secure:** Function with allowlist validation
- **Insecure:** `true`, `'*'`, or omitted

### `credentials`

- **Type:** Boolean
- **Recommendation:** Set to `true` only if you need cookies/auth headers
- **Warning:** Never use `credentials: true` with `origin: '*'` (browsers block this anyway)

### `methods`

- **Type:** Array of HTTP methods
- **Recommendation:** List only methods your API actually uses
- **Example:** `['GET', 'POST']` for read-only + create API

### `allowedHeaders`

- **Type:** Array of header names
- **Recommendation:** List only headers your API expects
- **Common:** `['Content-Type', 'Authorization']`

### `exposedHeaders`

- **Type:** Array of header names
- **Use:** Headers that frontend JS can read from response
- **Example:** `['X-Total-Count', 'X-Page-Number']`

### `maxAge`

- **Type:** Number (seconds)
- **Use:** How long browsers cache preflight responses
- **Recommendation:** `86400` (24 hours) for stable APIs

## Environment Variables

### Development

```bash
# .env.development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Staging

```bash
# .env.staging
ALLOWED_ORIGINS=https://staging.example.com,https://admin-staging.example.com
```

### Production

```bash
# .env.production or deployment config
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## Testing CORS Configuration

### Test 1: Verify Allowed Origin Works

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:4000/api/endpoint

# Should return:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
```

### Test 2: Verify Blocked Origin Fails

```bash
curl -H "Origin: https://evil-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:4000/api/endpoint

# Should NOT return Access-Control-Allow-Origin header
# Should return error or no CORS headers
```

### Test 3: Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Make request from different origin
4. Check response headers:
   - ✅ `Access-Control-Allow-Origin: <your-allowed-origin>`
   - ❌ `Access-Control-Allow-Origin: *` (insecure!)

## Common Mistakes

### ❌ Mistake 1: Wildcard with Credentials

```javascript
// This doesn't work - browsers reject it
app.use(
  cors({
    origin: "*",
    credentials: true, // ❌ Incompatible with wildcard
  })
);
```

### ❌ Mistake 2: String Array as origin

```javascript
// ❌ Wrong - origin doesn't accept arrays directly in some versions
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
  })
);

// ✅ Correct - Use function with allowlist
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = ["http://localhost:3000", "http://localhost:5173"];
      callback(null, allowed.includes(origin));
    },
  })
);
```

### ❌ Mistake 3: Forgetting Preflight

```javascript
// ❌ Missing OPTIONS handler
app.post("/api/endpoint", handler);

// ✅ Correct - CORS middleware handles OPTIONS automatically
app.use(cors(corsOptions));
app.post("/api/endpoint", handler);
```

### ❌ Mistake 4: Port Mismatch

```javascript
// ❌ Wrong - Missing port
allowedOrigins: ["http://localhost"];

// ✅ Correct - Include port
allowedOrigins: ["http://localhost:3000"];
```

## Security Best Practices

1. **Never use wildcards in production**

   - Always use explicit allowlist
   - Validate origin on every request

2. **Use HTTPS in production**

   - Don't allow `http://` origins in production
   - Only allow `https://` origins

3. **Minimize exposed headers**

   - Only expose headers that frontend needs
   - Avoid exposing internal headers

4. **Log blocked requests**

   - Monitor for unauthorized access attempts
   - Alert on suspicious origin patterns

5. **Separate public/private APIs**

   - Public APIs: Relaxed CORS (still not wildcard!)
   - Private APIs: Strict CORS with credentials

6. **Use Content Security Policy (CSP)**
   - CORS + CSP provide defense in depth
   - Example: `Content-Security-Policy: default-src 'self'`

## Debugging

### CORS Error in Browser Console

```
Access to fetch at 'http://api.example.com/endpoint' from origin
'http://localhost:3000' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present
```

**Solutions:**

1. Add `http://localhost:3000` to `allowedOrigins`
2. Check origin includes protocol and port
3. Verify CORS middleware is applied before routes

### Preflight Request Failing

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header
```

**Solutions:**

1. Ensure CORS middleware handles OPTIONS requests
2. Check `methods` includes the HTTP method you're using
3. Check `allowedHeaders` includes custom headers

## Migration Checklist

When updating from insecure to secure CORS:

- [ ] Identify all origins that need access (frontend URLs)
- [ ] Set `ALLOWED_ORIGINS` environment variable
- [ ] Update CORS configuration to use allowlist
- [ ] Test with real frontend in dev environment
- [ ] Verify blocked origins are rejected
- [ ] Update deployment configs with production origins
- [ ] Monitor logs for legitimate blocked requests
- [ ] Update documentation with new origin URLs

## Examples

### Political Sphere Configuration

**Game Server:** `apps/game-server/src/index.js`

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];
```

**API Server:** `apps/api/src/app.js`

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];
```

## References

- [OWASP: Testing for CORS](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing)
- [CWE-942: Permissive Cross-domain Policy](https://cwe.mitre.org/data/definitions/942.html)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors.html)

## Questions?

Contact the Security Team or refer to `docs/06-security-and-risk/` for more security guidelines.
