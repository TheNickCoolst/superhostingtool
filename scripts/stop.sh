#!/bin/bash

################################################################################
# Stop Script - Stoppt alle laufenden Services
################################################################################

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
    echo -e "${RED}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   ⛔ Stopping Services ⛔                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

stop_docker() {
    echo -e "${BLUE}Stoppe Docker Container...${NC}"
    cd "$SCRIPT_DIR"
    docker-compose stop
    echo -e "${GREEN}✓ Docker Container gestoppt${NC}"
}

stop_local() {
    echo -e "${BLUE}Stoppe lokale Prozesse...${NC}"

    # Stop Node processes
    pkill -f "node.*backend" 2>/dev/null && echo -e "${GREEN}✓ Backend gestoppt${NC}"
    pkill -f "node.*frontend" 2>/dev/null && echo -e "${GREEN}✓ Frontend gestoppt${NC}"
    pkill -f "node.*agent" 2>/dev/null && echo -e "${GREEN}✓ Agent gestoppt${NC}"
    pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✓ Vite gestoppt${NC}"

    # Stop PostgreSQL container if running
    if docker ps --format '{{.Names}}' | grep -q "minecraft-hosting-postgres"; then
        docker stop minecraft-hosting-postgres
        echo -e "${GREEN}✓ PostgreSQL Container gestoppt${NC}"
    fi
}

main() {
    print_header

    cd "$SCRIPT_DIR"

    # Check if Docker Compose services are running
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        stop_docker
    else
        stop_local
    fi

    echo -e "\n${GREEN}${BOLD}Services wurden gestoppt${NC}\n"

    # Show what's still running
    if pgrep -f "node" > /dev/null; then
        echo -e "${YELLOW}Warnung: Einige Node-Prozesse laufen noch:${NC}"
        pgrep -af "node"
        echo
        echo -e "Zum Beenden: ${BLUE}pkill -9 node${NC}"
    fi
}

main "$@"
