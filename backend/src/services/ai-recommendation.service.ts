import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export class AIRecommendationService {
  // Analyze server and generate recommendations
  async analyzeServer(serverId: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: {
        stats: true,
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    });

    if (!server) throw new Error('Server not found');

    const recommendations: any[] = [];

    // Check RAM usage
    if (server.stats) {
      const ramUsagePercent = (server.stats.ramUsage / server.allocatedRam) * 100;

      if (ramUsagePercent > 90) {
        recommendations.push({
          serverId,
          type: 'RESOURCE_OPTIMIZATION',
          title: 'High RAM Usage Detected',
          description: `Your server is using ${ramUsagePercent.toFixed(1)}% of allocated RAM. Consider increasing RAM allocation to ${Math.ceil(server.allocatedRam * 1.5)}MB for better performance.`,
          impact: 'HIGH',
          confidence: 0.95,
          metadata: {
            currentRam: server.allocatedRam,
            suggestedRam: Math.ceil(server.allocatedRam * 1.5),
            usage: ramUsagePercent,
          },
        });
      } else if (ramUsagePercent < 30) {
        recommendations.push({
          serverId,
          type: 'COST_REDUCTION',
          title: 'RAM Over-Provisioned',
          description: `Your server is only using ${ramUsagePercent.toFixed(1)}% of allocated RAM. You could reduce RAM to ${Math.ceil(server.allocatedRam * 0.6)}MB to save costs without affecting performance.`,
          impact: 'MEDIUM',
          confidence: 0.85,
          metadata: {
            currentRam: server.allocatedRam,
            suggestedRam: Math.ceil(server.allocatedRam * 0.6),
            usage: ramUsagePercent,
          },
        });
      }

      // Check TPS
      if (server.stats.tps < 18) {
        recommendations.push({
          serverId,
          type: 'PERFORMANCE_TUNING',
          title: 'Low TPS Detected',
          description: `Your server is running at ${server.stats.tps.toFixed(1)} TPS (below optimal 20 TPS). This may cause lag. Consider reducing view distance, entity count, or upgrading CPU allocation.`,
          impact: 'CRITICAL',
          confidence: 0.98,
          metadata: {
            currentTps: server.stats.tps,
            targetTps: 20,
          },
        });
      }

      // Check CPU usage
      const cpuUsagePercent = (server.stats.cpuUsage / server.allocatedCpu) * 100;

      if (cpuUsagePercent > 85) {
        recommendations.push({
          serverId,
          type: 'RESOURCE_OPTIMIZATION',
          title: 'High CPU Usage',
          description: `CPU usage is at ${cpuUsagePercent.toFixed(1)}%. Consider increasing CPU allocation or optimizing plugins to prevent performance issues.`,
          impact: 'HIGH',
          confidence: 0.90,
          metadata: {
            currentCpu: server.allocatedCpu,
            suggestedCpu: server.allocatedCpu + 0.5,
            usage: cpuUsagePercent,
          },
        });
      }
    }

    // Check backups
    const backupCount = await prisma.backup.count({
      where: { serverId },
    });

    if (backupCount === 0) {
      recommendations.push({
        serverId,
        type: 'BACKUP_STRATEGY',
        title: 'No Backups Found',
        description: 'You have no backups for this server. We strongly recommend setting up automatic backups to prevent data loss.',
        impact: 'CRITICAL',
        confidence: 1.0,
        metadata: {
          backupCount: 0,
        },
      });
    } else if (backupCount < 3) {
      recommendations.push({
        serverId,
        type: 'BACKUP_STRATEGY',
        title: 'Limited Backup Coverage',
        description: `You only have ${backupCount} backup(s). Consider increasing backup frequency for better data protection.`,
        impact: 'MEDIUM',
        confidence: 0.85,
        metadata: {
          backupCount,
        },
      });
    }

    // Check player retention
    const analytics = await prisma.playerAnalytics.findMany({
      where: { serverId },
      orderBy: { date: 'desc' },
      take: 7,
    });

    if (analytics.length >= 7) {
      const avgChurnRate = analytics.reduce((sum, a) => sum + (a.churnRate || 0), 0) / analytics.length;

      if (avgChurnRate > 30) {
        recommendations.push({
          serverId,
          type: 'PLAYER_RETENTION',
          title: 'High Player Churn Rate',
          description: `Your 7-day churn rate is ${avgChurnRate.toFixed(1)}%. Consider adding more engaging content, events, or plugins to improve player retention.`,
          impact: 'HIGH',
          confidence: 0.80,
          metadata: {
            churnRate: avgChurnRate,
          },
        });
      }
    }

    // Check security
    if (!server.enableWhitelist && server.maxPlayers > 10) {
      recommendations.push({
        serverId,
        type: 'SECURITY_IMPROVEMENT',
        title: 'Whitelist Not Enabled',
        description: 'Your server is public without whitelist protection. Consider enabling whitelist or adding protection plugins to prevent griefing.',
        impact: 'MEDIUM',
        confidence: 0.70,
        metadata: {},
      });
    }

    // Save recommendations
    for (const rec of recommendations) {
      await prisma.aIRecommendation.create({
        data: rec,
      });
    }

    return recommendations;
  }

  // Get recommendations for server
  async getRecommendations(serverId: string, options?: {
    includeApplied?: boolean;
    includeDismissed?: boolean;
  }) {
    const where: any = { serverId };

    if (!options?.includeApplied) {
      where.applied = false;
    }

    if (!options?.includeDismissed) {
      where.dismissed = false;
    }

    return prisma.aIRecommendation.findMany({
      where,
      orderBy: [
        { impact: 'desc' },
        { confidence: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // Apply recommendation
  async applyRecommendation(recommendationId: string) {
    return prisma.aIRecommendation.update({
      where: { id: recommendationId },
      data: {
        applied: true,
        appliedAt: new Date(),
      },
    });
  }

  // Dismiss recommendation
  async dismissRecommendation(recommendationId: string) {
    return prisma.aIRecommendation.update({
      where: { id: recommendationId },
      data: {
        dismissed: true,
      },
    });
  }

  // Auto-analyze all servers
  async autoAnalyzeAllServers() {
    const servers = await prisma.minecraftServer.findMany({
      where: {
        status: 'RUNNING',
      },
    });

    logger.info(`Auto-analyzing ${servers.length} servers`);

    for (const server of servers) {
      try {
        await this.analyzeServer(server.id);
      } catch (error) {
        logger.error(`Failed to analyze server ${server.id}`, { error });
      }
    }
  }
}

export const aiRecommendationService = new AIRecommendationService();
