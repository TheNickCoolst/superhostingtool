import { Router } from 'express';
import { ServerController } from '../controllers/server.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  createServerValidation,
  updateServerValidation,
  executeCommandValidation,
  validateUUID
} from '../middleware/validation.middleware';

const router = Router();
const serverController = new ServerController();

// Alle Routes erfordern Authentifizierung
router.use(authenticate);

// GET /api/servers - Hole alle Server des Benutzers
router.get('/', serverController.getUserServers);

// GET /api/servers/:id - Hole einen spezifischen Server
router.get('/:id', validateUUID, serverController.getServerById);

// POST /api/servers - Erstelle einen neuen Server (One-Click!)
router.post('/', createServerValidation, serverController.createServer);

// PATCH /api/servers/:id/resources - Update Server-Ressourcen (RAM/CPU)
router.patch('/:id/resources', updateServerValidation, serverController.updateResources);

// POST /api/servers/:id/start - Starte Server
router.post('/:id/start', validateUUID, serverController.startServer);

// POST /api/servers/:id/stop - Stoppe Server
router.post('/:id/stop', validateUUID, serverController.stopServer);

// POST /api/servers/:id/restart - Neustart mit minimaler Downtime
router.post('/:id/restart', validateUUID, serverController.restartServer);

// POST /api/servers/:id/command - Führe Minecraft-Befehl aus
router.post('/:id/command', executeCommandValidation, serverController.executeCommand);

// DELETE /api/servers/:id - Lösche Server
router.delete('/:id', validateUUID, serverController.deleteServer);

export default router;
