# CraftHost Pro 🎮
## Professionelle Minecraft Hosting Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Kubernetes](https://img.shields.io/badge/kubernetes-ready-326CE5.svg)
![TypeScript](https://img.shields.io/badge/typescript-100%25-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)

> Eine vollständige, skalierbare Web-basierte Lösung für Minecraft Server Management mit Multi-Host-Architektur, dynamischer Ressourcenverwaltung und minimaler Downtime.

**🚀 One-Click Installation** • **🔧 Zero-Config Setup** • **⚡ Live Resource Updates** • **🛡️ Enterprise-Ready**

---

## 📌 TL;DR - Quick Start

```bash
./quick-install.sh  # Installation (60 Sekunden)
npm run dev         # Server starten
# Öffne http://localhost:5173 → Registriere dich als Admin → Fertig! 🎉
```

**Was ist das?** Eine komplette Minecraft Hosting-Lösung wie Pterodactyl, aber mit:
- ✅ **Minimaler Downtime** (0-5 Sekunden bei Updates)
- ✅ **Live-Updates** von RAM/CPU ohne Neustart
- ✅ **Multi-Host-Architektur** für horizontale Skalierung
- ✅ **Zero-Config** - Erste Registrierung wird automatisch Admin
- ✅ **Enterprise-Features** - File Manager, Backups, Monitoring, Templates, Scheduled Tasks

## 🚀 NEU: Innovative v2.0 Features

- 🤖 **AI-Powered Performance Optimizer** - Automatische Lag-Erkennung & Auto-Fix
- 📈 **Intelligent Auto-Scaling** - Ressourcen passen sich automatisch an
- 💤 **Server Hibernation Mode** - Spare bis zu 70% Kosten
- 🌍 **Multi-World Management** - Mehrere Welten pro Server + Snapshots
- 🛒 **Server Marketplace** - Community-Templates mit Bewertungen
- 🔗 **Webhook System** - Integration mit Discord, Slack & Custom Apps
- 📊 **Advanced Analytics** - Predictive Metrics & Cost-Forecasting

**[➡️ Alle neuen Features im Detail](./INNOVATIVE_FEATURES.md)**

---

## ⚡ SUPER EINFACHE INSTALLATION

### 🚀 Option 1: One-Click Installation (EMPFOHLEN - 60 Sekunden!)

```bash
cd superhostingtool
./quick-install.sh
```

**Das war's!** Der Installer macht alles automatisch:
- ✅ Installiert Node.js (falls nicht vorhanden)
- ✅ Startet PostgreSQL via Docker
- ✅ Konfiguriert alle Services (automatische Secrets)
- ✅ Installiert alle Dependencies
- ✅ Richtet die Datenbank ein

**Keine Konfiguration nötig!** ☕ Danach einfach `npm run dev` starten.

---

### 🎯 Erster Start - Administrator Account

Nach der Installation:

```bash
npm run dev
```

**Öffne:** http://localhost:5173

🔑 **Der erste Benutzer wird automatisch zum Administrator!**
- Registriere dich als erster → Du wirst Admin
- Du bekommst 999 statt 9 Server-Slots
- Voller Zugriff auf alle Admin-Funktionen

Ähnlich wie bei **Pterodactyl Panel** - einfach und sicher!

---

### 🖥️ Option 2: Erweiterte Installation

Für erweiterte Optionen (Docker, minimale Installation, etc.):

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

## 🎯 Was ist CraftHost Pro?

**CraftHost Pro** (ehem. Superhostingtool) ist eine vollständige Minecraft Hosting-Plattform, die es ermöglicht, beliebig viele Minecraft-Server über eine zentrale Web-Oberfläche zu verwalten. Ähnlich wie **Pterodactyl Panel**, aber mit Fokus auf **minimale Downtime**, **Live-Updates** und **Enterprise-Features**.

### ⚡ Quick Features

| Feature | Beschreibung |
|---------|-------------|
| 🚀 **One-Click Server** | Komplette Server-Erstellung mit einem Klick |
| ⚡ **Live Updates** | RAM/CPU Anpassung ohne Neustart (0s Downtime) |
| 🔄 **Rolling Restarts** | Graceful Restarts mit nur 3-5s Downtime |
| 💾 **Zero-Downtime Backups** | Backups während Server läuft (0s Downtime) |
| 🎮 **Alle MC-Versionen** | Vanilla, Forge, Fabric, Paper, Spigot, Snapshots |
| 📦 **Mod Management** | Upload, Installation und Verwaltung von Mods |
| 📊 **Echtzeit-Monitoring** | Live CPU/RAM/TPS/Player Stats via WebSocket |
| 📁 **File Manager** | Web-basierter Editor für alle Server-Dateien |
| 👥 **Player Management** | Whitelist, Bans, Operators verwalten |
| ⏰ **Scheduled Tasks** | Cron-Jobs für Backups, Restarts, Commands |
| 📧 **Notifications** | Email, Webhook, Discord-Benachrichtigungen |
| 📈 **Analytics** | Performance-Trends und historische Daten |
| 🔐 **Security First** | JWT, bcrypt, Rate Limiting, Container Isolation |
| 🏗️ **Multi-Host** | Horizontale Skalierung über mehrere Hosts |
| 🐳 **Docker-basiert** | Jeder Server isoliert in eigenem Container |

---

## 📑 Inhaltsverzeichnis

- [📌 TL;DR - Quick Start](#-tldr---quick-start)
- [⚡ Installation](#-super-einfache-installation)
- [🎯 Was ist CraftHost Pro?](#-was-ist-crafthost-pro)
- [⚡ Quick Features](#-quick-features)
- [✨ Features im Detail](#features)
- [🏗️ Architektur](#architektur)
- [🔧 Technologie-Stack](#-technologie-stack)
- [🚀 Minimale Downtime](#minimale-downtime)
- [📦 Deployment](#deployment)
- [📡 API-Dokumentation](#api-dokumentation)
- [🔐 Sicherheit](#-sicherheit)
- [⚙️ Performance-Optimierungen](#performance-optimierungen)
- [📊 Monitoring & Logging](#monitoring--logging)
- [🗺️ Roadmap](#roadmap)
- [❓ FAQ](#-häufig-gestellte-fragen-faq)
- [🐛 Troubleshooting](#-troubleshooting)
- [📞 Support & Kontakt](#-support--kontakt)

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

### 🎉 Innovative Features (NEU!)

#### 🤖 KI & Automatisierung
- **AI-Powered Recommendations**: Intelligente Empfehlungen für Performance-Optimierung, Ressourcen-Anpassung und Kostenoptimierung
- **Anomaly Detection**: Automatische Erkennung ungewöhnlicher Muster in Server-Metriken mit ML-Algorithmen
- **Predictive Maintenance**: Vorhersage potenzieller Probleme bevor sie auftreten
- **Auto-Scaling**: Automatische Ressourcen-Anpassung basierend auf Echtzeit-Nutzung und konfigurierbaren Policies
- **Cost Tracking**: Detaillierte Kostenanalyse mit Optimierungsvorschlägen

#### 🏆 Gaming & Community
- **Achievement System**: 20+ Achievements für Server-Management, Performance, Community und mehr
- **Leaderboards**: Rankings nach Uptime, Performance, Spieleranzahl und Achievement-Punkten
- **Tournament System**: Organisiere und verwalte PvP/Building/Survival Turniere
- **Player Statistics**: Umfassende Spieler-Tracking und Statistiken

#### 👥 Social Features
- **Friends System**: Freunde hinzufügen, Freundschaftsanfragen verwalten
- **Guild/Clan System**: Erstelle oder trete Gilden bei, verwalte Mitglieder und Server
- **Integrated Chat**: Direktnachrichten und Guild-Chat direkt in der Platform
- **Activity Feed**: Öffentliche und private Aktivitäten-Timeline
- **Social Profiles**: Detaillierte Benutzerprofile mit Statistiken und Achievements

#### 🛒 Marketplace
- **Plugin/Mod Marketplace**: Kaufe und verkaufe Mods, Plugins, Templates und Worlds
- **Review System**: Bewertungen und Kommentare mit Verified Purchase Badge
- **Credit System**: Integrierte Währung mit Transaktions-Historie
- **Featured & Trending**: Kuratierte und beliebte Inhalte
- **Seller Dashboard**: Detaillierte Verkäufer-Statistiken und Umsatz-Tracking

#### 📊 Advanced Monitoring
- **Health Checks**: Multi-Layer Gesundheitsprüfungen (Ping, Query, RCON, Custom)
- **Performance Reports**: Automatische Reports (stündlich, täglich, wöchentlich, monatlich)
- **Alert Rules**: Konfigurierbare Alerts mit Custom-Metriken und Schwellwerten
- **Incident Management**: Incident-Tracking mit Status und Resolution-Workflow
- **Real-time Anomaly Alerts**: Sofortige Benachrichtigungen bei kritischen Abweichungen

#### 🔧 Advanced Server Features
- **Server Clustering**: BungeeCord/Velocity/Waterfall Netzwerk-Management
- **Server Snapshots**: Point-in-Time Snapshots mit Verschlüsselung
- **Live Migration**: Migriere Server zwischen Hosts ohne Downtime
- **A/B Testing**: Test verschiedene Konfigurationen parallel
- **Blue-Green Deployments**: Zero-Downtime Updates

#### 🔐 Integration & API
- **API Keys**: Granulare API-Zugriffskontrolle mit Permissions und Rate Limits
- **Webhooks**: Event-basierte Webhooks für externe Integrationen
- **Audit Logging**: Vollständige Audit-Trails aller Aktionen
- **OAuth Integration**: Unterstützung für externe OAuth-Provider (geplant)

### 🎉 Bestehende Features

- **Server-Templates**: Vorkonfigurierte Server-Setups für schnelle Bereitstellung
- **File Manager**: Web-basierter Datei-Browser zum Bearbeiten, Hochladen und Verwalten von Server-Dateien
- **Player Management**: Whitelist, Banlist und Operator-Verwaltung direkt im Web-Interface
- **Scheduled Tasks**: Zeitgesteuerte Aufgaben (Cron-Jobs) für Backups, Restarts, Commands und Ankündigungen
- **Notification System**: E-Mail, Webhook und Discord-Benachrichtigungen für Server-Events
- **Advanced Analytics**: Detaillierte Performance-Metriken mit historischen Trends und Grafiken
- **Console Logs**: Durchsuchbare Server-Logs mit Filterung nach Level
- **Live Console**: Echtzeit-Server-Konsole im Browser
- **World Import/Export**: Welten hoch- und herunterladen (über File Manager)
- **Server Cloning**: Server duplizieren mit allen Einstellungen

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

## 🔧 Technologie-Stack

### 🖥️ Backend (Node.js + TypeScript)
```
Runtime       │ Node.js 18+
Framework     │ Express.js
Language      │ TypeScript
ORM           │ Prisma (Type-Safe Database Access)
Database      │ PostgreSQL 15+
WebSocket     │ ws (Echtzeit-Updates)
Auth          │ JWT (jsonwebtoken)
Validation    │ express-validator
Security      │ helmet, cors, rate-limiting
File Handling │ multer (Uploads), tar-fs (Backups)
```

### 🎨 Frontend (React + TypeScript)
```
Framework        │ React 18
Language         │ TypeScript
Build Tool       │ Vite (Lightning Fast HMR)
Styling          │ TailwindCSS
State Management │ React Query (TanStack Query)
Routing          │ React Router v6
HTTP Client      │ Axios
Icons            │ Lucide React
Forms            │ React Hook Form
```

### 🤖 Host Agent (Node.js)
```
Runtime            │ Node.js 18+
Docker Integration │ Dockerode (Complete Docker API)
Compression        │ tar-fs, gzip
File System        │ fs-extra
Process Management │ child_process
```

### 🐳 DevOps & Infrastructure
```
Containerization │ Docker + Docker Compose
Orchestration    │ Kubernetes (Production)
Reverse Proxy    │ Nginx Ingress Controller
CI/CD            │ GitHub Actions (optional)
Monitoring       │ Prometheus + Grafana (empfohlen)
Logging          │ Loki + Promtail (empfohlen)
```

### 📦 Projekt-Struktur
```
crafthost-pro/
├── backend/                 # 🖥️ Express REST API & WebSocket Server
│   ├── src/
│   │   ├── controllers/    # HTTP Route Handler
│   │   ├── services/       # Business Logic
│   │   ├── middleware/     # Auth, Validation, Error Handling
│   │   ├── routes/         # API Routes
│   │   └── index.ts        # Entry Point
│   ├── prisma/
│   │   └── schema.prisma   # Database Schema (TypeORM Alternative)
│   └── Dockerfile
│
├── frontend/                # 🎨 React SPA
│   ├── src/
│   │   ├── components/     # Reusable UI Components
│   │   ├── pages/          # Page Components
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── lib/            # Utilities & Helpers
│   │   └── api/            # API Client (Axios)
│   └── Dockerfile
│
├── agent/                   # 🤖 Host Agent (Docker Management)
│   ├── src/
│   │   ├── services/       # Docker, Backup, Monitoring Services
│   │   ├── routes/         # Agent API
│   │   └── index.ts        # Entry Point
│   └── Dockerfile
│
├── shared/                  # 📦 Shared TypeScript Types
│   └── src/types/
│
├── k8s/                     # ☸️ Kubernetes Manifests
│   ├── namespace.yaml
│   ├── postgres-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── agent-daemonset.yaml
│   └── ingress.yaml
│
├── docker-compose.yml       # 🐳 Local Development Setup
├── quick-install.sh         # ⚡ One-Click Installer
└── install.sh               # 🔧 Advanced Installer
```

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

### 📋 Voraussetzungen

**Minimale Anforderungen für Entwicklung:**
- ✅ **Node.js** 18+ (mit npm)
- ✅ **PostgreSQL** 15+ (oder Docker für automatisches Setup)
- ✅ **Git** (für Repository klonen)

**Für Docker-Deployment:**
- ✅ **Docker** 20.10+
- ✅ **Docker Compose** v2.0+

**Für Production (Kubernetes):**
- ✅ **Kubernetes Cluster** 1.24+
- ✅ **kubectl** konfiguriert
- ✅ **Nginx Ingress Controller**
- ✅ (Optional) **cert-manager** für SSL/TLS

**Quick-Install macht alles automatisch!** ⚡
> Wenn du `quick-install.sh` verwendest, werden Node.js und PostgreSQL automatisch installiert/konfiguriert.

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

### 📊 Service-Ports Übersicht

| Service | Development (npm run dev) | Docker Compose | Kubernetes |
|---------|---------------------------|----------------|------------|
| **Frontend** | http://localhost:5173 | http://localhost | http://your-domain |
| **Backend API** | http://localhost:3000 | http://localhost:3000 | http://your-domain/api |
| **WebSocket** | ws://localhost:3001 | ws://localhost:3001 | ws://your-domain/ws |
| **PostgreSQL** | localhost:5432 | localhost:5432 | Internal only |
| **Agent** | http://localhost:4000 | http://localhost:4000 | Internal only |

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

#### **AI & Automation** (NEU!)

```http
# AI Recommendations
GET    /api/ai/recommendations/:serverId           # Empfehlungen abrufen
POST   /api/ai/recommendations/:serverId/analyze   # Analyse triggern
POST   /api/ai/recommendations/:id/apply           # Empfehlung anwenden

# Anomaly Detection
GET    /api/ai/anomalies/:serverId                 # Aktive Anomalien
GET    /api/ai/anomalies/:serverId/stats           # Anomalie-Statistiken
POST   /api/ai/anomalies/:id/resolve               # Anomalie beheben

# Auto-Scaling
GET    /api/ai/autoscaling/:serverId               # Policy abrufen
PUT    /api/ai/autoscaling/:serverId               # Policy aktualisieren
POST   /api/ai/autoscaling/:serverId/start         # Auto-Scaling starten
POST   /api/ai/autoscaling/:serverId/stop          # Auto-Scaling stoppen
GET    /api/ai/autoscaling/:serverId/history       # Scaling-Historie
```

#### **Achievements** (NEU!)

```http
GET    /api/achievements                            # Alle Achievements mit Progress
GET    /api/achievements/user                       # User Achievement Summary
GET    /api/achievements/user/:userId               # Anderer User's Achievements
POST   /api/achievements/check                      # Achievements prüfen
GET    /api/achievements/leaderboard                # Achievement Leaderboard
POST   /api/achievements/initialize                 # Initialize (Admin)
```

#### **Social Features** (NEU!)

```http
# Friends
GET    /api/social/friends                          # Freundesliste
GET    /api/social/friends/requests                 # Ausstehende Anfragen
POST   /api/social/friends/request                  # Freundschaftsanfrage senden
POST   /api/social/friends/:id/accept               # Anfrage akzeptieren
DELETE /api/social/friends/:id                      # Freund entfernen

# Guilds
GET    /api/social/guilds/search                    # Gilden suchen
GET    /api/social/guilds/my                        # Eigene Gilde
GET    /api/social/guilds/:guildId                  # Gilde Details
POST   /api/social/guilds                           # Gilde erstellen
POST   /api/social/guilds/:guildId/join             # Gilde beitreten
POST   /api/social/guilds/:guildId/leave            # Gilde verlassen
PUT    /api/social/guilds/:guildId/members/:id/role # Rolle ändern
DELETE /api/social/guilds/:guildId/members/:id      # Mitglied kicken
POST   /api/social/guilds/:guildId/servers          # Server hinzufügen
DELETE /api/social/guilds/:guildId/servers/:id      # Server entfernen

# Chat
GET    /api/social/chat/direct/:userId              # Direktnachrichten
GET    /api/social/chat/guild/:guildId              # Guild Chat
POST   /api/social/chat/send                        # Nachricht senden
POST   /api/social/chat/mark-read/:senderId         # Als gelesen markieren
GET    /api/social/chat/unread                      # Ungelesene Anzahl
```

#### **Marketplace** (NEU!)

```http
# Listings
GET    /api/marketplace/search                      # Listings suchen
GET    /api/marketplace/listings/:id                # Listing Details
POST   /api/marketplace/listings                    # Listing erstellen
PUT    /api/marketplace/listings/:id                # Listing aktualisieren
DELETE /api/marketplace/listings/:id                # Listing löschen
GET    /api/marketplace/featured                    # Featured Listings
GET    /api/marketplace/trending                    # Trending Listings

# Purchases
POST   /api/marketplace/purchase/:listingId         # Item kaufen
GET    /api/marketplace/purchases                   # Meine Käufe
POST   /api/marketplace/purchases/:id/refund        # Rückerstattung

# Reviews
POST   /api/marketplace/listings/:id/reviews        # Review hinzufügen

# Seller
GET    /api/marketplace/seller/listings             # Meine Listings
GET    /api/marketplace/seller/stats                # Verkäufer-Statistiken
GET    /api/marketplace/seller/:sellerId/stats      # Andere Verkäufer Stats

# Admin
POST   /api/marketplace/admin/listings/:id/approve  # Genehmigen (Admin)
POST   /api/marketplace/admin/listings/:id/reject   # Ablehnen (Admin)
POST   /api/marketplace/admin/listings/:id/feature  # Featured (Admin)
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

## 🔐 Sicherheit

### 🛡️ Implementierte Sicherheitsmaßnahmen

CraftHost Pro nimmt Sicherheit ernst und implementiert Industry-Best-Practices:

#### **Authentication & Authorization**
- ✅ **JWT Authentication**: Sichere Token-basierte Auth mit Expiration
- ✅ **First-User-Admin**: Erste Registrierung wird automatisch Admin (wie Pterodactyl)
- ✅ **Password Hashing**: bcrypt mit automatischem Salt (10 Runden)
- ✅ **Role-Based Access Control**: User/Admin Rollen-System

#### **API Security**
- ✅ **Rate Limiting**: Schutz vor Brute-Force (100 Requests/15min)
- ✅ **Input Validation**: express-validator für alle API-Inputs
- ✅ **SQL Injection Prevention**: Prisma ORM mit parametrisierten Queries
- ✅ **XSS Protection**: Helmet.js Security Headers
- ✅ **CORS**: Konfigurierte Cross-Origin-Policies

#### **Infrastructure Security**
- ✅ **Container Isolation**: Jeder Minecraft-Server läuft isoliert
- ✅ **Host Agent Auth**: API-Key-basierte Authentifizierung
- ✅ **Network Segmentation**: Kubernetes Network Policies
- ✅ **Secret Management**: Environment Variables (keine Hardcoded Secrets)

#### **Weitere Sicherheitsfeatures**
- ✅ **Registrierung nach First-User deaktiviert**: Verhindert ungewollte Accounts
- ✅ **HTTPS-Ready**: TLS/SSL Unterstützung via Ingress
- ✅ **Audit Logs**: Alle wichtigen Aktionen werden geloggt
- ✅ **File Upload Validation**: Nur erlaubte Dateitypen (Mods, Worlds)

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

## ❓ Häufig gestellte Fragen (FAQ)

### Installation & Setup

**Q: Muss ich PostgreSQL manuell installieren?**
A: Nein! `quick-install.sh` startet PostgreSQL automatisch via Docker. Für manuelle Installation siehe [Installation](#installation).

**Q: Wie erstelle ich den ersten Admin-Account?**
A: Starte einfach die Anwendung und registriere dich als erster Benutzer. Du wirst automatisch zum Admin mit 999 Server-Slots!

**Q: Kann ich nach dem ersten User weitere Accounts erstellen?**
A: Standardmäßig ist die Registrierung nach dem ersten User deaktiviert. Als Admin kannst du weitere User über die API erstellen.

### Server-Management

**Q: Wie viele Server kann ich erstellen?**
A: Als normaler User: 9 Server. Als Admin: 999 Server. Diese Limits sind in der Datenbank konfigurierbar.

**Q: Wie lange dauert es, einen Server zu erstellen?**
A: ~30-60 Sekunden je nach Minecraft-Version und Internet-Geschwindigkeit.

**Q: Kann ich RAM/CPU ändern ohne den Server neu zu starten?**
A: Ja! Bei kleinen Änderungen (<50%) wird ein Live-Update durchgeführt (0s Downtime). Bei größeren Änderungen erfolgt ein Rolling-Restart (3-5s Downtime).

### Performance & Downtime

**Q: Wie lange ist der Server bei Updates offline?**
A:
- **Live Updates** (RAM/CPU): 0 Sekunden
- **Rolling Restarts**: 3-5 Sekunden
- **Backups**: 0 Sekunden (Server läuft weiter)

**Q: Wie viele Server kann ein Host verwalten?**
A: Abhängig von Host-Ressourcen. Empfohlen: 10-20 Server pro 32GB RAM Host.

### Sicherheit

**Q: Ist die Plattform sicher für Production?**
A: Ja! JWT Auth, bcrypt Hashing, Rate Limiting, Input Validation, Container Isolation. Siehe [Sicherheit](#-sicherheit).

**Q: Wie sichere ich meine Daten?**
A: Automatische tägliche Backups + manuelle Backups on-demand. Backups werden komprimiert (tar.gz) gespeichert.

---

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Prüfe welcher Prozess Port 5173/3000 verwendet
lsof -i :5173
lsof -i :3000

# Oder ändere Ports in .env Dateien
```

### "Database connection failed"
```bash
# Prüfe ob PostgreSQL läuft
docker ps | grep postgres

# Oder starte DB manuell
docker-compose up -d postgres
```

### "Permission denied" bei Docker
```bash
# Füge User zur Docker-Gruppe hinzu
sudo usermod -aG docker $USER
newgrp docker
```

### Build-Fehler im Frontend
```bash
# Node Modules neu installieren
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Support & Kontakt

Bei Fragen oder Problemen:
- 📝 **GitHub Issues**: [Issue erstellen](../../issues)
- 📖 **Dokumentation**: [QUICKSTART.md](./QUICKSTART.md)
- 💬 **Discussions**: [GitHub Discussions](../../discussions)

---

## 📜 Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte.

---

## ❤️ Danke!

Entwickelt mit ❤️ für die Minecraft-Community

**Gefällt dir das Projekt?** Gib uns einen ⭐ auf GitHub!
