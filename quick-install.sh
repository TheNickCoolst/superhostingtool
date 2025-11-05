#!/bin/bash

################################################################################
# Minecraft Hosting Platform - Super Easy 1-Click Installation
# Installiert alles automatisch ohne Fragen!
################################################################################

set -e

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Schöner Header
clear
echo -e "${PURPLE}${BOLD}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║       🚀 Minecraft Hosting - Super Easy Installation 🚀      ║
║                                                               ║
║             Alles wird automatisch installiert!               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

log() {
    echo -e "${GREEN}✓${NC} $1"
}

log_info() {
    echo -e "${BLUE}►${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Prüfe Betriebssystem
if [[ "$OSTYPE" != "linux-gnu"* ]] && [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "Dieses Skript unterstützt nur Linux und macOS"
fi

IS_MAC=false
if [[ "$OSTYPE" == "darwin"* ]]; then
    IS_MAC=true
fi

log_info "Starte Installation..."
echo ""

# 1. Node.js installieren (falls nicht vorhanden)
if ! command -v node &> /dev/null; then
    log_info "Installiere Node.js..."
    if [ "$IS_MAC" = true ]; then
        if ! command -v brew &> /dev/null; then
            log_error "Homebrew nicht gefunden. Bitte installiere: https://brew.sh"
        fi
        brew install node@18 &> /dev/null
    else
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &> /dev/null
        sudo apt-get install -y nodejs &> /dev/null
    fi
    log "Node.js installiert"
else
    log "Node.js bereits installiert"
fi

# 2. PostgreSQL via Docker starten
log_info "Starte PostgreSQL Datenbank..."

if ! command -v docker &> /dev/null; then
    log_warn "Docker nicht gefunden - installiere Docker..."
    if [ "$IS_MAC" = true ]; then
        log_error "Bitte installiere Docker Desktop: https://www.docker.com/products/docker-desktop"
    else
        curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        sudo sh /tmp/get-docker.sh &> /dev/null
        sudo usermod -aG docker $USER
        rm /tmp/get-docker.sh
        log "Docker installiert"
    fi
fi

# Stoppe alte PostgreSQL Container
docker stop minecraft-hosting-postgres 2>/dev/null || true
docker rm minecraft-hosting-postgres 2>/dev/null || true

# Starte PostgreSQL
docker run -d --name minecraft-hosting-postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=minecraft_hosting \
    postgres:15 &> /dev/null

log "PostgreSQL Datenbank gestartet"
sleep 3

# 3. Environment Files erstellen
log_info "Erstelle Konfigurationsdateien..."

# Backend .env
if [ ! -f "${SCRIPT_DIR}/backend/.env" ]; then
    cp "${SCRIPT_DIR}/backend/.env.example" "${SCRIPT_DIR}/backend/.env" 2>/dev/null || true

    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

    if [ "$IS_MAC" = true ]; then
        sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/${JWT_SECRET}/" "${SCRIPT_DIR}/backend/.env" 2>/dev/null || true
    else
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/${JWT_SECRET}/" "${SCRIPT_DIR}/backend/.env" 2>/dev/null || true
    fi
fi

# Agent .env
if [ ! -f "${SCRIPT_DIR}/agent/.env" ]; then
    cp "${SCRIPT_DIR}/agent/.env.example" "${SCRIPT_DIR}/agent/.env" 2>/dev/null || true

    AGENT_KEY=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

    if [ "$IS_MAC" = true ]; then
        sed -i '' "s/your-agent-api-key-change-this/${AGENT_KEY}/" "${SCRIPT_DIR}/agent/.env" 2>/dev/null || true
    else
        sed -i "s/your-agent-api-key-change-this/${AGENT_KEY}/" "${SCRIPT_DIR}/agent/.env" 2>/dev/null || true
    fi
fi

log "Konfiguration erstellt"

# 4. Dependencies installieren
log_info "Installiere Pakete (das kann 1-2 Minuten dauern)..."
cd "$SCRIPT_DIR"
npm install --silent &> /dev/null || npm install
log "Pakete installiert"

# 5. Shared Library bauen
log_info "Baue Shared-Bibliothek..."
npm run build --workspace=shared &> /dev/null
log "Shared-Bibliothek gebaut"

# 6. Datenbank einrichten
log_info "Richte Datenbank ein..."
cd "${SCRIPT_DIR}/backend"
npx prisma generate &> /dev/null
npx prisma migrate deploy &> /dev/null
log "Datenbank eingerichtet"

# Fertig!
echo ""
echo -e "${GREEN}${BOLD}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                  🎉 Installation Erfolgreich! 🎉             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}${BOLD}Starte jetzt die Anwendung:${NC}\n"
echo -e "  ${GREEN}npm run dev${NC}\n"

echo -e "${CYAN}${BOLD}Dann öffne im Browser:${NC}\n"
echo -e "  ${BLUE}http://localhost:5173${NC}\n"

echo -e "${CYAN}${BOLD}Wichtig:${NC}"
echo -e "  ${YELLOW}→${NC} Der erste Benutzer wird automatisch ${BOLD}Administrator${NC}"
echo -e "  ${YELLOW}→${NC} Registriere dich gleich nach dem Start!\n"

echo -e "${BLUE}Viel Spaß! 🎮${NC}\n"
