import { Router } from 'express';
import { VersionController } from '../controllers/version.controller';

const router = Router();
const versionController = new VersionController();

// GET /api/versions - Hole alle verfügbaren Minecraft-Versionen
router.get('/', versionController.getAllVersions);

// GET /api/versions/latest - Hole neueste stabile Version
router.get('/latest', versionController.getLatestVersion);

// POST /api/versions/sync - Synchronisiere Versionen von Mojang (Admin only)
router.post('/sync', versionController.syncVersions);

export default router;
