#!/bin/bash
# ============================================================
# deploy.sh — Deploy backend on VPS (or redeploy after updates)
#
# Run after git clone (first time) or git pull (updates):
#   chmod +x deploy.sh
#   ./deploy.sh
#
# What it does:
#   1. Checks if backend/.env exists
#   2. Stops old containers
#   3. Builds and starts new containers
#   4. Shows container status
#   5. Prints backend URL
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}  🚀 E-Learning-OPENCLAW — Deploy${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""

# ──────────────────────────────────────────
# Step 1: Check if Docker is running
# ──────────────────────────────────────────
echo -e "${YELLOW}[1/5] Checking Docker...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}   ❌ Docker not installed! Run vps-setup.sh first.${NC}"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo -e "${YELLOW}   ⚠️  Docker not running. Starting...${NC}"
    sudo systemctl start docker
    sleep 2
fi
echo -e "${GREEN}   ✅ Docker is running${NC}"

# ──────────────────────────────────────────
# Step 2: Check backend/.env
# ──────────────────────────────────────────
echo -e "${YELLOW}[2/5] Checking backend/.env...${NC}"

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${RED}"
        echo "   ┌─────────────────────────────────────────────┐"
        echo "   │  ⚠️  backend/.env was created from template  │"
        echo "   │                                              │"
        echo "   │  You MUST fill in real values before running │"
        echo "   │  the backend. Edit the file now:             │"
        echo "   │                                              │"
        echo "   │    nano backend/.env                         │"
        echo "   │                                              │"
        echo "   │  Required values to change:                  │"
        echo "   │    - DB_DSN     (Supabase connection string) │"
        echo "   │    - JWT_SECRET (a strong random secret)     │"
        echo "   │                                              │"
        echo "   │  After editing, run ./deploy.sh again.       │"
        echo "   └─────────────────────────────────────────────┘"
        echo -e "${NC}"
        exit 1
    else
        echo -e "${RED}   ❌ backend/.env.example not found! Is this the right directory?${NC}"
        exit 1
    fi
fi

# Warn if still using placeholder values
if grep -q "xxxx" backend/.env 2>/dev/null || grep -q "your_password_here" backend/.env 2>/dev/null; then
    echo -e "${RED}   ⚠️  WARNING: backend/.env still has placeholder values!${NC}"
    echo -e "      Edit with: ${YELLOW}nano backend/.env${NC}"
    echo ""
    read -p "   Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 0
    fi
fi
echo -e "${GREEN}   ✅ backend/.env exists${NC}"

# ──────────────────────────────────────────
# Step 3: Fix line endings (in case of CRLF from Windows)
# ──────────────────────────────────────────
echo -e "${YELLOW}[3/5] Fixing line endings...${NC}"
find . -name "*.sh" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "Dockerfile" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.yml" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.yaml" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name ".env*" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
echo -e "${GREEN}   ✅ Line endings fixed${NC}"

# ──────────────────────────────────────────
# Step 4: Stop old containers & rebuild
# ──────────────────────────────────────────
echo -e "${YELLOW}[4/5] Stopping old containers and rebuilding...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
docker compose up --build -d
echo -e "${GREEN}   ✅ Backend container started${NC}"

# ──────────────────────────────────────────
# Step 5: Wait and show status
# ──────────────────────────────────────────
echo -e "${YELLOW}[5/5] Waiting for backend to start...${NC}"
sleep 5

echo ""
echo -e "${BOLD}Container status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Get VPS IP
VPS_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}  ✅ Backend deployed successfully!${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""
echo -e "${BOLD}Your backend is running at:${NC}"
echo -e "  ${GREEN}http://${VPS_IP}:8080${NC}"
echo ""
echo -e "${BOLD}Test commands:${NC}"
echo "  curl http://${VPS_IP}:8080/health"
echo "  curl http://localhost:8080/health"
echo ""
echo -e "${BOLD}View logs:${NC}"
echo "  docker compose logs -f"
echo ""
echo -e "${BOLD}Stop backend:${NC}"
echo "  docker compose down"
echo ""
echo -e "${BOLD}Vercel frontend:${NC}"
echo "  https://e-learning-openclaw.vercel.app"
echo ""
echo -e "${YELLOW}Don't forget to set on Vercel dashboard:${NC}"
echo "  VITE_API_URL = http://${VPS_IP}:8080"
echo "  VITE_API_BASE_URL = http://${VPS_IP}:8080"
echo ""
