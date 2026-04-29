#!/bin/bash
# ============================================================
# logs.sh — Simple Real-time Log Viewer
#
# Shows colored, real-time logs from Docker containers.
# No Grafana, no Prometheus — just terminal logs.
#
# USAGE:
#   ./logs.sh              ← all backend logs (default)
#   ./logs.sh all          ← all services
#   ./logs.sh nginx        ← only nginx logs
#   ./logs.sh gateway      ← only openclaw gateway logs
#   ./logs.sh errors       ← only ERROR lines from backend
#   ./logs.sh post         ← only POST requests
#   ./logs.sh get          ← only GET requests
#   ./logs.sh auth         ← only /api/auth routes
#   ./logs.sh route /api/x ← filter by custom route
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"
TAIL_LINES=100

echo ""
echo -e "${CYAN}${BOLD}════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  📋 Real-time Log Viewer${NC}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════${NC}"
echo ""

case "${1:-backend}" in
    all)
        echo -e "${GREEN}📡 Showing ALL service logs...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$TAIL_LINES"
        ;;
    nginx)
        echo -e "${GREEN}🌐 Showing NGINX logs...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$TAIL_LINES" nginx
        ;;
    gateway)
        echo -e "${GREEN}🦀 Showing OpenClaw Gateway logs...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$TAIL_LINES" openclaw_gateway
        ;;
    errors)
        echo -e "${RED}❌ Showing only ERROR logs from backend...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail=500 openclaw_backend | grep --color=always -i "ERROR\|FATAL\|PANIC\|error\|500"
        ;;
    post)
        echo -e "${GREEN}📤 Showing only POST requests...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail=500 openclaw_backend | grep --color=always "POST"
        ;;
    get)
        echo -e "${GREEN}📥 Showing only GET requests...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail=500 openclaw_backend | grep --color=always "GET"
        ;;
    auth)
        echo -e "${GREEN}🔐 Showing only /api/auth routes...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail=500 openclaw_backend | grep --color=always "/api/auth"
        ;;
    route)
        ROUTE="${2:-/api/}"
        echo -e "${GREEN}🔎 Showing only route: ${ROUTE}...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail=500 openclaw_backend | grep --color=always "$ROUTE"
        ;;
    backend|*)
        echo -e "${GREEN}🖥️  Showing BACKEND logs...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
        echo ""
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$TAIL_LINES" openclaw_backend
        ;;
esac
