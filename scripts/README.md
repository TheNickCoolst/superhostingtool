# Helper Scripts

Dieses Verzeichnis enthält verschiedene Hilfsskripte für das Management der Minecraft Hosting Platform.

## 📋 Übersicht

| Script | Beschreibung | Verwendung |
|--------|--------------|------------|
| `dev.sh` | Startet die Entwicklungsumgebung | `./scripts/dev.sh [backend\|frontend\|agent\|all]` |
| `start.sh` | Startet die Produktion | `./scripts/start.sh` |
| `stop.sh` | Stoppt alle Services | `./scripts/stop.sh` |
| `logs.sh` | Zeigt Service-Logs | `./scripts/logs.sh [service]` |
| `health-check.sh` | System-Gesundheitscheck | `./scripts/health-check.sh` |
| `uninstall.sh` | Deinstalliert die Plattform | `./scripts/uninstall.sh` |

---

## 🛠️ Detaillierte Beschreibungen

### `dev.sh` - Development Starter

Startet die Entwicklungsumgebung mit automatischer PostgreSQL-Überprüfung.

**Verwendung:**
```bash
# Alle Services starten
./scripts/dev.sh

# Nur Backend
./scripts/dev.sh backend

# Nur Frontend
./scripts/dev.sh frontend

# Nur Agent
./scripts/dev.sh agent
```

**Features:**
- ✅ Prüft PostgreSQL Status
- ✅ Startet PostgreSQL automatisch (via Docker) wenn nicht vorhanden
- ✅ Überprüft .env-Dateien
- ✅ Zeigt Zugriffs-URLs an

---

### `start.sh` - Production Starter

Startet die Anwendung im Produktionsmodus.

**Verwendung:**
```bash
./scripts/start.sh
```

**Features:**
- ✅ Auto-Detection: Docker Compose oder Built-Version
- ✅ Startet alle Services gleichzeitig
- ✅ Zeigt Status und Access-URLs
- ✅ Gibt Process-IDs aus (bei lokalem Start)

**Modi:**
1. **Docker Compose** (bevorzugt)
   - Nutzt `docker-compose up -d`
   - Alle Services in Containern

2. **Built Version**
   - Nutzt `node dist/index.js`
   - Benötigt vorheriges `npm run build`

---

### `stop.sh` - Service Stopper

Stoppt alle laufenden Services.

**Verwendung:**
```bash
./scripts/stop.sh
```

**Features:**
- ✅ Erkennt Docker oder lokale Prozesse automatisch
- ✅ Stoppt alle Node-Prozesse
- ✅ Stoppt PostgreSQL Container (falls vorhanden)
- ✅ Zeigt verbleibende Prozesse an

---

### `logs.sh` - Log Viewer

Zeigt Logs der Services an (nur für Docker).

**Verwendung:**
```bash
# Interaktives Menü
./scripts/logs.sh

# Direkt einen Service
./scripts/logs.sh backend
./scripts/logs.sh frontend
./scripts/logs.sh agent
./scripts/logs.sh postgres
./scripts/logs.sh all
```

**Features:**
- ✅ Interaktives Menü
- ✅ Follow-Mode (Echtzeit-Logs)
- ✅ Farbige Ausgabe
- ✅ Funktioniert mit Docker Compose

---

### `health-check.sh` - System Health Check

Überprüft den Status aller System-Komponenten.

**Verwendung:**
```bash
./scripts/health-check.sh
```

**Prüft:**
- ✅ Konfigurationsdateien (.env)
- ✅ Dependencies (node_modules)
- ✅ Datenbank-Verbindung
- ✅ Speicherplatz
- ✅ Service-Status (Docker oder lokal)
- ✅ Port-Verfügbarkeit

**Ausgabe-Beispiel:**
```
╔═══════════════════════════════════════════════════════════════╗
║              🏥 System Health Check 🏥                        ║
╚═══════════════════════════════════════════════════════════════╝

Konfiguration:
  backend/.env: ✓ Vorhanden
  agent/.env: ✓ Vorhanden

Dependencies:
  backend node_modules: ✓ Installiert
  frontend node_modules: ✓ Installiert
  agent node_modules: ✓ Installiert
  shared node_modules: ✓ Installiert

Datenbank:
  PostgreSQL Prozess: ✓ Läuft
  Verbindung: ✓ Erfolgreich

Speicherplatz:
  Verfügbarer Speicher: 50G (40% genutzt)

Docker Services:
  postgres: ✓ Läuft (Up 2 hours)
  backend: ✓ Läuft (Up 2 hours)
  frontend: ✓ Läuft (Up 2 hours)
  agent: ✓ Läuft (Up 2 hours)

Health Check abgeschlossen!
```

---

### `uninstall.sh` - Uninstaller

Entfernt die Installation und räumt auf.

**Verwendung:**
```bash
./scripts/uninstall.sh
```

**Entfernt:**
- ✅ Alle node_modules (in allen Workspaces)
- ✅ Docker Container & Images
- ✅ Build-Artefakte (dist-Ordner)
- ✅ Lock-Files (package-lock.json)
- ✅ Log-Dateien
- ⚠️ (Optional) Konfigurationsdateien (.env)
- ⚠️ (Optional) Datenbank und Uploads

**Sicherheit:**
- Interaktive Bestätigung für kritische Schritte
- Optional: Konfiguration und Daten behalten
- Warnung vor nicht-rückgängig-machbaren Aktionen

---

## 🔄 Typischer Workflow

### Entwicklung starten

```bash
# 1. Installation (einmalig)
./install.sh --local

# 2. Development starten
./scripts/dev.sh

# 3. Health Check durchführen
./scripts/health-check.sh

# 4. Services stoppen (Ende des Arbeitstages)
./scripts/stop.sh
```

### Production Deployment

```bash
# 1. Installation
./install.sh --docker

# 2. Services starten
./scripts/start.sh

# 3. Logs überwachen
./scripts/logs.sh all

# 4. Health Check
./scripts/health-check.sh
```

### Troubleshooting

```bash
# 1. System-Status prüfen
./scripts/health-check.sh

# 2. Logs ansehen
./scripts/logs.sh backend

# 3. Services neu starten
./scripts/stop.sh
./scripts/start.sh

# 4. Im Notfall: Komplette Neuinstallation
./scripts/uninstall.sh
./install.sh
```

---

## 💡 Tipps

### Script-Aliase erstellen

Füge zu deiner `~/.bashrc` oder `~/.zshrc` hinzu:

```bash
# Minecraft Hosting Platform Aliases
alias mcp-dev='cd /path/to/project && ./scripts/dev.sh'
alias mcp-start='cd /path/to/project && ./scripts/start.sh'
alias mcp-stop='cd /path/to/project && ./scripts/stop.sh'
alias mcp-logs='cd /path/to/project && ./scripts/logs.sh'
alias mcp-health='cd /path/to/project && ./scripts/health-check.sh'
```

### Automatischer Start beim Systemstart

Erstelle einen Systemd Service:

```bash
sudo nano /etc/systemd/system/minecraft-hosting.service
```

```ini
[Unit]
Description=Minecraft Hosting Platform
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/project
ExecStart=/path/to/project/scripts/start.sh
ExecStop=/path/to/project/scripts/stop.sh

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable minecraft-hosting
sudo systemctl start minecraft-hosting
```

### Cronjob für Health Checks

```bash
crontab -e
```

```bash
# Health Check jeden Tag um 2 Uhr
0 2 * * * /path/to/project/scripts/health-check.sh >> /var/log/mcp-health.log 2>&1
```

---

## 🐛 Debugging

### Script läuft nicht

```bash
# Stelle sicher, dass Scripts ausführbar sind
chmod +x scripts/*.sh

# Prüfe Shell
echo $SHELL

# Bash sollte verfügbar sein
bash scripts/dev.sh
```

### PostgreSQL startet nicht

```bash
# Prüfe Docker
docker ps

# Manuell PostgreSQL starten
docker run -d --name minecraft-hosting-postgres \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15
```

### Services starten nicht

```bash
# Prüfe Logs
./scripts/logs.sh

# Ports prüfen
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :4000  # Agent
lsof -i :5432  # PostgreSQL

# Prozesse prüfen
ps aux | grep node
```

---

## 📝 Script-Entwicklung

### Neue Scripts hinzufügen

1. Erstelle Script in `scripts/`
2. Mache es ausführbar: `chmod +x scripts/new-script.sh`
3. Folge dem bestehenden Format:
   - Shebang: `#!/bin/bash`
   - Set error handling: `set -e`
   - Verwende Color-Codes
   - Füge Header-Kommentar hinzu
   - Erstelle `main()` Funktion
4. Dokumentiere hier in README

### Best Practices

- ✅ Verwende `set -e` für automatischen Exit bei Fehlern
- ✅ Verwende `set -u` für Fehler bei undeklarierten Variablen
- ✅ Füge Help-Text hinzu (`--help`)
- ✅ Gebe farbige Ausgaben für bessere UX
- ✅ Prüfe Voraussetzungen vor Ausführung
- ✅ Verwende absolute Pfade mit `$SCRIPT_DIR`
- ✅ Dokumentiere alle Funktionen
- ✅ Teste auf verschiedenen Systemen (Linux, macOS)

---

## 🔗 Siehe auch

- [Hauptdokumentation](../README.md)
- [Quick Start Guide](../QUICKSTART.md)
- [Architektur](../ARCHITECTURE.md)
- [Installation Script](../install.sh)
