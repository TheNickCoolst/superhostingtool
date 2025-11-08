import { Request, Response, NextFunction } from 'express';
import { WebSocketService } from '../services/websocket.service';
import { WebSocketEvent } from '@minecraft-hosting/shared';
import { prisma } from '../lib/prisma';
import { ApiResponse } from '../lib/api-response';
import { ErrorFactory } from '../lib/errors';

/**
 * Stats Controller
 * Handles real-time statistics updates from agents
 */
export class StatsController {
  /**
   * Update server stats (called by agent)
   * POST /api/stats/update
   */
  async updateStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { containerName, stats } = req.body;

      if (!containerName || !stats) {
        throw ErrorFactory.validation('containerName and stats are required');
      }

      // Find server by container name
      const server = await prisma.minecraftServer.findFirst({
        where: { containerName },
        include: { user: true }
      });

      if (!server) {
        throw ErrorFactory.serverNotFound(containerName);
      }

      // Update or create ServerStats
      await prisma.serverStats.upsert({
        where: { serverId: server.id },
        update: {
          cpuUsage: stats.cpuUsage,
          ramUsage: Math.round(stats.ramUsage),
          lastUpdated: new Date()
        },
        create: {
          serverId: server.id,
          cpuUsage: stats.cpuUsage,
          ramUsage: Math.round(stats.ramUsage),
          lastUpdated: new Date()
        }
      });

      // Create ServerMetrics entry for historical data
      await prisma.serverMetrics.create({
        data: {
          serverId: server.id,
          cpuUsage: stats.cpuUsage,
          ramUsage: Math.round(stats.ramUsage),
          tps: stats.tps || 20.0,
          onlinePlayers: stats.onlinePlayers || 0,
          timestamp: new Date()
        }
      });

      // Broadcast stats update via WebSocket
      const wsService = WebSocketService.getInstance();
      wsService.broadcastToUser(server.userId, {
        event: WebSocketEvent.SERVER_STATS_UPDATE,
        data: {
          serverId: server.id,
          stats: {
            cpuUsage: stats.cpuUsage,
            ramUsage: Math.round(stats.ramUsage),
            tps: stats.tps || 20.0,
            onlinePlayers: stats.onlinePlayers || 0,
            uptime: stats.uptime || 0
          }
        }
      });

      return ApiResponse.success(res, { received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get server statistics
   * GET /api/stats/server/:serverId
   */
  async getServerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { serverId } = req.params;

      const stats = await prisma.serverStats.findUnique({
        where: { serverId }
      });

      if (!stats) {
        throw ErrorFactory.notFound('Stats', serverId);
      }

      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get historical metrics
   * GET /api/stats/server/:serverId/metrics
   */
  async getServerMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { serverId } = req.params;
      const { hours = 24 } = req.query;

      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours as string));

      const metrics = await prisma.serverMetrics.findMany({
        where: {
          serverId,
          timestamp: {
            gte: hoursAgo
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100 // Limit to 100 data points
      });

      return ApiResponse.success(res, {
        metrics,
        period: `${hours} hours`
      });
    } catch (error) {
      next(error);
    }
  }
}
