#!/bin/bash
# ============================================================
# deploy.sh — Deploy E-Learning-OPENCLAW on VPS
#
# Run after git clone (first time) or git pull (updates):
#   chmod +x deploy.sh
#   ./deploy.sh
#
# What it does:
#   1. Checks Docker is running
#   2. Checks backend/.env exists
#   3. Fixes line endings
#   4. Pulls latest changes from git
#   5. Builds frontend (React/Vite)
#   6. Stops old containers & rebuilds backend
#   7. Reloads nginx
#   8. Shows status
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
echo -e "${YELLOW}[1/7] Checking Docker...${NC}"

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
echo -e "${YELLOW}[2/7] Checking backend/.env...${NC}"

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
# Step 3: Fix line endings
# ──────────────────────────────────────────
echo -e "${YELLOW}[3/7] Fixing line endings...${NC}"
find . -name "*.sh" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "Dockerfile" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.yml" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.yaml" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name ".env*" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
echo -e "${GREEN}   ✅ Line endings fixed${NC}"

# ──────────────────────────────────────────
# Step 4: Pull latest changes from git
# ──────────────────────────────────────────
echo -e "${YELLOW}[4/7] Pulling latest changes from git...${NC}"
git pull origin main
echo -e "${GREEN}   ✅ Git pull selesai${NC}"

# ──────────────────────────────────────────
# Step 5: Build frontend
# ──────────────────────────────────────────
echo -e "${YELLOW}[5/7] Building frontend...${NC}"

if [ ! -d "frontend" ]; then
    echo -e "${RED}   ❌ Folder frontend tidak ditemukan!${NC}"
    exit 1
fi

cd frontend

# Install dependencies jika node_modules belum ada
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}   📦 Installing npm dependencies...${NC}"
    npm install
fi

npm run build
cd ..

echo -e "${GREEN}   ✅ Frontend berhasil di-build${NC}"

# ──────────────────────────────────────────
# Step 6: Stop old containers & rebuild backend
# ──────────────────────────────────────────
echo -e "${YELLOW}[6/7] Stopping old containers and rebuilding...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
docker compose up --build -d
echo -e "${GREEN}   ✅ Backend container started${NC}"

# ──────────────────────────────────────────
# Step 7: Reload nginx & show status
# ──────────────────────────────────────────
echo -e "${YELLOW}[7/7] Reloading nginx...${NC}"
sleep 3

if docker ps --format '{{.Names}}' | grep -q "^nginx$"; then
    docker exec nginx nginx -t && docker exec nginx nginx -s reload
    echo -e "${GREEN}   ✅ Nginx reloaded${NC}"
else
    echo -e "${YELLOW}   ⚠️  Container nginx tidak ditemukan, skip reload${NC}"
fi

# Wait for backend to start
sleep 3

echo ""
echo -e "${BOLD}Container status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Get VPS IP
VPS_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}  ✅ Deploy selesai!${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""
echo -e "${BOLD}Frontend:${NC}"
echo -e "  ${GREEN}https://andromedahub.my.id${NC}"
echo ""
echo -e "${BOLD}Backend API:${NC}"
echo -e "  ${GREEN}https://api.andromedahub.my.id${NC}"
echo ""
echo -e "${BOLD}OpenClaw Control:${NC}"
echo -e "  ${GREEN}https://claw.andromedahub.my.id${NC}"
echo ""
echo -e "${BOLD}Test backend:${NC}"
echo "  curl https://andromedahub.my.id/health"
echo ""
echo -e "${BOLD}View logs:${NC}"
echo "  docker compose logs -f"
echo "  docker logs nginx --tail 20"
echo ""
echo -e "${BOLD}Stop semua:${NC}"
echo "  docker compose down"
echo ""
