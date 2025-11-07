# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for Political Sphere Worker Service
# Background job processor with npm workspaces and BuildKit caching

# ============================================================================
# Base Stage - Pin by digest for reproducibility
# ============================================================================
# Update digest: docker pull node:22-alpine && docker inspect node:22-alpine --format='{{index .RepoDigests 0}}'
FROM node:25-alpine@sha256:7e467cc5aa91c87e94f93c4608cf234ca24aac3ec941f7f3db207367ccccdd11 AS base

# Build arguments for OCI labels
ARG REVISION="unknown"
ARG CREATED=""

# Install dumb-init only (no apk upgrade for reproducibility)
RUN apk add --no-cache dumb-init

# Create non-root user with fixed UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    mkdir -p /app && \
    chown nodejs:nodejs /app

WORKDIR /app

# ============================================================================
# Dependencies Stage - Install as non-root with BuildKit cache
# ============================================================================
FROM base AS dependencies

USER nodejs

# Copy root package files
COPY --chown=nodejs:nodejs package.json package-lock.json ./

# Install ALL dependencies with BuildKit npm cache
RUN --mount=type=cache,target=/home/nodejs/.npm,uid=1001,gid=1001 \
    npm ci --workspaces=false && \
    npm cache clean --force

# ============================================================================
# Development Stage - Hot reload with nodemon
# ============================================================================
FROM base AS development

USER nodejs

# Copy root package files
COPY --chown=nodejs:nodejs package.json package-lock.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/home/nodejs/.npm,uid=1001,gid=1001 \
    npm ci --workspaces=false && \
    npm cache clean --force

# Copy all source code
COPY --chown=nodejs:nodejs apps/worker ./apps/worker
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Set development environment
ENV NODE_ENV=development \
    NODE_OPTIONS="--max-old-space-size=512" \
    WORKER_INTERVAL_MS=15000

# Create heartbeat file for health checks
RUN mkdir -p /tmp && touch /tmp/worker-heartbeat

# Health check using heartbeat file (worker should update this periodically)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD test -f /tmp/worker-heartbeat && \
        test $(($(date +%s) - $(stat -c %Y /tmp/worker-heartbeat 2>/dev/null || stat -f %m /tmp/worker-heartbeat))) -lt 90 || exit 1

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start with nodemon for hot reload
CMD ["npx", "nodemon", "--watch", "apps/worker", "--watch", "libs", "apps/worker/src/index.js"]

# ============================================================================
# Builder Stage - Compile TypeScript
# ============================================================================
FROM base AS builder

USER nodejs

# Copy root package files
COPY --chown=nodejs:nodejs package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/home/nodejs/.npm,uid=1001,gid=1001 \
    npm ci --workspaces=false && \
    npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs apps/worker ./apps/worker
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Build the worker application (compiles TypeScript to dist/)
RUN npm run build -w apps/worker

# ============================================================================
# Production Stage - Minimal runtime image
# ============================================================================
FROM base AS production

# OCI labels with build-time metadata
LABEL org.opencontainers.image.title="Political Sphere Worker" \
      org.opencontainers.image.description="Background worker service for Political Sphere platform" \
      org.opencontainers.image.vendor="Political Sphere" \
      org.opencontainers.image.authors="Political Sphere Team" \
      org.opencontainers.image.source="https://github.com/PoliticalSphere/political-sphere" \
      org.opencontainers.image.documentation="https://github.com/PoliticalSphere/political-sphere/tree/main/apps/worker" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}" \
      com.political-sphere.service="worker" \
      com.political-sphere.tier="application"

USER nodejs

# Install production dependencies only
COPY --chown=nodejs:nodejs package.json package-lock.json ./
RUN --mount=type=cache,target=/home/nodejs/.npm,uid=1001,gid=1001 \
    npm ci --omit=dev --workspaces=false && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/worker/package.json ./apps/worker/

# Create writable directories and heartbeat file
RUN mkdir -p /app/tmp /app/logs /app/data /tmp && \
    chown nodejs:nodejs /app/tmp /app/logs /app/data && \
    touch /tmp/worker-heartbeat

# Set production environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps" \
    WORKER_INTERVAL_MS=60000

# Health check using heartbeat file (worker code must update this)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
    CMD test -f /tmp/worker-heartbeat && \
        test $(($(date +%s) - $(stat -c %Y /tmp/worker-heartbeat 2>/dev/null || stat -f %m /tmp/worker-heartbeat))) -lt 120 || exit 1

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start from compiled dist
CMD ["node", "apps/worker/dist/index.js"]
