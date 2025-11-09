# 🚀 Neue Features & Verbesserungen - CraftHost Pro

**Version:** 2.0.0
**Datum:** 2025-11-08

Diese Dokumentation beschreibt alle neuen Features und Sicherheitsverbesserungen, die in diesem Update hinzugefügt wurden.

---

## 📋 Inhaltsverzeichnis

- [Sicherheitsverbesserungen](#sicherheitsverbesserungen)
- [Neue Premium-Features](#neue-premium-features)
- [Performance-Optimierungen](#performance-optimierungen)
- [API-Änderungen](#api-änderungen)
- [Migration & Upgrade](#migration--upgrade)

---

## 🔒 Sicherheitsverbesserungen

### 1. **Verbesserte File Path Validation**

**Problem:** Die vorherige Implementierung war anfällig für Path Traversal-Angriffe.

**Lösung:**
- Path-Normalisierung zur Verhinderung von `../` Attacks
- Erkennung von Null-Bytes und URL-Encoding-Angriffen
- Whitelist-basierter Ansatz für erlaubte Verzeichnisse
- Regex-basierte Validierung gegen gefährliche Pfade

**Code:** `backend/src/services/file-manager.service.ts`

**Beispiel:**
```typescript
// Blockiert:
await fileManager.readFile(serverId, "../../../etc/passwd"); // ❌
await fileManager.readFile(serverId, "%2e%2e/secret"); // ❌
await fileManager.readFile(serverId, "/root/.ssh/id_rsa"); // ❌

// Erlaubt:
await fileManager.readFile(serverId, "server.properties"); // ✅
await fileManager.readFile(serverId, "world/level.dat"); // ✅
```

---

### 2. **File Upload Validation**

**Neu hinzugefügt:** Umfassende Validierung von hochgeladenen Dateien.

**Features:**
- ✅ Dateigrößen-Limits (50MB für Mods, 100MB für Worlds)
- ✅ Whitelist für erlaubte Dateitypen
- ✅ Header-basierte Erkennung von Shell-Scripts
- ✅ Schutz vor PHP/JavaScript-Injection

**Code:** `backend/src/services/file-manager.service.ts:validateFileUpload()`

**Erlaubte Dateitypen:**
- **Mods/Plugins:** `.jar` (max 50MB)
- **Worlds:** `.zip` (max 100MB)
- **Configs:** `.json`, `.yml`, `.yaml`, `.properties`, `.txt` (max 10MB)
- **Ressourcen:** `.png`, `.jpg`, `.jpeg` (max 10MB)
- **Minecraft:** `.dat`, `.mcmeta`, `.nbt`, `.mca`, `.mcfunction` (max 10MB)

---

### 3. **CSRF Protection**

**Neu hinzugefügt:** Cross-Site Request Forgery Schutz.

**Features:**
- ✅ Token-basierte CSRF-Validierung
- ✅ Automatische Token-Rotation (1 Stunde TTL)
- ✅ Header oder Body-basierte Token-Übertragung
- ✅ Automatisches Cleanup abgelaufener Tokens

**Code:** `backend/src/middleware/csrf.middleware.ts`

**Verwendung:**
```typescript
// 1. Token abrufen
GET /api/auth/csrf-token
Response: { "csrfToken": "..." }

// 2. Token bei Requests mitschicken
POST /api/servers
Headers: { "X-CSRF-Token": "..." }
```

---

### 4. **Singleton PrismaClient**

**Problem:** Mehrere PrismaClient-Instanzen erschöpften die Datenbankverbindungen.

**Lösung:**
- Singleton Pattern für PrismaClient
- Automatisches Connection Pooling
- Graceful Shutdown bei Prozessende

**Code:** `backend/src/lib/prisma.singleton.ts`

**Migration:**
```typescript
// Alt:
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Neu:
import prisma from '../lib/prisma.singleton';
```

---

## ✨ Neue Premium-Features

### 1. **Server Cloning** 🎯

Dupliziere komplette Server mit allen Einstellungen, Welten und Mods.

**Endpoint:** `POST /api/servers/advanced/:id/clone`

**Features:**
- ✅ Klonen aller Server-Einstellungen
- ✅ Optional: Welt-Daten klonen
- ✅ Optional: Mods/Plugins klonen
- ✅ Optional: Konfigurationsdateien klonen
- ✅ Automatische Host-Auswahl
- ✅ Server-Limit-Prüfung

**Beispiel:**
```bash
curl -X POST http://localhost:3000/api/servers/advanced/SERVER_ID/clone \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cloneName": "My Clone",
    "cloneWorld": true,
    "cloneMods": true,
    "cloneConfig": true
  }'
```

**Response:**
```json
{
  "message": "Server cloned successfully",
  "server": {
    "id": "...",
    "name": "My Clone",
    "status": "STOPPED"
  }
}
```

**Code:** `backend/src/services/server-cloning.service.ts`

---

### 2. **Server Import/Export** 📦

Exportiere und teile Server-Konfigurationen als JSON-Dateien.

**Endpoints:**

#### Export
```bash
# Export als JSON-Response
POST /api/servers/advanced/:id/export

# Export als Download
GET /api/servers/advanced/:id/export/download
```

#### Import
```bash
# Import via JSON-Body
POST /api/servers/advanced/import

# Import via File-Upload
POST /api/servers/advanced/import/upload
```

**Features:**
- ✅ Versionierte Export-Formate
- ✅ Checksum-Verifizierung für Integrität
- ✅ Optionales Einbeziehen von Mods/Config
- ✅ Teilbare Export-Dateien

**Export-Beispiel:**
```bash
curl -X POST http://localhost:3000/api/servers/advanced/SERVER_ID/export \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "includeMods": true,
    "includeConfig": true
  }'
```

**Import-Beispiel:**
```bash
curl -X POST http://localhost:3000/api/servers/advanced/import \
  -H "Authorization: Bearer TOKEN" \
  -F "exportFile=@server-export.json" \
  -F "serverName=My Imported Server"
```

**Export-Format:**
```json
{
  "version": "1.0.0",
  "exportDate": "2025-11-08T...",
  "server": {
    "name": "My Server",
    "minecraftVersion": "1.20.4",
    "allocatedRam": 4096,
    ...
  },
  "mods": [...],
  "config": {...},
  "checksum": "sha256..."
}
```

**Code:** `backend/src/services/server-import-export.service.ts`

---

### 3. **Health Check System** 🏥

Automatische Überwachung der Server-Gesundheit mit Self-Healing.

**Features:**
- ✅ Kontinuierliche Gesundheitsüberwachung (alle 60 Sekunden)
- ✅ CPU, RAM, Disk, TPS-Monitoring
- ✅ Automatische Container-Neustarts bei Ausfällen
- ✅ Historische Gesundheitsdaten
- ✅ Gesundheits-Übersicht für alle Server

**Endpoints:**

#### Aktuellen Health-Status abrufen
```bash
GET /api/servers/advanced/:id/health
```

**Response:**
```json
{
  "serverId": "...",
  "healthy": true,
  "checks": {
    "containerRunning": true,
    "memoryUsage": 65.5,
    "cpuUsage": 45.2,
    "diskSpace": 35.0,
    "responsive": true
  },
  "issues": [],
  "timestamp": "2025-11-08T..."
}
```

#### Health-Historie abrufen
```bash
GET /api/servers/advanced/:id/health/history?hours=24
```

#### Health-Übersicht aller Server
```bash
GET /api/servers/advanced/health/overview
```

**Response:**
```json
{
  "servers": [...],
  "summary": {
    "total": 5,
    "healthy": 4,
    "unhealthy": 1
  }
}
```

**Auto-Remediation:**
- Container nicht laufend → Automatischer Neustart
- Speicher kritisch (>95%) → Warnung + Optional: Neustart
- CPU kritisch (>95%) → Warnung
- Disk voll (>90%) → Warnung

**Code:** `backend/src/services/health-check.service.ts`

---

## ⚡ Performance-Optimierungen

### 1. **Redis-basiertes Caching**

**Implementiert:** In-Memory-Cache mit Redis-Fallback.

**Features:**
- ✅ TTL-basiertes Caching
- ✅ Pattern-basiertes Löschen
- ✅ Get-or-Set Pattern
- ✅ Automatisches Cleanup
- ✅ Cache-Statistiken

**Code:** `backend/src/lib/cache.service.ts`

**Verwendung:**
```typescript
import CacheService, { CacheKeys } from '../lib/cache.service';

// Get-or-Set Pattern (empfohlen)
const stats = await CacheService.getOrSet(
  CacheKeys.serverStats(serverId),
  async () => {
    // Expensive operation
    return await fetchStatsFromAgent();
  },
  300 // TTL: 5 Minuten
);

// Manuell
await CacheService.set('key', value, 60); // 60 Sekunden TTL
const cached = await CacheService.get('key');
await CacheService.delete('key');
await CacheService.deletePattern('server:*');
```

**Cache-Keys:**
- `server:{id}:stats` - Server-Statistiken
- `user:{id}:servers` - User-Server-Liste
- `minecraft:versions` - Verfügbare MC-Versionen
- `health:{serverId}` - Health-Check-Ergebnisse
- `analytics:{serverId}:{period}` - Analytics-Daten

**Production mit Redis:**
```typescript
// Ersetze in cache.service.ts:
import { createClient } from 'redis';
const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();
```

---

### 2. **Structured Logging verbessert**

**Verbesserungen:**
- ✅ Alle `console.log` durch `logger` ersetzt
- ✅ Kontextbezogene Logging-Informationen
- ✅ Debug-Logs nur in Development
- ✅ Strukturierte Error-Logs mit Stack-Traces

**Beispiele:**
```typescript
// Alt:
console.log('Server started', serverId);

// Neu:
logger.info('Server started', { serverId, userId });
```

---

## 🔄 API-Änderungen

### Neue Endpoints

```
POST   /api/servers/advanced/:id/clone
POST   /api/servers/advanced/:id/export
GET    /api/servers/advanced/:id/export/download
POST   /api/servers/advanced/import
POST   /api/servers/advanced/import/upload
GET    /api/servers/advanced/:id/health
GET    /api/servers/advanced/:id/health/history
GET    /api/servers/advanced/health/overview
GET    /api/auth/csrf-token
```

### Breaking Changes

**Keine!** Alle bestehenden Endpoints sind weiterhin kompatibel.

---

## 📦 Migration & Upgrade

### 1. **Dependencies installieren**

```bash
cd backend
npm install
```

### 2. **Umgebungsvariablen (optional)**

```bash
# .env
REDIS_URL=redis://localhost:6379  # Für Production-Redis
```

### 3. **Datenbank Migration**

Keine Änderungen am Datenbankschema erforderlich!

### 4. **Server neu starten**

```bash
npm run dev
```

### 5. **Health Check Service verifizieren**

```bash
# Logs sollten zeigen:
# [INFO] Health check service started
```

---

## 🧪 Testing

### Manuelle Tests

#### 1. Server Cloning testen
```bash
# Server erstellen
curl -X POST http://localhost:3000/api/servers \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Test Server", ...}'

# Server klonen
curl -X POST http://localhost:3000/api/servers/advanced/SERVER_ID/clone \
  -H "Authorization: Bearer TOKEN" \
  -d '{"cloneName": "Cloned Server", "cloneWorld": true}'
```

#### 2. Import/Export testen
```bash
# Exportieren
curl -X GET http://localhost:3000/api/servers/advanced/SERVER_ID/export/download \
  -H "Authorization: Bearer TOKEN" \
  -o export.json

# Importieren
curl -X POST http://localhost:3000/api/servers/advanced/import/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "exportFile=@export.json" \
  -F "serverName=Imported Server"
```

#### 3. Health Check testen
```bash
# Health-Status abrufen
curl http://localhost:3000/api/servers/advanced/SERVER_ID/health \
  -H "Authorization: Bearer TOKEN"

# Übersicht aller Server
curl http://localhost:3000/api/servers/advanced/health/overview \
  -H "Authorization: Bearer TOKEN"
```

---

## 🎯 Best Practices

### Server Cloning
- **Klone Welten nur bei Bedarf** - Welten können sehr groß sein
- **Prüfe Server-Limits** - Stelle sicher, dass genug Slots verfügbar sind
- **Verwende aussagekräftige Namen** - Erleichtert die Verwaltung

### Import/Export
- **Versioniere Exports** - Speichere Exports mit Datum/Version
- **Verifiziere Checksums** - Stelle Integrität sicher
- **Teile keine sensiblen Daten** - Whitelists/Ops können sensibel sein

### Health Checks
- **Überwache regelmäßig** - Nutze die Health-Overview
- **Reagiere auf Warnungen** - Kritische Issues frühzeitig beheben
- **Historische Daten nutzen** - Trends erkennen

### Caching
- **Verwende Get-or-Set** - Vermeidet Race Conditions
- **TTL sinnvoll wählen** - Zu kurz = wenig Nutzen, zu lang = veraltete Daten
- **Pattern-Deletes** - Invalidiere zusammenhängende Daten

---

## 🐛 Bekannte Probleme

### Server Cloning
- **Cross-Host World Cloning:** Noch nicht vollständig implementiert
  - Workaround: Manuelle Backup-Transfer zwischen Hosts

### Health Checks
- **TPS Detection:** Erfordert Server-Log-Parsing
  - Aktuell: Basiert auf Stats-API (kann ungenau sein)

---

## 📚 Weitere Ressourcen

- **Hauptdokumentation:** [README.md](./README.md)
- **API-Dokumentation:** Siehe README.md#API-Dokumentation
- **Quickstart:** [QUICKSTART.md](./QUICKSTART.md)

---

## ❤️ Credits

Diese Features wurden entwickelt, um CraftHost Pro zur besten Minecraft-Hosting-Lösung zu machen!

**Fragen oder Probleme?** Öffne ein [GitHub Issue](../../issues)!
