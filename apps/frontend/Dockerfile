# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for Political Sphere Frontend
# Static SPA served by nginx with npm workspaces and BuildKit caching

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
# Builder Stage - Compile React app to static assets
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
COPY --chown=nodejs:nodejs apps/frontend ./apps/frontend
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Build the frontend application (creates dist/ or build/)
RUN npm run build -w apps/frontend

# ============================================================================
# Development Stage - Hot reload with Vite dev server
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
COPY --chown=nodejs:nodejs apps/frontend ./apps/frontend
COPY --chown=nodejs:nodejs libs ./libs
COPY --chown=nodejs:nodejs tsconfig*.json nx.json ./

# Set development environment
ENV NODE_ENV=development \
    NODE_OPTIONS="--max-old-space-size=1024" \
    PORT=3000

# Expose frontend port
EXPOSE 3000

# Health check for development (Vite dev server doesn't have /healthz by default)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 0

# Handle graceful shutdown
STOPSIGNAL SIGTERM

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start Vite dev server with HMR
CMD ["npm", "run", "dev", "-w", "apps/frontend"]

# ============================================================================
# Production Stage - Static SPA served by nginx
# ============================================================================
FROM nginx:1.29-alpine AS production

# OCI labels with build-time metadata
LABEL org.opencontainers.image.title="Political Sphere Frontend" \
      org.opencontainers.image.description="React frontend for Political Sphere platform" \
      org.opencontainers.image.vendor="Political Sphere" \
      org.opencontainers.image.authors="Political Sphere Team" \
      org.opencontainers.image.source="https://github.com/PoliticalSphere/political-sphere" \
      org.opencontainers.image.documentation="https://github.com/PoliticalSphere/political-sphere/tree/main/apps/frontend" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}" \
      com.political-sphere.service="frontend" \
      com.political-sphere.tier="presentation"

# Copy built static files from builder stage
# Adjust path based on your build output (dist/ or build/)
COPY --from=builder --chown=nginx:nginx /app/apps/frontend/dist /usr/share/nginx/html

# Copy custom nginx configuration (if you have one)
# COPY --chown=nginx:nginx apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create health check endpoint
RUN echo '<!DOCTYPE html><html><body>OK</body></html>' > /usr/share/nginx/html/health.html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health.html || exit 1

# Handle graceful shutdown
STOPSIGNAL SIGQUIT

# nginx runs as non-root by default in official image
# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
