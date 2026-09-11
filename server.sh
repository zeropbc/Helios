#!/usr/bin/env bash
# Static server for Helios (no Node needed — just Python).
set -euo pipefail

PORT="${PORT:-8080}"
HOST="${HOST:-127.0.0.1}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${1:-}" == "--port" ]]; then
  if [[ -z "${2:-}" ]]; then
    printf 'Usage: %s [--port PORT]\\n' "$0" >&2
    exit 2
  fi
  PORT="$2"
fi

cd "$DIR"
exec python3 -m http.server "$PORT" --bind "$HOST"