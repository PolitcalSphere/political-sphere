#!/usr/bin/env bash
export APP_NAME="feature-dashboard-remote"
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app-audit-microfrontend.sh"
