# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS dev
CMD ["npm", "run", "start:worker"]

FROM base AS production-deps
RUN npm prune --omit=dev

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deps /app/node_modules ./node_modules
COPY . .
CMD ["node", "apps/worker/src/index.js"]
