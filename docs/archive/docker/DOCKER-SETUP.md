# Docker Setup for Political Sphere

This directory contains the complete Docker containerization setup for Political Sphere, optimized for MacBook Pro (2018) with 16GB RAM and 6-core CPU.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Architecture](#architecture)
- [Services](#services)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [MacBook Pro Optimizations](#macbook-pro-optimizations)

## 🚀 Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start all services
npm run docker:up

# 3. Seed database with test data
npm run docker:seed

# 4. Check service status
npm run docker:status

# 5. Access services
# Frontend:   http://localhost:3000
# API:        http://localhost:4000
# Keycloak:   http://localhost:8080
# Grafana:    http://localhost:3001
```

## 💻 System Requirements

### Minimum Requirements
- **RAM**: 12GB available
- **CPU**: 4 cores
- **Disk**: 20GB free space
- **Docker Desktop**: 4.25+ with Compose V2

### Recommended (MacBook Pro 2018)
- **RAM**: 16GB total (allocate 8-12GB to Docker)
- **CPU**: 6 cores
- **Disk**: 40GB SSD space
- **Docker Desktop**: Latest version

### Docker Desktop Configuration

1. Open Docker Desktop → Settings → Resources
2. Set the following:
   - **Memory**: 8-12GB (out of 16GB total)
   - **CPUs**: 4-5 cores (out of 6 total)
   - **Disk**: 40GB+
   - **Swap**: 2GB

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                          │
│                  (political-sphere-network)                 │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │   Frontend    │  │      API      │  │    Worker     │  │
│  │   (React)     │──│   (Node.js)   │──│  (Background) │  │
│  │   Port 3000   │  │   Port 4000   │  │               │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
│         │                  │                   │           │
│         │                  │                   │           │
│  ┌──────┴──────────────────┴───────────────────┘           │
│  │                                                          │
│  ▼                  ▼                   ▼                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  PostgreSQL   │  │     Redis     │  │   Keycloak    │  │
│  │   Port 5432   │  │   Port 6379   │  │   Port 8080   │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           Observability Stack                         │ │
│  │  Prometheus (9090) + Grafana (3001)                  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Services

### Core Infrastructure

| Service    | Port | Purpose | Health Check |
|------------|------|---------|--------------|
| PostgreSQL | 5432 | Primary database | pg_isready |
| Redis      | 6379 | Cache & sessions | redis-cli ping |
| Keycloak   | 8080 | Authentication | /health/ready |

### Application Services

| Service  | Port | Purpose | Hot Reload |
|----------|------|---------|------------|
| API      | 4000 | Backend REST API | ✅ Yes |
| Frontend | 3000 | React UI | ✅ Yes |
| Worker   | -    | Background jobs | ✅ Yes |

### Development Tools

| Service    | Port | Purpose | Credentials |
|------------|------|---------|-------------|
| pgAdmin    | 5050 | DB management | admin@political-sphere.local / admin |
| MailHog    | 8025 | Email testing | No auth |
| LocalStack | 4566 | AWS emulation | test / test |

### Observability

| Service    | Port | Purpose | Credentials |
|------------|------|---------|-------------|
| Prometheus | 9090 | Metrics | No auth |
| Grafana    | 3001 | Dashboards | admin / admin |

## 🔧 Development Workflow

### Starting Services

```bash
# Start minimal infrastructure only
npm run docker:up -- --minimal

# Start with monitoring
npm run docker:up -- --monitoring

# Start everything
npm run docker:up -- --full

# Default (infrastructure + apps)
npm run docker:up
```

### Stopping Services

```bash
# Stop services (preserve data)
npm run docker:down

# Stop and remove volumes (WARNING: deletes data)
npm run docker:down -- --clean

# Stop and prune unused resources
npm run docker:down -- --prune
```

### Service Management

```bash
# Check service status
npm run docker:status

# View logs
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f --tail=100 postgres

# Restart a service
docker compose restart api

# Execute commands in container
docker compose exec api sh
docker compose exec postgres psql -U political -d political_dev

# Run database migrations
docker compose exec api node apps/api/src/migrations.js
```

### Database Operations

```bash
# Seed database
npm run docker:seed

# Access PostgreSQL
docker compose exec postgres psql -U political -d political_dev

# Backup database
docker compose exec postgres pg_dump -U political political_dev > backup.sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U political -d political_dev

# Access pgAdmin
open http://localhost:5050
```

### Hot Reload

All application services support hot reload:

- **API**: Changes in `apps/api/` trigger automatic restart
- **Frontend**: Changes in `apps/frontend/` trigger HMR (Hot Module Replacement)
- **Worker**: Changes in `apps/worker/` trigger automatic restart

Shared libraries in `libs/` are watched and changes trigger service restarts.

## 🐛 Troubleshooting

### Services Won't Start

**Problem**: Services fail to start or become unhealthy

**Solutions**:
```bash
# 1. Check Docker resources
docker system df
docker system prune  # Clean up space

# 2. Check service logs
docker compose logs api

# 3. Restart Docker Desktop
# macOS: Click Docker icon → Restart

# 4. Reset everything
npm run docker:down -- --clean --prune
npm run docker:up
```

### Out of Memory

**Problem**: Docker runs out of memory

**Solutions**:
1. Increase Docker memory in Docker Desktop settings
2. Use minimal mode: `npm run docker:up -- --minimal`
3. Close other applications
4. Restart your Mac

### Port Conflicts

**Problem**: Port already in use

**Solutions**:
```bash
# Find process using port
lsof -i :3000  # Replace 3000 with your port
kill -9 <PID>  # Kill the process

# Or change port in .env
FRONTEND_PORT=3001
```

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solutions**:
```bash
# 1. Check PostgreSQL health
docker compose ps postgres

# 2. View logs
docker compose logs postgres

# 3. Restart PostgreSQL
docker compose restart postgres

# 4. Verify connection string in .env
DATABASE_URL=postgresql://political:changeme@localhost:5432/political_dev
```

### Slow Performance

**Problem**: Docker services are slow

**Solutions**:
1. **Use cached volumes**: Already configured in docker-compose.yml
2. **Enable VirtioFS**: Docker Desktop → Settings → General → "VirtioFS"
3. **Reduce resource limits**: Edit .env file:
   ```
   DOCKER_MEMORY_LIMIT=8G
   DOCKER_CPU_LIMIT=4.0
   ```
4. **Close unused services**:
   ```bash
   docker compose stop pgadmin mailhog prometheus grafana
   ```

## ⚡ MacBook Pro Optimizations

### Resource Allocation

The docker-compose.yml is pre-configured with optimal resource limits for MacBook Pro 2018:

| Service  | CPU Limit | Memory Limit | Reasoning |
|----------|-----------|--------------|-----------|
| API      | 2.0       | 2GB          | Node.js + TypeScript |
| Frontend | 2.0       | 2GB          | React build tools |
| Worker   | 1.0       | 1GB          | Background processing |
| PostgreSQL | 1.0     | 1GB          | Database operations |
| Redis    | 0.5       | 512MB        | In-memory cache |
| Keycloak | 1.0       | 1.5GB        | Java-based auth |

**Total**: ~5 CPUs, ~9GB RAM (leaves 3GB for macOS)

### Performance Tips

1. **Enable File Sharing Performance Features**:
   - Docker Desktop → Settings → General
   - Enable "Use the new Virtualization framework"
   - Enable "VirtioFS" for faster file operations

2. **Use Named Volumes for node_modules**:
   ```yaml
   volumes:
     - ./apps/api:/app/apps/api:cached
     - api-node-modules:/app/node_modules  # Faster than bind mount
   ```

3. **Reduce Logging Overhead**:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

4. **Prune Regularly**:
   ```bash
   # Weekly cleanup
   docker system prune -a --volumes
   ```

### Battery Saving Mode

When on battery power, reduce resource usage:

```bash
# Stop non-essential services
docker compose stop pgadmin mailhog prometheus grafana node-exporter

# Reduce worker interval
export WORKER_INTERVAL_MS=60000  # 1 minute instead of 15 seconds

# Use minimal mode
npm run docker:up -- --minimal
```

### Monitoring Resource Usage

```bash
# Real-time stats
docker stats

# Disk usage
docker system df

# Service-specific stats
npm run docker:status
```

## 🔒 Security Notes

### Development Security

- **Default credentials are insecure** - Change them in production
- **.env files are git-ignored** - Never commit credentials
- **Secrets in .env.example** - Template only, no real secrets

### Production Considerations

1. Use AWS Secrets Manager for production secrets
2. Enable TLS/SSL for all services
3. Change all default passwords
4. Use non-root users (already configured in Dockerfiles)
5. Enable read-only filesystems where possible
6. Scan images for vulnerabilities:
   ```bash
   docker scan political-sphere-api:latest
   ```

## 📚 Additional Resources

- [Docker Documentation](./docs/docker/)
- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./apps/api/README.md)
- [Frontend Documentation](./apps/frontend/README.md)
- [Worker Documentation](./apps/worker/README.md)

## 🆘 Getting Help

1. Check service logs: `docker compose logs [service]`
2. Run status check: `npm run docker:status`
3. Review troubleshooting section above
4. Check GitHub issues: [Project Issues](https://github.com/PoliticalSphere/political-sphere/issues)

## 📝 Quick Reference

```bash
# Essential commands
npm run docker:up           # Start services
npm run docker:down         # Stop services
npm run docker:status       # Check health
npm run docker:seed         # Seed database

# Direct docker-compose commands
docker compose up -d        # Start in background
docker compose ps           # List services
docker compose logs -f api  # Follow API logs
docker compose restart api  # Restart API
docker compose exec api sh  # Shell into API
docker compose down -v      # Stop + remove volumes
```

---

**Last Updated**: 2025-11-03  
**Version**: 1.0.0  
**Maintained by**: Political Sphere Team
