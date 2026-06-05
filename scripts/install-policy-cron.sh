#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIME_VALUE="${SALES_CALC_POLICY_TIME:-09:30}"
CRON_BEGIN="# skuroi-policy-update BEGIN"
CRON_END="# skuroi-policy-update END"
PRINT_ONLY=0

if [[ "${1:-}" == "--print" ]]; then
  PRINT_ONLY=1
fi

if [[ ! "${TIME_VALUE}" =~ ^([01]?[0-9]|2[0-3]):([0-5][0-9])$ ]]; then
  echo "Invalid SALES_CALC_POLICY_TIME=${TIME_VALUE}; expected HH:MM"
  exit 1
fi

HOUR="${BASH_REMATCH[1]}"
MINUTE="${BASH_REMATCH[2]}"
ENV_PREFIX=""
LOCAL_GIT_DIR="${PROJECT_DIR}/var/salescalc.git"

if [[ -n "${SALES_CALC_GIT_DIR:-}" ]]; then
  ENV_PREFIX="SALES_CALC_GIT_DIR=${SALES_CALC_GIT_DIR} "
elif [[ -d "${LOCAL_GIT_DIR}" ]]; then
  ENV_PREFIX="SALES_CALC_GIT_DIR=${LOCAL_GIT_DIR} "
fi

CRON_BLOCK="${CRON_BEGIN}
${MINUTE} ${HOUR} * * * cd ${PROJECT_DIR} && ${ENV_PREFIX}${PROJECT_DIR}/scripts/run-policy-update.sh
${CRON_END}"

if [[ "${PRINT_ONLY}" -eq 1 ]]; then
  printf '%s\n' "${CRON_BLOCK}"
  exit 0
fi

EXISTING="$(crontab -l 2>/dev/null || true)"
FILTERED="$(printf '%s\n' "${EXISTING}" | awk -v begin="${CRON_BEGIN}" -v end="${CRON_END}" '
  $0 == begin {skip=1; next}
  $0 == end {skip=0; next}
  skip != 1 {print}
')"

{
  printf '%s\n' "${FILTERED}" | sed '/^[[:space:]]*$/d'
  printf '%s\n' "${CRON_BLOCK}"
} | crontab -

echo "Installed policy watcher cron at ${TIME_VALUE} daily."
