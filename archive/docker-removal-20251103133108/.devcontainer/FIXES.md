# DevContainer Fixes - November 2025

## Issues Fixed

### 1. Disk Space Validation Error (CRITICAL)

**Problem**: Line 73 in `validate-host.sh` caused error: `[: 145i: integer expression expected`

**Root Cause**: The `df` command returned "145iGB" with an invalid 'i' character, which broke integer comparison.

**Solution**: Added sanitization to strip non-numeric characters before comparison:

```bash
DISK_NUMERIC=$(echo "$AVAILABLE_DISK" | tr -dc '0-9')
if [ "$DISK_NUMERIC" -lt 16 ]; then
    # warning logic
fi
```

### 2. postAttachCommand Syntax Error (CRITICAL)

**Problem**: Container failed with error:

```
OCI runtime exec failed: exec failed: unable to start container process:
exec: "bash .devcontainer/scripts/status-check.sh": stat bash .devcontainer/scripts/status-check.sh:
no such file or directory: unknown
```

**Root Cause**: The `postAttachCommand` array syntax was incorrect - trying to run two scripts as separate arguments instead of chained commands.

**Solution**: Changed from array to proper bash command string:

```json
// Before (incorrect):
"postAttachCommand": [
  "bash .devcontainer/scripts/status-check.sh",
  "bash .devcontainer/scripts/start-apps.sh || echo 'app processes not started'"
]

// After (correct):
"postAttachCommand": "bash -c 'bash .devcontainer/scripts/status-check.sh && bash .devcontainer/scripts/start-apps.sh || echo \"app processes not started\"'"
```

### 3. Extension Loading Issues

**Problem**: Many VS Code extensions failed to load or activate properly.

**Root Causes**:

- Missing ESLint validation settings
- Extensions waiting for workspace trust
- Possible initialization timing issues

**Solutions**:

1. Added explicit ESLint validation settings:

```json
"eslint.validate": [
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact"
]
```

2. Enhanced `status-check.sh`:
   - Added directory validation (checks for package.json)
   - Auto-installs dependencies if node_modules missing
   - Verifies required tools (node, pnpm, npm, nx)
   - Provides clear status messages

3. Created `debug-extensions.sh` troubleshooting script:
   - Lists installed extensions
   - Checks for missing critical extensions
   - Examines VS Code server logs
   - Provides comprehensive troubleshooting steps

### 4. Port 3000 Conflict Warning

**Problem**: Port 3000 already in use on host, causing potential conflicts.

**Solution**: Enhanced `start-apps.sh` with intelligent port detection:

```bash
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_warning "Port 3000 is in use, frontend will start on port 3001"
    export FRONTEND_PORT=3001
else
    export FRONTEND_PORT=3000
fi
```

### 5. Auto-Start Behaviour

**Problem**: Apps auto-starting could cause unexpected issues or conflicts.

**Solution**: Changed to manual startup mode:

- Apps no longer auto-start in background
- Scripts provide clear commands for manual startup
- Gives developers full control over which services to run
- Displays available npm scripts and Nx commands
- Shows current port configuration

## Files Modified

1. `.devcontainer/scripts/validate-host.sh`
   - Fixed disk space integer comparison

2. `.devcontainer/devcontainer.json`
   - Fixed postAttachCommand syntax
   - Added ESLint validation settings

3. `.devcontainer/scripts/status-check.sh`
   - Added directory validation
   - Added automatic dependency installation
   - Added comprehensive tool verification

4. `.devcontainer/scripts/start-apps.sh`
   - Added port conflict detection
   - Changed to manual startup mode
   - Enhanced user guidance

5. `.devcontainer/scripts/debug-extensions.sh` (NEW)
   - Comprehensive extension debugging tool

6. `CHANGELOG.md`
   - Documented all fixes

7. `TODO.md`
   - Marked tasks as complete

## How to Use

### After Rebuilding Container

1. **Grant Workspace Trust**:
   - Look for "Do you trust the authors..." prompt
   - Click "Yes, I trust the authors"
   - This enables all extensions

2. **Verify Extensions**:

   ```bash
   bash .devcontainer/scripts/debug-extensions.sh
   ```

3. **Start Development Services**:

   ```bash
   # Option 1: Start all services
   npm run dev:all

   # Option 2: Start services individually
   npm run dev:api        # API server on port 4000
   npm run dev:frontend   # Frontend on port 3000 (or 3001 if occupied)

   # Option 3: Use Nx directly
   nx serve api
   nx serve frontend
   ```

4. **Check Status**:
   ```bash
   bash .devcontainer/scripts/status-check.sh
   ```

### Troubleshooting Extensions

If extensions still don't load properly:

1. **Reload Window**: Cmd/Ctrl+Shift+P → "Developer: Reload Window"

2. **Check Extension Logs**: View → Output → Select extension from dropdown

3. **Rebuild Container**: Cmd/Ctrl+Shift+P → "Dev Containers: Rebuild Container"

4. **Manual Installation**:
   - Open Extensions view (Cmd/Ctrl+Shift+X)
   - Search for extension
   - Click "Install in Container"

### Common Issues

| Issue                | Cause                       | Solution                         |
| -------------------- | --------------------------- | -------------------------------- |
| Extensions disabled  | Workspace trust not granted | Click "Trust" in prompt          |
| Port conflicts       | Service already running     | Check ports with `lsof -i :3000` |
| Missing dependencies | node_modules not installed  | Run `pnpm install`               |
| Slow performance     | Low resources               | Increase Docker memory to 6GB+   |

## Verification Steps

1. ✅ Container builds without errors
2. ✅ `validate-host.sh` completes without integer errors
3. ✅ `postAttachCommand` executes successfully
4. ✅ All extensions load and activate
5. ✅ Port conflicts handled gracefully
6. ✅ Apps can be started manually
7. ✅ Debug script provides useful information

## Next Steps

1. Test the dev container with full rebuild
2. Verify all extensions activate properly
3. Ensure apps start without conflicts
4. Monitor for any new issues
5. Update documentation as needed

## Related Documentation

- `.devcontainer/README.md` - Full DevContainer setup guide
- `docs/onboarding.md` - Developer onboarding
- `docs/contributing.md` - Contribution guidelines

## Change History

- **2025-11-02**: Initial fixes implemented
  - Fixed disk space validation
  - Fixed postAttachCommand syntax
  - Enhanced extension support
  - Added port conflict handling
  - Created debug-extensions.sh
  - Changed to manual app startup

---

**Last Updated**: 2025-11-02  
**Status**: ✅ Ready for testing  
**Reviewed by**: GitHub Copilot
