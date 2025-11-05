import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';

import authRoutes from './routes/auth.routes';
import serverRoutes from './routes/server.routes';
import hostRoutes from './routes/host.routes';
import modRoutes from './routes/mod.routes';
import backupRoutes from './routes/backup.routes';
import versionRoutes from './routes/version.routes';

import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { WebSocketService } from './services/websocket.service';
import { BackupScheduler } from './services/backup.scheduler';
import { HostHeartbeatService } from './services/host-heartbeat.service';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// ==================== Middleware ====================
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// ==================== Routes ====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/mods', modRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/versions', versionRoutes);

// ==================== Error Handling ====================
app.use(errorHandler);

// ==================== Start Server ====================
const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

// ==================== WebSocket Server ====================
const wss = new WebSocketServer({ port: parseInt(WS_PORT as string) });
const wsService = WebSocketService.getInstance(wss);

console.log(`🔌 WebSocket server running on port ${WS_PORT}`);

// ==================== Background Services ====================
const backupScheduler = new BackupScheduler();
backupScheduler.start();
console.log('📦 Backup scheduler started');

const heartbeatService = new HostHeartbeatService();
heartbeatService.start();
console.log('💓 Host heartbeat service started');

// ==================== Graceful Shutdown ====================
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  backupScheduler.stop();
  heartbeatService.stop();
});

export default app;
