#!/bin/bash

################################################################################
# SUPER EINFACHER ONE-COMMAND INSTALLER
#
# Einfach ausführen: curl -fsSL https://raw.githubusercontent.com/yourusername/superhostingtool/main/quick-start.sh | bash
#
# Oder lokal: ./quick-start.sh
################################################################################

set -e

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${PURPLE}${BOLD}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    🚀 SUPERHOSTINGTOOL - SUPER EINFACHE INSTALLATION 🚀      ║
║                                                               ║
║         Minecraft Hosting Platform in 60 Sekunden!           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

echo -e "${BLUE}Was macht dieses Script?${NC}"
echo -e "  ✓ Installiert automatisch Docker & Docker Compose"
echo -e "  ✓ Lädt das Projekt herunter"
echo -e "  ✓ Konfiguriert alles automatisch"
echo -e "  ✓ Startet die Plattform"
echo -e "\n${GREEN}${BOLD}Keine manuelle Konfiguration nötig!${NC}\n"

read -p "Installation starten? (Enter drücken) " -r
echo

# Betriebssystem erkennen
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo -e "${RED}Fehler: Nicht unterstütztes Betriebssystem${NC}"
    exit 1
fi

echo -e "${BLUE}━━━ Schritt 1/4: Docker installieren ━━━${NC}\n"

# Docker Check & Installation
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker nicht gefunden. Installiere Docker...${NC}"

    if [ "$OS" = "linux" ]; then
        # Docker für Linux
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh

        # Docker starten
        sudo systemctl start docker || sudo service docker start
        sudo systemctl enable docker || true

        echo -e "${GREEN}✓ Docker installiert!${NC}"
    elif [ "$OS" = "macos" ]; then
        echo -e "${YELLOW}Bitte Docker Desktop für macOS installieren:${NC}"
        echo -e "  1. Öffne: ${BLUE}https://www.docker.com/products/docker-desktop${NC}"
        echo -e "  2. Lade Docker Desktop herunter und installiere es"
        echo -e "  3. Starte Docker Desktop"
        echo -e "  4. Führe dieses Script erneut aus\n"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Docker bereits installiert${NC}"
fi

# Docker Compose Check
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${YELLOW}Docker Compose nicht gefunden. Installiere...${NC}"

    if [ "$OS" = "linux" ]; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi

    echo -e "${GREEN}✓ Docker Compose installiert!${NC}"
else
    echo -e "${GREEN}✓ Docker Compose bereits installiert${NC}"
fi

echo -e "\n${BLUE}━━━ Schritt 2/4: Projekt vorbereiten ━━━${NC}\n"

# Check ob wir schon im Projekt-Verzeichnis sind
if [ -f "docker-compose.yml" ] && [ -f "package.json" ]; then
    echo -e "${GREEN}✓ Bereits im Projekt-Verzeichnis${NC}"
    PROJECT_DIR=$(pwd)
else
    # Git Check
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}Git nicht gefunden. Installiere Git...${NC}"

        if [ "$OS" = "linux" ]; then
            sudo apt-get update -qq
            sudo apt-get install -y git
        elif [ "$OS" = "macos" ]; then
            xcode-select --install
        fi
    fi

    # Projekt klonen
    echo -e "${YELLOW}Klone Projekt...${NC}"
    INSTALL_DIR="$HOME/superhostingtool"

    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}Verzeichnis existiert bereits. Aktualisiere...${NC}"
        cd "$INSTALL_DIR"
        git pull || true
    else
        git clone https://github.com/yourusername/superhostingtool.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    PROJECT_DIR="$INSTALL_DIR"
    echo -e "${GREEN}✓ Projekt bereit${NC}"
fi

echo -e "\n${BLUE}━━━ Schritt 3/4: Automatische Konfiguration ━━━${NC}\n"

# Umgebungsvariablen automatisch erstellen
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Erstelle Backend-Konfiguration...${NC}"
    cp backend/.env.example backend/.env

    # Sichere Secrets generieren
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)

    # .env aktualisieren
    sed -i.bak "s|your-super-secret-jwt-key-change-this-in-production|${JWT_SECRET}|g" backend/.env
    sed -i.bak "s|postgres:postgres@|postgres:${DB_PASSWORD}@|g" backend/.env
    rm backend/.env.bak 2>/dev/null || true

    echo -e "${GREEN}✓ Backend konfiguriert${NC}"
fi

if [ ! -f "agent/.env" ]; then
    echo -e "${YELLOW}Erstelle Agent-Konfiguration...${NC}"
    cp agent/.env.example agent/.env

    AGENT_KEY=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    sed -i.bak "s|your-agent-api-key-change-this|${AGENT_KEY}|g" agent/.env
    rm agent/.env.bak 2>/dev/null || true

    echo -e "${GREEN}✓ Agent konfiguriert${NC}"
fi

# Docker Compose Konfiguration anpassen
if [ ! -f "docker-compose.override.yml" ]; then
    cat > docker-compose.override.yml << 'COMPOSE'
version: '3.8'

services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    restart: unless-stopped

  frontend:
    restart: unless-stopped

  agent:
    restart: unless-stopped

volumes:
  postgres-data:
COMPOSE
    echo -e "${GREEN}✓ Docker Compose optimiert${NC}"
fi

echo -e "\n${BLUE}━━━ Schritt 4/4: Plattform starten ━━━${NC}\n"

echo -e "${YELLOW}Starte Container (dies kann 2-3 Minuten dauern)...${NC}"

# Container bauen und starten
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Warte auf Datenbank
echo -e "${YELLOW}Warte auf Datenbank...${NC}"
sleep 15

# Datenbank migrieren
echo -e "${YELLOW}Richte Datenbank ein...${NC}"
docker-compose exec -T backend npx prisma migrate deploy 2>/dev/null || {
    echo -e "${YELLOW}Erste Migration... bitte warten${NC}"
    sleep 10
    docker-compose exec -T backend npx prisma migrate deploy
}

# Prüfe ob alles läuft
echo -e "\n${YELLOW}Prüfe Services...${NC}"
sleep 5

# Health Check
FRONTEND_STATUS=$(docker-compose ps | grep frontend | grep -c "Up" || echo "0")
BACKEND_STATUS=$(docker-compose ps | grep backend | grep -c "Up" || echo "0")

if [ "$FRONTEND_STATUS" = "1" ] && [ "$BACKEND_STATUS" = "1" ]; then
    echo -e "\n${GREEN}${BOLD}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              🎉 INSTALLATION ERFOLGREICH! 🎉                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"

    echo -e "${CYAN}${BOLD}🌐 Deine Plattform ist jetzt verfügbar:${NC}\n"
    echo -e "   ${BOLD}Frontend:${NC}  ${BLUE}http://localhost${NC}"
    echo -e "   ${BOLD}Backend:${NC}   ${BLUE}http://localhost:3000${NC}"
    echo -e "   ${BOLD}API Docs:${NC}  ${BLUE}http://localhost:3000/api${NC}\n"

    echo -e "${CYAN}${BOLD}📚 Nächste Schritte:${NC}\n"
    echo -e "   1. Öffne ${BLUE}http://localhost${NC} in deinem Browser"
    echo -e "   2. Erstelle einen Account"
    echo -e "   3. Erstelle deinen ersten Minecraft-Server!\n"

    echo -e "${CYAN}${BOLD}🛠️  Nützliche Befehle:${NC}\n"
    echo -e "   ${GREEN}docker-compose logs -f${NC}              # Logs ansehen"
    echo -e "   ${GREEN}docker-compose restart${NC}              # Neustart"
    echo -e "   ${GREEN}docker-compose down${NC}                 # Stoppen"
    echo -e "   ${GREEN}docker-compose up -d${NC}                # Starten\n"

    echo -e "${CYAN}${BOLD}📖 Dokumentation:${NC}"
    echo -e "   ${BLUE}$PROJECT_DIR/README.md${NC}\n"

    # Browser öffnen (optional)
    read -p "Browser automatisch öffnen? (j/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[JjYy]$ ]]; then
        if [ "$OS" = "linux" ]; then
            xdg-open http://localhost 2>/dev/null || true
        elif [ "$OS" = "macos" ]; then
            open http://localhost
        fi
    fi

else
    echo -e "\n${YELLOW}⚠️  Services starten noch...${NC}"
    echo -e "   Führe aus: ${GREEN}docker-compose logs -f${NC}"
    echo -e "   Und warte bis alle Services bereit sind.\n"
fi

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Viel Spaß mit deiner Minecraft Hosting Plattform! 🎮${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
