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
import templateRoutes from './routes/template.routes';
import playerRoutes from './routes/player.routes';
import scheduledTaskRoutes from './routes/scheduled-task.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import fileRoutes from './routes/file.routes';

import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { WebSocketService } from './services/websocket.service';
import { BackupScheduler } from './services/backup.scheduler';
import { HostHeartbeatService } from './services/host-heartbeat.service';
import ScheduledTaskService from './services/scheduled-task.service';
import { validateEnvironment } from './lib/env-validation';

// Load environment variables
dotenv.config();

// Validate environment variables before starting the application
validateEnvironment();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// ==================== Middleware ====================
app.use(helmet());

// Configure CORS with environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
app.use('/api/templates', templateRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tasks', scheduledTaskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/files', fileRoutes);

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

// Initialize scheduled tasks
ScheduledTaskService.initializeTasks().then(() => {
  console.log('⏰ Scheduled tasks initialized');
}).catch((error) => {
  console.error('Failed to initialize scheduled tasks:', error);
});

// ==================== Graceful Shutdown ====================
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  backupScheduler.stop();
  heartbeatService.stop();
  ScheduledTaskService.stopAll();
});

export default app;
