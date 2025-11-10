import prisma from '../lib/prisma';
import type {
  AIPerformancePrediction,
  AnomalyDetection,
  ResourceOptimization,
  AnomalyType,
  AnomalySeverity
} from '@prisma/client';

interface MetricData {
  timestamp: Date;
  cpu: number;
  ram: number;
  players: number;
  tps: number;
}

interface PredictionResult {
  cpu: number;
  ram: number;
  players: number;
  tps: number;
  confidence: number;
}

/**
 * AI-Powered Performance Optimization Service
 *
 * Features:
 * - Machine Learning-based load prediction
 * - Anomaly detection with auto-remediation
 * - Resource optimization recommendations
 * - Predictive scaling suggestions
 */
class AIPerformanceService {

  /**
   * Predict server performance metrics for the next N minutes
   * Uses time-series analysis and pattern recognition
   */
  async predictPerformance(serverId: string, timeframeMinutes: number = 30): Promise<AIPerformancePrediction> {
    // Fetch historical metrics (last 24 hours)
    const historicalData = await prisma.serverMetrics.findMany({
      where: {
        serverId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (historicalData.length < 10) {
      // Not enough data for prediction
      throw new Error('Insufficient historical data for prediction. Need at least 10 data points.');
    }

    // Perform time-series prediction
    const prediction = this.performTimeSeries(historicalData, timeframeMinutes);

    // Store prediction in database
    const predictionRecord = await prisma.aIPerformancePrediction.create({
      data: {
        serverId,
        predictedCpu: prediction.cpu,
        predictedRam: prediction.ram,
        predictedPlayers: prediction.players,
        predictedTps: prediction.tps,
        confidence: prediction.confidence,
        timeframe: timeframeMinutes,
        predictionTime: new Date()
      }
    });

    return predictionRecord;
  }

  /**
   * Perform time-series analysis to predict future metrics
   * Uses weighted moving average with trend analysis
   */
  private performTimeSeries(data: MetricData[], timeframeMinutes: number): PredictionResult {
    const recentData = data.slice(-20); // Last 20 data points

    // Calculate weighted moving average (more recent = higher weight)
    const weights = recentData.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const avgCpu = recentData.reduce((sum, d, i) => sum + d.cpuUsage * weights[i], 0) / totalWeight;
    const avgRam = recentData.reduce((sum, d, i) => sum + d.ramUsage * weights[i], 0) / totalWeight;
    const avgPlayers = recentData.reduce((sum, d, i) => sum + d.onlinePlayers * weights[i], 0) / totalWeight;
    const avgTps = recentData.reduce((sum, d, i) => sum + d.tps * weights[i], 0) / totalWeight;

    // Calculate trend (linear regression slope)
    const trend = this.calculateTrend(recentData);

    // Apply trend to predictions
    const trendFactor = 1 + (trend * timeframeMinutes / 60);

    // Predict with trend adjustment
    const predictedCpu = Math.max(0, Math.min(100, avgCpu * trendFactor));
    const predictedRam = Math.max(0, avgRam * trendFactor);
    const predictedPlayers = Math.max(0, Math.round(avgPlayers * trendFactor));
    const predictedTps = Math.max(0, avgTps * (2 - trendFactor)); // TPS inversely related to load

    // Calculate confidence based on data variance
    const variance = this.calculateVariance(recentData);
    const confidence = Math.max(0.3, Math.min(1.0, 1.0 - variance));

    return {
      cpu: predictedCpu,
      ram: predictedRam,
      players: predictedPlayers,
      tps: predictedTps,
      confidence
    };
  }

  /**
   * Calculate trend using simple linear regression
   */
  private calculateTrend(data: MetricData[]): number {
    const n = data.length;
    const xSum = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
    const ySum = data.reduce((sum, d) => sum + d.cpuUsage, 0);
    const xySum = data.reduce((sum, d, i) => sum + i * d.cpuUsage, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    return slope;
  }

  /**
   * Calculate variance of metrics
   */
  private calculateVariance(data: MetricData[]): number {
    const cpuMean = data.reduce((sum, d) => sum + d.cpuUsage, 0) / data.length;
    const variance = data.reduce((sum, d) => sum + Math.pow(d.cpuUsage - cpuMean, 2), 0) / data.length;
    return Math.min(1.0, variance / 1000); // Normalize to 0-1
  }

  /**
   * Detect anomalies in server performance
   * Uses statistical analysis and pattern matching
   */
  async detectAnomalies(serverId: string): Promise<AnomalyDetection[]> {
    const recentMetrics = await prisma.serverMetrics.findMany({
      where: {
        serverId,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (recentMetrics.length < 5) {
      return [];
    }

    const anomalies: AnomalyDetection[] = [];
    const latest = recentMetrics[0];
    const historical = recentMetrics.slice(1);

    // Calculate baseline metrics
    const avgCpu = historical.reduce((sum, m) => sum + m.cpuUsage, 0) / historical.length;
    const avgRam = historical.reduce((sum, m) => sum + m.ramUsage, 0) / historical.length;
    const avgTps = historical.reduce((sum, m) => sum + m.tps, 0) / historical.length;
    const avgPlayers = historical.reduce((sum, m) => sum + m.onlinePlayers, 0) / historical.length;

    const stdDevCpu = Math.sqrt(historical.reduce((sum, m) => sum + Math.pow(m.cpuUsage - avgCpu, 2), 0) / historical.length);
    const stdDevRam = Math.sqrt(historical.reduce((sum, m) => sum + Math.pow(m.ramUsage - avgRam, 2), 0) / historical.length);
    const stdDevTps = Math.sqrt(historical.reduce((sum, m) => sum + Math.pow(m.tps - avgTps, 2), 0) / historical.length);

    // Detect CPU spike (>2 standard deviations)
    if (latest.cpuUsage > avgCpu + 2 * stdDevCpu && latest.cpuUsage > 70) {
      const anomaly = await prisma.anomalyDetection.create({
        data: {
          serverId,
          anomalyType: 'CPU_SPIKE',
          severity: latest.cpuUsage > 90 ? 'CRITICAL' : latest.cpuUsage > 80 ? 'HIGH' : 'MEDIUM',
          description: `CPU usage spiked to ${latest.cpuUsage.toFixed(1)}% (avg: ${avgCpu.toFixed(1)}%)`,
          metricValue: latest.cpuUsage,
          expectedValue: avgCpu,
          deviation: ((latest.cpuUsage - avgCpu) / avgCpu * 100),
          detectedAt: new Date()
        }
      });
      anomalies.push(anomaly);
    }

    // Detect memory leak (steady increase)
    const ramTrend = this.calculateTrend(historical.map(m => ({
      timestamp: m.timestamp,
      cpu: m.cpuUsage,
      ram: m.ramUsage,
      players: m.onlinePlayers,
      tps: m.tps
    })));

    if (ramTrend > 0.5 && latest.ramUsage > avgRam + stdDevRam) {
      const anomaly = await prisma.anomalyDetection.create({
        data: {
          serverId,
          anomalyType: 'MEMORY_LEAK',
          severity: latest.ramUsage > avgRam * 1.5 ? 'HIGH' : 'MEDIUM',
          description: `Potential memory leak detected. RAM usage increasing steadily (current: ${latest.ramUsage}MB)`,
          metricValue: latest.ramUsage,
          expectedValue: avgRam,
          deviation: ((latest.ramUsage - avgRam) / avgRam * 100),
          detectedAt: new Date()
        }
      });
      anomalies.push(anomaly);
    }

    // Detect TPS drop
    if (latest.tps < avgTps - 2 * stdDevTps && latest.tps < 18) {
      const anomaly = await prisma.anomalyDetection.create({
        data: {
          serverId,
          anomalyType: 'TPS_DROP',
          severity: latest.tps < 15 ? 'CRITICAL' : latest.tps < 17 ? 'HIGH' : 'MEDIUM',
          description: `TPS dropped to ${latest.tps.toFixed(1)} (avg: ${avgTps.toFixed(1)})`,
          metricValue: latest.tps,
          expectedValue: avgTps,
          deviation: ((avgTps - latest.tps) / avgTps * 100),
          detectedAt: new Date()
        }
      });
      anomalies.push(anomaly);
    }

    // Detect player surge
    if (latest.onlinePlayers > avgPlayers + 10 && latest.onlinePlayers > avgPlayers * 2) {
      const anomaly = await prisma.anomalyDetection.create({
        data: {
          serverId,
          anomalyType: 'PLAYER_SURGE',
          severity: 'MEDIUM',
          description: `Unusual player surge detected: ${latest.onlinePlayers} players (avg: ${avgPlayers.toFixed(0)})`,
          metricValue: latest.onlinePlayers,
          expectedValue: avgPlayers,
          deviation: ((latest.onlinePlayers - avgPlayers) / avgPlayers * 100),
          detectedAt: new Date()
        }
      });
      anomalies.push(anomaly);
    }

    return anomalies;
  }

  /**
   * Generate resource optimization recommendations
   * Analyzes usage patterns and suggests optimal resource allocation
   */
  async generateOptimizationRecommendations(serverId: string): Promise<ResourceOptimization | null> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { stats: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Get metrics from last 7 days
    const metrics = await prisma.serverMetrics.findMany({
      where: {
        serverId,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (metrics.length < 50) {
      return null; // Not enough data
    }

    // Calculate percentile usage (95th percentile)
    const cpuUsages = metrics.map(m => m.cpuUsage).sort((a, b) => a - b);
    const ramUsages = metrics.map(m => m.ramUsage).sort((a, b) => a - b);

    const p95Index = Math.floor(metrics.length * 0.95);
    const p95Cpu = cpuUsages[p95Index];
    const p95Ram = ramUsages[p95Index];

    const avgCpu = cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length;
    const avgRam = ramUsages.reduce((a, b) => a + b, 0) / ramUsages.length;

    // Calculate optimal resources
    let recommendedCpu = server.allocatedCpu;
    let recommendedRam = server.allocatedRam;
    let reasoning = '';
    let potentialSavings = 0;
    let confidence = 0;

    // CPU Optimization
    if (p95Cpu < server.allocatedCpu * 0.5) {
      // Over-provisioned CPU
      recommendedCpu = Math.max(0.5, Math.ceil(p95Cpu / 10) * 10 / 100 + 0.5);
      const savings = ((server.allocatedCpu - recommendedCpu) / server.allocatedCpu) * 100;
      potentialSavings += savings * 0.3; // CPU = 30% of cost
      reasoning += `CPU over-provisioned: 95th percentile usage is ${p95Cpu.toFixed(1)}% of ${server.allocatedCpu} cores. `;
      confidence += 0.3;
    } else if (p95Cpu > server.allocatedCpu * 0.85) {
      // Under-provisioned CPU
      recommendedCpu = Math.ceil(server.allocatedCpu * 1.5 * 2) / 2;
      reasoning += `CPU under-provisioned: 95th percentile usage is ${p95Cpu.toFixed(1)}%, risking performance issues. `;
      confidence += 0.3;
    } else {
      confidence += 0.2;
    }

    // RAM Optimization
    if (p95Ram < server.allocatedRam * 0.6) {
      // Over-provisioned RAM
      recommendedRam = Math.max(1024, Math.ceil(p95Ram * 1.2 / 512) * 512);
      const savings = ((server.allocatedRam - recommendedRam) / server.allocatedRam) * 100;
      potentialSavings += savings * 0.7; // RAM = 70% of cost
      reasoning += `RAM over-provisioned: 95th percentile usage is ${p95Ram}MB of ${server.allocatedRam}MB. `;
      confidence += 0.4;
    } else if (p95Ram > server.allocatedRam * 0.85) {
      // Under-provisioned RAM
      recommendedRam = Math.ceil(server.allocatedRam * 1.3 / 512) * 512;
      reasoning += `RAM under-provisioned: 95th percentile usage is ${p95Ram}MB, risking OOM errors. `;
      confidence += 0.4;
    } else {
      reasoning += 'Current resource allocation is optimal. ';
      confidence += 0.3;
    }

    // Only create recommendation if there's a significant change
    if (Math.abs(recommendedCpu - server.allocatedCpu) > 0.25 || Math.abs(recommendedRam - server.allocatedRam) > 512) {
      const optimization = await prisma.resourceOptimization.create({
        data: {
          serverId,
          currentRam: server.allocatedRam,
          currentCpu: server.allocatedCpu,
          recommendedRam,
          recommendedCpu,
          potentialSavings: Math.round(potentialSavings),
          reasoning: reasoning.trim(),
          confidence: Math.min(1.0, confidence),
          applied: false
        }
      });

      return optimization;
    }

    return null;
  }

  /**
   * Apply resource optimization recommendation
   */
  async applyOptimization(optimizationId: string): Promise<void> {
    const optimization = await prisma.resourceOptimization.findUnique({
      where: { id: optimizationId }
    });

    if (!optimization || optimization.applied) {
      throw new Error('Optimization not found or already applied');
    }

    // Update server resources
    await prisma.minecraftServer.update({
      where: { id: optimization.serverId },
      data: {
        allocatedRam: optimization.recommendedRam,
        allocatedCpu: optimization.recommendedCpu
      }
    });

    // Mark as applied
    await prisma.resourceOptimization.update({
      where: { id: optimizationId },
      data: {
        applied: true,
        appliedAt: new Date()
      }
    });
  }

  /**
   * Get unresolved anomalies for a server
   */
  async getUnresolvedAnomalies(serverId: string): Promise<AnomalyDetection[]> {
    return await prisma.anomalyDetection.findMany({
      where: {
        serverId,
        resolved: false
      },
      orderBy: { detectedAt: 'desc' }
    });
  }

  /**
   * Mark anomaly as resolved
   */
  async resolveAnomaly(anomalyId: string, autoResolved: boolean = false): Promise<void> {
    await prisma.anomalyDetection.update({
      where: { id: anomalyId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        autoResolved
      }
    });
  }

  /**
   * Get prediction accuracy by comparing predictions with actual values
   */
  async calculatePredictionAccuracy(serverId: string): Promise<number> {
    const predictions = await prisma.aIPerformancePrediction.findMany({
      where: {
        serverId,
        actualCpu: { not: null }
      },
      take: 100
    });

    if (predictions.length === 0) {
      return 0;
    }

    const accuracies = predictions.map(p => {
      const cpuError = Math.abs(p.predictedCpu - (p.actualCpu || 0)) / (p.actualCpu || 1);
      const ramError = Math.abs(p.predictedRam - (p.actualRam || 0)) / (p.actualRam || 1);
      const playersError = Math.abs(p.predictedPlayers - (p.actualPlayers || 0)) / Math.max(1, p.actualPlayers || 1);

      return 1 - (cpuError + ramError + playersError) / 3;
    });

    return accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  }
}

export default new AIPerformanceService();
