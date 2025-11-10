import prisma from '../lib/prisma.singleton';
import { AgentService } from './agent.service';
import { logger } from '../lib/logger';

/**
 * Health Check Service
 * Monitors server health and automatically takes action on failures
 */

export interface HealthCheckResult {
  serverId: string;
  healthy: boolean;
  checks: {
    containerRunning: boolean;
    memoryUsage: number;
    cpuUsage: number;
    diskSpace: number;
    responsive: boolean;
  };
  issues: string[];
  timestamp: Date;
}

export class HealthCheckService {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

  /**
   * Start the health check service
   */
  start(): void {
    if (this.checkInterval) {
      logger.warn('Health check service already running');
      return;
    }

    logger.info('Starting health check service');

    this.checkInterval = setInterval(() => {
      this.performHealthChecks().catch((error) => {
        logger.error('Health check failed', error);
      });
    }, this.CHECK_INTERVAL_MS);

    // Run first check immediately
    this.performHealthChecks().catch((error) => {
      logger.error('Initial health check failed', error);
    });
  }

  /**
   * Stop the health check service
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Health check service stopped');
    }
  }

  /**
   * Perform health checks on all running servers
   */
  private async performHealthChecks(): Promise<void> {
    const runningServers = await prisma.minecraftServer.findMany({
      where: {
        status: MinecraftServerStatus.RUNNING,
      },
    });

    logger.debug(`Performing health checks on ${runningServers.length} servers`);

    const checks = runningServers.map((server) =>
      this.checkServerHealth(server.id).catch((error) => {
        logger.error(`Health check failed for server ${server.id}`, error);
        return null;
      })
    );

    const results = await Promise.all(checks);

    // Process results and take action
    for (const result of results) {
      if (result && !result.healthy) {
        await this.handleUnhealthyServer(result);
      }
    }
  }

  /**
   * Check health of a specific server
   */
  async checkServerHealth(serverId: string): Promise<HealthCheckResult> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const issues: string[] = [];
    const checks = {
      containerRunning: false,
      memoryUsage: 0,
      cpuUsage: 0,
      diskSpace: 0,
      responsive: false,
    };

    try {
      // 1. Check if container is running
      const stats = await AgentService.getServerStats(server.hostId, server.containerName);
      checks.containerRunning = stats.status === 'running';

      if (!checks.containerRunning) {
        issues.push('Container is not running');
      }

      // 2. Check memory usage
      checks.memoryUsage = stats.memoryUsage;
      if (stats.memoryUsage > 95) {
        issues.push(`Memory usage critical: ${stats.memoryUsage.toFixed(1)}%`);
      } else if (stats.memoryUsage > 85) {
        issues.push(`Memory usage high: ${stats.memoryUsage.toFixed(1)}%`);
      }

      // 3. Check CPU usage
      checks.cpuUsage = stats.cpuUsage;
      if (stats.cpuUsage > 95) {
        issues.push(`CPU usage critical: ${stats.cpuUsage.toFixed(1)}%`);
      } else if (stats.cpuUsage > 85) {
        issues.push(`CPU usage high: ${stats.cpuUsage.toFixed(1)}%`);
      }

      // 4. Check disk space
      checks.diskSpace = stats.diskUsage || 0;
      if (checks.diskSpace > 90) {
        issues.push(`Disk space critical: ${checks.diskSpace.toFixed(1)}%`);
      } else if (checks.diskSpace > 80) {
        issues.push(`Disk space high: ${checks.diskSpace.toFixed(1)}%`);
      }

      // 5. Check server responsiveness (TPS)
      checks.responsive = stats.tps ? stats.tps > 15 : false;
      if (!checks.responsive && stats.tps) {
        issues.push(`Server lagging: TPS ${stats.tps.toFixed(1)}/20`);
      }
    } catch (error) {
      issues.push(`Failed to get server stats: ${error}`);
    }

    const result: HealthCheckResult = {
      serverId: server.id,
      healthy: issues.length === 0,
      checks,
      issues,
      timestamp: new Date(),
    };

    // Store health check result
    await this.storeHealthCheckResult(result);

    return result;
  }

  /**
   * Store health check result in database
   */
  private async storeHealthCheckResult(result: HealthCheckResult): Promise<void> {
    await prisma.serverStats.create({
      data: {
        serverId: result.serverId,
        cpuUsage: result.checks.cpuUsage,
        memoryUsage: result.checks.memoryUsage,
        diskUsage: result.checks.diskSpace,
        playerCount: 0, // Would need to fetch from stats
        tps: result.checks.responsive ? 20 : 0,
        timestamp: result.timestamp,
      },
    });
  }

  /**
   * Handle unhealthy server (automatic remediation)
   */
  private async handleUnhealthyServer(result: HealthCheckResult): Promise<void> {
    logger.warn('Unhealthy server detected', {
      serverId: result.serverId,
      issues: result.issues,
    });

    const server = await prisma.minecraftServer.findUnique({
      where: { id: result.serverId },
      include: { user: true },
    });

    if (!server) {
      return;
    }

    // Critical issues that require immediate action
    const criticalIssues = result.issues.filter((issue) => issue.includes('critical'));

    if (criticalIssues.length > 0) {
      logger.error('Critical issues detected', {
        serverId: result.serverId,
        issues: criticalIssues,
      });

      // Automatic remediation actions
      if (result.issues.some((i) => i.includes('Memory usage critical'))) {
        // Could automatically restart server or increase memory
        logger.info('Considering automatic server restart due to memory issues', {
          serverId: result.serverId,
        });
      }

      if (!result.checks.containerRunning) {
        // Automatically restart container
        logger.info('Attempting to restart unresponsive container', {
          serverId: result.serverId,
        });

        try {
          await AgentService.startServer(server.hostId, server.containerName);
          logger.info('Container restarted successfully', { serverId: result.serverId });
        } catch (error) {
          logger.error('Failed to restart container', error);
        }
      }
    }

    // TODO: Send notifications to server owner
    // await NotificationService.sendHealthAlert(server.userId, result);
  }

  /**
   * Get health history for a server
   */
  async getHealthHistory(
    serverId: string,
    hours: number = 24
  ): Promise<HealthCheckResult[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await prisma.serverStats.findMany({
      where: {
        serverId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });

    return stats.map((stat) => ({
      serverId: stat.serverId,
      healthy: stat.cpuUsage < 85 && stat.memoryUsage < 85,
      checks: {
        containerRunning: true,
        memoryUsage: stat.memoryUsage,
        cpuUsage: stat.cpuUsage,
        diskSpace: stat.diskUsage || 0,
        responsive: stat.tps ? stat.tps > 15 : false,
      },
      issues: [],
      timestamp: stat.timestamp,
    }));
  }

  /**
   * Get current health status of all user's servers
   */
  async getUserServersHealth(userId: string): Promise<HealthCheckResult[]> {
    const servers = await prisma.minecraftServer.findMany({
      where: { userId },
    });

    const healthChecks = await Promise.all(
      servers.map((server) =>
        this.checkServerHealth(server.id).catch((error) => {
          logger.error(`Failed to check health for server ${server.id}`, error);
          return null;
        })
      )
    );

    return healthChecks.filter((check): check is HealthCheckResult => check !== null);
  }
}

export default new HealthCheckService();
