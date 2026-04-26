#!/bin/bash
# ============================================================
# vps-setup.sh — One-time setup for fresh Ubuntu 22.04 VPS
#
# Run this ONCE after first SSH login to your VPS:
#   chmod +x vps-setup.sh
#   sudo ./vps-setup.sh
#
# What it does:
#   1. Updates the system
#   2. Installs Docker + Docker Compose
#   3. Installs Git
#   4. Adds your user to the docker group
#   5. Enables Docker to start on boot
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Must run as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root: sudo ./vps-setup.sh${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}  🖥️  VPS Setup — Ubuntu 22.04${NC}"
echo -e "${CYAN}${BOLD}  E-Learning-OPENCLAW${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""

# ──────────────────────────────────────────
# Step 1: Update system
# ──────────────────────────────────────────
echo -e "${YELLOW}[1/6] Updating system packages...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}   ✅ System updated${NC}"

# ──────────────────────────────────────────
# Step 2: Install Docker
# ──────────────────────────────────────────
echo -e "${YELLOW}[2/6] Installing Docker...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}   ✅ Docker already installed: $(docker --version)${NC}"
else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}   ✅ Docker installed: $(docker --version)${NC}"
fi

# ──────────────────────────────────────────
# Step 3: Install Docker Compose plugin
# ──────────────────────────────────────────
echo -e "${YELLOW}[3/6] Installing Docker Compose plugin...${NC}"

if docker compose version &> /dev/null; then
    echo -e "${GREEN}   ✅ Docker Compose already installed: $(docker compose version)${NC}"
else
    apt install -y docker-compose-plugin
    echo -e "${GREEN}   ✅ Docker Compose installed: $(docker compose version)${NC}"
fi

# ──────────────────────────────────────────
# Step 4: Install Git
# ──────────────────────────────────────────
echo -e "${YELLOW}[4/6] Installing Git...${NC}"

if command -v git &> /dev/null; then
    echo -e "${GREEN}   ✅ Git already installed: $(git --version)${NC}"
else
    apt install -y git
    echo -e "${GREEN}   ✅ Git installed: $(git --version)${NC}"
fi

# ──────────────────────────────────────────
# Step 5: Add current user to docker group
# ──────────────────────────────────────────
echo -e "${YELLOW}[5/6] Setting up Docker permissions...${NC}"

# Get the actual user (not root, since we're using sudo)
ACTUAL_USER="${SUDO_USER:-$USER}"

if id -nG "$ACTUAL_USER" | grep -qw "docker"; then
    echo -e "${GREEN}   ✅ User '$ACTUAL_USER' already in docker group${NC}"
else
    usermod -aG docker "$ACTUAL_USER"
    echo -e "${GREEN}   ✅ User '$ACTUAL_USER' added to docker group${NC}"
    echo -e "${YELLOW}   ⚠️  You need to logout and login again for this to take effect${NC}"
fi

# ──────────────────────────────────────────
# Step 6: Enable Docker on startup
# ──────────────────────────────────────────
echo -e "${YELLOW}[6/6] Enabling Docker on boot...${NC}"
systemctl enable docker
systemctl start docker
echo -e "${GREEN}   ✅ Docker enabled and running${NC}"

# ──────────────────────────────────────────
# Done!
# ──────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}  ✅ VPS is ready!${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo "  1. Logout and login again (for docker group):"
echo "     exit"
echo "     ssh user@your-vps-ip"
echo ""
echo "  2. Clone your repository:"
echo "     git clone https://github.com/YOUR_USERNAME/NF-Student-HUB.git"
echo "     cd NF-Student-HUB"
echo ""
echo "  3. Setup environment:"
echo "     chmod +x deploy.sh setup-env.sh"
echo "     ./setup-env.sh"
echo "     nano backend/.env    ← fill in real values"
echo ""
echo "  4. Deploy:"
echo "     ./deploy.sh"
echo ""
