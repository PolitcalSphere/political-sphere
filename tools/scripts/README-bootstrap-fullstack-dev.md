# Bootstrap Fullstack Development Infrastructure

To start all required infrastructure and app servers for a complete development session, use:

```bash
./scripts/bootstrap-fullstack-dev.sh
```

This script will:
- Run the core infrastructure bootstrap (`bootstrap-dev.sh`)
- Start frontend dev server (`nx serve frontend`)
- Start API/backend dev server (`nx serve api`)
- Start worker/remote/host dev servers if present
- Start local database via Docker Compose if `data/docker-compose.yml` exists
- Start Storybook for UI library if present
- (Optionally) Start test watcher and linter daemon (uncomment in script if needed)

**Run this script at the start of every fullstack development session.**

Logs for each service are written to their respective directories (e.g. `apps/frontend/frontend-dev.log`).

For troubleshooting, check the logs or ensure Docker and Nx are installed and available in your PATH.
