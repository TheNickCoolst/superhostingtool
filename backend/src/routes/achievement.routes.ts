/**
 * Achievement Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { achievementService } from '../services/achievement.service';
import { logger } from '../lib/logger';

const router = express.Router();

/**
 * GET /api/achievements
 * Get all achievements with user progress
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const achievements = await achievementService.getAllAchievementsWithProgress(userId);
    res.json(achievements);
  } catch (error: any) {
    logger.error('Error fetching achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/achievements/user
 * Get user's achievement summary
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const summary = await achievementService.getUserAchievements(userId);
    res.json(summary);
  } catch (error: any) {
    logger.error('Error fetching user achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/achievements/user/:userId
 * Get another user's achievements
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const summary = await achievementService.getUserAchievements(userId);
    res.json(summary);
  } catch (error: any) {
    logger.error('Error fetching user achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/achievements/check
 * Check and unlock achievements for current user
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await achievementService.checkAchievements(userId);
    res.json({ success: true, message: 'Achievements checked' });
  } catch (error: any) {
    logger.error('Error checking achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/achievements/leaderboard
 * Get achievement leaderboard
 */
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await achievementService.getAchievementLeaderboard(limit);
    res.json(leaderboard);
  } catch (error: any) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/achievements/initialize (Admin only)
 * Initialize default achievements
 */
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await achievementService.initializeAchievements();
    res.json({ success: true, message: 'Achievements initialized' });
  } catch (error: any) {
    logger.error('Error initializing achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
