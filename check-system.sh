#!/bin/bash

################################################################################
# System Requirements Checker
# Prüft ob alle Voraussetzungen für Superhostingtool erfüllt sind
################################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BLUE}${BOLD}"
cat << "EOF"
  ____            _                    ____ _               _
 / ___| _   _ ___| |_ ___ _ __ ___    / ___| |__   ___  ___| | __
 \___ \| | | / __| __/ _ \ '_ ` _ \  | |   | '_ \ / _ \/ __| |/ /
  ___) | |_| \__ \ ||  __/ | | | | | | |___| | | |  __/ (__|   <
 |____/ \__, |___/\__\___|_| |_| |_|  \____|_| |_|\___|\___|_|\_\
        |___/

   Überprüfe System-Voraussetzungen...
EOF
echo -e "${NC}\n"

# Betriebssystem erkennen
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
    OS_TYPE="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
    OS_TYPE="macos"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="Windows"
    OS_TYPE="windows"
else
    OS="Unbekannt"
    OS_TYPE="unknown"
fi

echo -e "${BLUE}🖥️  Betriebssystem:${NC} $OS\n"

# Funktion für Check-Ausgabe
check_item() {
    local name="$1"
    local status="$2"
    local version="$3"
    local note="$4"

    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✅ $name${NC}"
        [ -n "$version" ] && echo -e "   Version: ${BOLD}$version${NC}"
        [ -n "$note" ] && echo -e "   ${BLUE}ℹ️  $note${NC}"
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠️  $name${NC}"
        [ -n "$version" ] && echo -e "   Version: ${BOLD}$version${NC}"
        [ -n "$note" ] && echo -e "   ${YELLOW}⚠️  $note${NC}"
    else
        echo -e "${RED}❌ $name${NC}"
        [ -n "$note" ] && echo -e "   ${RED}❌ $note${NC}"
    fi
    echo
}

# Zähler für Status
ALL_OK=true

# Docker Check
echo -e "${BLUE}${BOLD}━━━ Docker (empfohlen) ━━━${NC}\n"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker -v | grep -oP '\d+\.\d+\.\d+' | head -n1)

    if docker ps &> /dev/null; then
        check_item "Docker" "ok" "$DOCKER_VERSION" "Docker läuft und ist bereit"
    else
        check_item "Docker" "warn" "$DOCKER_VERSION" "Docker ist installiert aber läuft nicht. Starte Docker!"
        ALL_OK=false
    fi
else
    check_item "Docker" "fail" "" "Nicht installiert - Wird für einfache Installation benötigt"
    ALL_OK=false
fi

# Docker Compose Check
if command -v docker-compose &> /dev/null; then
    DC_VERSION=$(docker-compose -v | grep -oP '\d+\.\d+\.\d+' | head -n1)
    check_item "Docker Compose" "ok" "$DC_VERSION"
elif docker compose version &> /dev/null 2>&1; then
    DC_VERSION=$(docker compose version | grep -oP '\d+\.\d+\.\d+' | head -n1)
    check_item "Docker Compose" "ok" "$DC_VERSION" "Als Docker Plugin installiert"
else
    check_item "Docker Compose" "fail" "" "Nicht installiert - Wird für Docker-Installation benötigt"
    ALL_OK=false
fi

# Node.js Check (optional für lokale Entwicklung)
echo -e "${BLUE}${BOLD}━━━ Node.js (optional für lokale Entwicklung) ━━━${NC}\n"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

    if [ "$NODE_MAJOR" -ge 18 ]; then
        check_item "Node.js" "ok" "$NODE_VERSION"
    else
        check_item "Node.js" "warn" "$NODE_VERSION" "Version 18+ wird empfohlen (du hast $NODE_VERSION)"
    fi
else
    check_item "Node.js" "warn" "" "Nicht installiert - Nur für lokale Entwicklung nötig"
fi

# npm Check
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_item "npm" "ok" "$NPM_VERSION"
else
    check_item "npm" "warn" "" "Nicht installiert - Nur für lokale Entwicklung nötig"
fi

# PostgreSQL Check (optional)
echo -e "${BLUE}${BOLD}━━━ PostgreSQL (optional für lokale Entwicklung) ━━━${NC}\n"

if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | grep -oP '\d+(\.\d+)?' | head -n1)
    check_item "PostgreSQL" "ok" "$PG_VERSION"
else
    check_item "PostgreSQL" "warn" "" "Nicht installiert - Docker verwendet eigene Datenbank"
fi

# Git Check
echo -e "${BLUE}${BOLD}━━━ Git ━━━${NC}\n"

if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | grep -oP '\d+\.\d+\.\d+' | head -n1)
    check_item "Git" "ok" "$GIT_VERSION"
else
    check_item "Git" "warn" "" "Empfohlen für Updates und Versionskontrolle"
fi

# Disk Space Check
echo -e "${BLUE}${BOLD}━━━ Speicherplatz ━━━${NC}\n"

if [[ "$OS_TYPE" == "linux" || "$OS_TYPE" == "macos" ]]; then
    if [[ "$OS_TYPE" == "linux" ]]; then
        DISK_FREE=$(df -h . | awk 'NR==2 {print $4}')
        DISK_FREE_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    else
        DISK_FREE=$(df -h . | awk 'NR==2 {print $4}')
        DISK_FREE_GB=$(df -g . | awk 'NR==2 {print $4}')
    fi

    if [ "$DISK_FREE_GB" -ge 10 ]; then
        check_item "Speicherplatz" "ok" "$DISK_FREE verfügbar" "Ausreichend für Installation"
    elif [ "$DISK_FREE_GB" -ge 5 ]; then
        check_item "Speicherplatz" "warn" "$DISK_FREE verfügbar" "Mindestens verfügbar, mehr empfohlen"
    else
        check_item "Speicherplatz" "fail" "$DISK_FREE verfügbar" "Nicht ausreichend (mindestens 5 GB empfohlen)"
        ALL_OK=false
    fi
fi

# RAM Check
echo -e "${BLUE}${BOLD}━━━ Arbeitsspeicher ━━━${NC}\n"

if [[ "$OS_TYPE" == "linux" ]]; then
    RAM_TOTAL=$(free -g | awk 'NR==2 {print $2}')
    RAM_FREE=$(free -g | awk 'NR==2 {print $7}')
elif [[ "$OS_TYPE" == "macos" ]]; then
    RAM_TOTAL=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
    RAM_FREE=$(vm_stat | grep "Pages free" | awk '{print int($3*4096/1024/1024/1024)}')
fi

if [ -n "$RAM_TOTAL" ]; then
    if [ "$RAM_TOTAL" -ge 8 ]; then
        check_item "RAM" "ok" "${RAM_TOTAL} GB total" "Ausreichend für mehrere Server"
    elif [ "$RAM_TOTAL" -ge 4 ]; then
        check_item "RAM" "warn" "${RAM_TOTAL} GB total" "Ausreichend für 1-2 Server"
    else
        check_item "RAM" "warn" "${RAM_TOTAL} GB total" "Mindestens 4 GB empfohlen"
    fi
fi

# Port Check
echo -e "${BLUE}${BOLD}━━━ Ports ━━━${NC}\n"

check_port() {
    local port=$1
    local name=$2

    if command -v nc &> /dev/null; then
        if nc -z localhost $port 2>/dev/null; then
            check_item "Port $port ($name)" "warn" "" "Port bereits belegt"
        else
            check_item "Port $port ($name)" "ok" "" "Port verfügbar"
        fi
    elif command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            check_item "Port $port ($name)" "warn" "" "Port bereits belegt"
        else
            check_item "Port $port ($name)" "ok" "" "Port verfügbar"
        fi
    else
        check_item "Port $port ($name)" "warn" "" "Konnte nicht prüfen (nc/lsof fehlt)"
    fi
}

check_port 80 "Frontend"
check_port 3000 "Backend"
check_port 3001 "WebSocket"
check_port 5432 "PostgreSQL"

# Zusammenfassung
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}${BOLD}✅ ALLES BEREIT!${NC}\n"
    echo -e "Dein System erfüllt alle Voraussetzungen für Superhostingtool!\n"
    echo -e "${BLUE}${BOLD}Nächste Schritte:${NC}\n"
    echo -e "  ${GREEN}./quick-start.sh${NC}        # Automatische Installation"
    echo -e "  ${GREEN}./install.sh${NC}            # Interaktiver Installer"
    echo -e "  ${GREEN}./install.sh --docker${NC}   # Docker Compose direkt\n"
else
    echo -e "${YELLOW}${BOLD}⚠️  TEILWEISE BEREIT${NC}\n"
    echo -e "Einige Komponenten fehlen oder sind nicht optimal konfiguriert.\n"

    if ! command -v docker &> /dev/null || ! docker ps &> /dev/null; then
        echo -e "${BOLD}Docker installieren:${NC}"
        if [[ "$OS_TYPE" == "linux" ]]; then
            echo -e "  ${GREEN}curl -fsSL https://get.docker.com | sudo bash${NC}"
        elif [[ "$OS_TYPE" == "macos" ]]; then
            echo -e "  Lade Docker Desktop herunter: ${BLUE}https://www.docker.com/products/docker-desktop${NC}"
        fi
        echo
    fi

    echo -e "${BOLD}Oder nutze den automatischen Installer:${NC}"
    echo -e "  ${GREEN}./quick-start.sh${NC}        # Installiert fehlende Komponenten automatisch\n"
fi

# Empfehlungen
echo -e "${BLUE}${BOLD}💡 Empfohlene Konfiguration:${NC}\n"
echo -e "  • ${BOLD}RAM:${NC} Mindestens 4 GB (8+ GB empfohlen)"
echo -e "  • ${BOLD}CPU:${NC} 2+ Kerne"
echo -e "  • ${BOLD}Speicher:${NC} 10+ GB frei"
echo -e "  • ${BOLD}OS:${NC} Linux (Ubuntu/Debian) oder macOS"
echo -e "  • ${BOLD}Software:${NC} Docker 20.10+ & Docker Compose\n"

echo -e "${BLUE}${BOLD}📚 Dokumentation:${NC}"
echo -e "  • Quick Start: ${GREEN}GETTING_STARTED.md${NC}"
echo -e "  • Vollständige Anleitung: ${GREEN}README.md${NC}"
echo -e "  • Setup Wizard: ${GREEN}setup-wizard.html${NC}\n"
