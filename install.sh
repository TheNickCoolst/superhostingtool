#!/bin/bash

################################################################################
# Minecraft Hosting Platform - One-Click Installation Script
# Version: 1.0.0
# Description: Automated installation with multiple deployment modes
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/install.log"
MIN_NODE_VERSION="18.0.0"
MIN_DOCKER_VERSION="20.10.0"

################################################################################
# Utility Functions
################################################################################

print_header() {
    echo -e "${PURPLE}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║    🎮 Minecraft Hosting Platform - Installation Script 🎮    ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log() {
    echo -e "${GREEN}[✓]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

print_step() {
    echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

version_ge() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

################################################################################
# Prerequisite Checks
################################################################################

check_node() {
    if command -v node &> /dev/null; then
        local node_version=$(node -v | sed 's/v//')
        if version_ge "$node_version" "$MIN_NODE_VERSION"; then
            log "Node.js $node_version gefunden ✓"
            return 0
        else
            log_warn "Node.js $node_version ist zu alt (benötigt: $MIN_NODE_VERSION)"
            return 1
        fi
    else
        log_warn "Node.js nicht installiert"
        return 1
    fi
}

check_npm() {
    if command -v npm &> /dev/null; then
        local npm_version=$(npm -v)
        log "npm $npm_version gefunden ✓"
        return 0
    else
        log_warn "npm nicht installiert"
        return 1
    fi
}

check_docker() {
    if command -v docker &> /dev/null; then
        if docker ps &> /dev/null; then
            local docker_version=$(docker -v | grep -oP '\d+\.\d+\.\d+' | head -n1)
            log "Docker $docker_version gefunden und läuft ✓"
            return 0
        else
            log_warn "Docker installiert aber nicht gestartet"
            return 2
        fi
    else
        log_warn "Docker nicht installiert"
        return 1
    fi
}

check_docker_compose() {
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        log "Docker Compose gefunden ✓"
        return 0
    else
        log_warn "Docker Compose nicht installiert"
        return 1
    fi
}

check_postgres() {
    if command -v psql &> /dev/null; then
        local pg_version=$(psql --version | grep -oP '\d+(\.\d+)?')
        log "PostgreSQL $pg_version gefunden ✓"
        return 0
    else
        log_info "PostgreSQL nicht lokal installiert (optional bei Docker-Installation)"
        return 1
    fi
}

check_git() {
    if command -v git &> /dev/null; then
        log "Git gefunden ✓"
        return 0
    else
        log_warn "Git nicht installiert"
        return 1
    fi
}

################################################################################
# Installation Functions
################################################################################

install_node_linux() {
    log_info "Installiere Node.js via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
}

install_node_macos() {
    log_info "Installiere Node.js via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install node@18
    else
        log_error "Homebrew nicht gefunden. Bitte installiere Node.js manuell von: https://nodejs.org"
        exit 1
    fi
}

install_docker_linux() {
    log_info "Installiere Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    log_warn "Bitte melde dich ab und wieder an, damit Docker-Gruppenrechte wirksam werden"
}

install_docker_macos() {
    log_info "Bitte installiere Docker Desktop von: https://www.docker.com/products/docker-desktop"
    open "https://www.docker.com/products/docker-desktop"
    exit 1
}

install_prerequisites() {
    local os=$(check_os)
    log_info "Betriebssystem erkannt: $os"

    # Check and install Node.js
    if ! check_node; then
        read -p "Node.js installieren? (j/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[JjYy]$ ]]; then
            case $os in
                linux)
                    install_node_linux
                    ;;
                macos)
                    install_node_macos
                    ;;
                *)
                    log_error "Automatische Installation auf diesem OS nicht unterstützt"
                    log_info "Bitte installiere Node.js $MIN_NODE_VERSION+ von: https://nodejs.org"
                    exit 1
                    ;;
            esac
        else
            log_error "Node.js wird benötigt. Installation abgebrochen."
            exit 1
        fi
    fi

    # Check npm
    if ! check_npm; then
        log_error "npm sollte mit Node.js installiert worden sein. Bitte überprüfe deine Installation."
        exit 1
    fi

    # Git check
    if ! check_git; then
        log_warn "Git wird empfohlen für Updates und Versionskontrolle"
    fi
}

################################################################################
# Setup Functions
################################################################################

setup_environment_files() {
    print_step "Erstelle Umgebungskonfigurationen"

    # Backend .env
    if [ ! -f "${SCRIPT_DIR}/backend/.env" ]; then
        log_info "Erstelle backend/.env..."
        cp "${SCRIPT_DIR}/backend/.env.example" "${SCRIPT_DIR}/backend/.env"

        # Generate random JWT secret
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

        # Update .env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/${JWT_SECRET}/" "${SCRIPT_DIR}/backend/.env"
        else
            sed -i "s/your-super-secret-jwt-key-change-this-in-production/${JWT_SECRET}/" "${SCRIPT_DIR}/backend/.env"
        fi

        log "Backend .env erstellt mit generiertem JWT_SECRET"
    else
        log "backend/.env existiert bereits"
    fi

    # Agent .env
    if [ ! -f "${SCRIPT_DIR}/agent/.env" ]; then
        log_info "Erstelle agent/.env..."
        cp "${SCRIPT_DIR}/agent/.env.example" "${SCRIPT_DIR}/agent/.env"

        # Generate random agent API key
        AGENT_KEY=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/your-agent-api-key-change-this/${AGENT_KEY}/" "${SCRIPT_DIR}/agent/.env"
        else
            sed -i "s/your-agent-api-key-change-this/${AGENT_KEY}/" "${SCRIPT_DIR}/agent/.env"
        fi

        log "Agent .env erstellt mit generiertem AGENT_API_KEY"
    else
        log "agent/.env existiert bereits"
    fi
}

install_dependencies() {
    print_step "Installiere Dependencies"

    cd "$SCRIPT_DIR"

    log_info "Installiere npm-Pakete (dies kann einige Minuten dauern)..."
    npm install --loglevel=error

    log "Alle Dependencies installiert"
}

build_shared() {
    print_step "Baue Shared-Bibliothek"

    cd "$SCRIPT_DIR"
    npm run build --workspace=shared

    log "Shared-Bibliothek gebaut"
}

setup_database() {
    print_step "Richte Datenbank ein"

    cd "${SCRIPT_DIR}/backend"

    log_info "Generiere Prisma Client..."
    npx prisma generate

    log_info "Führe Datenbank-Migrationen aus..."
    npx prisma migrate deploy

    log "Datenbank eingerichtet"
}

################################################################################
# Installation Modes
################################################################################

install_local_development() {
    print_header
    echo -e "${BOLD}Installation: Lokale Entwicklungsumgebung${NC}\n"

    install_prerequisites
    setup_environment_files
    install_dependencies
    build_shared

    # Check if PostgreSQL is available
    if ! check_postgres; then
        log_warn "PostgreSQL nicht gefunden."
        log_info "Du kannst entweder:"
        log_info "  1. PostgreSQL lokal installieren"
        log_info "  2. PostgreSQL via Docker starten: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15"
        log_info "  3. Docker Compose verwenden (siehe: ./install.sh --docker)"
        echo
        read -p "PostgreSQL via Docker starten? (j/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[JjYy]$ ]]; then
            if check_docker; then
                log_info "Starte PostgreSQL Container..."
                docker run -d --name minecraft-hosting-postgres \
                    -p 5432:5432 \
                    -e POSTGRES_USER=postgres \
                    -e POSTGRES_PASSWORD=postgres \
                    -e POSTGRES_DB=minecraft_hosting \
                    postgres:15
                log "PostgreSQL Container gestartet"
                sleep 3  # Wait for DB to be ready
            else
                log_error "Docker nicht verfügbar"
                exit 1
            fi
        else
            log_warn "Bitte stelle sicher, dass PostgreSQL läuft bevor du die Anwendung startest"
        fi
    fi

    setup_database

    print_step "Installation Abgeschlossen! 🎉"

    echo -e "${GREEN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   Installation Erfolgreich!                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${CYAN}Nächste Schritte:${NC}\n"
    echo -e "  ${BOLD}Starte die Entwicklungsserver:${NC}"
    echo -e "    ${GREEN}npm run dev${NC}            # Startet alle Services gleichzeitig"
    echo -e "    ${GREEN}npm run dev:backend${NC}    # Nur Backend"
    echo -e "    ${GREEN}npm run dev:frontend${NC}   # Nur Frontend"
    echo -e "    ${GREEN}npm run dev:agent${NC}      # Nur Agent\n"

    echo -e "  ${BOLD}Zugriff:${NC}"
    echo -e "    Frontend:  ${BLUE}http://localhost:5173${NC}"
    echo -e "    Backend:   ${BLUE}http://localhost:3000${NC}"
    echo -e "    WebSocket: ${BLUE}ws://localhost:3001${NC}"
    echo -e "    Agent:     ${BLUE}http://localhost:4000${NC}\n"

    echo -e "  ${BOLD}Weitere Befehle:${NC}"
    echo -e "    ${GREEN}npm run build${NC}          # Baue für Produktion"
    echo -e "    ${GREEN}npm test${NC}               # Führe Tests aus"
    echo -e "    ${GREEN}./scripts/health-check.sh${NC}  # System-Gesundheitscheck\n"
}

install_docker() {
    print_header
    echo -e "${BOLD}Installation: Docker Compose${NC}\n"

    # Check Docker
    local docker_status=$(check_docker; echo $?)
    if [ $docker_status -eq 1 ]; then
        read -p "Docker installieren? (j/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[JjYy]$ ]]; then
            local os=$(check_os)
            case $os in
                linux)
                    install_docker_linux
                    ;;
                macos)
                    install_docker_macos
                    ;;
                *)
                    log_error "Docker-Installation auf diesem OS nicht unterstützt"
                    exit 1
                    ;;
            esac
        else
            log_error "Docker wird benötigt. Installation abgebrochen."
            exit 1
        fi
    elif [ $docker_status -eq 2 ]; then
        log_info "Starte Docker..."
        sudo systemctl start docker || sudo service docker start
    fi

    check_docker_compose || {
        log_error "Docker Compose nicht gefunden. Bitte installiere Docker Desktop oder docker-compose"
        exit 1
    }

    setup_environment_files

    print_step "Starte Docker Container"

    cd "$SCRIPT_DIR"

    log_info "Baue und starte Container..."
    docker-compose up -d --build

    log_info "Warte auf Datenbank..."
    sleep 10

    log_info "Führe Datenbank-Migrationen aus..."
    docker-compose exec -T backend npx prisma migrate deploy

    print_step "Installation Abgeschlossen! 🎉"

    echo -e "${GREEN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                Docker Installation Erfolgreich!               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${CYAN}Container Status:${NC}\n"
    docker-compose ps

    echo -e "\n${CYAN}Zugriff:${NC}"
    echo -e "    Frontend:  ${BLUE}http://localhost${NC}"
    echo -e "    Backend:   ${BLUE}http://localhost:3000${NC}\n"

    echo -e "${CYAN}Nützliche Befehle:${NC}"
    echo -e "    ${GREEN}docker-compose logs -f${NC}              # Logs ansehen"
    echo -e "    ${GREEN}docker-compose stop${NC}                 # Container stoppen"
    echo -e "    ${GREEN}docker-compose down${NC}                 # Container entfernen"
    echo -e "    ${GREEN}docker-compose restart${NC}              # Container neustarten\n"
}

install_minimal() {
    print_header
    echo -e "${BOLD}Installation: Minimal (nur Dependencies)${NC}\n"

    install_prerequisites
    install_dependencies
    build_shared

    log "Minimale Installation abgeschlossen"
    log_info "Erstelle .env-Dateien und richte die Datenbank manuell ein"
}

################################################################################
# Main Menu
################################################################################

show_menu() {
    print_header

    echo -e "${GREEN}${BOLD}💡 Tipp: Für eine super einfache Installation, nutze:${NC}"
    echo -e "${BLUE}   ./quick-install.sh${NC}\n"
    echo -e "${BOLD}Oder wähle einen erweiterten Installationsmodus:${NC}\n"

    echo -e "${CYAN}1)${NC} ${BOLD}Lokale Entwicklung${NC}"
    echo -e "   → Für Entwickler: Installiert alle Dependencies lokal"
    echo -e "   → Benötigt: Node.js 18+, PostgreSQL (oder Docker für DB)"
    echo -e "   → Hot-Reload, volle Kontrolle\n"

    echo -e "${CYAN}2)${NC} ${BOLD}Docker Compose${NC} ${GREEN}(Empfohlen)${NC}"
    echo -e "   → Produktionsreife Umgebung mit einem Befehl"
    echo -e "   → Benötigt: Docker & Docker Compose"
    echo -e "   → Isoliert, einfach zu deployen\n"

    echo -e "${CYAN}3)${NC} ${BOLD}Minimal${NC}"
    echo -e "   → Installiert nur npm-Dependencies"
    echo -e "   → Für erfahrene Benutzer mit eigener Konfiguration\n"

    echo -e "${CYAN}4)${NC} ${BOLD}Systemcheck${NC}"
    echo -e "   → Prüft installierte Voraussetzungen\n"

    echo -e "${CYAN}5)${NC} Beenden\n"

    read -p "Deine Wahl [1-5]: " choice

    case $choice in
        1)
            install_local_development
            ;;
        2)
            install_docker
            ;;
        3)
            install_minimal
            ;;
        4)
            system_check
            show_menu
            ;;
        5)
            echo -e "${YELLOW}Installation abgebrochen${NC}"
            exit 0
            ;;
        *)
            log_error "Ungültige Auswahl"
            show_menu
            ;;
    esac
}

system_check() {
    print_step "System-Überprüfung"

    local os=$(check_os)
    log_info "Betriebssystem: $os"

    echo
    check_node && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
    check_npm && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
    check_docker && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
    check_docker_compose && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
    check_postgres && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
    check_git && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

    echo
}

################################################################################
# Main Entry Point
################################################################################

main() {
    # Clear log file
    echo "Installation gestartet: $(date)" > "$LOG_FILE"

    # Parse command-line arguments
    case "${1:-}" in
        --local|--dev)
            install_local_development
            ;;
        --docker)
            install_docker
            ;;
        --minimal)
            install_minimal
            ;;
        --check)
            system_check
            ;;
        --help|-h)
            echo "Verwendung: $0 [OPTION]"
            echo ""
            echo "Optionen:"
            echo "  --local, --dev     Lokale Entwicklungsumgebung"
            echo "  --docker           Docker Compose Installation"
            echo "  --minimal          Nur Dependencies installieren"
            echo "  --check            System-Voraussetzungen prüfen"
            echo "  --help, -h         Diese Hilfe anzeigen"
            echo ""
            echo "Ohne Argumente wird das interaktive Menü gestartet."
            ;;
        *)
            show_menu
            ;;
    esac
}

# Run main function
main "$@"
