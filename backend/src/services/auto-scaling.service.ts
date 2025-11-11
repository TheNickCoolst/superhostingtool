/**
 * Auto-Scaling Service
 * Automatically adjusts server resources based on usage patterns and policies
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { agentService } from './agent.service';

const prisma = new PrismaClient();

interface ScalingDecision {
  shouldScale: boolean;
  action: 'scale_up' | 'scale_down' | 'none';
  newRam?: number;
  newCpu?: number;
  reason: string;
}

export class AutoScalingService {
  private readonly CHECK_INTERVAL = 60 * 1000; // 1 minute
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start auto-scaling for a server
   */
  async startAutoScaling(serverId: string): Promise<void> {
    const policy = await this.getOrCreatePolicy(serverId);

    if (!policy.enabled) {
      logger.info(`Auto-scaling is disabled for server ${serverId}`);
      return;
    }

    // Stop existing interval if any
    this.stopAutoScaling(serverId);

    // Start new monitoring interval
    const interval = setInterval(async () => {
      await this.evaluateAndScale(serverId);
    }, this.CHECK_INTERVAL);

    this.intervals.set(serverId, interval);
    logger.info(`Auto-scaling started for server ${serverId}`);
  }

  /**
   * Stop auto-scaling for a server
   */
  stopAutoScaling(serverId: string): void {
    const interval = this.intervals.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(serverId);
      logger.info(`Auto-scaling stopped for server ${serverId}`);
    }
  }

  /**
   * Get or create auto-scaling policy for a server
   */
  private async getOrCreatePolicy(serverId: string) {
    let policy = await prisma.autoScalingPolicy.findUnique({
      where: { serverId }
    });

    if (!policy) {
      const server = await prisma.minecraftServer.findUnique({
        where: { id: serverId }
      });

      if (!server) throw new Error('Server not found');

      policy = await prisma.autoScalingPolicy.create({
        data: {
          serverId,
          minRam: Math.floor(server.allocatedRam * 0.5),
          maxRam: Math.floor(server.allocatedRam * 2),
          minCpu: Math.max(1, server.allocatedCpu * 0.5),
          maxCpu: server.allocatedCpu * 2,
          enabled: false // Disabled by default
        }
      });
    }

    return policy;
  }

  /**
   * Evaluate metrics and scale if needed
   */
  private async evaluateAndScale(serverId: string): Promise<void> {
    try {
      const policy = await prisma.autoScalingPolicy.findUnique({
        where: { serverId }
      });

      if (!policy || !policy.enabled) return;

      // Check cooldown period
      if (policy.lastScalingAction) {
        const timeSinceLastScale = Date.now() - policy.lastScalingAction.getTime();
        if (timeSinceLastScale < policy.cooldownPeriod * 1000) {
          logger.debug(`Cooldown period active for server ${serverId}`);
          return;
        }
      }

      const server = await prisma.minecraftServer.findUnique({
        where: { id: serverId },
        include: { stats: true }
      });

      if (!server || !server.stats) return;

      // Get recent metrics for more accurate decision
      const recentMetrics = await this.getRecentMetrics(serverId, 5);
      if (recentMetrics.length < 3) return; // Need at least 3 data points

      const decision = await this.makeScalingDecision(server, server.stats, recentMetrics, policy);

      if (decision.shouldScale && decision.action !== 'none') {
        await this.executeScaling(serverId, decision);
      }
    } catch (error) {
      logger.error(`Error in auto-scaling for server ${serverId}:`, error);
    }
  }

  /**
   * Get recent metrics for analysis
   */
  private async getRecentMetrics(serverId: string, count: number) {
    return prisma.serverMetrics.findMany({
      where: { serverId },
      orderBy: { timestamp: 'desc' },
      take: count
    });
  }

  /**
   * Make scaling decision based on metrics
   */
  private async makeScalingDecision(
    server: any,
    currentStats: any,
    recentMetrics: any[],
    policy: any
  ): Promise<ScalingDecision> {
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
    const avgRamUsage = recentMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / recentMetrics.length;

    const ramUsagePercent = (avgRamUsage / server.allocatedRam) * 100;
    const cpuUsagePercent = avgCpuUsage;

    // Check for scale up conditions
    if (ramUsagePercent > policy.scaleUpThreshold || cpuUsagePercent > policy.scaleUpThreshold) {
      const newRam = Math.min(
        policy.maxRam,
        Math.ceil(server.allocatedRam * 1.3) // 30% increase
      );
      const newCpu = Math.min(
        policy.maxCpu,
        Math.ceil(server.allocatedCpu * 1.3 * 10) / 10 // 30% increase, rounded to 0.1
      );

      if (newRam > server.allocatedRam || newCpu > server.allocatedCpu) {
        return {
          shouldScale: true,
          action: 'scale_up',
          newRam,
          newCpu,
          reason: `High resource usage detected: RAM ${ramUsagePercent.toFixed(1)}%, CPU ${cpuUsagePercent.toFixed(1)}%`
        };
      }
    }

    // Check for scale down conditions (more conservative)
    if (ramUsagePercent < policy.scaleDownThreshold && cpuUsagePercent < policy.scaleDownThreshold) {
      const newRam = Math.max(
        policy.minRam,
        Math.floor(avgRamUsage * 1.5) // 50% buffer above usage
      );
      const newCpu = Math.max(
        policy.minCpu,
        Math.ceil((server.allocatedCpu * (cpuUsagePercent / 100) * 1.5) * 10) / 10
      );

      if (newRam < server.allocatedRam * 0.8 || newCpu < server.allocatedCpu * 0.8) {
        // Only scale down if it's at least 20% reduction
        return {
          shouldScale: true,
          action: 'scale_down',
          newRam,
          newCpu,
          reason: `Low resource utilization: RAM ${ramUsagePercent.toFixed(1)}%, CPU ${cpuUsagePercent.toFixed(1)}%`
        };
      }
    }

    return {
      shouldScale: false,
      action: 'none',
      reason: 'Resource usage within acceptable range'
    };
  }

  /**
   * Execute scaling action
   */
  private async executeScaling(serverId: string, decision: ScalingDecision): Promise<void> {
    try {
      const server = await prisma.minecraftServer.findUnique({
        where: { id: serverId }
      });

      if (!server) return;

      logger.info(`Executing ${decision.action} for server ${serverId}: ${decision.reason}`);

      // Update server resources
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: {
          allocatedRam: decision.newRam || server.allocatedRam,
          allocatedCpu: decision.newCpu || server.allocatedCpu
        }
      });

      // Call agent to apply changes
      await agentService.updateServerResources(
        server.hostId,
        server.containerName,
        decision.newRam || server.allocatedRam,
        decision.newCpu || server.allocatedCpu
      );

      // Update policy last scaling action
      await prisma.autoScalingPolicy.update({
        where: { serverId },
        data: {
          lastScalingAction: new Date()
        }
      });

      // Create activity log
      await prisma.activityFeed.create({
        data: {
          userId: server.userId,
          activityType: 'SERVER_STARTED', // Reusing existing type, ideally add SERVER_SCALED
          title: `Auto-scaled server ${server.name}`,
          description: `${decision.action}: RAM ${decision.newRam}MB, CPU ${decision.newCpu} cores. ${decision.reason}`,
          isPublic: false
        }
      });

      logger.info(`Successfully scaled server ${serverId}`);
    } catch (error) {
      logger.error(`Error executing scaling for server ${serverId}:`, error);
    }
  }

  /**
   * Update auto-scaling policy
   */
  async updatePolicy(serverId: string, updates: Partial<{
    enabled: boolean;
    minRam: number;
    maxRam: number;
    minCpu: number;
    maxCpu: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;
  }>) {
    const policy = await prisma.autoScalingPolicy.update({
      where: { serverId },
      data: updates
    });

    // Restart auto-scaling if enabled
    if (updates.enabled === true) {
      await this.startAutoScaling(serverId);
    } else if (updates.enabled === false) {
      this.stopAutoScaling(serverId);
    }

    return policy;
  }

  /**
   * Get auto-scaling policy
   */
  async getPolicy(serverId: string) {
    return this.getOrCreatePolicy(serverId);
  }

  /**
   * Get scaling history (from activity feed)
   */
  async getScalingHistory(serverId: string, limit: number = 50) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) return [];

    return prisma.activityFeed.findMany({
      where: {
        userId: server.userId,
        title: { contains: 'Auto-scaled' }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Clean up on service shutdown
   */
  shutdown(): void {
    for (const [serverId, interval] of this.intervals.entries()) {
      clearInterval(interval);
      logger.info(`Stopped auto-scaling for server ${serverId}`);
    }
    this.intervals.clear();
  }
}

export const autoScalingService = new AutoScalingService();

// Cleanup on process exit
process.on('SIGINT', () => autoScalingService.shutdown());
process.on('SIGTERM', () => autoScalingService.shutdown());
