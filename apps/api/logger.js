// Minimal logger shim for tests and local runs (tools copy)
// Minimal logger shim for tests and local runs
// Production should use structured logger (pino/winston) and include request context
module.exports = {
  info: (msg, ctx) => {
    if (ctx) console.info('[INFO]', msg, JSON.stringify(ctx));
    else console.info('[INFO]', msg);
  },
  warn: (msg, ctx) => {
    if (ctx) console.warn('[WARN]', msg, JSON.stringify(ctx));
    else console.warn('[WARN]', msg);
  },
  error: (msg, ctx) => {
    if (ctx) console.error('[ERROR]', msg, JSON.stringify(ctx));
    else console.error('[ERROR]', msg);
  },
  audit: (msg, ctx) => {
    // Audit-level logs - keep as info in tests
    if (ctx) console.log('[AUDIT]', msg, JSON.stringify(ctx));
    else console.log('[AUDIT]', msg);
  }
};
