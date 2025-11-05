#!/bin/bash

################################################################################
# Superhostingtool - Einfacher Start Script
################################################################################

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BLUE}${BOLD}"
cat << "EOF"
  ____                       _               _   _
 / ___| _   _ _ __   ___ _ _| |__   ___  ___| |_(_)_ __   __ _
 \___ \| | | | '_ \ / _ \ '__| '_ \ / _ \/ __| __| | '_ \ / _` |
  ___) | |_| | |_) |  __/ |  | | | | (_) \__ \ |_| | | | | (_| |
 |____/ \__,_| .__/ \___|_|  |_| |_|\___/|___/\__|_|_| |_|\__, |
             |_|                                           |___/

         🎮 Minecraft Hosting Platform 🎮
EOF
echo -e "${NC}\n"

# Prüfe ob Docker Compose existiert
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}⚠️  docker-compose.yml nicht gefunden!${NC}"
    echo -e "Bitte führe dieses Script im Projekt-Verzeichnis aus.\n"
    exit 1
fi

# Prüfe ob Docker läuft
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker läuft nicht oder ist nicht installiert!${NC}"
    echo -e "\nBitte starte Docker oder führe die Installation aus:"
    echo -e "  ${GREEN}./quick-start.sh${NC}\n"
    exit 1
fi

echo -e "${BLUE}📦 Starte alle Services...${NC}\n"

# Starte Docker Compose
docker-compose up -d

echo -e "\n${BLUE}⏳ Warte auf Services...${NC}"
sleep 5

# Zeige Status
echo -e "\n${BLUE}📊 Service Status:${NC}\n"
docker-compose ps

# Prüfe ob Services laufen
RUNNING=$(docker-compose ps | grep -c "Up" || echo "0")

if [ "$RUNNING" -ge 3 ]; then
    echo -e "\n${GREEN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                                                        ║"
    echo "║          ✅ Plattform erfolgreich gestartet!          ║"
    echo "║                                                        ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    echo -e "${BLUE}${BOLD}🌐 Zugriff:${NC}"
    echo -e "   Frontend:  ${GREEN}http://localhost${NC}"
    echo -e "   Backend:   ${GREEN}http://localhost:3000${NC}"
    echo -e "   API Docs:  ${GREEN}http://localhost:3000/api${NC}\n"

    echo -e "${BLUE}${BOLD}📚 Nützliche Befehle:${NC}"
    echo -e "   ${GREEN}docker-compose logs -f${NC}       # Logs ansehen"
    echo -e "   ${GREEN}docker-compose restart${NC}       # Neustart"
    echo -e "   ${GREEN}./stop.sh${NC}                    # Stoppen\n"

    # Frage ob Browser geöffnet werden soll
    read -p "Browser öffnen? (j/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[JjYy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open http://localhost
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open http://localhost 2>/dev/null || echo "Bitte öffne: http://localhost"
        fi
    fi

else
    echo -e "\n${YELLOW}⚠️  Einige Services sind noch nicht bereit.${NC}"
    echo -e "Führe aus: ${GREEN}docker-compose logs -f${NC} für Details\n"
fi
