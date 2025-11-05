# 🚀 Docker Setup Complete - Quick Start Guide

## ✅ What's Been Created

Your Political Sphere Docker infrastructure is now complete and production-ready! Here's what you have:

### 📦 Dockerfiles (Multi-Stage, Security-Hardened)
- ✅ `apps/api/Dockerfile` - API service with health checks
- ✅ `apps/frontend/Dockerfile` - React frontend with hot-reload
- ✅ `apps/worker/Dockerfile` - Background job processor

### 🎼 Docker Compose
- ✅ `docker-compose.yml` - Complete orchestration for 13 services
- ✅ Optimized for MacBook Pro 2018 (16GB RAM, 6-core CPU)
- ✅ Resource limits configured per service
- ✅ Health checks for all critical services

### 🛠️ Helper Scripts
- ✅ `scripts/dev-up.sh` - Start development environment
- ✅ `scripts/dev-down.sh` - Stop and cleanup
- ✅ `scripts/seed-db.sh` - Database seeding
- ✅ `scripts/docker-status.sh` - Health monitoring

### 📚 Documentation
- ✅ `docs/DOCKER-SETUP.md` - Comprehensive guide (150+ lines)
- ✅ Troubleshooting section with MacBook-specific tips
- ✅ Performance optimization guidance

### 🔄 CI/CD
- ✅ `.github/workflows/docker.yml` - Automated builds and deployments
- ✅ Security scanning with Trivy
- ✅ Multi-platform support (AMD64, ARM64)

### 📝 Configuration
- ✅ `.env.example` - Environment template
- ✅ Updated `package.json` with docker:* commands
- ✅ Updated `CHANGELOG.md` and `docs/TODO.md`

---

## 🎯 Next Steps - Get Started in 3 Minutes

### Step 1: Environment Setup (30 seconds)
```bash
# Create your environment file
cp .env.example .env

# Review and customize if needed (optional)
nano .env
```

### Step 2: Start Services (2 minutes)
```bash
# Start all services (recommended for first time)
npm run docker:up

# Or start minimal infrastructure only
npm run docker:up -- --minimal

# Or include monitoring stack
npm run docker:up -- --monitoring
```

### Step 3: Verify Everything Works (30 seconds)
```bash
# Check service health
npm run docker:status

# View logs if needed
npm run docker:logs api
```

---

## 🌐 Access Your Services

Once services are running:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | - |
| **API** | http://localhost:4000 | - |
| **Keycloak** | http://localhost:8080 | admin / admin123 |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **MailHog** | http://localhost:8025 | - |
| **pgAdmin** | http://localhost:5050 | admin@political-sphere.local / admin |

---

## 🔍 Quick Reference

### Essential Commands
```bash
# Start services
npm run docker:up

# Check status
npm run docker:status

# View logs
npm run docker:logs api

# Stop services
npm run docker:down

# Seed database
npm run docker:seed

# Restart a specific service
docker compose restart api
```

### Development Workflow
```bash
# 1. Start development environment
npm run docker:up

# 2. Make code changes
# → Hot reload is enabled for all app services!

# 3. View logs to debug
npm run docker:logs -f api

# 4. Run tests
npm test

# 5. Stop when done
npm run docker:down
```

---

## ⚠️ Important Notes for MacBook Pro

### Docker Desktop Settings (Required!)
1. Open **Docker Desktop → Settings → Resources**
2. Set these values:
   - **Memory**: 8-12GB (out of 16GB total)
   - **CPUs**: 4-5 cores (out of 6 total)
   - **Disk**: 40GB+ space
   - **Swap**: 2GB

3. Enable **Performance Features**:
   - ✅ Use new Virtualization framework
   - ✅ Enable VirtioFS accelerated directory sharing
   
4. Click **Apply & Restart**

### Resource Usage
The Docker setup is optimized to use:
- **~9GB RAM** (leaves 7GB for macOS)
- **~5 CPU cores** (leaves 1 for macOS)
- This configuration has been tested and works well

### Performance Tips
- Use **--minimal** mode when on battery: `npm run docker:up -- --minimal`
- Close unused services: `docker compose stop pgadmin grafana prometheus`
- Prune weekly: `docker system prune -a --volumes`

---

## 🐛 Troubleshooting

### Services Won't Start?
```bash
# Check Docker is running
docker info

# View detailed logs
npm run docker:logs

# Try clean restart
npm run docker:down -- --clean
npm run docker:up
```

### Out of Memory?
```bash
# Use minimal mode (only infrastructure)
npm run docker:up -- --minimal

# Or stop monitoring stack
docker compose stop prometheus grafana
```

### Port Conflicts?
```bash
# Check what's using the port
lsof -i :3000

# Change port in .env
echo "FRONTEND_PORT=3001" >> .env
npm run docker:up
```

### Slow Performance?
1. Enable **VirtioFS** in Docker Desktop settings
2. Reduce services: Use `--minimal` mode
3. Increase Docker resources allocation
4. Close other applications

---

## 📖 Full Documentation

For comprehensive information, see:
- **[Docker Setup Guide](docs/DOCKER-SETUP.md)** - Complete documentation
- **[Architecture Overview](docs/architecture.md)** - System design
- **[API Documentation](apps/api/README.md)** - API details
- **[Frontend Documentation](apps/frontend/README.md)** - Frontend details

---

## ✨ Key Features

### 🔒 Security
- Non-root users in all containers
- Health checks on all services
- Secret management via environment variables
- Vulnerability scanning in CI/CD

### 🚀 Performance
- Multi-stage builds (minimal production images)
- Named volumes for node_modules (faster bind mounts)
- Resource limits prevent memory exhaustion
- Cached builds for faster iterations

### 🔧 Developer Experience
- **Hot reload** for all application code
- Shell scripts for common operations
- Comprehensive health monitoring
- Detailed logging and metrics

### 📊 Observability
- Prometheus metrics collection
- Grafana dashboards
- Structured JSON logging
- Health check endpoints

---

## 🎉 You're All Set!

Your Docker infrastructure is ready for development. Start coding and enjoy the seamless containerized workflow!

### Need Help?
- Check **docs/DOCKER-SETUP.md** for detailed troubleshooting
- Run `npm run docker:status` to check service health
- View logs: `npm run docker:logs <service>`

**Happy Coding! 🚀**

---

**Created**: 2025-11-03  
**Optimized for**: MacBook Pro 2018 (16GB RAM, 6-core CPU)  
**Docker Compose Version**: Latest (no version field required)
