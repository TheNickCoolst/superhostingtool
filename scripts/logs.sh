#!/bin/bash

################################################################################
# Logs Viewer - Zeigt Logs aller Services
################################################################################

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

show_menu() {
    echo -e "${BLUE}${BOLD}Welche Logs möchtest du sehen?${NC}\n"
    echo "1) Alle Services"
    echo "2) Backend"
    echo "3) Frontend"
    echo "4) Agent"
    echo "5) PostgreSQL"
    echo "6) Zurück"
    echo
    read -p "Wahl [1-6]: " choice
}

main() {
    cd "$SCRIPT_DIR"

    # Check if running with Docker
    if docker ps --format '{{.Names}}' | grep -q backend 2>/dev/null; then
        if [ -n "$1" ]; then
            # Direct argument provided
            case "$1" in
                backend|frontend|agent|postgres)
                    docker-compose logs -f "$1"
                    ;;
                all)
                    docker-compose logs -f
                    ;;
                *)
                    echo -e "${YELLOW}Unbekannter Service: $1${NC}"
                    echo "Verfügbar: all, backend, frontend, agent, postgres"
                    ;;
            esac
        else
            # Interactive menu
            show_menu
            case $choice in
                1)
                    docker-compose logs -f
                    ;;
                2)
                    docker-compose logs -f backend
                    ;;
                3)
                    docker-compose logs -f frontend
                    ;;
                4)
                    docker-compose logs -f agent
                    ;;
                5)
                    docker-compose logs -f postgres
                    ;;
                6)
                    exit 0
                    ;;
                *)
                    echo -e "${YELLOW}Ungültige Auswahl${NC}"
                    ;;
            esac
        fi
    else
        echo -e "${YELLOW}Docker Container nicht gefunden${NC}"
        echo "Für lokale Entwicklung siehe die Konsolen-Ausgabe von 'npm run dev'"
        echo
        echo "Oder prüfe die Log-Dateien:"
        echo "  backend/logs/"
        echo "  agent/logs/"
    fi
}

main "$@"
