# Bootstrap Development Infrastructure

To ensure all required infrastructure for fast AI and development sessions is running, use the bootstrap script:

```bash
./scripts/bootstrap-dev.sh
```

This script will:
- Start Docker Desktop if not running
- Start the monitoring stack (Grafana, Prometheus, Otel Collector, Jaeger)
- Start the semantic code index server
- Start the AI cache/context preloader
- Start the AI metrics server (if present)
- Start the Nx daemon

**Run this script at the start of every development session.**

You can also add this to your onboarding instructions, Makefile, or as a pre-hook in your dev environment to automate infrastructure startup for both Copilot and Blackbox.

---

For troubleshooting, check the logs in:
- `ai-cache/index-server.log`
- `ai-cache/context-preloader.log`
- `ai-metrics/metrics-server.log`
- `nx-daemon.log`

If you encounter issues with Docker, ensure Docker Desktop is installed and running.
