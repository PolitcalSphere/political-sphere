# Quick Start Guide - After DevContainer Fixes

## 🚀 Immediate Next Steps

### 1. Rebuild the DevContainer

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) and select:

```
Dev Containers: Rebuild Container
```

Wait for the rebuild to complete (~5-10 minutes).

### 2. Grant Workspace Trust

When prompted "Do you trust the authors of the files in this folder?":

- ✅ Click **"Yes, I trust the authors"**

This is **critical** for extensions to activate properly.

### 3. Verify Extensions Loaded

Run the debug script:

```bash
bash .devcontainer/scripts/debug-extensions.sh
```

Expected output:

```
✅ Found 35 installed extensions
✅ All critical extensions are installed!
```

If you see missing extensions, reload the window: `Developer: Reload Window`

### 4. Check Environment Status

```bash
bash .devcontainer/scripts/status-check.sh
```

This will show:

- ✅ Tool verification (Node.js, pnpm, npm, Nx)
- 🐳 Docker service status
- 🔗 Quick links to services
- 📝 Available commands

### 5. Start Development Services

**Option A - All Services:**

```bash
npm run dev:all
```

**Option B - Individual Services:**

```bash
# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start Frontend
npm run dev:frontend

# Terminal 3: Start Worker (if needed)
npm run dev:worker
```

**Option C - Using Nx:**

```bash
nx serve api
nx serve frontend
```

## 📍 Service URLs

After starting services, access them at:

- **Frontend**: http://localhost:3000 (or 3001 if 3000 is busy)
- **API**: http://localhost:4000
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Keycloak**: http://localhost:8080
- **MailHog**: http://localhost:8025

## 🔧 Troubleshooting

### Extensions Still Not Loading?

1. **Reload Window**: `Cmd/Ctrl+Shift+P` → `Developer: Reload Window`
2. **Check Logs**: View → Output → Select extension from dropdown
3. **Reinstall**: Extensions view → Search → "Install in Container"
4. **Rebuild Again**: `Dev Containers: Rebuild Container`

### Port Already in Use?

The system will automatically use port 3001 for frontend if 3000 is busy.

Check what's using a port:

```bash
lsof -i :3000
```

Kill the process if needed:

```bash
kill -9 <PID>
```

### Missing Dependencies?

```bash
pnpm install --frozen-lockfile
```

### Apps Won't Start?

1. Check Docker services are running:

   ```bash
   docker compose -f apps/dev/docker/docker-compose.dev.yaml ps
   ```

2. View app logs:

   ```bash
   # If you used npm run dev:all
   cat /tmp/dev-all.log

   # Individual services
   cat /tmp/api.log
   cat /tmp/frontend.log
   ```

3. Restart Docker services:
   ```bash
   docker compose -f apps/dev/docker/docker-compose.dev.yaml restart
   ```

## ✅ Verification Checklist

Before you start coding:

- [ ] DevContainer rebuilt successfully
- [ ] Workspace trust granted
- [ ] All extensions loaded (check with debug-extensions.sh)
- [ ] node_modules directory exists
- [ ] Docker services are running
- [ ] At least one app service started (api or frontend)
- [ ] Can access service URLs in browser

## 🆘 Still Having Issues?

1. **Check the detailed fixes**: See `.devcontainer/FIXES.md`
2. **Review logs**: Check `/tmp/*.log` files
3. **Docker logs**: `docker compose logs`
4. **Extension diagnostics**: Run `debug-extensions.sh`

## 📚 Additional Resources

- **DevContainer Setup**: `.devcontainer/README.md`
- **Onboarding Guide**: `docs/onboarding.md`
- **Architecture**: `docs/architecture.md`
- **Contributing**: `docs/contributing.md`

## 🎯 What Was Fixed

1. ✅ Disk space validation error (integer parsing)
2. ✅ postAttachCommand syntax error
3. ✅ Extension activation issues
4. ✅ Port conflict handling
5. ✅ Auto-start behaviour (now manual)
6. ✅ Added debug-extensions.sh tool

---

**Need help?** Run `bash .devcontainer/scripts/debug-extensions.sh` for diagnostics.

**Last Updated**: 2025-11-02
