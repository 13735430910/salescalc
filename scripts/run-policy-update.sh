#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${PROJECT_DIR}/var"
LOCK_DIR="${STATE_DIR}/policy-update.lock"

mkdir -p "${STATE_DIR}"

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "$(date -Is) policy update already running" >> "${STATE_DIR}/policy-watch.log"
  exit 0
fi

cleanup() {
  rmdir "${LOCK_DIR}"
}
trap cleanup EXIT

cd "${PROJECT_DIR}"
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

node scripts/policy-update.mjs >> "${STATE_DIR}/policy-watch-run.log" 2>&1
