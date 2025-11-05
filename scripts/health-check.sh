#!/bin/bash

################################################################################
# Health Check Script - Überprüft den Status aller Services
################################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
    echo -e "${BLUE}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              🏥 System Health Check 🏥                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-5}

    echo -n "  $name: "
    if curl -s -f -m "$timeout" "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Läuft${NC}"
        return 0
    else
        echo -e "${RED}✗ Nicht erreichbar${NC}"
        return 1
    fi
}

check_port() {
    local name=$1
    local port=$2

    echo -n "  $name (Port $port): "
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓ Port offen${NC}"
        return 0
    else
        echo -e "${RED}✗ Port geschlossen${NC}"
        return 1
    fi
}

check_docker_services() {
    echo -e "${BOLD}Docker Services:${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "  ${YELLOW}Docker nicht installiert${NC}\n"
        return 1
    fi

    if ! docker ps &> /dev/null; then
        echo -e "  ${RED}Docker läuft nicht${NC}\n"
        return 1
    fi

    local services=("postgres" "backend" "frontend" "agent")
    local all_running=0

    for service in "${services[@]}"; do
        echo -n "  $service: "
        if docker ps --format '{{.Names}}' | grep -q "$service"; then
            local status=$(docker ps --filter "name=$service" --format '{{.Status}}')
            echo -e "${GREEN}✓ Läuft${NC} ($status)"
        else
            echo -e "${RED}✗ Nicht gestartet${NC}"
            all_running=1
        fi
    done

    echo

    return $all_running
}

check_local_services() {
    echo -e "${BOLD}Lokale Services:${NC}"

    check_service "Backend API" "http://localhost:3000/api/health" 5
    check_service "Frontend" "http://localhost:5173" 5
    check_port "WebSocket" 3001
    check_port "Agent" 4000

    echo
}

check_database() {
    echo -e "${BOLD}Datenbank:${NC}"

    # Check if postgres process is running
    if pgrep -x postgres > /dev/null; then
        echo -e "  PostgreSQL Prozess: ${GREEN}✓ Läuft${NC}"

        # Try to connect
        if command -v psql &> /dev/null; then
            export PGPASSWORD=postgres
            if psql -h localhost -U postgres -d minecraft_hosting -c '\q' 2>/dev/null; then
                echo -e "  Verbindung: ${GREEN}✓ Erfolgreich${NC}"
            else
                echo -e "  Verbindung: ${YELLOW}⚠ Nicht erreichbar${NC}"
            fi
        else
            echo -e "  psql Client: ${YELLOW}Nicht installiert (kann Verbindung nicht testen)${NC}"
        fi
    elif docker ps --format '{{.Names}}' | grep -q postgres 2>/dev/null; then
        echo -e "  PostgreSQL Container: ${GREEN}✓ Läuft${NC}"
    else
        echo -e "  PostgreSQL: ${RED}✗ Nicht gefunden${NC}"
    fi

    echo
}

check_disk_space() {
    echo -e "${BOLD}Speicherplatz:${NC}"

    local available=$(df -h "$SCRIPT_DIR" | awk 'NR==2 {print $4}')
    local usage=$(df -h "$SCRIPT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')

    echo -n "  Verfügbarer Speicher: "
    if [ "$usage" -lt 80 ]; then
        echo -e "${GREEN}$available (${usage}% genutzt)${NC}"
    elif [ "$usage" -lt 90 ]; then
        echo -e "${YELLOW}$available (${usage}% genutzt)${NC}"
    else
        echo -e "${RED}$available (${usage}% genutzt) - Warnung: Wenig Speicher!${NC}"
    fi

    echo
}

check_node_modules() {
    echo -e "${BOLD}Dependencies:${NC}"

    local workspaces=("backend" "frontend" "agent" "shared")

    for ws in "${workspaces[@]}"; do
        echo -n "  $ws node_modules: "
        if [ -d "$SCRIPT_DIR/$ws/node_modules" ]; then
            echo -e "${GREEN}✓ Installiert${NC}"
        else
            echo -e "${RED}✗ Fehlt${NC}"
        fi
    done

    echo
}

check_env_files() {
    echo -e "${BOLD}Konfiguration:${NC}"

    echo -n "  backend/.env: "
    if [ -f "$SCRIPT_DIR/backend/.env" ]; then
        echo -e "${GREEN}✓ Vorhanden${NC}"
    else
        echo -e "${RED}✗ Fehlt${NC}"
    fi

    echo -n "  agent/.env: "
    if [ -f "$SCRIPT_DIR/agent/.env" ]; then
        echo -e "${GREEN}✓ Vorhanden${NC}"
    else
        echo -e "${RED}✗ Fehlt${NC}"
    fi

    echo
}

main() {
    print_header

    check_env_files
    check_node_modules
    check_database
    check_disk_space

    # Check if running with Docker or locally
    if docker ps &> /dev/null && docker ps --format '{{.Names}}' | grep -q backend; then
        check_docker_services
    else
        check_local_services
    fi

    echo -e "${BOLD}Health Check abgeschlossen!${NC}\n"
}

main
