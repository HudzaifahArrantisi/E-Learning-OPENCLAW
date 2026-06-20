#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "--docker" ] || [ "${1:-}" = "--prod" ] || [ "${1:-}" = "-p" ]; then
  exec bash scripts/start-docker.sh "$@"
fi

PYTHON_BIN="${PYTHON_BIN:-python}"
PYTHON_SERVICE_PATH="${PYTHON_SERVICE_PATH:-./pddikti_service.py}"
PYTHON_PORT="${PYTHON_PORT:-5001}"
GO_SERVER_PATH="${GO_SERVER_PATH:-./backend/server}"
PDDIKTI_HEALTH_URL="${PDDIKTI_HEALTH_URL:-http://localhost:${PYTHON_PORT}/health}"
PDDIKTI_VERIFY_URL="${PDDIKTI_VERIFY_URL:-http://localhost:${PYTHON_PORT}/validate-nim?nim={nim}}"
PDDIKTI_STARTUP_TIMEOUT_SECONDS="${PDDIKTI_STARTUP_TIMEOUT_SECONDS:-60}"

export PYTHON_PORT
export PDDIKTI_HEALTH_URL
export PDDIKTI_VERIFY_URL
export PDDIKTI_STARTUP_TIMEOUT_SECONDS

PYTHON_PID=""
GO_PID=""

shutdown() {
  trap - SIGTERM SIGINT EXIT

  if [ -n "${GO_PID}" ] && kill -0 "${GO_PID}" 2>/dev/null; then
    echo "Stopping Go backend..."
    kill "${GO_PID}" 2>/dev/null || true
  fi

  if [ -n "${PYTHON_PID}" ] && kill -0 "${PYTHON_PID}" 2>/dev/null; then
    echo "Stopping PDDikti Python service..."
    kill "${PYTHON_PID}" 2>/dev/null || true
  fi

  if [ -n "${GO_PID}" ]; then
    wait "${GO_PID}" 2>/dev/null || true
  fi
  if [ -n "${PYTHON_PID}" ]; then
    wait "${PYTHON_PID}" 2>/dev/null || true
  fi
}

trap shutdown SIGTERM SIGINT EXIT

if [ ! -f "${PYTHON_SERVICE_PATH}" ]; then
  echo "Python service not found: ${PYTHON_SERVICE_PATH}" >&2
  exit 1
fi

if [ ! -f "${GO_SERVER_PATH}" ]; then
  echo "Go binary not found: ${GO_SERVER_PATH}" >&2
  echo "Build it first with: cd backend && go build -o server ." >&2
  exit 1
fi

if [ ! -x "${GO_SERVER_PATH}" ]; then
  chmod +x "${GO_SERVER_PATH}" 2>/dev/null || true
fi

echo "Starting PDDikti Python service on port ${PYTHON_PORT}..."
"${PYTHON_BIN}" "${PYTHON_SERVICE_PATH}" &
PYTHON_PID=$!

echo "Waiting for PDDikti service health check: ${PDDIKTI_HEALTH_URL}"
deadline=$((SECONDS + PDDIKTI_STARTUP_TIMEOUT_SECONDS))
until HEALTH_URL="${PDDIKTI_HEALTH_URL}" "${PYTHON_BIN}" -c 'import os, urllib.request; urllib.request.urlopen(os.environ["HEALTH_URL"], timeout=2).read()' >/dev/null 2>&1; do
  if ! kill -0 "${PYTHON_PID}" 2>/dev/null; then
    echo "PDDikti Python service exited before becoming healthy." >&2
    exit 1
  fi

  if [ "${SECONDS}" -ge "${deadline}" ]; then
    echo "Timed out waiting for PDDikti service after ${PDDIKTI_STARTUP_TIMEOUT_SECONDS}s." >&2
    exit 1
  fi

  sleep 1
done

echo "PDDikti Python service is healthy."
echo "Starting Go backend from ${GO_SERVER_PATH}..."
"${GO_SERVER_PATH}" &
GO_PID=$!

set +e
wait "${GO_PID}"
GO_STATUS=$?
GO_PID=""
shutdown
exit "${GO_STATUS}"
