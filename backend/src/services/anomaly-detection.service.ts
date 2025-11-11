/**
 * Anomaly Detection Service
 * Detects unusual patterns in server metrics using statistical analysis
 */

import { PrismaClient, AlertSeverity } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

export class AnomalyDetectionService {
  private readonly DETECTION_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
  private readonly BASELINE_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Analyze server metrics for anomalies
   */
  async detectAnomalies(serverId: string): Promise<void> {
    try {
      const currentMetrics = await this.getCurrentMetrics(serverId);
      if (!currentMetrics) return;

      const baseline = await this.calculateBaseline(serverId);
      if (!baseline) return;

      // Detect anomalies in different metrics
      await Promise.all([
        this.checkCpuAnomaly(serverId, currentMetrics.cpuUsage, baseline.cpu),
        this.checkRamAnomaly(serverId, currentMetrics.ramUsage, baseline.ram),
        this.checkTpsAnomaly(serverId, currentMetrics.tps, baseline.tps),
        this.checkPlayerCountAnomaly(serverId, currentMetrics.onlinePlayers, baseline.players)
      ]);

      logger.info(`Anomaly detection completed for server ${serverId}`);
    } catch (error) {
      logger.error(`Error in anomaly detection for server ${serverId}:`, error);
    }
  }

  /**
   * Get current server metrics
   */
  private async getCurrentMetrics(serverId: string) {
    return prisma.serverStats.findUnique({
      where: { serverId }
    });
  }

  /**
   * Calculate baseline statistics for each metric
   */
  private async calculateBaseline(serverId: string): Promise<{
    cpu: MetricStats;
    ram: MetricStats;
    tps: MetricStats;
    players: MetricStats;
  } | null> {
    const historicalData = await prisma.serverMetrics.findMany({
      where: {
        serverId,
        timestamp: {
          gte: new Date(Date.now() - this.BASELINE_WINDOW)
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (historicalData.length < 100) {
      logger.warn(`Insufficient data for baseline calculation: ${historicalData.length} points`);
      return null;
    }

    return {
      cpu: this.calculateStats(historicalData.map(m => m.cpuUsage)),
      ram: this.calculateStats(historicalData.map(m => m.ramUsage)),
      tps: this.calculateStats(historicalData.map(m => m.tps)),
      players: this.calculateStats(historicalData.map(m => m.onlinePlayers))
    };
  }

  /**
   * Calculate statistical properties of a dataset
   */
  private calculateStats(values: number[]): MetricStats {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Check for CPU usage anomaly
   */
  private async checkCpuAnomaly(serverId: string, current: number, baseline: MetricStats): Promise<void> {
    const zScore = Math.abs((current - baseline.mean) / baseline.stdDev);
    const deviation = ((current - baseline.mean) / baseline.mean) * 100;

    // Z-score > 3 indicates anomaly (99.7% confidence)
    if (zScore > 3) {
      const severity = this.calculateSeverity(zScore);

      await this.createAnomaly({
        serverId,
        metricType: 'cpu',
        detectedValue: current,
        expectedValue: baseline.mean,
        deviation,
        severity
      });

      logger.warn(`CPU anomaly detected for server ${serverId}: ${current}% (expected ~${baseline.mean.toFixed(1)}%)`);
    }
  }

  /**
   * Check for RAM usage anomaly
   */
  private async checkRamAnomaly(serverId: string, current: number, baseline: MetricStats): Promise<void> {
    const zScore = Math.abs((current - baseline.mean) / baseline.stdDev);
    const deviation = ((current - baseline.mean) / baseline.mean) * 100;

    if (zScore > 3) {
      const severity = this.calculateSeverity(zScore);

      await this.createAnomaly({
        serverId,
        metricType: 'ram',
        detectedValue: current,
        expectedValue: baseline.mean,
        deviation,
        severity
      });

      logger.warn(`RAM anomaly detected for server ${serverId}: ${current}MB (expected ~${baseline.mean.toFixed(0)}MB)`);
    }
  }

  /**
   * Check for TPS anomaly
   */
  private async checkTpsAnomaly(serverId: string, current: number, baseline: MetricStats): Promise<void> {
    const zScore = Math.abs((current - baseline.mean) / baseline.stdDev);
    const deviation = ((current - baseline.mean) / baseline.mean) * 100;

    // TPS drops are more critical
    if (zScore > 2.5 || (current < 18 && baseline.mean > 19)) {
      const severity = current < 15 ? AlertSeverity.CRITICAL : this.calculateSeverity(zScore);

      await this.createAnomaly({
        serverId,
        metricType: 'tps',
        detectedValue: current,
        expectedValue: baseline.mean,
        deviation,
        severity
      });

      logger.warn(`TPS anomaly detected for server ${serverId}: ${current.toFixed(2)} (expected ~${baseline.mean.toFixed(2)})`);
    }
  }

  /**
   * Check for player count anomaly
   */
  private async checkPlayerCountAnomaly(serverId: string, current: number, baseline: MetricStats): Promise<void> {
    // Only detect if there's a significant spike
    const zScore = (current - baseline.mean) / baseline.stdDev;
    const deviation = ((current - baseline.mean) / baseline.mean) * 100;

    if (zScore > 4) { // Unusual player spike
      await this.createAnomaly({
        serverId,
        metricType: 'players',
        detectedValue: current,
        expectedValue: baseline.mean,
        deviation,
        severity: AlertSeverity.INFO // Usually not critical
      });

      logger.info(`Player count spike detected for server ${serverId}: ${current} (expected ~${baseline.mean.toFixed(0)})`);
    }
  }

  /**
   * Create an anomaly record (avoid duplicates in recent time)
   */
  private async createAnomaly(data: {
    serverId: string;
    metricType: string;
    detectedValue: number;
    expectedValue: number;
    deviation: number;
    severity: AlertSeverity;
  }): Promise<void> {
    // Check for recent similar anomaly (within last hour)
    const recentAnomaly = await prisma.anomalyDetection.findFirst({
      where: {
        serverId: data.serverId,
        metricType: data.metricType,
        isResolved: false,
        detectedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour
        }
      }
    });

    if (recentAnomaly) {
      // Update existing anomaly
      await prisma.anomalyDetection.update({
        where: { id: recentAnomaly.id },
        data: {
          detectedValue: data.detectedValue,
          expectedValue: data.expectedValue,
          deviation: data.deviation,
          severity: data.severity,
          detectedAt: new Date()
        }
      });
    } else {
      // Create new anomaly
      await prisma.anomalyDetection.create({
        data
      });
    }
  }

  /**
   * Resolve an anomaly
   */
  async resolveAnomaly(anomalyId: string) {
    return prisma.anomalyDetection.update({
      where: { id: anomalyId },
      data: {
        isResolved: true,
        resolvedAt: new Date()
      }
    });
  }

  /**
   * Get active anomalies for a server
   */
  async getActiveAnomalies(serverId: string) {
    return prisma.anomalyDetection.findMany({
      where: {
        serverId,
        isResolved: false
      },
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' }
      ]
    });
  }

  /**
   * Auto-resolve old anomalies that normalized
   */
  async autoResolveNormalizedAnomalies(serverId: string): Promise<void> {
    const activeAnomalies = await this.getActiveAnomalies(serverId);
    const currentMetrics = await this.getCurrentMetrics(serverId);

    if (!currentMetrics) return;

    for (const anomaly of activeAnomalies) {
      let isNormalized = false;
      const currentValue = this.getCurrentValueForMetric(anomaly.metricType, currentMetrics);

      // Check if value is back to normal (within 10% of expected)
      const diff = Math.abs(currentValue - anomaly.expectedValue);
      const threshold = anomaly.expectedValue * 0.1;

      if (diff < threshold) {
        isNormalized = true;
      }

      if (isNormalized) {
        await this.resolveAnomaly(anomaly.id);
        logger.info(`Auto-resolved anomaly ${anomaly.id} for metric ${anomaly.metricType}`);
      }
    }
  }

  /**
   * Calculate severity based on z-score
   */
  private calculateSeverity(zScore: number): AlertSeverity {
    if (zScore > 5) return AlertSeverity.CRITICAL;
    if (zScore > 4) return AlertSeverity.ERROR;
    if (zScore > 3) return AlertSeverity.WARNING;
    return AlertSeverity.INFO;
  }

  /**
   * Get current value for a specific metric type
   */
  private getCurrentValueForMetric(metricType: string, metrics: any): number {
    switch (metricType) {
      case 'cpu': return metrics.cpuUsage;
      case 'ram': return metrics.ramUsage;
      case 'tps': return metrics.tps;
      case 'players': return metrics.onlinePlayers;
      default: return 0;
    }
  }

  /**
   * Get anomaly statistics for a server
   */
  async getAnomalyStatistics(serverId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const anomalies = await prisma.anomalyDetection.findMany({
      where: {
        serverId,
        detectedAt: { gte: since }
      }
    });

    const byType = anomalies.reduce((acc, a) => {
      acc[a.metricType] = (acc[a.metricType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = anomalies.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: anomalies.length,
      resolved: anomalies.filter(a => a.isResolved).length,
      active: anomalies.filter(a => !a.isResolved).length,
      byType,
      bySeverity,
      avgResolutionTime: this.calculateAvgResolutionTime(anomalies.filter(a => a.isResolved))
    };
  }

  /**
   * Calculate average resolution time
   */
  private calculateAvgResolutionTime(resolved: any[]): number {
    if (resolved.length === 0) return 0;

    const totalTime = resolved.reduce((sum, a) => {
      if (!a.resolvedAt) return sum;
      return sum + (a.resolvedAt.getTime() - a.detectedAt.getTime());
    }, 0);

    return Math.floor(totalTime / resolved.length / 1000); // in seconds
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
