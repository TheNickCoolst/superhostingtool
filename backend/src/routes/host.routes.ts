import { Router } from 'express';
import { HostController } from '../controllers/host.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
const hostController = new HostController();

// Alle Routes erfordern Authentifizierung
router.use(authenticate);

// GET /api/hosts - Hole alle Hosts (nur für Admins)
router.get('/', authorize(UserRole.ADMIN), hostController.getAllHosts);

// GET /api/hosts/:id - Hole einen spezifischen Host
router.get('/:id', hostController.getHostById);

// POST /api/hosts/:id/heartbeat - Heartbeat von Host-Agent (wird vom Agent aufgerufen)
router.post('/:id/heartbeat', hostController.updateHeartbeat);

export default router;
