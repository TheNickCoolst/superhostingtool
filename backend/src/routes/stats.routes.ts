import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { authenticateAgent } from '../middleware/auth.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const statsController = new StatsController();

// Agent endpoint (requires agent API key)
router.post('/update', authenticateAgent, statsController.updateStats);

// User endpoints (requires user authentication)
router.get('/server/:serverId', authenticate, statsController.getServerStats);
router.get('/server/:serverId/metrics', authenticate, statsController.getServerMetrics);

export default router;
