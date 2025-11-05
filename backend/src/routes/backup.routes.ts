import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const backupController = new BackupController();

// Alle Routes erfordern Authentifizierung
router.use(authenticate);

// GET /api/backups/server/:serverId - Hole alle Backups für einen Server
router.get('/server/:serverId', backupController.getServerBackups);

// POST /api/backups/server/:serverId - Erstelle manuelles Backup
router.post('/server/:serverId', backupController.createBackup);

// POST /api/backups/:backupId/restore - Stelle Backup wieder her
router.post('/:backupId/restore', backupController.restoreBackup);

// DELETE /api/backups/:backupId - Lösche Backup
router.delete('/:backupId', backupController.deleteBackup);

export default router;
