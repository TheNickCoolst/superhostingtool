import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import { DockerService } from './services/docker.service';
import { BackupService } from './services/backup.service';
import { MonitoringService } from './services/monitoring.service';
import { HeartbeatService } from './services/heartbeat.service';
import { AgentCommandType, AgentResponse } from '@minecraft-hosting/shared';

dotenv.config();

const app: Application = express();
const PORT = process.env.AGENT_PORT || 4000;

// Services
const dockerService = new DockerService();
const backupService = new BackupService(dockerService);
const monitoringService = new MonitoringService(dockerService);
const heartbeatService = new HeartbeatService();

// Middleware
app.use(express.json());

// Authentifizierungs-Middleware
const authenticate = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.AGENT_API_KEY;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

/**
 * Haupt-Endpunkt: Empfängt Befehle vom zentralen Backend
 */
app.post('/api/command', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    let result: AgentResponse;

    console.log(`Received command: ${type}`, payload);

    switch (type as AgentCommandType) {
      case AgentCommandType.CREATE_SERVER:
        result = await dockerService.createServer(payload);
        break;

      case AgentCommandType.START_SERVER:
        result = await dockerService.startServer(payload.containerName);
        break;

      case AgentCommandType.STOP_SERVER:
        result = await dockerService.stopServer(payload.containerName);
        break;

      case AgentCommandType.DELETE_SERVER:
        result = await dockerService.deleteServer(payload.containerName);
        break;

      case AgentCommandType.RESTART_SERVER:
        result = await dockerService.restartServer(payload.containerName, payload.graceful);
        break;

      case AgentCommandType.UPDATE_RESOURCES:
        result = await dockerService.updateResources(
          payload.containerName,
          payload.allocatedRam,
          payload.allocatedCpu,
          payload.liveUpdate
        );
        break;

      case AgentCommandType.EXECUTE_COMMAND:
        result = await dockerService.executeCommand(payload.containerName, payload.command);
        break;

      case AgentCommandType.CREATE_BACKUP:
        result = await backupService.createBackup(payload.containerName, payload.backupName);
        break;

      case AgentCommandType.RESTORE_BACKUP:
        result = await backupService.restoreBackup(payload.containerName, payload.backupPath);
        break;

      case AgentCommandType.INSTALL_MOD:
        result = await dockerService.installMod(payload.containerName, payload.modFileName);
        break;

      case AgentCommandType.REMOVE_MOD:
        result = await dockerService.removeMod(payload.containerName, payload.modFileName);
        break;

      case AgentCommandType.GET_STATS:
        result = await monitoringService.getServerStats(payload.containerName);
        break;

      // File Management Operations
      case 'LIST_FILES' as any:
        result = await dockerService.listFiles(payload.containerName, payload.path);
        break;

      case 'READ_FILE' as any:
        result = await dockerService.readFile(payload.containerName, payload.filePath);
        break;

      case 'WRITE_FILE' as any:
        result = await dockerService.writeFile(payload.containerName, payload.filePath, payload.content);
        break;

      case 'DELETE_FILE' as any:
        result = await dockerService.deleteFile(payload.containerName, payload.filePath);
        break;

      case 'CREATE_DIRECTORY' as any:
        result = await dockerService.createDirectory(payload.containerName, payload.dirPath);
        break;

      case 'UPLOAD_FILE' as any:
        result = await dockerService.uploadFile(
          payload.containerName,
          payload.filePath,
          Buffer.from(payload.content, 'base64')
        );
        break;

      case 'DOWNLOAD_FILE' as any:
        result = await dockerService.downloadFile(payload.containerName, payload.filePath);
        break;

      case 'GET_FILE_INFO' as any:
        result = await dockerService.getFileInfo(payload.containerName, payload.filePath);
        break;

      default:
        result = {
          success: false,
          error: `Unknown command type: ${type}`
        };
    }

    res.json(result);
  } catch (error: any) {
    console.error('Command execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🤖 Host Agent running on port ${PORT}`);
  console.log(`📦 Docker service initialized`);

  // Start Heartbeat
  heartbeatService.start();
  console.log('💓 Heartbeat service started');

  // Start Monitoring
  monitoringService.start();
  console.log('📊 Monitoring service started');
});

export default app;
