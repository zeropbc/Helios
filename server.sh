#!/usr/bin/env bash
# Static server for Helios (no Node needed — just Python).
set -euo pipefail

PORT="${PORT:-8080}"
HOST="${HOST:-127.0.0.1}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$DIR"
exec python3 -m http.server "$PORT" --bind "$HOST"