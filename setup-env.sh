#!/bin/bash
# ============================================================
# setup-env.sh — Auto-create .env files after git clone
# Safe to run multiple times (idempotent)
#
# USAGE:
#   chmod +x setup-env.sh
#   ./setup-env.sh
# ============================================================

set -e

# Colors for pretty output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "  🔧 E-Learning-OPENCLAW — Environment Setup"
echo "============================================"
echo ""

# --- Fix line endings (in case cloned from Windows) ---
echo -e "${YELLOW}[1/3] Fixing line endings (CRLF → LF)...${NC}"

# Fix common files that break with CRLF
find . -name "*.sh" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "Dockerfile" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.go" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.yml" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.yaml" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name "*.conf" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true
find . -name ".env*" -type f -exec sed -i 's/\r$//' {} + 2>/dev/null || true

echo -e "${GREEN}   ✅ Line endings fixed${NC}"

# --- Backend .env ---
echo -e "${YELLOW}[2/3] Checking backend/.env ...${NC}"

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}   ✅ backend/.env already exists — skipping${NC}"
else
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}   ✅ Created backend/.env from .env.example${NC}"
        echo -e "${RED}   ⚠️  IMPORTANT: Edit backend/.env and fill in your REAL values!${NC}"
        echo -e "      Run: ${YELLOW}nano backend/.env${NC}"
    else
        echo -e "${RED}   ❌ ERROR: backend/.env.example not found!${NC}"
        echo -e "      Make sure you cloned the repo correctly."
        exit 1
    fi
fi

# --- Frontend .env (optional, Docker build uses ARG instead) ---
echo -e "${YELLOW}[3/3] Checking frontend/.env ...${NC}"

if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}   ✅ frontend/.env already exists — skipping${NC}"
else
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        echo -e "${GREEN}   ✅ Created frontend/.env from .env.example${NC}"
    else
        echo -e "${YELLOW}   ⚠️  frontend/.env.example not found — skipping (Docker uses build args)${NC}"
    fi
fi

echo ""
echo "============================================"
echo -e "${GREEN}  ✅ Environment setup complete!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your real values:"
echo "     nano backend/.env"
echo ""
echo "  2. Required values to change:"
echo "     - DB_DSN          (your Supabase connection string)"
echo "     - JWT_SECRET      (a strong random secret)"
echo "     - TELEGRAM_BOT_TOKEN (if using OpenClaw notifications)"
echo ""
echo "  3. Then run: ./start.sh"
echo ""
