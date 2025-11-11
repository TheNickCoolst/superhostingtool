/**
 * AI Recommendation Service
 * Provides intelligent recommendations for server optimization using ML algorithms
 */

import { PrismaClient, RecommendationType, RecommendationPriority, AlertSeverity } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

interface ServerMetrics {
  cpuUsage: number;
  ramUsage: number;
  tps: number;
  onlinePlayers: number;
  allocatedRam: number;
  allocatedCpu: number;
}

export class AIRecommendationService {
  /**
   * Analyze server metrics and generate recommendations
   */
  async analyzeServerAndGenerateRecommendations(serverId: string): Promise<void> {
    try {
      const server = await prisma.minecraftServer.findUnique({
        where: { id: serverId },
        include: { stats: true }
      });

      if (!server || !server.stats) {
        return;
      }

      const metrics: ServerMetrics = {
        cpuUsage: server.stats.cpuUsage,
        ramUsage: server.stats.ramUsage,
        tps: server.stats.tps,
        onlinePlayers: server.stats.onlinePlayers,
        allocatedRam: server.allocatedRam,
        allocatedCpu: server.allocatedCpu
      };

      // Generate various recommendations
      await Promise.all([
        this.checkPerformanceOptimization(serverId, metrics),
        this.checkResourceAdjustment(serverId, metrics),
        this.checkCostOptimization(serverId, metrics),
        this.checkVersionUpgrade(serverId, server.version),
        this.checkBackupStrategy(serverId)
      ]);

      logger.info(`Generated AI recommendations for server ${serverId}`);
    } catch (error) {
      logger.error(`Error generating recommendations for server ${serverId}:`, error);
    }
  }

  /**
   * Check if performance optimization is needed
   */
  private async checkPerformanceOptimization(serverId: string, metrics: ServerMetrics): Promise<void> {
    // Low TPS detection
    if (metrics.tps < 18.0) {
      const confidence = this.calculateConfidence(metrics.tps, 20, 15);

      await this.createRecommendation({
        serverId,
        type: RecommendationType.PERFORMANCE_OPTIMIZATION,
        title: 'Low TPS Detected',
        description: `Your server is running at ${metrics.tps.toFixed(2)} TPS, which is below optimal. This may cause lag for players.`,
        priority: metrics.tps < 15 ? RecommendationPriority.CRITICAL : RecommendationPriority.HIGH,
        potentialImpact: 'Improving TPS will enhance player experience and reduce lag.',
        suggestedAction: 'Consider: 1) Reducing entity count, 2) Optimizing plugins, 3) Increasing allocated resources, 4) Using performance mods like Paper or Fabric',
        confidence
      });
    }

    // High CPU usage
    if (metrics.cpuUsage > 80) {
      await this.createRecommendation({
        serverId,
        type: RecommendationType.PERFORMANCE_OPTIMIZATION,
        title: 'High CPU Usage',
        description: `CPU usage is at ${metrics.cpuUsage.toFixed(1)}%, which may cause performance issues.`,
        priority: RecommendationPriority.HIGH,
        potentialImpact: 'Reducing CPU usage will prevent lag and improve server responsiveness.',
        suggestedAction: 'Consider: 1) Optimizing plugins/mods, 2) Reducing world size, 3) Limiting mob spawning, 4) Upgrading to more CPU cores',
        confidence: 0.9
      });
    }
  }

  /**
   * Check if resource adjustment is recommended
   */
  private async checkResourceAdjustment(serverId: string, metrics: ServerMetrics): Promise<void> {
    const ramUsagePercent = (metrics.ramUsage / metrics.allocatedRam) * 100;
    const cpuUsagePercent = metrics.cpuUsage;

    // RAM underutilization
    if (ramUsagePercent < 40 && metrics.allocatedRam > 2048) {
      await this.createRecommendation({
        serverId,
        type: RecommendationType.RESOURCE_ADJUSTMENT,
        title: 'RAM Underutilization Detected',
        description: `You're only using ${ramUsagePercent.toFixed(1)}% of allocated RAM (${metrics.ramUsage}MB / ${metrics.allocatedRam}MB).`,
        priority: RecommendationPriority.MEDIUM,
        potentialImpact: 'Reducing allocated RAM can lower hosting costs without affecting performance.',
        suggestedAction: `Consider reducing RAM to ${Math.ceil(metrics.ramUsage * 1.5)}MB for optimal efficiency.`,
        confidence: 0.85
      });
    }

    // RAM overutilization
    if (ramUsagePercent > 90) {
      const recommendedRam = Math.ceil(metrics.allocatedRam * 1.3);
      await this.createRecommendation({
        serverId,
        type: RecommendationType.RESOURCE_ADJUSTMENT,
        title: 'Insufficient RAM',
        description: `RAM usage is at ${ramUsagePercent.toFixed(1)}%, which may cause crashes or severe lag.`,
        priority: RecommendationPriority.CRITICAL,
        potentialImpact: 'Increasing RAM will prevent crashes and improve stability.',
        suggestedAction: `Increase RAM allocation to ${recommendedRam}MB to maintain a healthy buffer.`,
        confidence: 0.95
      });
    }

    // CPU underutilization
    if (cpuUsagePercent < 20 && metrics.allocatedCpu > 1) {
      await this.createRecommendation({
        serverId,
        type: RecommendationType.RESOURCE_ADJUSTMENT,
        title: 'CPU Underutilization',
        description: `CPU usage is only ${cpuUsagePercent.toFixed(1)}%, indicating over-provisioning.`,
        priority: RecommendationPriority.LOW,
        potentialImpact: 'Reducing CPU allocation can lower costs.',
        suggestedAction: `Consider reducing to ${Math.max(1, Math.ceil(metrics.allocatedCpu * 0.7))} CPU cores.`,
        confidence: 0.75
      });
    }
  }

  /**
   * Check for cost optimization opportunities
   */
  private async checkCostOptimization(serverId: string, metrics: ServerMetrics): Promise<void> {
    // Get recent cost data
    const recentCosts = await prisma.costTracking.findMany({
      where: { serverId },
      orderBy: { date: 'desc' },
      take: 30
    });

    if (recentCosts.length < 7) return; // Need at least a week of data

    const avgDailyCost = recentCosts.reduce((sum, c) => sum + c.totalCost, 0) / recentCosts.length;
    const ramUsagePercent = (metrics.ramUsage / metrics.allocatedRam) * 100;

    // Cost optimization based on usage patterns
    if (avgDailyCost > 1.0 && (ramUsagePercent < 50 || metrics.cpuUsage < 30)) {
      const potentialSavings = avgDailyCost * 0.3;

      await this.createRecommendation({
        serverId,
        type: RecommendationType.COST_OPTIMIZATION,
        title: 'Cost Optimization Opportunity',
        description: `Your average daily cost is $${avgDailyCost.toFixed(2)}, but resources are underutilized.`,
        priority: RecommendationPriority.MEDIUM,
        potentialImpact: `Could save approximately $${potentialSavings.toFixed(2)}/day (~$${(potentialSavings * 30).toFixed(2)}/month).`,
        suggestedAction: 'Reduce allocated resources to match actual usage patterns. Enable auto-scaling for optimal cost-performance balance.',
        confidence: 0.8
      });
    }

    // Check for inactive periods
    const metricsHistory = await prisma.serverMetrics.findMany({
      where: {
        serverId,
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (metricsHistory.length > 0) {
      const inactivePeriods = this.detectInactivePeriods(metricsHistory);

      if (inactivePeriods.totalHours > 48) {
        const weeklySavings = avgDailyCost * (inactivePeriods.totalHours / 24) * 0.8;

        await this.createRecommendation({
          serverId,
          type: RecommendationType.COST_OPTIMIZATION,
          title: 'Inactive Server Detected',
          description: `Server was inactive for ${inactivePeriods.totalHours} hours in the past week.`,
          priority: RecommendationPriority.MEDIUM,
          potentialImpact: `Could save $${weeklySavings.toFixed(2)}/week by implementing auto-shutdown during inactive periods.`,
          suggestedAction: 'Enable scheduled tasks to automatically stop server during inactive hours and start before peak times.',
          confidence: 0.9
        });
      }
    }
  }

  /**
   * Check if server version upgrade is recommended
   */
  private async checkVersionUpgrade(serverId: string, currentVersion: string): Promise<void> {
    const latestVersion = await prisma.minecraftVersion.findFirst({
      where: { isStable: true },
      orderBy: { releaseDate: 'desc' }
    });

    if (!latestVersion) return;

    // Simple version comparison (you'd want more sophisticated logic)
    const current = this.parseVersion(currentVersion);
    const latest = this.parseVersion(latestVersion.version);

    if (latest.major > current.major || (latest.major === current.major && latest.minor > current.minor)) {
      await this.createRecommendation({
        serverId,
        type: RecommendationType.VERSION_UPGRADE,
        title: 'New Minecraft Version Available',
        description: `A newer stable version (${latestVersion.version}) is available. You're running ${currentVersion}.`,
        priority: RecommendationPriority.LOW,
        potentialImpact: 'Upgrading provides new features, performance improvements, and security fixes.',
        suggestedAction: `Upgrade to ${latestVersion.version}. Remember to backup your server first!`,
        confidence: 0.95
      });
    }
  }

  /**
   * Check backup strategy
   */
  private async checkBackupStrategy(serverId: string): Promise<void> {
    const recentBackups = await prisma.backup.findMany({
      where: {
        serverId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentBackups.length === 0) {
      await this.createRecommendation({
        serverId,
        type: RecommendationType.BACKUP_STRATEGY,
        title: 'No Recent Backups',
        description: 'No backups have been created in the past 7 days.',
        priority: RecommendationPriority.CRITICAL,
        potentialImpact: 'Without backups, you risk losing all server data in case of failure.',
        suggestedAction: 'Enable automatic daily backups immediately. Consider keeping at least 7 days of backup history.',
        confidence: 1.0
      });
    } else if (recentBackups.length < 3) {
      await this.createRecommendation({
        serverId,
        type: RecommendationType.BACKUP_STRATEGY,
        title: 'Insufficient Backup Frequency',
        description: `Only ${recentBackups.length} backup(s) in the past week.`,
        priority: RecommendationPriority.HIGH,
        potentialImpact: 'More frequent backups reduce data loss risk.',
        suggestedAction: 'Increase backup frequency to at least once per day for better data protection.',
        confidence: 0.9
      });
    }
  }

  /**
   * Create a recommendation (avoid duplicates)
   */
  private async createRecommendation(data: {
    serverId: string;
    type: RecommendationType;
    title: string;
    description: string;
    priority: RecommendationPriority;
    potentialImpact?: string;
    suggestedAction: string;
    confidence: number;
  }): Promise<void> {
    // Check if similar recommendation already exists and is not expired
    const existing = await prisma.aIRecommendation.findFirst({
      where: {
        serverId: data.serverId,
        type: data.type,
        title: data.title,
        isApplied: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (existing) {
      // Update existing recommendation
      await prisma.aIRecommendation.update({
        where: { id: existing.id },
        data: {
          description: data.description,
          priority: data.priority,
          confidence: data.confidence,
          suggestedAction: data.suggestedAction,
          potentialImpact: data.potentialImpact
        }
      });
    } else {
      // Create new recommendation
      await prisma.aIRecommendation.create({
        data: {
          ...data,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });
    }
  }

  /**
   * Get recommendations for a server
   */
  async getRecommendations(serverId: string, onlyActive: boolean = true) {
    return prisma.aIRecommendation.findMany({
      where: {
        serverId,
        ...(onlyActive ? {
          isApplied: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        } : {})
      },
      orderBy: [
        { priority: 'desc' },
        { confidence: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * Mark recommendation as applied
   */
  async applyRecommendation(recommendationId: string) {
    return prisma.aIRecommendation.update({
      where: { id: recommendationId },
      data: {
        isApplied: true,
        appliedAt: new Date()
      }
    });
  }

  /**
   * Helper: Calculate confidence score
   */
  private calculateConfidence(value: number, optimal: number, critical: number): number {
    const deviation = Math.abs(value - optimal) / Math.abs(optimal - critical);
    return Math.min(0.99, Math.max(0.5, 1 - deviation * 0.3));
  }

  /**
   * Helper: Parse version string
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(p => parseInt(p) || 0);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }

  /**
   * Helper: Detect inactive periods
   */
  private detectInactivePeriods(metrics: any[]): { totalHours: number; periods: any[] } {
    let totalInactiveHours = 0;
    const periods = [];
    let inactiveStart: Date | null = null;

    for (const metric of metrics) {
      if (metric.onlinePlayers === 0 && metric.cpuUsage < 10) {
        if (!inactiveStart) {
          inactiveStart = metric.timestamp;
        }
      } else {
        if (inactiveStart) {
          const hours = (metric.timestamp.getTime() - inactiveStart.getTime()) / (1000 * 60 * 60);
          if (hours > 1) { // Only count periods longer than 1 hour
            totalInactiveHours += hours;
            periods.push({ start: inactiveStart, end: metric.timestamp, hours });
          }
          inactiveStart = null;
        }
      }
    }

    return { totalHours: Math.floor(totalInactiveHours), periods };
  }
}

export const aiRecommendationService = new AIRecommendationService();
