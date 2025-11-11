# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for Political Sphere Game Server
# Optimized for npm workspaces with BuildKit caching and security best practices

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
COPY --chown=nodejs:nodejs apps/game-server ./apps/game-server
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Set development environment
ENV NODE_ENV=development \
    NODE_OPTIONS="--max-old-space-size=1024" \
    PORT=3000

# Expose game server port
EXPOSE 3000

# Health check (adjust endpoint based on your implementation)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 0

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start with hot reload (adjust command based on your package.json scripts)
CMD ["npm", "run", "dev", "-w", "apps/game-server"]

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
COPY --chown=nodejs:nodejs apps/game-server ./apps/game-server
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Build the game server application (compiles TypeScript to dist/)
RUN npm run build -w apps/game-server

# ============================================================================
# Production Stage - Minimal runtime image
# ============================================================================
FROM base AS production

# OCI labels with build-time metadata
LABEL org.opencontainers.image.title="Political Sphere Game Server" \
      org.opencontainers.image.description="Real-time game simulation server for Political Sphere platform" \
      org.opencontainers.image.vendor="Political Sphere" \
      org.opencontainers.image.authors="Political Sphere Team" \
      org.opencontainers.image.source="https://github.com/PoliticalSphere/political-sphere" \
      org.opencontainers.image.documentation="https://github.com/PoliticalSphere/political-sphere/tree/main/apps/game-server" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}" \
      com.political-sphere.service="game-server" \
      com.political-sphere.tier="application"

USER nodejs

# Install production dependencies only
COPY --chown=nodejs:nodejs package.json package-lock.json ./
RUN --mount=type=cache,target=/home/nodejs/.npm,uid=1001,gid=1001 \
    npm ci --omit=dev --workspaces=false && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/game-server ./dist/apps/game-server
COPY --from=builder --chown=nodejs:nodejs /app/apps/game-server/package.json ./apps/game-server/

# Copy game data if exists
COPY --from=builder --chown=nodejs:nodejs /app/apps/game-server/data ./apps/game-server/data

# Create writable directories for logs/temp
RUN mkdir -p /app/tmp /app/logs && \
    chown nodejs:nodejs /app/tmp /app/logs

# Set production environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048 --enable-source-maps" \
    PORT=3000

# Expose game server port
EXPOSE 3000

# Health check for production
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=5 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start from compiled dist
CMD ["node", "dist/apps/game-server/server.js"]
