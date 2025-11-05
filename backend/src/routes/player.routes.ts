import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import PlayerManagementService from '../services/player-management.service';

const router = Router();

// ==================== Whitelist Routes ====================

// Get whitelist for a server
router.get('/:serverId/whitelist', authenticate, async (req, res, next) => {
  try {
    const whitelist = await PlayerManagementService.getWhitelist(req.params.serverId);
    res.json(whitelist);
  } catch (error) {
    next(error);
  }
});

// Add player to whitelist
router.post('/:serverId/whitelist', authenticate, async (req, res, next) => {
  try {
    const { playerName, playerUuid } = req.body;
    const entry = await PlayerManagementService.addToWhitelist(
      req.params.serverId,
      playerName,
      playerUuid
    );
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// Remove player from whitelist
router.delete('/:serverId/whitelist/:playerName', authenticate, async (req, res, next) => {
  try {
    await PlayerManagementService.removeFromWhitelist(
      req.params.serverId,
      req.params.playerName
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== Ban Routes ====================

// Get bans for a server
router.get('/:serverId/bans', authenticate, async (req, res, next) => {
  try {
    const bans = await PlayerManagementService.getBans(req.params.serverId);
    res.json(bans);
  } catch (error) {
    next(error);
  }
});

// Ban a player
router.post('/:serverId/bans', authenticate, async (req, res, next) => {
  try {
    const { playerName, reason, expiresAt } = req.body;
    const ban = await PlayerManagementService.banPlayer(
      req.params.serverId,
      playerName,
      reason,
      (req as any).user.username,
      expiresAt ? new Date(expiresAt) : undefined
    );
    res.status(201).json(ban);
  } catch (error) {
    next(error);
  }
});

// Unban a player
router.delete('/:serverId/bans/:playerName', authenticate, async (req, res, next) => {
  try {
    await PlayerManagementService.unbanPlayer(
      req.params.serverId,
      req.params.playerName
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== Operator Routes ====================

// Get operators for a server
router.get('/:serverId/operators', authenticate, async (req, res, next) => {
  try {
    const operators = await PlayerManagementService.getOperators(req.params.serverId);
    res.json(operators);
  } catch (error) {
    next(error);
  }
});

// Add operator
router.post('/:serverId/operators', authenticate, async (req, res, next) => {
  try {
    const { playerName, playerUuid, level } = req.body;
    const operator = await PlayerManagementService.addOperator(
      req.params.serverId,
      playerName,
      playerUuid,
      level
    );
    res.status(201).json(operator);
  } catch (error) {
    next(error);
  }
});

// Remove operator
router.delete('/:serverId/operators/:playerName', authenticate, async (req, res, next) => {
  try {
    await PlayerManagementService.removeOperator(
      req.params.serverId,
      req.params.playerName
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
