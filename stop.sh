#!/bin/bash

################################################################################
# Superhostingtool - Einfacher Stop Script
################################################################################

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${YELLOW}${BOLD}"
cat << "EOF"
  ____  _                   _
 / ___|| |_ ___  _ __  _ __(_)_ __   __ _
 \___ \| __/ _ \| '_ \| '_ \ | '_ \ / _` |
  ___) | || (_) | |_) | |_) | | | | | (_| |
 |____/ \__\___/| .__/| .__/|_|_| |_|\__, |
                |_|   |_|            |___/

   Stoppe Superhostingtool Services...
EOF
echo -e "${NC}\n"

# Prüfe ob Docker Compose existiert
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}⚠️  docker-compose.yml nicht gefunden!${NC}"
    echo -e "Bitte führe dieses Script im Projekt-Verzeichnis aus.\n"
    exit 1
fi

# Frage Benutzer was er tun möchte
echo -e "${BOLD}Was möchtest du tun?${NC}\n"
echo -e "  ${YELLOW}1)${NC} Services stoppen (Container bleiben erhalten)"
echo -e "  ${YELLOW}2)${NC} Services stoppen und Container entfernen"
echo -e "  ${YELLOW}3)${NC} Alles entfernen (inkl. Volumes und Daten) ⚠️"
echo -e "  ${YELLOW}4)${NC} Abbrechen\n"

read -p "Wähle eine Option [1-4]: " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Stoppe Services...${NC}"
        docker-compose stop
        echo -e "${GREEN}✓ Services gestoppt${NC}"
        echo -e "\n${BOLD}Zum Starten:${NC} ./start.sh oder docker-compose start\n"
        ;;
    2)
        echo -e "\n${YELLOW}Stoppe und entferne Container...${NC}"
        docker-compose down
        echo -e "${GREEN}✓ Container entfernt${NC}"
        echo -e "\n${BOLD}Zum Starten:${NC} ./start.sh oder docker-compose up -d\n"
        ;;
    3)
        echo -e "\n${RED}⚠️  ACHTUNG: Dies löscht ALLE Daten!${NC}"
        read -p "Wirklich fortfahren? (j/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[JjYy]$ ]]; then
            echo -e "${RED}Entferne alles...${NC}"
            docker-compose down -v
            echo -e "${GREEN}✓ Alles entfernt${NC}\n"
        else
            echo -e "${YELLOW}Abgebrochen${NC}\n"
        fi
        ;;
    4)
        echo -e "${YELLOW}Abgebrochen${NC}\n"
        exit 0
        ;;
    *)
        echo -e "${RED}Ungültige Auswahl${NC}\n"
        exit 1
        ;;
esac
