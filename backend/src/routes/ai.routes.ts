/**
 * AI & Automation Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { aiRecommendationService } from '../services/ai-recommendation.service';
import { anomalyDetectionService } from '../services/anomaly-detection.service';
import { autoScalingService } from '../services/auto-scaling.service';
import { logger } from '../lib/logger';

const router = express.Router();

// ==================== AI RECOMMENDATIONS ====================

/**
 * GET /api/ai/recommendations/:serverId
 * Get AI recommendations for a server
 */
router.get('/recommendations/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const onlyActive = req.query.active !== 'false';

    const recommendations = await aiRecommendationService.getRecommendations(serverId, onlyActive);
    res.json(recommendations);
  } catch (error: any) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/recommendations/:serverId/analyze
 * Trigger analysis for a server
 */
router.post('/recommendations/:serverId/analyze', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    await aiRecommendationService.analyzeServerAndGenerateRecommendations(serverId);
    res.json({ success: true, message: 'Analysis completed' });
  } catch (error: any) {
    logger.error('Error analyzing server:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/recommendations/:id/apply
 * Mark recommendation as applied
 */
router.post('/recommendations/:id/apply', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const recommendation = await aiRecommendationService.applyRecommendation(id);
    res.json(recommendation);
  } catch (error: any) {
    logger.error('Error applying recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANOMALY DETECTION ====================

/**
 * GET /api/ai/anomalies/:serverId
 * Get active anomalies for a server
 */
router.get('/anomalies/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const anomalies = await anomalyDetectionService.getActiveAnomalies(serverId);
    res.json(anomalies);
  } catch (error: any) {
    logger.error('Error fetching anomalies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/anomalies/:serverId/stats
 * Get anomaly statistics
 */
router.get('/anomalies/:serverId/stats', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const stats = await anomalyDetectionService.getAnomalyStatistics(serverId, days);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching anomaly stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/anomalies/:id/resolve
 * Resolve an anomaly
 */
router.post('/anomalies/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const anomaly = await anomalyDetectionService.resolveAnomaly(id);
    res.json(anomaly);
  } catch (error: any) {
    logger.error('Error resolving anomaly:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTO-SCALING ====================

/**
 * GET /api/ai/autoscaling/:serverId
 * Get auto-scaling policy
 */
router.get('/autoscaling/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const policy = await autoScalingService.getPolicy(serverId);
    res.json(policy);
  } catch (error: any) {
    logger.error('Error fetching auto-scaling policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ai/autoscaling/:serverId
 * Update auto-scaling policy
 */
router.put('/autoscaling/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const policy = await autoScalingService.updatePolicy(serverId, req.body);
    res.json(policy);
  } catch (error: any) {
    logger.error('Error updating auto-scaling policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/autoscaling/:serverId/start
 * Start auto-scaling
 */
router.post('/autoscaling/:serverId/start', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    await autoScalingService.startAutoScaling(serverId);
    res.json({ success: true, message: 'Auto-scaling started' });
  } catch (error: any) {
    logger.error('Error starting auto-scaling:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/autoscaling/:serverId/stop
 * Stop auto-scaling
 */
router.post('/autoscaling/:serverId/stop', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    autoScalingService.stopAutoScaling(serverId);
    res.json({ success: true, message: 'Auto-scaling stopped' });
  } catch (error: any) {
    logger.error('Error stopping auto-scaling:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/autoscaling/:serverId/history
 * Get scaling history
 */
router.get('/autoscaling/:serverId/history', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await autoScalingService.getScalingHistory(serverId, limit);
    res.json(history);
  } catch (error: any) {
    logger.error('Error fetching scaling history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
