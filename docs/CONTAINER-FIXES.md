# Container Issues - Resolution Guide

## Issues Identified

### 1. Docker-in-Docker Permission Issues (PRIMARY)

**Problem**: Docker daemon cannot start inside the dev container due to:
- Missing `sudo` command (required by docker-init.sh)
- Restrictive security settings in docker-compose.dev.yaml
- Docker socket owned by root:root (GID 0)

**Root Cause**: The docker-compose.dev.yaml has conflicting security settings:
```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
```

These settings prevent the Docker-in-Docker feature from functioning properly.

### 2. Monitoring Stack Cannot Start

**Problem**: The monitoring stack (Grafana, Prometheus, Jaeger) requires Docker to run, but Docker is not accessible inside the container.

## Solutions Implemented

### Solution 1: Updated Docker Compose Configuration

**File**: `apps/dev/docker/docker-compose.dev.yaml`

Changed the `dev` service configuration to enable Docker-in-Docker:

```yaml
# Before (too restrictive)
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL

# After (enables Docker-in-Docker)
privileged: true
security_opt:
  - no-new-privileges:false
cap_add:
  - SYS_ADMIN
  - NET_ADMIN
```

**Note**: This change requires rebuilding the dev container to take effect.

### Solution 2: Created Docker Helper Script

**File**: `scripts/docker-helper.sh`

A comprehensive script to manage Docker and services:

```bash
# Check status
bash scripts/docker-helper.sh status

# Start Docker daemon
bash scripts/docker-helper.sh start-daemon

# Start monitoring stack
bash scripts/docker-helper.sh start-monitoring

# Stop monitoring stack
bash scripts/docker-helper.sh stop-monitoring
```

### Solution 3: Removed Obsolete Docker Compose Version

**File**: `monitoring/docker-compose.yml`

Removed the `version: '3.8'` line which is obsolete and causes warnings in newer Docker Compose versions.

## How to Apply the Fixes

### Option A: Rebuild the Dev Container (RECOMMENDED)

This applies all fixes permanently:

1. **Save your work and commit changes**

2. **Rebuild the container**:
   - Press `Cmd/Ctrl + Shift + P`
   - Select "Dev Containers: Rebuild Container"
   - Wait for rebuild to complete (5-10 minutes)

3. **Verify Docker works**:
   ```bash
   docker info
   ```

4. **Start monitoring stack**:
   ```bash
   bash scripts/docker-helper.sh start-monitoring
   ```

### Option B: Run from Host (TEMPORARY WORKAROUND)

If you cannot rebuild right now, run Docker commands from your host machine:

1. **Open a terminal on your HOST machine** (not in the container)

2. **Navigate to the project monitoring directory**:
   ```bash
   cd path/to/political-sphere/monitoring
   ```

3. **Start the monitoring stack**:
   ```bash
   docker compose up -d
   ```

4. **Access services**:
   - Grafana: http://localhost:3000 (admin/admin)
   - Prometheus: http://localhost:9090
   - Jaeger: http://localhost:16686

5. **Stop when done**:
   ```bash
   docker compose down
   ```

## Security Considerations

### Trade-offs

The updated configuration uses `privileged: true` which is necessary for Docker-in-Docker but reduces container isolation. This is acceptable for development environments but should NOT be used in production.

**Why this is safe for development**:
- Dev containers are isolated from production
- Used only by trusted developers
- Required for legitimate development workflows
- Standard practice for Docker-in-Docker scenarios

**Alternative Approaches**:
If you're uncomfortable with privileged mode, you can:
1. Use Option B (run from host) permanently
2. Use a separate VM for Docker operations
3. Use cloud-based development environments

## Verification Steps

After rebuilding the container:

1. ✅ **Test Docker access**:
   ```bash
   docker version
   docker ps
   ```

2. ✅ **Test monitoring stack**:
   ```bash
   bash scripts/docker-helper.sh start-monitoring
   curl http://localhost:9090/-/healthy
   ```

3. ✅ **Test core services**:
   ```bash
   bash scripts/docker-helper.sh status
   ```

4. ✅ **Check ports**:
   ```bash
   netstat -tlnp | grep -E '(3000|9090|16686)'
   ```

## Troubleshooting

### Docker daemon still won't start after rebuild

**Check**:
```bash
cat /tmp/docker-init.log
ps aux | grep dockerd
```

**If sudo errors persist**, the Docker-in-Docker feature may not be properly installed. Verify in devcontainer.json:
```jsonc
"features": {
  "ghcr.io/devcontainers/features/docker-in-docker:2": {
    "moby": true,
    "dockerDashComposeVersion": "v2"
  }
}
```

### Port conflicts (especially port 3000)

Grafana uses port 3000, which may conflict with the frontend:

**Option 1: Change Grafana port**
Edit `monitoring/docker-compose.yml`:
```yaml
grafana:
  ports:
    - '3003:3000'  # Changed from 3000:3000
```

**Option 2: Run services separately**
Don't run frontend and monitoring stack simultaneously.

### Container rebuild fails

**Clear Docker cache**:
```bash
# From host machine
docker system prune -a
docker volume prune
```

Then rebuild the container.

## Summary

| Status | Item | Action Required |
|--------|------|-----------------|
| ✅ | Core services (Postgres, Redis) | Working - no action needed |
| ✅ | Docker-compose config updated | Rebuild container to apply |
| ✅ | Helper script created | Available immediately |
| ✅ | Version warning fixed | Applied immediately |
| ⚠️ | Docker-in-Docker | Requires container rebuild |
| ⚠️ | Monitoring stack | Start after rebuild OR use host |

## Next Steps

1. **Immediate**: Use workaround (Option B) to start monitoring from host
2. **When convenient**: Rebuild container (Option A) for permanent fix
3. **After rebuild**: Use `docker-helper.sh` for easy service management

## Files Modified

- `apps/dev/docker/docker-compose.dev.yaml` - Updated security settings
- `monitoring/docker-compose.yml` - Removed obsolete version field
- `scripts/docker-helper.sh` - NEW: Docker management script
- `docs/CONTAINER-FIXES.md` - NEW: This documentation

## References

- [Docker-in-Docker Feature](https://github.com/devcontainers/features/tree/main/src/docker-in-docker)
- [Dev Containers Security](https://code.visualstudio.com/remote/advancedcontainers/improve-performance#_use-a-targeted-named-volume)
- [Project DevContainer Docs](.devcontainer/README.md)
