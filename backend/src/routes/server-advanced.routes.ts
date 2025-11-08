import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import ServerCloningService from '../services/server-cloning.service';
import ServerImportExportService from '../services/server-import-export.service';
import HealthCheckService from '../services/health-check.service';
import { logger } from '../lib/logger';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

/**
 * ==================== SERVER CLONING ====================
 */

/**
 * POST /api/servers/advanced/:id/clone
 * Clone a server with all its configuration
 */
router.post('/:id/clone', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: sourceServerId } = req.params;
    const userId = req.user!.id;
    const { cloneName, cloneWorld, cloneMods, clonePlugins, cloneConfig } = req.body;

    if (!cloneName) {
      return res.status(400).json({ error: 'Clone name is required' });
    }

    const clonedServer = await ServerCloningService.cloneServer(sourceServerId, userId, {
      cloneName,
      cloneWorld: cloneWorld || false,
      cloneMods: cloneMods || false,
      clonePlugins: clonePlugins || false,
      cloneConfig: cloneConfig !== false, // Default true
    });

    logger.info('Server cloned successfully', { sourceServerId, clonedServerId: clonedServer.id, userId });

    res.status(201).json({
      message: 'Server cloned successfully',
      server: clonedServer,
    });
  } catch (error: any) {
    logger.error('Server cloning failed', error);
    res.status(500).json({ error: error.message || 'Failed to clone server' });
  }
});

/**
 * ==================== SERVER IMPORT/EXPORT ====================
 */

/**
 * POST /api/servers/advanced/:id/export
 * Export a server configuration
 */
router.post('/:id/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: serverId } = req.params;
    const userId = req.user!.id;
    const { includeWorld, includeMods, includeConfig } = req.body;

    const exportData = await ServerImportExportService.exportServer(serverId, userId, {
      includeWorld: includeWorld || false,
      includeMods: includeMods !== false, // Default true
      includeConfig: includeConfig !== false, // Default true
    });

    logger.info('Server exported successfully', { serverId, userId });

    res.json({
      message: 'Server exported successfully',
      export: exportData,
    });
  } catch (error: any) {
    logger.error('Server export failed', error);
    res.status(500).json({ error: error.message || 'Failed to export server' });
  }
});

/**
 * GET /api/servers/advanced/:id/export/download
 * Download server export as JSON file
 */
router.get('/:id/export/download', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: serverId } = req.params;
    const userId = req.user!.id;

    const exportData = await ServerImportExportService.exportServer(serverId, userId, {
      includeWorld: false,
      includeMods: true,
      includeConfig: true,
    });

    const fileBuffer = await ServerImportExportService.generateExportFile(exportData);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="server-${serverId}-export.json"`);
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('Server export download failed', error);
    res.status(500).json({ error: error.message || 'Failed to download export' });
  }
});

/**
 * POST /api/servers/advanced/import
 * Import a server from export data
 */
router.post('/import', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { exportData, serverName } = req.body;

    if (!exportData) {
      return res.status(400).json({ error: 'Export data is required' });
    }

    const importedServer = await ServerImportExportService.importServer(
      userId,
      exportData,
      serverName
    );

    logger.info('Server imported successfully', { importedServerId: importedServer.id, userId });

    res.status(201).json({
      message: 'Server imported successfully',
      server: importedServer,
    });
  } catch (error: any) {
    logger.error('Server import failed', error);
    res.status(500).json({ error: error.message || 'Failed to import server' });
  }
});

/**
 * POST /api/servers/advanced/import/upload
 * Import a server from uploaded export file
 */
router.post('/import/upload', authenticate, upload.single('exportFile'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { serverName } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Export file is required' });
    }

    const exportData = await ServerImportExportService.parseExportFile(req.file.buffer);
    const importedServer = await ServerImportExportService.importServer(
      userId,
      exportData,
      serverName
    );

    logger.info('Server imported from file successfully', { importedServerId: importedServer.id, userId });

    res.status(201).json({
      message: 'Server imported successfully',
      server: importedServer,
    });
  } catch (error: any) {
    logger.error('Server import from file failed', error);
    res.status(500).json({ error: error.message || 'Failed to import server from file' });
  }
});

/**
 * ==================== HEALTH CHECKS ====================
 */

/**
 * GET /api/servers/advanced/:id/health
 * Get current health status of a server
 */
router.get('/:id/health', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: serverId } = req.params;

    const healthResult = await HealthCheckService.checkServerHealth(serverId);

    res.json({
      message: 'Health check completed',
      health: healthResult,
    });
  } catch (error: any) {
    logger.error('Health check failed', error);
    res.status(500).json({ error: error.message || 'Failed to check server health' });
  }
});

/**
 * GET /api/servers/advanced/:id/health/history
 * Get health history for a server
 */
router.get('/:id/health/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: serverId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    const history = await HealthCheckService.getHealthHistory(serverId, hours);

    res.json({
      message: 'Health history retrieved',
      history,
      period: `${hours} hours`,
    });
  } catch (error: any) {
    logger.error('Failed to get health history', error);
    res.status(500).json({ error: error.message || 'Failed to get health history' });
  }
});

/**
 * GET /api/servers/advanced/health/overview
 * Get health overview of all user's servers
 */
router.get('/health/overview', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const healthOverview = await HealthCheckService.getUserServersHealth(userId);

    res.json({
      message: 'Health overview retrieved',
      servers: healthOverview,
      summary: {
        total: healthOverview.length,
        healthy: healthOverview.filter((h) => h.healthy).length,
        unhealthy: healthOverview.filter((h) => !h.healthy).length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get health overview', error);
    res.status(500).json({ error: error.message || 'Failed to get health overview' });
  }
});

export default router;
