# VS Code Performance Optimization Guide

## 🐌 Symptoms of Performance Issues

- Slow AI assistant responses (Copilot, Blackbox AI)
- VS Code feels sluggish or unresponsive
- High CPU usage from Code Helper processes
- TypeScript IntelliSense delays
- System fans running loudly

## 🔍 Root Causes

Common causes in this workspace:

1. **Multiple Vitest worker processes** accumulating from the Vitest extension
2. **Playwright test servers** running in the background
3. **Multiple esbuild service processes** not terminating
4. **TypeScript server** watching too many files
5. **AI index servers** consuming resources
6. **File watchers** monitoring excluded directories

## ⚡ Quick Fixes

### 1. Run the Cleanup Script (Fastest)

```bash
./scripts/cleanup-processes.sh
```

This script automatically kills resource-intensive processes:

- Vitest workers
- Playwright test servers
- esbuild service processes
- AI index servers

### 2. Reload VS Code Window

**Cmd+Shift+P** → `Developer: Reload Window`

This is faster than restarting VS Code completely and resets most extension states.

### 3. Restart TypeScript Server

**Cmd+Shift+P** → `TypeScript: Restart TS Server`

Fixes TypeScript IntelliSense delays without full reload.

### 4. Close Unused Tabs

Close editor tabs you're not actively using. Each open file consumes memory.

## 🛠️ Preventive Measures

### VS Code Settings Applied

The workspace settings have been optimized to prevent common issues:

```json
{
  // Limit TypeScript memory usage
  "typescript.tsserver.maxTsServerMemory": 4096,

  // Exclude directories from TypeScript watching
  "typescript.tsserver.watchOptions": {
    "excludeDirectories": [
      "**/node_modules",
      "**/dist",
      "**/coverage",
      "**/ai-index",
      "**/ai-cache"
    ]
  },

  // Prevent Vitest from running all tests automatically
  "vitest.commandLine": "npx vitest --run --changed",
  "testing.automaticallyOpenPeekView": "never",
  "testing.openTesting": "neverOpen",

  // File watcher exclusions (already configured)
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/coverage/**": true,
    "**/ai-index/**": true,
    "**/ai-cache/**": true
  }
}
```

### Recommended Extensions Configuration

**Vitest Extension:**

- Only runs tests on changed files (`--changed`)
- Doesn't auto-open test panels
- Limited worker processes

**TypeScript:**

- Memory cap at 4GB
- Excludes build artifacts and caches
- No automatic type acquisition

## 📊 Monitoring Performance

### Check Running Processes

```bash
# Count VS Code/Node processes
ps aux | grep -E "(Code|node)" | grep -v grep | wc -l

# Check for runaway test processes
ps aux | grep -E "(vitest|playwright|jest)" | grep -v grep
```

### Check System Load

```bash
# macOS
top -l 1 -n 10 -o cpu

# System load averages
uptime
```

**Healthy load:** < 8.0 on a 12-core system
**Warning:** > 10.0
**Critical:** > 15.0

### Check File Handle Usage

```bash
# Count open file handles by Node processes
lsof -c node 2>/dev/null | wc -l
```

**Normal:** < 1000
**High:** 1000-5000
**Problematic:** > 5000

## 🚨 Emergency Recovery

If VS Code becomes completely unresponsive:

### 1. Force Kill Heavy Processes

```bash
# Kill all Vitest-related processes
pkill -9 -f vitest

# Kill TypeScript servers
pkill -9 -f tsserver

# Kill all VS Code extension hosts
pkill -9 -f "Code Helper"
```

**⚠️ Warning:** This will force-quit VS Code. Save your work first if possible.

### 2. Clear Caches

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Clear VS Code workspace cache
rm -rf .vscode/.cache

# Clear AI caches
rm -rf ai-cache ai-index ai/cache ai/ai-cache
```

### 3. Full VS Code Restart

1. Quit VS Code completely (Cmd+Q)
2. Wait 5 seconds
3. Relaunch VS Code
4. Wait for extensions to fully load before opening files

## 🎯 Best Practices

### Development Workflow

1. **Use targeted test runs** instead of running all tests:

   ```bash
   npm run test:changed      # Run tests for changed files
   npx vitest --run path/to/test.spec.ts  # Run specific test
   ```

2. **Close unused editor tabs** regularly

   - Use Cmd+W to close current tab
   - Use Cmd+K W to close all tabs

3. **Restart TypeScript server** after major changes:

   - Switching branches
   - Installing dependencies
   - Updating TypeScript version

4. **Run cleanup script** weekly or when you notice slowdown:
   ```bash
   ./scripts/cleanup-processes.sh
   ```

### Git Operations

```bash
# Clean branch switches (prevents file watcher issues)
git checkout main
# Then reload VS Code window
```

### NPM/PNPM Operations

```bash
# After installing dependencies, restart TypeScript
npm install
# Then: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## 🔧 Advanced Optimization

### For Extreme Cases

If you're still experiencing issues, consider:

1. **Disable unused extensions:**

   - Go to Extensions (Cmd+Shift+X)
   - Disable extensions you don't use daily
   - Restart VS Code

2. **Reduce TypeScript strictness temporarily:**

   ```json
   // In tsconfig.json (not recommended for commits)
   {
     "skipLibCheck": true,
     "skipDefaultLibCheck": true
   }
   ```

3. **Increase system resources:**

   - Close other applications
   - Add more RAM if < 16GB
   - Use an external monitor (reduce GPU load)

4. **Use project references** for large monorepos:
   - Already configured in this workspace
   - Reduces TypeScript compilation scope

## 📈 Performance Benchmarks

### Target Metrics

| Metric                  | Healthy | Acceptable | Action Required |
| ----------------------- | ------- | ---------- | --------------- |
| AI Response Time        | < 2s    | 2-5s       | > 5s            |
| TypeScript IntelliSense | < 500ms | 500ms-2s   | > 2s            |
| System Load Average     | < 8.0   | 8.0-12.0   | > 12.0          |
| VS Code Processes       | < 25    | 25-40      | > 40            |
| Memory Usage            | < 8GB   | 8-12GB     | > 12GB          |

### Common Patterns

- **Morning slowness:** VS Code indexing after overnight changes

  - Solution: Wait 2-3 minutes for indexing to complete

- **Post-merge slowness:** File watcher catching up with changes

  - Solution: Reload window after major merges

- **Gradual degradation:** Memory leaks in extensions
  - Solution: Full VS Code restart weekly

## 🆘 Getting Help

If performance issues persist:

1. **Run diagnostics:**

   ```bash
   ./scripts/cleanup-processes.sh
   # Note the output
   ```

2. **Check logs:**

   - **Cmd+Shift+P** → `Developer: Show Logs`
   - Look for errors or warnings

3. **Report issue:**
   - Include output from cleanup script
   - Include system specs (CPU, RAM)
   - Include VS Code version
   - List installed extensions

## 📚 Related Documentation

- [Contributing Guide](./contributing.md)
- [Development Workflow](./onboarding.md)
- [Testing Strategy](./05-engineering-and-devops/testing-strategy.md)
- [CI/CD Pipeline](./05-engineering-and-devops/ci-cd.md)

## 🔄 Maintenance Schedule

| Task                 | Frequency                | Command/Action                   |
| -------------------- | ------------------------ | -------------------------------- |
| Run cleanup script   | Weekly                   | `./scripts/cleanup-processes.sh` |
| Restart TypeScript   | After dependency updates | Cmd+Shift+P → Restart TS Server  |
| Clear caches         | Monthly                  | `rm -rf node_modules/.cache`     |
| Full VS Code restart | Weekly                   | Cmd+Q, then relaunch             |
| Review extensions    | Quarterly                | Disable unused extensions        |

---

**Last Updated:** 2025-11-04  
**Version:** 1.0.0  
**Owner:** Developer Experience Team
