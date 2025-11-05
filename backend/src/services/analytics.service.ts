import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  // Store server metrics
  async recordMetrics(serverId: string, metrics: {
    cpuUsage: number;
    ramUsage: number;
    diskUsage?: number;
    tps: number;
    onlinePlayers: number;
    chunks?: number;
    entities?: number;
    tileEntities?: number;
  }) {
    return prisma.serverMetrics.create({
      data: {
        serverId,
        ...metrics
      }
    });
  }

  // Get metrics for a time range
  async getMetrics(serverId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return prisma.serverMetrics.findMany({
      where: {
        serverId,
        timestamp: {
          gte: since
        }
      },
      orderBy: { timestamp: 'asc' }
    });
  }

  // Get aggregated statistics
  async getAggregatedStats(serverId: string, hours: number = 24) {
    const metrics = await this.getMetrics(serverId, hours);

    if (metrics.length === 0) {
      return null;
    }

    const cpuValues = metrics.map(m => m.cpuUsage);
    const ramValues = metrics.map(m => m.ramUsage);
    const tpsValues = metrics.map(m => m.tps);
    const playerValues = metrics.map(m => m.onlinePlayers);

    return {
      cpu: {
        avg: this.average(cpuValues),
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
        current: cpuValues[cpuValues.length - 1]
      },
      ram: {
        avg: this.average(ramValues),
        min: Math.min(...ramValues),
        max: Math.max(...ramValues),
        current: ramValues[ramValues.length - 1]
      },
      tps: {
        avg: this.average(tpsValues),
        min: Math.min(...tpsValues),
        max: Math.max(...tpsValues),
        current: tpsValues[tpsValues.length - 1]
      },
      players: {
        avg: this.average(playerValues),
        min: Math.min(...playerValues),
        max: Math.max(...playerValues),
        current: playerValues[playerValues.length - 1]
      },
      dataPoints: metrics.length,
      timeRange: hours
    };
  }

  // Get performance trends
  async getPerformanceTrends(serverId: string, days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const metrics = await prisma.serverMetrics.findMany({
      where: {
        serverId,
        timestamp: {
          gte: since
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Group by day
    const dailyStats: any = {};

    for (const metric of metrics) {
      const date = metric.timestamp.toISOString().split('T')[0];

      if (!dailyStats[date]) {
        dailyStats[date] = {
          cpu: [],
          ram: [],
          tps: [],
          players: []
        };
      }

      dailyStats[date].cpu.push(metric.cpuUsage);
      dailyStats[date].ram.push(metric.ramUsage);
      dailyStats[date].tps.push(metric.tps);
      dailyStats[date].players.push(metric.onlinePlayers);
    }

    // Calculate daily averages
    const trends = Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
      date,
      avgCpu: this.average(stats.cpu),
      avgRam: this.average(stats.ram),
      avgTps: this.average(stats.tps),
      avgPlayers: this.average(stats.players),
      maxCpu: Math.max(...stats.cpu),
      maxRam: Math.max(...stats.ram),
      minTps: Math.min(...stats.tps),
      maxPlayers: Math.max(...stats.players)
    }));

    return trends;
  }

  // Store console log
  async storeConsoleLog(serverId: string, message: string, level: string = 'INFO') {
    return prisma.consoleLog.create({
      data: {
        serverId,
        message,
        level: level as any
      }
    });
  }

  // Get console logs
  async getConsoleLogs(serverId: string, limit: number = 100, level?: string) {
    return prisma.consoleLog.findMany({
      where: {
        serverId,
        ...(level ? { level: level as any } : {})
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  // Search console logs
  async searchConsoleLogs(serverId: string, query: string, limit: number = 100) {
    return prisma.consoleLog.findMany({
      where: {
        serverId,
        message: {
          contains: query,
          mode: 'insensitive'
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  // Clean old metrics (retention policy)
  async cleanOldMetrics(daysToKeep: number = 30) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const deletedMetrics = await prisma.serverMetrics.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    const deletedLogs = await prisma.consoleLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    return {
      deletedMetrics: deletedMetrics.count,
      deletedLogs: deletedLogs.count
    };
  }

  // Helper: Calculate average
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Get server uptime statistics
  async getUptimeStats(serverId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // This is simplified - in production you'd track actual uptime events
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { stats: true }
    });

    if (!server || !server.stats) {
      return null;
    }

    return {
      currentUptime: server.stats.uptime,
      status: server.status,
      lastStarted: server.lastStarted,
      // Additional uptime metrics could be calculated from ServerMetrics records
    };
  }
}

export default new AnalyticsService();
