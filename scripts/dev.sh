#!/bin/bash

################################################################################
# Development Helper Script - Startet die Entwicklungsumgebung
################################################################################

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
    echo -e "${BLUE}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║          🛠️  Development Environment Starter 🛠️              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

check_postgres() {
    if pgrep -x postgres > /dev/null || docker ps --format '{{.Names}}' | grep -q postgres; then
        echo -e "${GREEN}✓${NC} PostgreSQL läuft"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} PostgreSQL läuft nicht"
        return 1
    fi
}

start_postgres() {
    echo -e "${BLUE}Starte PostgreSQL via Docker...${NC}"
    docker run -d --name minecraft-hosting-postgres \
        -p 5432:5432 \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=minecraft_hosting \
        postgres:15

    echo -e "${GREEN}PostgreSQL gestartet${NC}"
    sleep 3
}

main() {
    print_header

    cd "$SCRIPT_DIR"

    # Check if .env files exist
    if [ ! -f "backend/.env" ]; then
        echo -e "${YELLOW}backend/.env fehlt! Führe zuerst ./install.sh aus${NC}"
        exit 1
    fi

    # Check PostgreSQL
    if ! check_postgres; then
        read -p "PostgreSQL via Docker starten? (j/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[JjYy]$ ]]; then
            start_postgres
        else
            echo -e "${YELLOW}Bitte starte PostgreSQL manuell${NC}"
            exit 1
        fi
    fi

    # Parse arguments
    case "${1:-all}" in
        backend)
            echo -e "${BLUE}Starte nur Backend...${NC}"
            npm run dev:backend
            ;;
        frontend)
            echo -e "${BLUE}Starte nur Frontend...${NC}"
            npm run dev:frontend
            ;;
        agent)
            echo -e "${BLUE}Starte nur Agent...${NC}"
            npm run dev:agent
            ;;
        all|*)
            echo -e "${BLUE}Starte alle Services...${NC}\n"
            echo -e "${GREEN}Zugriff:${NC}"
            echo -e "  Frontend:  http://localhost:5173"
            echo -e "  Backend:   http://localhost:3000"
            echo -e "  WebSocket: ws://localhost:3001"
            echo -e "  Agent:     http://localhost:4000\n"
            npm run dev
            ;;
    esac
}

main "$@"
