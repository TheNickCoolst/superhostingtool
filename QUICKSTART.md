# 🚀 Quick Start Guide

## One-Click Installation

Die einfachste Methode, die Minecraft Hosting Platform zu installieren:

```bash
./install.sh
```

Das Installationsskript führt dich durch den gesamten Prozess und bietet drei Modi:

### Installation Modi

#### 1️⃣ Lokale Entwicklung
```bash
./install.sh --local
```
- ✅ Ideal für Entwicklung
- ✅ Hot-Reload aktiviert
- ✅ Volle Kontrolle über Services
- ⚙️ Benötigt: Node.js 18+, PostgreSQL

#### 2️⃣ Docker Compose (Empfohlen)
```bash
./install.sh --docker
```
- ✅ Produktionsreif
- ✅ Ein-Klick-Deployment
- ✅ Vollständig isoliert
- ⚙️ Benötigt: Docker & Docker Compose

#### 3️⃣ Minimal
```bash
./install.sh --minimal
```
- ✅ Nur Dependencies
- ✅ Für erfahrene Benutzer
- ⚙️ Manuelle Konfiguration erforderlich

---

## Schnellstart nach Installation

### Mit Docker Compose

```bash
# Alle Services starten
docker-compose up -d

# Logs ansehen
docker-compose logs -f

# Services stoppen
docker-compose down
```

**Zugriff:**
- Frontend: http://localhost
- Backend API: http://localhost:3000
- API Dokumentation: http://localhost:3000/api-docs

### Lokale Entwicklung

```bash
# Alle Services starten
npm run dev

# Oder einzeln starten:
npm run dev:backend    # Backend + WebSocket
npm run dev:frontend   # React Development Server
npm run dev:agent      # Host Agent
```

**Zugriff:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3001
- Agent: http://localhost:4000

---

## Erste Schritte

### 1. Registrierung

Öffne das Frontend und erstelle einen Account:
```
http://localhost:5173/register
```

### 2. Host hinzufügen

Bevor du Server erstellen kannst, muss mindestens ein Host aktiv sein:

```bash
# Agent starten (falls nicht bereits laufend)
npm run dev:agent
```

Der Agent registriert sich automatisch beim Backend.

### 3. Minecraft Server erstellen

1. Gehe zu **Dashboard → Neuer Server**
2. Wähle:
   - Server-Typ (Vanilla, Paper, Forge, etc.)
   - Minecraft Version
   - RAM & CPU
   - Host
3. Klicke auf **Server erstellen**
4. Warte auf die Installation (~30-60 Sekunden)

### 4. Server starten

- Klicke auf **Start** im Server-Dashboard
- Server startet innerhalb von 10-30 Sekunden
- Verbinde dich mit: `localhost:25565` (oder die IP deines Hosts)

---

## Nützliche Befehle

### Entwicklung

```bash
# Alle Tests ausführen
npm test

# Nur Backend-Tests
npm test --workspace=backend

# Build für Produktion
npm run build

# TypeScript Type-Checking
npm run type-check
```

### Datenbank

```bash
# Migrations ausführen
cd backend && npx prisma migrate dev

# Prisma Studio öffnen (GUI für DB)
cd backend && npx prisma studio

# Datenbank zurücksetzen
cd backend && npx prisma migrate reset
```

### Docker

```bash
# Services neu bauen
docker-compose build

# Nur einen Service neu starten
docker-compose restart backend

# Logs eines Services
docker-compose logs -f backend

# In Container einloggen
docker-compose exec backend sh
```

### Monitoring

```bash
# System Health Check
./scripts/health-check.sh

# Container Status (Docker)
docker-compose ps

# Ressourcen-Nutzung
docker stats
```

---

## Fehlerbehebung

### Port bereits belegt

```bash
# Prüfe welcher Prozess den Port nutzt
lsof -i :3000

# Oder unter Linux
netstat -tuln | grep 3000

# Prozess beenden
kill -9 <PID>
```

### PostgreSQL-Verbindungsfehler

```bash
# Prüfe ob PostgreSQL läuft
sudo systemctl status postgresql

# Oder mit Docker
docker ps | grep postgres

# PostgreSQL starten
sudo systemctl start postgresql

# Mit Docker
docker start minecraft-hosting-postgres
```

### Docker-Probleme

```bash
# Docker neu starten
sudo systemctl restart docker

# Alte Container aufräumen
docker system prune -a

# Volumes entfernen
docker volume prune
```

### node_modules Probleme

```bash
# Alle node_modules löschen und neu installieren
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
npm install
```

---

## Performance-Optimierung

### Für Entwicklung

```bash
# Nur benötigte Services starten
npm run dev:backend &    # Backend im Hintergrund
npm run dev:frontend     # Frontend im Vordergrund

# Memory Limit für Node erhöhen
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### Für Produktion

```bash
# Build-Optimierung
npm run build

# PM2 für Process Management
npm install -g pm2
pm2 start backend/dist/index.js --name "backend"
pm2 startup
pm2 save
```

### Docker Compose Production

Erstelle eine `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      NODE_ENV: production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Umgebungsvariablen

### Backend (.env)

```env
# Datenbank
DATABASE_URL="postgresql://user:pass@localhost:5432/minecraft_hosting"

# Server
PORT=3000
WS_PORT=3001
NODE_ENV=production

# Security
JWT_SECRET="dein-super-geheimer-jwt-key"
JWT_EXPIRES_IN="7d"

# Limits
MAX_FILE_SIZE=104857600  # 100MB
RATE_LIMIT_WINDOW_MS=900000  # 15 min
RATE_LIMIT_MAX_REQUESTS=100
```

### Agent (.env)

```env
AGENT_PORT=4000
AGENT_API_KEY="dein-agent-api-key"
BACKEND_URL="http://localhost:3000"
HOST_ID="host-1"
SERVER_BASE_DIR="/var/minecraft/servers"
NODE_ENV=production
```

---

## Backup & Restore

### Automatische Backups

Backups werden automatisch alle 24h erstellt. Konfiguration in `backend/.env`:

```env
AUTO_BACKUP_INTERVAL="24h"
BACKUP_DIR="./backups"
```

### Manuelles Backup erstellen

Via API:
```bash
curl -X POST http://localhost:3000/api/servers/{serverId}/backup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Oder im Frontend: **Server → Backups → Neues Backup**

### Backup wiederherstellen

```bash
curl -X POST http://localhost:3000/api/servers/{serverId}/restore/{backupId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Deinstallation

```bash
./scripts/uninstall.sh
```

Entfernt:
- Alle node_modules
- Docker Container & Images
- Build-Artefakte
- (Optional) Konfiguration und Daten

---

## Weitere Ressourcen

- 📖 [Vollständige Dokumentation](./README.md)
- 🏗️ [Architektur-Details](./ARCHITECTURE.md)
- 🐛 [Issue Tracker](https://github.com/yourusername/minecraft-hosting-platform/issues)
- 💬 [Discussions](https://github.com/yourusername/minecraft-hosting-platform/discussions)

---

## Support

Bei Problemen:

1. Prüfe die [Fehlerbehebung](#fehlerbehebung)
2. Führe `./scripts/health-check.sh` aus
3. Prüfe die Logs:
   - Docker: `docker-compose logs -f`
   - Lokal: `npm run dev` (zeigt alle Logs)
4. Erstelle ein [Issue](https://github.com/yourusername/minecraft-hosting-platform/issues)

---

**Happy Hosting! 🎮**
