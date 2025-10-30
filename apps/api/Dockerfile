# syntax=docker/dockerfile:1.4

FROM node:22-alpine AS base

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
RUN chown nodejs:nodejs /app

# Copy package files
COPY --chown=nodejs:nodejs package.json package-lock.json ./

# Install dependencies (omit dev deps in image builds)
RUN npm ci --omit=dev && \
    npm cache clean --force

FROM base AS production-deps
RUN npm prune --omit=dev

FROM node:22-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Security: Set environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048" \
    PORT=4000

WORKDIR /app
RUN chown nodejs:nodejs /app

# Copy dependencies and application code
COPY --from=production-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs apps/api ./apps/api
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs package.json ./

# Security: Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 4000

CMD ["node", "apps/api/src/index.js"]
