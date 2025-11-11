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
import serverAdvancedRoutes from './routes/server-advanced.routes';
import aiRoutes from './routes/ai.routes';
import achievementRoutes from './routes/achievement.routes';
import socialRoutes from './routes/social.routes';
import marketplaceRoutes from './routes/marketplace.routes';

import { errorHandler, AppError } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { WebSocketService } from './services/websocket.service';
import { BackupScheduler } from './services/backup.scheduler';
import { HostHeartbeatService } from './services/host-heartbeat.service';
import ScheduledTaskService from './services/scheduled-task.service';
import HealthCheckService from './services/health-check.service';
import { validateEnvironment, getEnv, getEnvNumber } from './lib/env-validation';
import { logger } from './lib/logger';

// Load environment variables
dotenv.config();

// Validate environment variables before starting the application
validateEnvironment();

const app: Application = express();
const PORT = getEnvNumber('PORT', 3000);
const WS_PORT = getEnvNumber('WS_PORT', 3001);

// ==================== Middleware ====================
app.use(helmet());

// Configure CORS with environment variables
const allowedOrigins = getEnv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',').map(origin => origin.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin });
      callback(new AppError(`Origin ${origin} is not allowed by CORS policy`, 403));
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
app.use('/api/servers/advanced', serverAdvancedRoutes);

// New innovative features
app.use('/api/ai', aiRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// ==================== Error Handling ====================
app.use(errorHandler);

// ==================== Start Server ====================
const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  logger.info('Backend server started', { port: PORT, environment: getEnv('NODE_ENV') });
});

// ==================== WebSocket Server ====================
const wss = new WebSocketServer({ port: WS_PORT });
const wsService = WebSocketService.getInstance(wss);

logger.info('WebSocket server started', { port: WS_PORT });

// ==================== Background Services ====================
const backupScheduler = new BackupScheduler();
backupScheduler.start();
logger.info('Backup scheduler started');

const heartbeatService = new HostHeartbeatService();
heartbeatService.start();
logger.info('Host heartbeat service started');

// Start health check service
HealthCheckService.start();
logger.info('Health check service started');

// Initialize scheduled tasks
ScheduledTaskService.initializeTasks().then(() => {
  logger.info('Scheduled tasks initialized');
}).catch((error) => {
  logger.error('Failed to initialize scheduled tasks', error);
});

// ==================== Graceful Shutdown ====================
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received, initiating graceful shutdown');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  backupScheduler.stop();
  heartbeatService.stop();
  HealthCheckService.stop();
  ScheduledTaskService.stopAll();
});

export default app;
