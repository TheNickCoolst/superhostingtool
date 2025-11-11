/**
 * Social Routes (Friends, Guilds, Chat)
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { socialService } from '../services/social.service';
import { logger } from '../lib/logger';

const router = express.Router();

// ==================== FRIENDS ====================

/**
 * GET /api/social/friends
 * Get user's friends
 */
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const friends = await socialService.getFriends(userId);
    res.json(friends);
  } catch (error: any) {
    logger.error('Error fetching friends:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/friends/requests
 * Get pending friend requests
 */
router.get('/friends/requests', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const requests = await socialService.getPendingRequests(userId);
    res.json(requests);
  } catch (error: any) {
    logger.error('Error fetching friend requests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/friends/request
 * Send friend request
 */
router.post('/friends/request', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { friendId } = req.body;

    const friendship = await socialService.sendFriendRequest(userId, friendId);
    res.json(friendship);
  } catch (error: any) {
    logger.error('Error sending friend request:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/social/friends/:friendshipId/accept
 * Accept friend request
 */
router.post('/friends/:friendshipId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { friendshipId } = req.params;

    const friendship = await socialService.acceptFriendRequest(userId, friendshipId);
    res.json(friendship);
  } catch (error: any) {
    logger.error('Error accepting friend request:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/social/friends/:friendshipId
 * Remove friend or decline request
 */
router.delete('/friends/:friendshipId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { friendshipId } = req.params;

    const result = await socialService.removeFriend(userId, friendshipId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error removing friend:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== GUILDS ====================

/**
 * GET /api/social/guilds/search
 * Search guilds
 */
router.get('/guilds/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q as string || '';
    const guilds = await socialService.searchGuilds(query);
    res.json(guilds);
  } catch (error: any) {
    logger.error('Error searching guilds:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/guilds/my
 * Get user's guild
 */
router.get('/guilds/my', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const guild = await socialService.getUserGuild(userId);
    res.json(guild);
  } catch (error: any) {
    logger.error('Error fetching user guild:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/guilds/:guildId
 * Get guild details
 */
router.get('/guilds/:guildId', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = await socialService.getGuild(guildId);
    res.json(guild);
  } catch (error: any) {
    logger.error('Error fetching guild:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/guilds
 * Create guild
 */
router.post('/guilds', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const guild = await socialService.createGuild(userId, req.body);
    res.json(guild);
  } catch (error: any) {
    logger.error('Error creating guild:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/social/guilds/:guildId/join
 * Join guild
 */
router.post('/guilds/:guildId/join', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { guildId } = req.params;

    const member = await socialService.joinGuild(userId, guildId);
    res.json(member);
  } catch (error: any) {
    logger.error('Error joining guild:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/social/guilds/:guildId/leave
 * Leave guild
 */
router.post('/guilds/:guildId/leave', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { guildId } = req.params;

    const result = await socialService.leaveGuild(userId, guildId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error leaving guild:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/social/guilds/:guildId/members/:memberId/role
 * Update member role
 */
router.put('/guilds/:guildId/members/:memberId/role', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { guildId, memberId } = req.params;
    const { role } = req.body;

    const member = await socialService.updateMemberRole(userId, guildId, memberId, role);
    res.json(member);
  } catch (error: any) {
    logger.error('Error updating member role:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/social/guilds/:guildId/members/:memberId
 * Kick member from guild
 */
router.delete('/guilds/:guildId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { guildId, memberId } = req.params;

    const result = await socialService.kickMember(userId, guildId, memberId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error kicking member:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/social/guilds/:guildId/servers
 * Add server to guild
 */
router.post('/guilds/:guildId/servers', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { guildId } = req.params;
    const { serverId } = req.body;

    const guildServer = await socialService.addServerToGuild(userId, guildId, serverId);
    res.json(guildServer);
  } catch (error: any) {
    logger.error('Error adding server to guild:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/social/guilds/:guildId/servers/:serverId
 * Remove server from guild
 */
router.delete('/guilds/:guildId/servers/:serverId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { guildId, serverId } = req.params;

    const result = await socialService.removeServerFromGuild(userId, guildId, serverId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error removing server from guild:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== CHAT ====================

/**
 * GET /api/social/chat/direct/:userId
 * Get direct messages with a user
 */
router.get('/chat/direct/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = (req as any).user.id;
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await socialService.getDirectMessages(currentUserId, userId, limit);
    res.json(messages);
  } catch (error: any) {
    logger.error('Error fetching direct messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/chat/guild/:guildId
 * Get guild messages
 */
router.get('/chat/guild/:guildId', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const messages = await socialService.getGuildMessages(guildId, limit);
    res.json(messages);
  } catch (error: any) {
    logger.error('Error fetching guild messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/chat/send
 * Send message
 */
router.post('/chat/send', authenticateToken, async (req, res) => {
  try {
    const senderId = (req as any).user.id;
    const { recipientId, guildId, content } = req.body;

    const message = await socialService.sendMessage(senderId, recipientId, guildId, content);
    res.json(message);
  } catch (error: any) {
    logger.error('Error sending message:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/social/chat/mark-read/:senderId
 * Mark messages as read
 */
router.post('/chat/mark-read/:senderId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { senderId } = req.params;

    const result = await socialService.markMessagesAsRead(userId, senderId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/chat/unread
 * Get unread message count
 */
router.get('/chat/unread', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const count = await socialService.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
