# syntax=docker/dockerfile:1.4

FROM node:22-alpine AS base

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
RUN chown nodejs:nodejs /app

# Create a minimal package.json for production dependencies
# This avoids workspace protocol issues in Docker
RUN echo '{"name":"api","version":"1.0.0","type":"module","dependencies":{}}' > package.json

# Install only the runtime dependencies we need
RUN npm install --no-audit --no-fund --no-save \
    express@^5.1.0 \
    jsonwebtoken@^9.0.2 \
    bcrypt@^6.0.0 \
    uuid@^13.0.0 \
    zod@^4.1.12 \
    bcryptjs@^2.4.3 && \
    npm cache clean --force

# Dev-time shim: if code imports 'bcrypt' but project uses the pure-JS 'bcryptjs',
# create a small package that re-exports bcryptjs so imports like `import bcrypt from 'bcrypt'`
# resolve in the image without requiring native bcrypt compilation.
RUN node -e "const fs=require('fs'); const dir='/app/node_modules/bcrypt'; fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(dir+'/package.json', JSON.stringify({name:'bcrypt',version:'0.0.0',type:'module','main':'index.js'})); fs.writeFileSync(dir+'/index.js', 'import bcryptjs from \"bcryptjs\"; export default bcryptjs;');"

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

# Copy dependencies from base stage
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nodejs:nodejs /app/package.json ./

# Copy application code and pre-built shared libraries
COPY --chown=nodejs:nodejs apps/api ./apps/api
COPY --chown=nodejs:nodejs libs/shared/dist ./node_modules/@political-sphere/shared

# Ensure bcrypt shim exists in the final image
RUN node -e "const fs=require('fs'); const dir='/app/node_modules/bcrypt'; fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(dir+'/package.json', JSON.stringify({name:'bcrypt',version:'0.0.0',type:'module','main':'index.js'})); fs.writeFileSync(dir+'/index.js', 'import bcryptjs from \"bcryptjs\"; export default bcryptjs;');"

# Security: Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 4000

CMD ["node", "apps/api/src/index.js"]
