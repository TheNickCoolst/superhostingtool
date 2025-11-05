#!/bin/bash

################################################################################
# Production Start Script - Startet die Anwendung im Produktionsmodus
################################################################################

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
    echo -e "${BLUE}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              🚀 Production Start Script 🚀                    ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

main() {
    print_header

    cd "$SCRIPT_DIR"

    # Check if Docker Compose is available
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo -e "${BLUE}Starte via Docker Compose...${NC}\n"

        # Check if containers are already running
        if docker-compose ps | grep -q "Up"; then
            echo -e "${GREEN}Container laufen bereits${NC}"
            docker-compose ps
            exit 0
        fi

        # Start containers
        docker-compose up -d

        echo -e "\n${GREEN}✓ Services gestartet${NC}\n"

        # Show status
        docker-compose ps

        echo -e "\n${BOLD}Zugriff:${NC}"
        echo -e "  Frontend:  ${GREEN}http://localhost${NC}"
        echo -e "  Backend:   ${GREEN}http://localhost:3000${NC}\n"

        echo -e "${BOLD}Logs anzeigen:${NC}"
        echo -e "  ${BLUE}docker-compose logs -f${NC}\n"

        echo -e "${BOLD}Services stoppen:${NC}"
        echo -e "  ${BLUE}docker-compose stop${NC}\n"

    elif [ -d "$SCRIPT_DIR/backend/dist" ] && [ -d "$SCRIPT_DIR/frontend/dist" ]; then
        echo -e "${BLUE}Starte Built-Version...${NC}\n"

        # Check PostgreSQL
        if ! pgrep -x postgres > /dev/null; then
            echo -e "${RED}PostgreSQL läuft nicht!${NC}"
            exit 1
        fi

        # Start backend
        echo -e "${GREEN}Starte Backend...${NC}"
        cd "$SCRIPT_DIR/backend"
        NODE_ENV=production node dist/index.js &
        BACKEND_PID=$!

        # Start frontend (with a simple HTTP server)
        echo -e "${GREEN}Starte Frontend...${NC}"
        cd "$SCRIPT_DIR/frontend"
        npx serve -s dist -l 5173 &
        FRONTEND_PID=$!

        # Start agent
        echo -e "${GREEN}Starte Agent...${NC}"
        cd "$SCRIPT_DIR/agent"
        NODE_ENV=production node dist/index.js &
        AGENT_PID=$!

        echo -e "\n${GREEN}✓ Services gestartet${NC}\n"

        echo -e "${BOLD}Process IDs:${NC}"
        echo -e "  Backend: $BACKEND_PID"
        echo -e "  Frontend: $FRONTEND_PID"
        echo -e "  Agent: $AGENT_PID\n"

        echo -e "${BOLD}Stoppen mit:${NC}"
        echo -e "  ${BLUE}kill $BACKEND_PID $FRONTEND_PID $AGENT_PID${NC}\n"

    else
        echo -e "${RED}Keine Built-Version gefunden und Docker Compose nicht verfügbar${NC}"
        echo -e "Bitte zuerst bauen: ${BLUE}npm run build${NC}"
        echo -e "Oder installiere Docker Compose"
        exit 1
    fi
}

main "$@"
