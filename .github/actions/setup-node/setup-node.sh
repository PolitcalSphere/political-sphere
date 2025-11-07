#!/usr/bin/env bash
set -euo pipefail

# STATUS: OPERATIONAL
# Purpose: Resolve and activate a Node.js version from the GitHub runner toolcache.
# Inputs (env):
#   REQUESTED_VERSION - The requested Node.js version (e.g., 18.x, 20.x, 20.11.1)
# Outputs (file):
#   Writes resolved-version=<semver> to $GITHUB_OUTPUT
# Errors: Emits ::error workflow commands and exits non-zero on fatal conditions.

REQ="${REQUESTED_VERSION:-}"
if [[ -z "$REQ" ]]; then
	echo "::error title=Missing input::REQUESTED_VERSION env var not provided" >&2
	exit 2
fi

# Extract major (support '18', '18.x', '18.19.0')
MAJOR="$REQ"
if [[ "$MAJOR" == *.* ]]; then
	MAJOR="${MAJOR%%.*}"
fi
if ! [[ "$MAJOR" =~ ^[0-9]+$ ]]; then
	echo "::error title=Invalid node-version::Value must start with a numeric major (e.g. 18.x)" >&2
	exit 2
fi

OS="${RUNNER_OS:-}"
if [[ "$OS" == "Windows" ]]; then
	# On Windows runners, the tools directory is exposed via AGENT_TOOLSDIRECTORY
	# Typically: C:\hostedtoolcache\windows
	TOOLS_ROOT="${AGENT_TOOLSDIRECTORY:-}"
	if [[ -z "${TOOLS_ROOT}" ]]; then
		# Fallback to standard default if env missing
		TOOLS_ROOT="C:/hostedtoolcache/windows"
	fi
	TOOLCACHE="${TOOLS_ROOT//\\/\/}/node"
else
	# Linux/macOS default
	TOOLCACHE="/opt/hostedtoolcache/node"
fi

if [[ ! -d "$TOOLCACHE" ]]; then
	echo "::error title=Toolcache missing::Directory $TOOLCACHE not found (RUNNER_OS=${OS:-unknown})" >&2
	exit 1
fi

mapfile -t CANDIDATES < <(ls -1 "$TOOLCACHE" | grep -E "^${MAJOR}\\.[0-9]+\\.[0-9]+$" | sort -V || true)
if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
	echo "::error title=Version not found::No Node ${MAJOR}.x versions present in toolcache" >&2
	echo "Installed versions:" >&2
	ls -1 "$TOOLCACHE" >&2 || true
	exit 1
fi
RESOLVED="${CANDIDATES[-1]}"

"${OS:-}" >/dev/null 2>&1 || true
# Prefer x64 then arm64 (Windows layouts differ slightly; executables are in arch dir root)
ARCH_DIR="$TOOLCACHE/$RESOLVED/x64"
if [[ ! -d "$ARCH_DIR" ]]; then
	ARCH_DIR="$TOOLCACHE/$RESOLVED/arm64"
fi
if [[ ! -d "$ARCH_DIR" ]]; then
	echo "::error title=Architecture missing::Neither x64 nor arm64 directory exists for $RESOLVED in $TOOLCACHE" >&2
	exit 1
fi

if [[ "$OS" == "Windows" ]]; then
	# On Windows, node.exe resides directly under the arch dir
	echo "$ARCH_DIR" >> "$GITHUB_PATH"
else
	# On Linux/macOS, binaries live under bin/
	echo "$ARCH_DIR/bin" >> "$GITHUB_PATH"
fi
echo "resolved-version=$RESOLVED" >> "$GITHUB_OUTPUT"
echo "Activated Node $RESOLVED ($ARCH_DIR)" >&2
node -v || true
