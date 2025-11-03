# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for Political Sphere API Service
# Optimized for npm workspaces with BuildKit caching and security best practices

# ============================================================================
# Base Stage - Pin by digest for reproducibility
# ============================================================================
# Update digest: docker pull node:22-alpine && docker inspect node:22-alpine --format='{{index .RepoDigests 0}}'
FROM node:22-alpine@sha256:6e80991f69cc7722c561e5d14d5e72ab47c0d6b6cfb3ae50fb9cf9a7b30fdf97 AS base

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
# Development Stage - Full tooling with hot reload
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
COPY --chown=nodejs:nodejs apps/api ./apps/api
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Set development environment
ENV NODE_ENV=development \
    NODE_OPTIONS="--max-old-space-size=1024" \
    PORT=4000

# Expose API port
EXPOSE 4000

# Health check (note: /healthz may not exist in dev server - adjust as needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 0

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start with hot reload (adjust command based on your package.json scripts)
CMD ["npm", "run", "dev", "-w", "apps/api"]

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
COPY --chown=nodejs:nodejs apps/api ./apps/api
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Build the API application (compiles TypeScript to dist/)
RUN npm run build -w apps/api

# ============================================================================
# Production Stage - Minimal runtime image
# ============================================================================
FROM base AS production

# OCI labels with build-time metadata
LABEL org.opencontainers.image.title="Political Sphere API" \
      org.opencontainers.image.description="Backend API service for Political Sphere platform" \
      org.opencontainers.image.vendor="Political Sphere" \
      org.opencontainers.image.authors="Political Sphere Team" \
      org.opencontainers.image.source="https://github.com/PoliticalSphere/political-sphere" \
      org.opencontainers.image.documentation="https://github.com/PoliticalSphere/political-sphere/tree/main/apps/api" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}" \
      com.political-sphere.service="api" \
      com.political-sphere.tier="application"

USER nodejs

# Install production dependencies only
COPY --chown=nodejs:nodejs package.json package-lock.json ./
RUN --mount=type=cache,target=/home/nodejs/.npm,uid=1001,gid=1001 \
    npm ci --omit=dev --workspaces=false && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/

# Create writable directories for logs/temp
RUN mkdir -p /app/tmp /app/logs && \
    chown nodejs:nodejs /app/tmp /app/logs

# Set production environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048 --enable-source-maps" \
    PORT=4000

# Expose API port
EXPOSE 4000

# Health check for production
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=5 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start from compiled dist
CMD ["node", "apps/api/dist/index.js"]
