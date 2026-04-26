#!/bin/bash
# ============================================================
# start.sh — One-command setup for Kali Linux / VPS
# Automates: Docker check → env setup → build → run → verify
#
# USAGE:
#   chmod +x start.sh
#   ./start.sh           ← local dev (Kali Linux)
#   ./start.sh --prod    ← VPS production mode
# ============================================================

set -e

# Colors for pretty output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

MODE="dev"
COMPOSE_FILE="docker-compose.dev.yml"

# Check for --prod flag
if [ "$1" = "--prod" ] || [ "$1" = "-p" ]; then
    MODE="prod"
    COMPOSE_FILE="docker-compose.yml"
fi

echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}  🚀 E-Learning-OPENCLAW — Auto Start${NC}"
echo -e "${CYAN}${BOLD}  Mode: ${MODE}${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""

# ──────────────────────────────────────────
# Step 1: Check if Docker is running
# ──────────────────────────────────────────
echo -e "${YELLOW}[1/6] Checking Docker...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}   ❌ Docker is not installed! Please install Docker first.${NC}"
    echo "   Visit: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo -e "${YELLOW}   ⚠️  Docker daemon is not running. Starting...${NC}"
    sudo systemctl start docker
    sleep 2

    if ! docker info &> /dev/null 2>&1; then
        echo -e "${RED}   ❌ Failed to start Docker. Try: sudo systemctl start docker${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}   ✅ Docker is running${NC}"

# ──────────────────────────────────────────
# Step 2: Run setup-env.sh (create .env if missing)
# ──────────────────────────────────────────
echo -e "${YELLOW}[2/6] Setting up environment files...${NC}"

if [ -f "./setup-env.sh" ]; then
    chmod +x ./setup-env.sh
    ./setup-env.sh
else
    echo -e "${RED}   ❌ setup-env.sh not found! Make sure you're in the project root.${NC}"
    exit 1
fi

# Verify backend/.env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}   ❌ backend/.env still missing after setup!${NC}"
    echo -e "      Create it manually: cp backend/.env.example backend/.env"
    exit 1
fi

# Check if DB_DSN has been changed from placeholder
if grep -q "xxxx" backend/.env 2>/dev/null; then
    echo ""
    echo -e "${RED}   ⚠️  WARNING: backend/.env still has placeholder values!${NC}"
    echo -e "      Edit with: ${YELLOW}nano backend/.env${NC}"
    echo -e "      Then run: ${YELLOW}./start.sh${NC} again"
    echo ""
    read -p "   Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 0
    fi
fi

echo -e "${GREEN}   ✅ Environment files ready${NC}"

# ──────────────────────────────────────────
# Step 3: Cleanup old containers
# ──────────────────────────────────────────
echo -e "${YELLOW}[3/6] Cleaning up old containers...${NC}"
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}   ✅ Old containers removed${NC}"

# ──────────────────────────────────────────
# Step 4: Build and start containers
# ──────────────────────────────────────────
echo -e "${YELLOW}[4/6] Building and starting containers (this may take a few minutes)...${NC}"
echo -e "      Using: ${CYAN}$COMPOSE_FILE${NC}"

if [ "$MODE" = "prod" ]; then
    docker compose -f "$COMPOSE_FILE" up --build -d
else
    docker compose -f "$COMPOSE_FILE" up --build -d
fi

echo -e "${GREEN}   ✅ Containers started${NC}"

# ──────────────────────────────────────────
# Step 5: Wait for services to be ready
# ──────────────────────────────────────────
echo -e "${YELLOW}[5/6] Waiting for services to start...${NC}"
sleep 5
echo -e "${GREEN}   ✅ Wait complete${NC}"

# ──────────────────────────────────────────
# Step 6: Show running containers
# ──────────────────────────────────────────
echo -e "${YELLOW}[6/6] Container status:${NC}"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# ──────────────────────────────────────────
# Print test URLs
# ──────────────────────────────────────────
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}  ✅ All services are running!${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""
echo -e "${BOLD}Test your services:${NC}"
echo ""
echo -e "  ${GREEN}Backend health check:${NC}"
echo "    curl http://localhost:8080/"
echo ""
echo -e "  ${GREEN}Backend API test:${NC}"
echo "    curl http://localhost:8080/api/feed"
echo ""
echo -e "  ${GREEN}Frontend (browser):${NC}"
echo "    http://localhost:3000"
echo ""
echo -e "  ${GREEN}View logs:${NC}"
echo "    docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo -e "  ${GREEN}Stop everything:${NC}"
echo "    docker compose -f $COMPOSE_FILE down"
echo ""
