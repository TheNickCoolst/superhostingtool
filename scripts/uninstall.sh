#!/bin/bash

################################################################################
# Uninstall Script - Entfernt Installation und räumt auf
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
    echo -e "${RED}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    ⚠️  Deinstallation  ⚠️                     ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

confirm() {
    read -p "$1 (j/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[JjYy]$ ]]
}

main() {
    print_header

    echo -e "${YELLOW}${BOLD}WARNUNG:${NC} Dies wird folgendes entfernen:\n"
    echo "  • Alle node_modules"
    echo "  • Docker Container und Images"
    echo "  • Build-Artefakte"
    echo "  • (Optional) Datenbank und Konfigurationsdateien"
    echo

    if ! confirm "Möchtest du fortfahren?"; then
        echo -e "${BLUE}Abgebrochen.${NC}"
        exit 0
    fi

    echo

    # Stop and remove Docker containers
    if command -v docker &> /dev/null && docker ps -a --format '{{.Names}}' | grep -q "minecraft-hosting\|postgres\|backend\|frontend\|agent"; then
        echo -e "${BLUE}Stoppe und entferne Docker Container...${NC}"

        cd "$SCRIPT_DIR"
        docker-compose down -v 2>/dev/null || true

        # Remove standalone postgres container
        docker stop minecraft-hosting-postgres 2>/dev/null || true
        docker rm minecraft-hosting-postgres 2>/dev/null || true

        # Remove images
        if confirm "Docker Images auch entfernen?"; then
            docker-compose down --rmi all 2>/dev/null || true
        fi

        echo -e "${GREEN}✓ Docker Container entfernt${NC}\n"
    fi

    # Remove node_modules
    echo -e "${BLUE}Entferne node_modules...${NC}"
    find "$SCRIPT_DIR" -name "node_modules" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
    echo -e "${GREEN}✓ node_modules entfernt${NC}\n"

    # Remove build artifacts
    echo -e "${BLUE}Entferne Build-Artefakte...${NC}"
    rm -rf "$SCRIPT_DIR/backend/dist" 2>/dev/null || true
    rm -rf "$SCRIPT_DIR/frontend/dist" 2>/dev/null || true
    rm -rf "$SCRIPT_DIR/agent/dist" 2>/dev/null || true
    rm -rf "$SCRIPT_DIR/shared/dist" 2>/dev/null || true
    echo -e "${GREEN}✓ Build-Artefakte entfernt${NC}\n"

    # Remove lock files
    echo -e "${BLUE}Entferne Lock-Files...${NC}"
    rm -f "$SCRIPT_DIR/package-lock.json"
    rm -f "$SCRIPT_DIR/*/package-lock.json"
    echo -e "${GREEN}✓ Lock-Files entfernt${NC}\n"

    # Remove log files
    echo -e "${BLUE}Entferne Log-Dateien...${NC}"
    rm -f "$SCRIPT_DIR/install.log" 2>/dev/null || true
    rm -rf "$SCRIPT_DIR/backend/logs" 2>/dev/null || true
    echo -e "${GREEN}✓ Log-Dateien entfernt${NC}\n"

    # Optional: Remove config files
    if confirm "Konfigurationsdateien (.env) auch entfernen?"; then
        rm -f "$SCRIPT_DIR/backend/.env" 2>/dev/null || true
        rm -f "$SCRIPT_DIR/agent/.env" 2>/dev/null || true
        echo -e "${GREEN}✓ Konfigurationsdateien entfernt${NC}\n"
    fi

    # Optional: Remove data directories
    if confirm "Datenbankdateien und Uploads entfernen? (NICHT RÜCKGÄNGIG ZU MACHEN!)"; then
        rm -rf "$SCRIPT_DIR/backend/uploads" 2>/dev/null || true
        rm -rf "$SCRIPT_DIR/backend/backups" 2>/dev/null || true
        rm -rf "$SCRIPT_DIR/agent/servers" 2>/dev/null || true
        echo -e "${GREEN}✓ Daten entfernt${NC}\n"
    fi

    echo -e "${GREEN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              Deinstallation erfolgreich!                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    echo -e "Um die Anwendung neu zu installieren, führe aus:"
    echo -e "  ${BLUE}./install.sh${NC}\n"
}

main
