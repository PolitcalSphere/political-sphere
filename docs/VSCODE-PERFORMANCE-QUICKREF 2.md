# VS Code Performance - Quick Reference

## 🚀 Quick Fixes (In Order)

1. **Run cleanup script:**

   ```bash
   ./scripts/cleanup-processes.sh
   ```

2. **Reload VS Code:**  
   `Cmd+Shift+P` → `Developer: Reload Window`

3. **Restart TypeScript:**  
   `Cmd+Shift+P` → `TypeScript: Restart TS Server`

4. **Close unused tabs:**  
   `Cmd+K W` (close all) or `Cmd+W` (close current)

5. **Full restart:**  
   `Cmd+Q` then relaunch VS Code

## 📊 Check System Health

```bash
# Process count (should be < 30)
ps aux | grep -E "(Code|node)" | grep -v grep | wc -l

# System load (should be < 8.0 on 12-core)
uptime

# Test processes (should be 0 when idle)
ps aux | grep -E "(vitest|playwright)" | grep -v grep
```

## ⚡ Performance Targets

| Metric            | Good  | Action Needed |
| ----------------- | ----- | ------------- |
| VS Code processes | < 30  | > 40          |
| System load       | < 8.0 | > 12.0        |
| AI response time  | < 2s  | > 5s          |

## 🛠️ Common Issues

**Slow AI responses:**

- Run: `./scripts/cleanup-processes.sh`
- Then: Reload VS Code window

**TypeScript slow:**

- `Cmd+Shift+P` → `TypeScript: Restart TS Server`

**Multiple test runners:**

- Run: `pkill -f vitest`

## 📚 Full Guide

See [docs/VSCODE-PERFORMANCE.md](./VSCODE-PERFORMANCE.md) for comprehensive guide.
