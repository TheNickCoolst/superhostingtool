import { Router } from 'express';
import { ServerController } from '../controllers/server.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const serverController = new ServerController();

// Alle Routes erfordern Authentifizierung
router.use(authenticate);

// GET /api/servers - Hole alle Server des Benutzers
router.get('/', serverController.getUserServers);

// GET /api/servers/:id - Hole einen spezifischen Server
router.get('/:id', serverController.getServerById);

// POST /api/servers - Erstelle einen neuen Server (One-Click!)
router.post('/', serverController.createServer);

// PATCH /api/servers/:id/resources - Update Server-Ressourcen (RAM/CPU)
router.patch('/:id/resources', serverController.updateResources);

// POST /api/servers/:id/start - Starte Server
router.post('/:id/start', serverController.startServer);

// POST /api/servers/:id/stop - Stoppe Server
router.post('/:id/stop', serverController.stopServer);

// POST /api/servers/:id/restart - Neustart mit minimaler Downtime
router.post('/:id/restart', serverController.restartServer);

// POST /api/servers/:id/command - Führe Minecraft-Befehl aus
router.post('/:id/command', serverController.executeCommand);

// DELETE /api/servers/:id - Lösche Server
router.delete('/:id', serverController.deleteServer);

export default router;
