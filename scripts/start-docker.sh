#!/usr/bin/env bash
set -e

MODE="dev"
COMPOSE_FILE="docker-compose.dev.yml"

if [ "${1:-}" = "--prod" ] || [ "${1:-}" = "-p" ]; then
  MODE="prod"
  COMPOSE_FILE="docker-compose.yml"
fi

echo "============================================"
echo "  E-Learning-OPENCLAW Auto Start"
echo "  Mode: ${MODE}"
echo "============================================"

echo "[1/6] Checking Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install Docker first." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Try: sudo systemctl start docker" >&2
  exit 1
fi

echo "[2/6] Setting up environment files..."
if [ -f "./setup-env.sh" ]; then
  chmod +x ./setup-env.sh
  ./setup-env.sh
else
  echo "setup-env.sh not found. Run this from the project root." >&2
  exit 1
fi

if [ ! -f "backend/.env" ]; then
  echo "backend/.env is missing. Create it from backend/.env.example." >&2
  exit 1
fi

if grep -q "xxxx" backend/.env 2>/dev/null; then
  echo "WARNING: backend/.env still has placeholder values."
  printf "Continue anyway? (y/N): "
  read -r CONTINUE
  if [ "${CONTINUE}" != "y" ] && [ "${CONTINUE}" != "Y" ]; then
    exit 0
  fi
fi

echo "[3/6] Cleaning up old containers..."
docker compose -f "${COMPOSE_FILE}" down --remove-orphans 2>/dev/null || true

echo "[4/6] Building and starting containers..."
docker compose -f "${COMPOSE_FILE}" up --build -d

echo "[5/6] Waiting for services to start..."
sleep 5

echo "[6/6] Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "Backend health: http://localhost:8080/health"
echo "Frontend: http://localhost:3000"
echo "Logs: docker compose -f ${COMPOSE_FILE} logs -f"
echo "Stop: docker compose -f ${COMPOSE_FILE} down"
