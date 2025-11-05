# 🚀 Getting Started - So einfach wie möglich!

## 📋 Was du wissen musst (in 30 Sekunden)

**Superhostingtool** ist eine Minecraft Hosting Plattform. Du kannst damit:
- ✅ Minecraft Server mit einem Klick erstellen
- ✅ Server verwalten (starten, stoppen, neu starten)
- ✅ Ressourcen (RAM, CPU) live anpassen
- ✅ Backups erstellen und wiederherstellen
- ✅ Mods installieren und verwalten
- ✅ Alle Minecraft-Versionen nutzen

---

## ⚡ Installation (1 Befehl, 60 Sekunden)

### Kopiere diesen Befehl und führe ihn aus:

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/superhostingtool/main/quick-start.sh | bash
```

**Das war's!** ☕ Lehn dich zurück und warte.

Der Installer macht automatisch:
1. ✅ Installiert Docker (falls nicht vorhanden)
2. ✅ Lädt das Projekt herunter
3. ✅ Konfiguriert alle Services
4. ✅ Startet die Plattform

Nach 60 Sekunden ist alles bereit!

---

## 🎮 Erste Schritte nach der Installation

### 1. Öffne die Plattform

```
http://localhost
```

### 2. Erstelle einen Account

- Klicke auf "Registrieren"
- Gib deine Daten ein
- Fertig!

### 3. Erstelle deinen ersten Server

- Klicke auf "Neuer Server"
- Wähle:
  - **Name:** z.B. "Mein erster Server"
  - **Version:** z.B. "1.20.4"
  - **RAM:** z.B. 4 GB
  - **Spieler:** z.B. 20
- Klicke auf "Server erstellen"
- Warte 30 Sekunden
- **Fertig!** Dein Server läuft!

### 4. Verbinde dich mit deinem Server

In Minecraft:
- Multiplayer → Direktverbindung
- IP: `localhost:25565` (oder die IP deines Servers)
- Spielen!

---

## 🛠️ Wichtige Befehle

### Plattform starten
```bash
./start.sh
# ODER
docker-compose up -d
```

### Plattform stoppen
```bash
./stop.sh
# ODER
docker-compose down
```

### Logs ansehen
```bash
docker-compose logs -f
```

### Status prüfen
```bash
docker-compose ps
```

---

## 🆘 Hilfe & Probleme

### Die Plattform startet nicht?

1. **Prüfe ob Docker läuft:**
   ```bash
   docker ps
   ```

   Falls nicht, starte Docker:
   ```bash
   # Linux
   sudo systemctl start docker

   # macOS
   # Öffne Docker Desktop
   ```

2. **Prüfe die Logs:**
   ```bash
   docker-compose logs
   ```

3. **Neustart versuchen:**
   ```bash
   ./stop.sh
   ./start.sh
   ```

### Ports bereits belegt?

Falls Port 80 oder 3000 schon verwendet werden:

**Option 1:** Andere Ports verwenden
- Bearbeite `docker-compose.yml`
- Ändere `80:80` zu z.B. `8080:80`
- Starte neu: `./start.sh`

**Option 2:** Anderen Service stoppen
- Finde welcher Service Port 80 nutzt:
  ```bash
  sudo lsof -i :80
  ```
- Stoppe den Service

### Docker Permission Error?

Falls du die Meldung "permission denied" erhältst:

```bash
# Füge deinen User zur docker-Gruppe hinzu:
sudo usermod -aG docker $USER

# Melde dich ab und wieder an
# Oder führe aus:
newgrp docker
```

### Alles zurücksetzen?

Um komplett neu anzufangen:

```bash
# Stoppe und entferne alles
docker-compose down -v

# Starte Installation erneut
./quick-start.sh
```

---

## 📚 Nächste Schritte

Jetzt wo die Plattform läuft:

1. **Erkunde das Dashboard**
   - Übersicht aller Server
   - Ressourcen-Monitoring
   - Schnellaktionen

2. **Erstelle mehrere Server**
   - Teste verschiedene Versionen
   - Erstelle Server-Templates
   - Klone bestehende Server

3. **Installiere Mods**
   - Lade Mods hoch
   - Installiere mit einem Klick
   - Verwalte Mod-Versionen

4. **Richte Backups ein**
   - Automatische tägliche Backups
   - Manuelle Backups jederzeit
   - Ein-Klick Wiederherstellung

5. **Nutze erweiterte Features**
   - File Manager für Server-Dateien
   - Player Management (Whitelist, Bans)
   - Scheduled Tasks (Automatisierung)
   - Notifications (Discord, E-Mail)
   - Analytics & Monitoring

---

## 🎯 Tipps & Tricks

### Performance optimieren

**RAM richtig einstellen:**
- Vanilla Server: 2-4 GB
- Modded Server: 4-8 GB
- Große Modpacks: 8-16 GB

**CPU richtig zuweisen:**
- 1-10 Spieler: 1-2 CPUs
- 10-50 Spieler: 2-4 CPUs
- 50+ Spieler: 4+ CPUs

### Sicherheit

**Wichtig für Production:**
1. Ändere Passwörter in `.env` Dateien
2. Aktiviere Firewall für Minecraft-Ports
3. Nutze SSL/TLS für HTTPS
4. Regelmäßige Backups!

### Skalierung

**Mehr Server hosten:**
- Füge weitere Host-Agents hinzu
- Nutze Kubernetes für Auto-Scaling
- Siehe `ARCHITECTURE.md` für Details

---

## 💬 Community & Support

- **Dokumentation:** [README.md](./README.md)
- **Architektur:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Docs:** http://localhost:3000/api
- **Issues:** GitHub Issues
- **Fragen:** Discord / E-Mail

---

## 🎉 Fertig!

Du bist jetzt bereit, Minecraft Server wie ein Profi zu hosten! 🚀

**Viel Spaß beim Server-Management!** 🎮

---

## Anhang: Alle Installations-Optionen

### Option 1: One-Line Install (Einfachste)
```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/superhostingtool/main/quick-start.sh | bash
```

### Option 2: Lokaler Quick-Start
```bash
git clone https://github.com/yourusername/superhostingtool.git
cd superhostingtool
./quick-start.sh
```

### Option 3: Interaktiver Installer
```bash
./install.sh
# Wähle: Docker Compose (empfohlen)
```

### Option 4: Manuell mit Docker Compose
```bash
# 1. .env Dateien erstellen
cp backend/.env.example backend/.env
cp agent/.env.example agent/.env

# 2. Secrets anpassen (optional)
nano backend/.env
nano agent/.env

# 3. Starten
docker-compose up -d

# 4. Datenbank migrieren
docker-compose exec backend npx prisma migrate deploy
```

### Option 5: Lokale Entwicklung
```bash
# Voraussetzungen: Node.js 18+, PostgreSQL 15+

# 1. Dependencies installieren
npm install

# 2. Shared-Modul bauen
npm run build --workspace=shared

# 3. .env Dateien erstellen
cp backend/.env.example backend/.env
cp agent/.env.example agent/.env

# 4. Datenbank migrieren
cd backend
npx prisma migrate dev

# 5. Services starten
cd ..
npm run dev
```

### Option 6: Kubernetes
```bash
# Siehe README.md → Deployment → Kubernetes
kubectl apply -f k8s/
```

---

**Wähle die Option die am besten zu dir passt! Docker Compose (Option 1-3) ist am einfachsten.** 🎯
