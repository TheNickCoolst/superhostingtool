# Architektur-Dokumentation

## Übersicht

Diese Dokumentation beschreibt die technische Architektur der Minecraft Hosting Plattform im Detail.

## System-Architektur

### High-Level Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Ingress     │ (DDoS Protection, SSL/TLS)
                    │   (Nginx)     │
                    └───────┬───────┘
                            │
                ┌───────────┴──────────┐
                ▼                      ▼
        ┌──────────────┐      ┌──────────────┐
        │   Frontend   │      │   Backend    │
        │   (React)    │      │  (Express)   │
        └──────────────┘      └───────┬──────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌───────────┐     ┌──────────────┐  ┌──────────────┐
            │PostgreSQL │     │ Host Agent 1 │  │ Host Agent 2 │
            └───────────┘     └──────┬───────┘  └──────┬───────┘
                                     │                 │
                              ┌──────┴──────┐   ┌──────┴──────┐
                              ▼             ▼   ▼             ▼
                          [MC Server] [MC Server] [MC Server] ...
```

## Backend-Architektur

### Layer-Struktur

```
┌─────────────────────────────────────┐
│      Routes (HTTP Endpoints)        │
├─────────────────────────────────────┤
│      Controllers (Request Handler)  │
├─────────────────────────────────────┤
│      Services (Business Logic)      │
├─────────────────────────────────────┤
│      Prisma ORM (Data Access)       │
├─────────────────────────────────────┤
│      PostgreSQL (Database)          │
└─────────────────────────────────────┘
```

### Service-Komponenten

#### 1. **AuthService**
Verantwortlich für:
- Benutzer-Registrierung
- Login mit JWT-Token-Generierung
- Password-Hashing (bcrypt)

#### 2. **ServerService**
Kern-Service für Server-Management:
- Server-Erstellung (wählt automatisch besten Host)
- Server-Lifecycle (Start, Stop, Restart)
- Resource-Updates (live!)
- Server-Löschung

#### 3. **HostService**
Verwaltet physische Hosts:
- Host-Auswahl basierend auf verfügbaren Ressourcen
- Load Balancing (niedrigste Auslastung zuerst)
- Ressourcen-Tracking (RAM, CPU)
- Heartbeat-Monitoring

#### 4. **AgentService**
Kommunikation mit Host-Agenten:
- Sendet Befehle über REST API
- Verwendet Host-API-Key für Auth
- Timeout-Handling (30s)

#### 5. **MinecraftVersionService**
Minecraft-Version-Management:
- Sync mit Mojang's Version-Manifest
- Download-URL-Bereitstellung
- Version-Filterung (Release, Snapshot)

#### 6. **WebSocketService**
Echtzeit-Kommunikation:
- Singleton-Pattern (eine Instanz)
- Broadcast an alle Clients
- Event-basierte Architektur

## Host Agent-Architektur

### Agent-Komponenten

```
┌─────────────────────────────────────┐
│      Express API (Command Handler) │
├─────────────────────────────────────┤
│      DockerService                  │
├─────────────────────────────────────┤
│      BackupService                  │
├─────────────────────────────────────┤
│      MonitoringService              │
├─────────────────────────────────────┤
│      HeartbeatService               │
├─────────────────────────────────────┤
│      Dockerode (Docker API Client)  │
└─────────────────────────────────────┘
```

### DockerService

Kritischster Service im Agent:

**Funktionen:**
1. **createServer()**: Erstellt Docker Container
   - Download Minecraft JAR
   - Erstellt server.properties
   - Konfiguriert Container mit Ressourcen-Limits

2. **startServer()**: Startet Container
   - Einfacher `docker start`

3. **stopServer()**: Graceful Shutdown
   - Sendet "save-all" an Minecraft
   - Sendet "stop" Befehl
   - Docker stop mit Timeout (30s)

4. **restartServer()**: Rolling Restart
   ```
   1. save-all
   2. Warte 3s
   3. stop (graceful)
   4. docker stop (max 10s)
   5. docker start
   → Downtime: 3-5 Sekunden
   ```

5. **updateResources()**: Live Resource Updates
   ```typescript
   if (ramDiff < 50% && cpuDiff < 50%) {
     // LIVE UPDATE (0s downtime)
     docker.update({
       Memory: newRam,
       NanoCpus: newCpu
     });
   } else {
     // Rolling Restart (5s downtime)
     restartServer(graceful=true);
     docker.update(...);
   }
   ```

### BackupService

**Backup-Strategie:**
```
1. save-all      → Flush alle Chunks auf Disk
2. save-off      → Deaktiviere Auto-Save
3. tar -czf      → Erstelle komprimiertes Archive
4. save-on       → Aktiviere Auto-Save wieder

Server läuft während des gesamten Prozesses!
```

**Restore-Strategie:**
```
1. Stoppe Server (muss!)
2. Emergency Backup des aktuellen Zustands
3. Lösche alte Welt-Daten (world, world_nether, world_the_end)
4. Extrahiere Backup
5. Server kann neu gestartet werden
```

### MonitoringService

Sammelt kontinuierlich Stats:
- CPU-Usage (in %)
- RAM-Usage (in MB)
- Container-Status
- Uptime

Sendet Stats an Backend via WebSocket (optional) oder API.

### HeartbeatService

Sendet alle 30 Sekunden Heartbeat an Backend:
```http
POST /api/hosts/:hostId/heartbeat
Authorization: Bearer <agent-api-key>
```

Backend markiert Hosts als OFFLINE, wenn kein Heartbeat für 60s empfangen wurde.

## Datenbank-Schema

### Wichtigste Relationen

```sql
User (1) ──── (N) MinecraftServer
Host (1) ──── (N) MinecraftServer
MinecraftServer (1) ──── (N) Backup
MinecraftServer (1) ──── (1) ServerStats
MinecraftServer (N) ──── (M) Mod (via ServerMod)
```

### Indexe

Performance-Optimierungen:
```sql
-- User-Suche
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_username ON User(username);

-- Server-Abfragen
CREATE INDEX idx_server_userId ON MinecraftServer(userId);
CREATE INDEX idx_server_hostId ON MinecraftServer(hostId);
CREATE INDEX idx_server_status ON MinecraftServer(status);

-- Host-Filtering
CREATE INDEX idx_host_status ON Host(status);
CREATE INDEX idx_host_region ON Host(region);
```

## Frontend-Architektur

### Komponenten-Hierarchie

```
App
├── Layout (Navigation, Auth-Context)
│   ├── Dashboard
│   │   └── StatsCards, RecentServers
│   ├── Servers
│   │   └── ServerCard (List)
│   ├── CreateServer
│   │   └── ServerForm
│   ├── ServerDetails
│   │   └── ControlButtons, ResourceModal, Stats
│   └── Mods
│       └── ModList
```

### State Management

Verwendet **React Query** für:
- Server-Side State Caching
- Automatic Refetching
- Optimistic Updates
- Loading/Error States

Beispiel:
```typescript
const { data: servers } = useQuery({
  queryKey: ['servers'],
  queryFn: () => api.get('/api/servers'),
  refetchInterval: 5000  // Auto-Refresh alle 5s
});
```

### API-Integration

Axios Interceptors für:
1. **Request**: Auto-Inject JWT Token
2. **Response**: Handle 401 (Logout bei expired token)

## Skalierungs-Strategie

### Horizontal Scaling

#### Backend
```yaml
# Kubernetes HPA
minReplicas: 3
maxReplicas: 10

# Scale basierend auf:
- CPU > 70%
- Memory > 80%
```

#### Frontend
Stateless → Beliebig skalierbar

#### Database
- Read Replicas für Read-Heavy Workloads
- Connection Pooling (Prisma)
- Indexes auf häufige Queries

### Vertical Scaling

#### Host Agents
- Mehr RAM → Mehr/größere Server
- Mehr CPU Cores → Mehr gleichzeitige Server

#### Database
- Mehr RAM → Größerer Cache
- SSD → Schnellere Disk I/O

## Sicherheits-Architektur

### Defense in Depth

```
┌─────────────────────────────────────┐
│  1. Ingress (DDoS, Rate Limit)     │
├─────────────────────────────────────┤
│  2. TLS/SSL (HTTPS)                │
├─────────────────────────────────────┤
│  3. JWT Authentication             │
├─────────────────────────────────────┤
│  4. Input Validation               │
├─────────────────────────────────────┤
│  5. ORM (SQL Injection Prevention) │
├─────────────────────────────────────┤
│  6. Container Isolation            │
└─────────────────────────────────────┘
```

### Container-Isolation

Jeder Minecraft-Server läuft in eigenem Container:
- Eigenes Dateisystem
- Ressourcen-Limits (RAM, CPU)
- Network Isolation (optional)

## Performance-Optimierungen

### Backend

1. **Database Query Optimization**
   - Eager Loading für Relations
   - Selective Fields (nur benötigte Daten)
   - Pagination für große Listen

2. **Caching**
   - Minecraft Versions (24h Cache)
   - User-Daten bei JWT-Verifizierung
   - (Kann mit Redis erweitert werden)

3. **Compression**
   - Gzip für HTTP Responses
   - Tar.gz für Backups

### Frontend

1. **Code Splitting**
   - Route-based Splitting (Vite)
   - Lazy Loading von Components

2. **Asset Optimization**
   - Minification (Vite)
   - Tree Shaking

3. **React Query**
   - Aggressive Caching
   - Background Refetching
   - Stale-While-Revalidate

### Agent

1. **Efficient File Operations**
   - Streaming für große Backups
   - Compression Level 6 (Balance Speed/Size)

2. **Docker API**
   - Connection Pooling
   - Stream Stats (nicht alle auf einmal laden)

## Fehlerbehandlung

### Backend

```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof AppError) {
    // Erwarteter Fehler (z.B. "Server not found")
    return res.status(error.statusCode).json({ error: error.message });
  } else {
    // Unerwarteter Fehler
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Agent

Bei Fehler in Docker-Operationen:
- Cleanup versuchen (z.B. Container entfernen bei failed create)
- Fehler an Backend melden
- Retry-Logik (optional, für temporäre Fehler)

### Frontend

```typescript
const mutation = useMutation({
  mutationFn: createServer,
  onError: (error) => {
    // Zeige Fehlermeldung
    alert(error.message);
  },
  onSuccess: () => {
    // Zeige Erfolgsmeldung
    navigate('/servers');
  }
});
```

## Monitoring & Observability

### Logs

**Strukturiertes Logging:**
```typescript
console.log(`[${new Date().toISOString()}] [INFO] Server ${serverId} started`);
console.error(`[${new Date().toISOString()}] [ERROR] Failed to start server: ${error}`);
```

### Metriken

**Wichtige Metriken:**
- Request Rate (req/s)
- Response Time (ms)
- Error Rate (%)
- Container Count per Host
- Database Connection Pool Size
- WebSocket Connections

### Health Checks

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});
```

Kubernetes nutzt diese für:
- Liveness Probes (Container neu starten bei Fehler)
- Readiness Probes (Traffic nur an gesunde Pods)

## Deployment-Pipeline

### CI/CD (Empfohlen)

```yaml
# .github/workflows/deploy.yml

1. Test:
   - npm test
   - npm run lint

2. Build:
   - docker build -t backend:$VERSION backend/
   - docker build -t frontend:$VERSION frontend/
   - docker build -t agent:$VERSION agent/

3. Push:
   - docker push registry/backend:$VERSION
   - docker push registry/frontend:$VERSION
   - docker push registry/agent:$VERSION

4. Deploy:
   - kubectl set image deployment/backend backend=registry/backend:$VERSION
   - kubectl set image deployment/frontend frontend=registry/frontend:$VERSION
   - kubectl set image daemonset/agent agent=registry/agent:$VERSION

5. Verify:
   - kubectl rollout status deployment/backend
   - Health Check
```

## Disaster Recovery

### Backup-Strategie

1. **Database Backups**
   - Täglich: Full Backup
   - Stündlich: Incremental Backup
   - Retention: 30 Tage

2. **Minecraft Server Backups**
   - Täglich: Automatic Backup (3 Uhr nachts)
   - On-Demand: Manual Backups
   - Retention: 30 Tage

3. **Configuration Backups**
   - GitOps: Alle Kubernetes Manifests in Git
   - Secrets: Verschlüsselt in Vault

### Recovery-Prozeduren

**Scenario 1: Pod Crash**
- Kubernetes startet automatisch neu
- Downtime: ~10 Sekunden

**Scenario 2: Node Failure**
- Kubernetes reschedult Pods auf anderen Nodes
- Downtime: ~1 Minute

**Scenario 3: Database Failure**
- Restore from Backup
- Downtime: Abhängig von Backup-Größe

**Scenario 4: Complete Cluster Loss**
- Neuen Cluster aufsetzen
- Database aus Backup wiederherstellen
- Deployments aus Git neu deployen
- Downtime: ~1-2 Stunden

## Nächste Schritte

Mögliche Erweiterungen:
1. **Redis für Caching**
2. **RabbitMQ für Async Jobs**
3. **Prometheus + Grafana für Monitoring**
4. **ELK Stack für Log-Aggregation**
5. **Vault für Secret Management**
6. **ArgoCD für GitOps**
7. **Istio für Service Mesh**
