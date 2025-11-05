# Minecraft Hosting Platform 🎮

Eine skalierbare, professionelle Minecraft Hosting Plattform mit Multi-Host-Architektur, dynamischer Ressourcenverwaltung und minimaler Downtime.

## ⚡ SUPER EINFACHE INSTALLATION

### 🚀 Option 1: One-Line Installation (EMPFOHLEN - 60 Sekunden!)

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/superhostingtool/main/quick-start.sh | bash
```

**Das war's!** Der Installer macht alles automatisch:
- ✅ Installiert Docker automatisch
- ✅ Lädt das Projekt herunter
- ✅ Konfiguriert alle Services
- ✅ Startet die Plattform
- ✅ Öffnet http://localhost in deinem Browser

**Keine Konfiguration nötig!** ☕ Einfach zurücklehnen und warten.

---

### 🖥️ Option 2: Lokale Installation

Wenn du das Projekt schon heruntergeladen hast:

```bash
cd superhostingtool
./quick-start.sh
```

Oder mit dem interaktiven Installer:

```bash
./install.sh
```

---

### 🌐 Option 3: Web-basierter Setup Wizard

Öffne einfach `setup-wizard.html` in deinem Browser für eine geführte Installation mit grafischer Oberfläche!

```bash
# Öffne die Datei in deinem Browser:
open setup-wizard.html        # macOS
xdg-open setup-wizard.html    # Linux
```

---

### 📱 Quick Commands (nachdem installiert)

```bash
# Starten
docker-compose up -d

# Stoppen
docker-compose down

# Logs ansehen
docker-compose logs -f

# Status prüfen
docker-compose ps
```

**Frontend:** http://localhost
**Backend API:** http://localhost:3000
**Dokumentation:** [QUICKSTART.md](./QUICKSTART.md)

---

## 🎯 Was ist Superhostingtool?

---

## Inhaltsverzeichnis

- [Quick Start](#-quick-start)
- [Features](#features)
- [Architektur](#architektur)
- [Technologie-Stack](#technologie-stack)
- [Minimale Downtime](#minimale-downtime)
- [Installation](#installation)
- [Deployment](#deployment)
- [API-Dokumentation](#api-dokumentation)
- [Sicherheit](#sicherheit)

---

## Features

### ✨ Kern-Features

- **Multi-Host-Architektur**: Zentrales Web-Panel mit dezentralen Agenten auf mehreren Hosts
- **One-Click Server-Erstellung**: Komplette Server-Konfiguration mit einem Klick
- **Dynamische Ressourcen-Verwaltung**: RAM und CPU können "on the fly" angepasst werden
- **Minimale Downtime**: Rolling-Restarts und Live-Updates (typisch 3-5 Sekunden)
- **Alle Minecraft-Versionen**: Vanilla, Snapshots, Forge, Fabric, Paper, Spigot
- **Mod-Management**: Upload, Installation und Verwaltung von Mods
- **Automatische Backups**: Tägliche Backups mit 0 Sekunden Downtime
- **Echtzeit-Monitoring**: Live-Stats über WebSocket (CPU, RAM, TPS, Spieler)
- **Nutzer-Pools**: Jeder Nutzer kann bis zu 9 Server verwalten (konfigurierbar)
- **DDoS-Schutz**: Rate Limiting und Ingress-Level-Protection

### 🎉 Neue Features

- **Server-Templates**: Vorkonfigurierte Server-Setups für schnelle Bereitstellung
- **File Manager**: Web-basierter Datei-Browser zum Bearbeiten, Hochladen und Verwalten von Server-Dateien
- **Player Management**: Whitelist, Banlist und Operator-Verwaltung direkt im Web-Interface
- **Scheduled Tasks**: Zeitgesteuerte Aufgaben (Cron-Jobs) für Backups, Restarts, Commands und Ankündigungen
- **Notification System**: E-Mail, Webhook und Discord-Benachrichtigungen für Server-Events
- **Advanced Analytics**: Detaillierte Performance-Metriken mit historischen Trends und Grafiken
- **Console Logs**: Durchsuchbare Server-Logs mit Filterung nach Level
- **Live Console**: Echtzeit-Server-Konsole im Browser (geplant)
- **World Import/Export**: Welten hoch- und herunterladen (über File Manager)
- **Server Cloning**: Server duplizieren mit allen Einstellungen (geplant)

### 🎯 Besondere Highlights

1. **Live Resource Updates**: Änderung von RAM/CPU ohne Neustart durch Docker's Update API
2. **Graceful Restarts**: Welt wird gespeichert, Server stoppt sanft, minimale Downtime
3. **Automatic Version Management**: Automatischer Sync aller Minecraft-Versionen von Mojang
4. **Container Isolation**: Jeder Server läuft in einem eigenen Docker Container
5. **Horizontal Scaling**: Backend und Frontend skalieren automatisch (Kubernetes HPA)

---

## Architektur

### Überblick

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                           │
│  - Dashboard, Server-Verwaltung, Mod-Management              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Express)                          │
│  - REST API                                                  │
│  - WebSocket Server (Echtzeit-Updates)                       │
│  - Authentication & Authorization                            │
│  - Backup Scheduler                                          │
│  - Minecraft Version Manager                                 │
└───────────┬───────────────────────────┬─────────────────────┘
            │                           │
            ▼                           ▼
    ┌───────────────┐         ┌──────────────────┐
    │   PostgreSQL  │         │   HOST AGENTS    │
    │   (Database)  │         │  (auf Hosts)     │
    └───────────────┘         └────────┬─────────┘
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                      ┌─────────────┐   ┌─────────────┐
                      │  Docker     │   │  Docker     │
                      │  Container  │   │  Container  │
                      │  (MC Server)│   │  (MC Server)│
                      └─────────────┘   └─────────────┘
```

### Komponenten

#### 1. **Frontend (React + TypeScript)**
- **Technologien**: React 18, TypeScript, TailwindCSS, React Query
- **Features**:
  - Dashboard mit Server-Übersicht
  - One-Click Server-Erstellung
  - Live-Monitoring
  - Mod-Management UI
  - Responsive Design

#### 2. **Backend (Node.js + Express)**
- **Technologien**: Express, TypeScript, Prisma ORM, WebSocket
- **Verantwortlichkeiten**:
  - REST API für alle Operationen
  - WebSocket für Echtzeit-Updates
  - Authentifizierung (JWT)
  - Datenbank-Management
  - Host-Auswahl (Load Balancing)
  - Backup-Scheduling

#### 3. **Host Agent (Node.js + Dockerode)**
- **Technologien**: Express, Dockerode, TypeScript
- **Läuft auf jedem Host**:
  - Verwaltet Docker Container
  - Führt Server-Operationen aus
  - Sendet Heartbeats an Backend
  - Sammelt Performance-Metriken

#### 4. **Datenbank (PostgreSQL)**
- **Schema**:
  - Users (Benutzer)
  - Hosts (Server-Hosts)
  - MinecraftServers (Server-Instanzen)
  - Mods (verfügbare Mods)
  - Backups (Server-Backups)
  - ServerStats (Performance-Metriken)

---

## Technologie-Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **WebSocket**: ws
- **Auth**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: helmet, cors, rate-limiting

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Agent
- **Runtime**: Node.js 18+
- **Docker Integration**: Dockerode
- **Compression**: tar-fs, gzip
- **File System**: fs-extra

### DevOps
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Reverse Proxy**: Nginx
- **CI/CD**: (kann mit GitHub Actions erweitert werden)

---

## Minimale Downtime

### 🚀 Wie wird minimale Downtime erreicht?

#### 1. **Dynamische Ressourcen-Anpassung (0-5 Sekunden Downtime)**

**Strategie:**
```typescript
// backend/src/services/agent.service.ts:updateResources()

1. Docker Live-Update nutzen (KEINE Downtime):
   - Docker erlaubt --memory und --cpus Updates im laufenden Betrieb
   - Befehl: docker update --memory=4G --cpus=2 container_name
   - Downtime: 0 Sekunden

2. Nur bei drastischen Änderungen (>50%) Rolling-Restart:
   - Save-all → Welt speichern
   - Graceful Stop (SIGTERM, max 10s)
   - Container neu starten mit neuen Ressourcen
   - Downtime: ~3-5 Sekunden
```

**Implementierung:**
```typescript
// agent/src/services/docker.service.ts:updateResources()

if (liveUpdate && ramDiff < 0.5 && cpuDiff < 0.5) {
  // LIVE UPDATE - Keine Downtime!
  await container.update({
    Memory: newRam * 1024 * 1024,
    NanoCpus: newCpu * 1000000000
  });
  // Downtime: 0 Sekunden
} else {
  // Rolling Restart für große Änderungen
  await this.restartServer(containerName, true);
  // Downtime: ~5 Sekunden
}
```

#### 2. **Server-Neustart mit Rolling-Restart (3-5 Sekunden)**

**Strategie:**
```typescript
// agent/src/services/docker.service.ts:restartServer()

1. Sende "save-all" an Minecraft (speichert Welt)
2. Warte 3 Sekunden auf Speicherbestätigung
3. Sende "stop" Befehl (graceful shutdown)
4. Docker Container stoppen (SIGTERM, max 10s timeout)
5. Sofort neu starten

Downtime: ~3-5 Sekunden
```

**Code:**
```typescript
async restartServer(containerName: string, graceful = true) {
  // 1. Speichere Welt
  await this.executeCommand(containerName, 'save-all');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 2. Stoppe gracefully
  await this.executeCommand(containerName, 'stop');
  await container.stop({ t: 10 });

  // 3. Starte sofort neu
  await container.start();

  // Typische Downtime: 3-5 Sekunden
}
```

#### 3. **Backup ohne Downtime (0 Sekunden)**

**Strategie:**
```typescript
// agent/src/services/backup.service.ts:createBackup()

1. Sende "save-all" (flush alle Chunks auf Disk)
2. Sende "save-off" (deaktiviert Auto-Save temporär)
3. Erstelle TAR.GZ Archive der Welt (Server läuft weiter!)
4. Sende "save-on" (aktiviert Auto-Save wieder)

Server läuft während des gesamten Prozesses!
Downtime: 0 Sekunden
```

#### 4. **Rolling-Updates bei mehreren Servern**

**Kubernetes Strategie:**
```yaml
# k8s/backend-deployment.yaml

strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1  # Max 1 Pod offline
    maxSurge: 1        # Max 1 extra Pod während Update

# Bedeutet: Immer mindestens N-1 Pods verfügbar
```

---

## Installation

### Voraussetzungen

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose
- (Optional) Kubernetes Cluster

### Lokale Entwicklung

```bash
# 1. Repository klonen
git clone https://github.com/yourusername/minecraft-hosting-platform.git
cd minecraft-hosting-platform

# 2. Dependencies installieren
npm install

# 3. Shared-Modul bauen
npm run build --workspace=shared

# 4. Umgebungsvariablen einrichten
cp backend/.env.example backend/.env
cp agent/.env.example agent/.env

# 5. Datenbank migrieren
cd backend
npx prisma migrate dev
npx prisma generate

# 6. Minecraft Versionen synchronisieren
# (Optional: Kann auch über API gemacht werden)

# 7. Services starten
cd ..
npm run dev
```

Die Anwendung läuft jetzt auf:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **WebSocket**: ws://localhost:3001
- **Agent**: http://localhost:4000

### Docker Compose

```bash
# 1. Docker Compose starten
docker-compose up -d

# 2. Datenbank migrieren (beim ersten Start)
docker-compose exec backend npx prisma migrate deploy

# 3. Admin-User erstellen (optional)
docker-compose exec backend npm run seed
```

Zugriff:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000

---

## Deployment

### Kubernetes Deployment

```bash
# 1. Namespace erstellen
kubectl apply -f k8s/namespace.yaml

# 2. Secrets anpassen (WICHTIG!)
# Editiere k8s/postgres-deployment.yaml
# Editiere k8s/backend-deployment.yaml
# Editiere k8s/agent-daemonset.yaml

# 3. PostgreSQL deployen
kubectl apply -f k8s/postgres-deployment.yaml

# 4. Warte bis PostgreSQL bereit ist
kubectl wait --for=condition=ready pod -l app=postgres -n minecraft-hosting --timeout=300s

# 5. Backend deployen
kubectl apply -f k8s/backend-deployment.yaml

# 6. Frontend deployen
kubectl apply -f k8s/frontend-deployment.yaml

# 7. Host Agents deployen (als DaemonSet)
kubectl apply -f k8s/agent-daemonset.yaml

# 8. Ingress einrichten
kubectl apply -f k8s/ingress.yaml

# 9. Status prüfen
kubectl get pods -n minecraft-hosting
kubectl get services -n minecraft-hosting
kubectl get ingress -n minecraft-hosting
```

### Production Checklist

- [ ] Alle Secrets ändern (JWT_SECRET, POSTGRES_PASSWORD, AGENT_API_KEY)
- [ ] SSL/TLS Zertifikate einrichten (cert-manager + Let's Encrypt)
- [ ] Backup-Strategie für PostgreSQL implementieren
- [ ] Monitoring einrichten (Prometheus + Grafana)
- [ ] Logging zentralisieren (ELK Stack oder Loki)
- [ ] Resource Limits für Kubernetes Pods setzen
- [ ] Ingress DDoS-Protection konfigurieren
- [ ] Container Images in private Registry pushen
- [ ] Datenbank-Backups automatisieren
- [ ] Disaster Recovery Plan erstellen

---

## API-Dokumentation

### Authentifizierung

Alle API-Requests (außer `/auth/*`) benötigen einen JWT Token im `Authorization` Header:

```http
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### **Auth**

```http
POST /api/auth/register
POST /api/auth/login
```

#### **Server Management**

```http
GET    /api/servers              # Alle Server des Users
GET    /api/servers/:id          # Server Details
POST   /api/servers              # Server erstellen (ONE-CLICK!)
PATCH  /api/servers/:id/resources # Ressourcen anpassen (live!)
POST   /api/servers/:id/start    # Server starten
POST   /api/servers/:id/stop     # Server stoppen
POST   /api/servers/:id/restart  # Rolling-Restart (3-5s downtime)
POST   /api/servers/:id/command  # Minecraft-Befehl ausführen
DELETE /api/servers/:id          # Server löschen
```

#### **Mods**

```http
GET    /api/mods                      # Alle verfügbaren Mods
POST   /api/mods                      # Mod hochladen
POST   /api/mods/:modId/install/:serverId    # Mod installieren
DELETE /api/mods/:modId/uninstall/:serverId  # Mod deinstallieren
```

#### **Backups**

```http
GET    /api/backups/server/:serverId  # Server-Backups
POST   /api/backups/server/:serverId  # Backup erstellen
POST   /api/backups/:backupId/restore # Backup wiederherstellen
DELETE /api/backups/:backupId         # Backup löschen
```

#### **Versions**

```http
GET    /api/versions        # Alle Minecraft-Versionen
GET    /api/versions/latest # Neueste stabile Version
POST   /api/versions/sync   # Versionen synchronisieren (Admin)
```

#### **Templates**

```http
GET    /api/templates           # Alle öffentlichen Templates
GET    /api/templates/:id       # Template Details
POST   /api/templates           # Template erstellen
PATCH  /api/templates/:id       # Template aktualisieren
DELETE /api/templates/:id       # Template löschen
POST   /api/templates/:id/download  # Download-Counter erhöhen
```

#### **Player Management**

```http
GET    /api/players/:serverId/whitelist    # Whitelist anzeigen
POST   /api/players/:serverId/whitelist    # Spieler zur Whitelist hinzufügen
DELETE /api/players/:serverId/whitelist/:playerName  # Spieler von Whitelist entfernen

GET    /api/players/:serverId/bans         # Bans anzeigen
POST   /api/players/:serverId/bans         # Spieler bannen
DELETE /api/players/:serverId/bans/:playerName  # Ban aufheben

GET    /api/players/:serverId/operators    # Operators anzeigen
POST   /api/players/:serverId/operators    # Operator hinzufügen
DELETE /api/players/:serverId/operators/:playerName  # Operator entfernen
```

#### **Scheduled Tasks**

```http
GET    /api/tasks/server/:serverId  # Alle Tasks für einen Server
GET    /api/tasks/:id               # Task Details
POST   /api/tasks                   # Task erstellen
PATCH  /api/tasks/:id               # Task aktualisieren
DELETE /api/tasks/:id               # Task löschen
POST   /api/tasks/:id/trigger       # Task manuell ausführen
```

#### **Notifications**

```http
GET    /api/notifications           # Alle Notification-Configs des Users
POST   /api/notifications           # Notification-Config erstellen
PATCH  /api/notifications/:id       # Config aktualisieren
DELETE /api/notifications/:id       # Config löschen
```

#### **Analytics**

```http
GET    /api/analytics/server/:serverId/metrics     # Performance-Metriken
GET    /api/analytics/server/:serverId/stats       # Aggregierte Statistiken
GET    /api/analytics/server/:serverId/trends      # Performance-Trends
GET    /api/analytics/server/:serverId/logs        # Console Logs
GET    /api/analytics/server/:serverId/logs/search # Logs durchsuchen
GET    /api/analytics/server/:serverId/uptime      # Uptime-Statistiken
```

#### **File Manager**

```http
GET    /api/files/server/:serverId/list       # Dateien auflisten
GET    /api/files/server/:serverId/read       # Datei lesen
POST   /api/files/server/:serverId/write      # Datei schreiben
DELETE /api/files/server/:serverId/file       # Datei löschen
POST   /api/files/server/:serverId/directory  # Verzeichnis erstellen
POST   /api/files/server/:serverId/upload     # Datei hochladen
GET    /api/files/server/:serverId/download   # Datei herunterladen
GET    /api/files/server/:serverId/info       # Datei-Informationen
```

### Beispiel: Server erstellen

```bash
curl -X POST http://localhost:3000/api/servers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome Server",
    "minecraftVersion": "1.20.4",
    "versionType": "VANILLA",
    "allocatedRam": 4096,
    "allocatedCpu": 2,
    "maxPlayers": 20,
    "difficulty": "NORMAL",
    "gameMode": "SURVIVAL"
  }'
```

---

## Sicherheit

### Implementierte Sicherheitsmaßnahmen

1. **JWT Authentication**: Sichere Token-basierte Auth
2. **Rate Limiting**: Schutz vor Brute-Force (100 Requests/15min)
3. **Helmet.js**: HTTP Security Headers
4. **CORS**: Konfigurierte Cross-Origin-Policies
5. **Input Validation**: express-validator für alle Inputs
6. **SQL Injection Prevention**: Prisma ORM (parametrisierte Queries)
7. **Password Hashing**: bcrypt mit Salt
8. **Container Isolation**: Jeder Server in eigenem Docker Container
9. **Host Agent Authentication**: API-Key-basierte Auth
10. **Kubernetes Network Policies**: (kann erweitert werden)

### DDoS-Schutz

```yaml
# k8s/ingress.yaml
nginx.ingress.kubernetes.io/limit-rps: "10"
nginx.ingress.kubernetes.io/limit-connections: "10"
```

### Empfohlene Sicherheits-Erweiterungen

- [ ] 2FA für Admin-Accounts
- [ ] Audit Logging aller Admin-Aktionen
- [ ] Firewall-Regeln für Minecraft-Ports
- [ ] Intrusion Detection System (IDS)
- [ ] Regelmäßige Security Scans (Snyk, Trivy)
- [ ] Secret Management (Vault, Sealed Secrets)

---

## Projekt-Struktur

```
minecraft-hosting-platform/
├── backend/                 # Backend Service
│   ├── src/
│   │   ├── controllers/    # Route Handler
│   │   ├── services/       # Business Logic
│   │   ├── middleware/     # Express Middleware
│   │   ├── routes/         # API Routes
│   │   └── index.ts        # Entry Point
│   ├── prisma/
│   │   └── schema.prisma   # Datenbank Schema
│   └── Dockerfile
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── pages/          # Page Components
│   │   ├── hooks/          # Custom Hooks
│   │   └── lib/            # Utilities
│   └── Dockerfile
├── agent/                   # Host Agent
│   ├── src/
│   │   ├── services/       # Docker, Backup, Monitoring
│   │   └── index.ts        # Entry Point
│   └── Dockerfile
├── shared/                  # Shared Types
│   └── src/
│       └── types/
├── k8s/                     # Kubernetes Manifests
│   ├── namespace.yaml
│   ├── postgres-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── agent-daemonset.yaml
│   └── ingress.yaml
└── docker-compose.yml       # Docker Compose Setup
```

---

## Performance-Optimierungen

### Backend
- Connection Pooling (Prisma)
- Query Optimization (Indexe auf User, Host, Server)
- Gzip Compression
- Caching (kann mit Redis erweitert werden)

### Frontend
- Code Splitting (Vite)
- Lazy Loading
- React Query Caching
- Optimistic Updates

### Database
- Indexes auf häufig abgefragten Feldern
- Connection Pooling
- Read Replicas (für Skalierung)

### Container
- Multi-Stage Docker Builds
- Alpine Images (kleinere Größe)
- Layer Caching

---

## Monitoring & Logging

### Empfohlenes Setup

```yaml
# Prometheus für Metriken
# Grafana für Dashboards
# Loki für Logs
# AlertManager für Alerts
```

### Wichtige Metriken

- Server CPU/RAM Usage
- Container Anzahl pro Host
- API Response Times
- WebSocket Verbindungen
- Backup Success Rate
- Database Query Performance

---

## Lizenz

MIT License

---

## Support & Kontakt

Bei Fragen oder Problemen:
- GitHub Issues: [Create Issue]
- Email: support@example.com
- Dokumentation: [Wiki]

---

## Roadmap

### Geplante Features

- [ ] Multi-Tenancy (mehrere Organisationen)
- [ ] Custom Domains pro Server
- [ ] Advanced Monitoring (Grafana Integration)
- [ ] Automated Scaling (basierend auf Spielerzahl)
- [ ] Plugin-System für Server-Erweiterungen
- [ ] Mobile App (React Native)
- [ ] Billing & Payment Integration
- [ ] CDN für Mod-Downloads
- [ ] Server Templates (vorkonfigurierte Setups)
- [ ] Discord Bot Integration

---

## Danke!

Entwickelt mit ❤️ für die Minecraft-Community
