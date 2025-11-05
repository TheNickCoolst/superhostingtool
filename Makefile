# Minecraft Hosting Platform - Makefile
# Vereinfacht häufig verwendete Befehle

.PHONY: help install dev start stop logs health clean test build docker-up docker-down

# Farben für Ausgabe
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

help: ## Zeigt diese Hilfe an
	@echo ""
	@echo "$(BLUE)╔═══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║     Minecraft Hosting Platform - Available Commands          ║$(NC)"
	@echo "$(BLUE)╚═══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Führt die One-Click-Installation aus
	@./install.sh

install-docker: ## Installiert mit Docker Compose
	@./install.sh --docker

install-local: ## Installiert für lokale Entwicklung
	@./install.sh --local

dev: ## Startet die Entwicklungsumgebung
	@./scripts/dev.sh

dev-backend: ## Startet nur Backend
	@./scripts/dev.sh backend

dev-frontend: ## Startet nur Frontend
	@./scripts/dev.sh frontend

dev-agent: ## Startet nur Agent
	@./scripts/dev.sh agent

start: ## Startet die Produktion
	@./scripts/start.sh

stop: ## Stoppt alle Services
	@./scripts/stop.sh

restart: stop start ## Neustart aller Services

logs: ## Zeigt Logs an
	@./scripts/logs.sh

logs-backend: ## Zeigt Backend-Logs
	@./scripts/logs.sh backend

logs-frontend: ## Zeigt Frontend-Logs
	@./scripts/logs.sh frontend

logs-agent: ## Zeigt Agent-Logs
	@./scripts/logs.sh agent

health: ## Führt Health Check aus
	@./scripts/health-check.sh

clean: ## Räumt Build-Artefakte auf
	@echo "$(YELLOW)Räume auf...$(NC)"
	@find . -name "dist" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	@find . -name "*.log" -type f -delete 2>/dev/null || true
	@echo "$(GREEN)✓ Aufgeräumt$(NC)"

clean-all: ## Räumt alles auf (inkl. node_modules)
	@./scripts/uninstall.sh

test: ## Führt alle Tests aus
	@npm test

test-backend: ## Führt Backend-Tests aus
	@npm test --workspace=backend

test-frontend: ## Führt Frontend-Tests aus
	@npm test --workspace=frontend

build: ## Baut alle Workspaces
	@echo "$(BLUE)Baue Projekt...$(NC)"
	@npm run build
	@echo "$(GREEN)✓ Build abgeschlossen$(NC)"

build-backend: ## Baut Backend
	@npm run build --workspace=backend

build-frontend: ## Baut Frontend
	@npm run build --workspace=frontend

build-agent: ## Baut Agent
	@npm run build --workspace=agent

docker-up: ## Startet Docker Compose
	@docker-compose up -d
	@echo "$(GREEN)✓ Docker Container gestartet$(NC)"

docker-down: ## Stoppt Docker Compose
	@docker-compose down
	@echo "$(GREEN)✓ Docker Container gestoppt$(NC)"

docker-logs: ## Zeigt Docker Logs
	@docker-compose logs -f

docker-build: ## Baut Docker Images neu
	@docker-compose build

docker-restart: ## Neustart Docker Container
	@docker-compose restart

migrate: ## Führt Datenbank-Migrationen aus
	@cd backend && npx prisma migrate deploy

migrate-dev: ## Führt Dev-Migrationen aus
	@cd backend && npx prisma migrate dev

db-studio: ## Öffnet Prisma Studio
	@cd backend && npx prisma studio

db-seed: ## Seed die Datenbank
	@cd backend && npm run seed

db-reset: ## Setzt Datenbank zurück
	@cd backend && npx prisma migrate reset

format: ## Formatiert Code mit Prettier
	@npm run format 2>/dev/null || echo "$(YELLOW)Format-Script nicht konfiguriert$(NC)"

lint: ## Prüft Code mit ESLint
	@npm run lint 2>/dev/null || echo "$(YELLOW)Lint-Script nicht konfiguriert$(NC)"

deps: ## Installiert alle Dependencies
	@npm install
	@echo "$(GREEN)✓ Dependencies installiert$(NC)"

deps-update: ## Aktualisiert alle Dependencies
	@npm update
	@echo "$(GREEN)✓ Dependencies aktualisiert$(NC)"

check: health ## Alias für health

status: ## Zeigt Status aller Services
	@echo "$(BLUE)Service Status:$(NC)"
	@if docker ps --format '{{.Names}}' | grep -q backend 2>/dev/null; then \
		docker-compose ps; \
	else \
		echo "$(YELLOW)Docker Container nicht aktiv$(NC)"; \
		pgrep -af node || echo "$(YELLOW)Keine Node-Prozesse gefunden$(NC)"; \
	fi

# Alias-Befehle für Convenience
run: dev ## Alias für dev
up: start ## Alias für start
down: stop ## Alias für stop
