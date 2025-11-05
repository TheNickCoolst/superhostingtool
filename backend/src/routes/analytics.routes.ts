import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import AnalyticsService from '../services/analytics.service';

const router = Router();

// Get metrics for a server
router.get('/server/:serverId/metrics', authenticate, async (req, res, next) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = await AnalyticsService.getMetrics(req.params.serverId, hours);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// Get aggregated statistics
router.get('/server/:serverId/stats', authenticate, async (req, res, next) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const stats = await AnalyticsService.getAggregatedStats(req.params.serverId, hours);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Get performance trends
router.get('/server/:serverId/trends', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const trends = await AnalyticsService.getPerformanceTrends(req.params.serverId, days);
    res.json(trends);
  } catch (error) {
    next(error);
  }
});

// Get console logs
router.get('/server/:serverId/logs', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const logs = await AnalyticsService.getConsoleLogs(req.params.serverId, limit, level);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Search console logs
router.get('/server/:serverId/logs/search', authenticate, async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const logs = await AnalyticsService.searchConsoleLogs(req.params.serverId, query, limit);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Get uptime statistics
router.get('/server/:serverId/uptime', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const uptime = await AnalyticsService.getUptimeStats(req.params.serverId, days);
    res.json(uptime);
  } catch (error) {
    next(error);
  }
});

export default router;
