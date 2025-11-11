import { MinecraftServer, ServerStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AgentService } from './agent.service';
import { logger } from '../lib/logger';

/**
 * 🚀 Intelligent Auto-Scaling Service
 *
 * Passt Server-Ressourcen automatisch an die aktuelle Last an:
 * - Basierend auf Spieleranzahl
 * - Basierend auf CPU/RAM-Auslastung
 * - Basierend auf TPS
 * - Lernt aus historischen Daten
 */

export interface AutoScalingConfig {
  enabled: boolean;
  minRam: number; // MB
  maxRam: number; // MB
  minCpu: number; // cores
  maxCpu: number; // cores
  scaleUpThreshold: number; // % (z.B. 80%)
  scaleDownThreshold: number; // % (z.B. 30%)
  playerBasedScaling: boolean;
  ramPerPlayer: number; // MB pro Spieler
  baseRam: number; // Basis-RAM (MB)
}

export interface ScalingDecision {
  shouldScale: boolean;
  direction: 'UP' | 'DOWN' | 'NONE';
  newRam?: number;
  newCpu?: number;
  reason: string;
  confidence: number; // 0-100%
  estimatedCostImpact?: number; // % Änderung
}

export class IntelligentAutoScalingService {
  private agentService = new AgentService();

  // Default Config
  private readonly DEFAULT_CONFIG: AutoScalingConfig = {
    enabled: true,
    minRam: 1024, // 1GB
    maxRam: 16384, // 16GB
    minCpu: 1,
    maxCpu: 8,
    scaleUpThreshold: 80,
    scaleDownThreshold: 30,
    playerBasedScaling: true,
    ramPerPlayer: 150, // 150MB pro Spieler
    baseRam: 2048 // 2GB Basis
  };

  /**
   * Analysiert ob Server skaliert werden sollte
   */
  async analyzeScalingNeed(serverId: string, config?: Partial<AutoScalingConfig>): Promise<ScalingDecision> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { stats: true }
    });

    if (!server || !server.stats) {
      return {
        shouldScale: false,
        direction: 'NONE',
        reason: 'Server nicht gefunden oder keine Stats verfügbar',
        confidence: 0
      };
    }

    const reasons: string[] = [];
    let scaleUpScore = 0;
    let scaleDownScore = 0;

    // 1. RAM-basierte Analyse
    const ramUsagePercent = (server.stats.ramUsage / server.allocatedRam) * 100;
    if (ramUsagePercent > finalConfig.scaleUpThreshold) {
      scaleUpScore += 30;
      reasons.push(`RAM-Auslastung bei ${ramUsagePercent.toFixed(1)}%`);
    } else if (ramUsagePercent < finalConfig.scaleDownThreshold) {
      scaleDownScore += 20;
      reasons.push(`RAM-Auslastung nur bei ${ramUsagePercent.toFixed(1)}%`);
    }

    // 2. CPU-basierte Analyse
    const cpuUsagePercent = (server.stats.cpuUsage / server.allocatedCpu) * 100;
    if (cpuUsagePercent > finalConfig.scaleUpThreshold) {
      scaleUpScore += 25;
      reasons.push(`CPU-Auslastung bei ${cpuUsagePercent.toFixed(1)}%`);
    } else if (cpuUsagePercent < finalConfig.scaleDownThreshold) {
      scaleDownScore += 15;
      reasons.push(`CPU-Auslastung nur bei ${cpuUsagePercent.toFixed(1)}%`);
    }

    // 3. TPS-basierte Analyse
    if (server.stats.tps < 18) {
      scaleUpScore += 20;
      reasons.push(`TPS niedrig: ${server.stats.tps.toFixed(1)}`);
    }

    // 4. Spieler-basierte Analyse
    if (finalConfig.playerBasedScaling) {
      const recommendedRam = finalConfig.baseRam + (server.stats.onlinePlayers * finalConfig.ramPerPlayer);

      if (recommendedRam > server.allocatedRam * 1.2) {
        scaleUpScore += 15;
        reasons.push(`Empfohlener RAM für ${server.stats.onlinePlayers} Spieler: ${recommendedRam}MB`);
      } else if (recommendedRam < server.allocatedRam * 0.6 && server.stats.onlinePlayers < 2) {
        scaleDownScore += 10;
        reasons.push(`Nur ${server.stats.onlinePlayers} Spieler online, RAM überdimensioniert`);
      }
    }

    // 5. Historische Trend-Analyse
    const recentMetrics = await prisma.serverMetrics.findMany({
      where: { serverId },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    if (recentMetrics.length >= 5) {
      const ramTrend = this.calculateTrend(recentMetrics.map(m => m.ramUsage));
      const playerTrend = this.calculateTrend(recentMetrics.map(m => m.onlinePlayers));

      if (ramTrend > 50) { // RAM steigt schnell
        scaleUpScore += 10;
        reasons.push('RAM-Auslastung steigt kontinuierlich');
      }

      if (playerTrend > 0.5) { // Spielerzahl steigt
        scaleUpScore += 5;
        reasons.push('Spielerzahl steigt');
      } else if (playerTrend < -0.5) { // Spielerzahl sinkt
        scaleDownScore += 5;
        reasons.push('Spielerzahl sinkt');
      }
    }

    // Entscheidung treffen
    const shouldScale = scaleUpScore > 30 || scaleDownScore > 20;
    const direction = scaleUpScore > scaleDownScore ? 'UP' : (scaleDownScore > scaleUpScore ? 'DOWN' : 'NONE');

    if (!shouldScale || direction === 'NONE') {
      return {
        shouldScale: false,
        direction: 'NONE',
        reason: 'Keine Skalierung notwendig',
        confidence: 0
      };
    }

    // Berechne neue Ressourcen
    const decision = this.calculateNewResources(server, direction, finalConfig);
    decision.reason = reasons.join('; ');
    decision.confidence = Math.min(100, direction === 'UP' ? scaleUpScore : scaleDownScore);

    return decision;
  }

  /**
   * Berechnet neue Ressourcen-Werte
   */
  private calculateNewResources(
    server: MinecraftServer & { stats: any },
    direction: 'UP' | 'DOWN',
    config: AutoScalingConfig
  ): ScalingDecision {
    let newRam = server.allocatedRam;
    let newCpu = server.allocatedCpu;

    if (direction === 'UP') {
      // Scale up: +25% RAM, +0.5 CPU
      newRam = Math.min(config.maxRam, Math.ceil(server.allocatedRam * 1.25));
      newCpu = Math.min(config.maxCpu, server.allocatedCpu + 0.5);
    } else {
      // Scale down: -20% RAM, -0.5 CPU
      newRam = Math.max(config.minRam, Math.floor(server.allocatedRam * 0.8));
      newCpu = Math.max(config.minCpu, server.allocatedCpu - 0.5);
    }

    // Cost Impact Berechnung (sehr vereinfacht)
    const ramChange = ((newRam - server.allocatedRam) / server.allocatedRam) * 100;
    const cpuChange = ((newCpu - server.allocatedCpu) / server.allocatedCpu) * 100;
    const estimatedCostImpact = (ramChange + cpuChange) / 2;

    return {
      shouldScale: true,
      direction,
      newRam,
      newCpu,
      reason: '',
      confidence: 0,
      estimatedCostImpact: Math.round(estimatedCostImpact)
    };
  }

  /**
   * Führt Auto-Scaling durch
   */
  async performAutoScaling(serverId: string, dryRun: boolean = false): Promise<ScalingDecision> {
    const decision = await this.analyzeScalingNeed(serverId);

    if (!decision.shouldScale || !decision.newRam || !decision.newCpu) {
      logger.info(`No scaling needed for server ${serverId}`);
      return decision;
    }

    if (dryRun) {
      logger.info(`[DRY RUN] Would scale server ${serverId}: RAM ${decision.newRam}MB, CPU ${decision.newCpu}`);
      return decision;
    }

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    try {
      logger.info(`Auto-scaling server ${server.name}: ${decision.direction} to RAM=${decision.newRam}MB, CPU=${decision.newCpu}`);

      // Update über Agent Service
      await this.agentService.updateResources(
        server.host,
        server.containerName,
        decision.newRam,
        decision.newCpu
      );

      // Update DB
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: {
          allocatedRam: decision.newRam,
          allocatedCpu: decision.newCpu
        }
      });

      logger.info(`Auto-scaling completed for server ${serverId}`);

      return decision;
    } catch (error) {
      logger.error(`Auto-scaling failed for server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Führt Auto-Scaling für alle Server durch (Scheduler)
   */
  async performGlobalAutoScaling(): Promise<Map<string, ScalingDecision>> {
    const runningServers = await prisma.minecraftServer.findMany({
      where: { status: ServerStatus.RUNNING },
      include: { stats: true }
    });

    const results = new Map<string, ScalingDecision>();

    for (const server of runningServers) {
      try {
        const decision = await this.performAutoScaling(server.id, false);
        results.set(server.id, decision);
      } catch (error) {
        logger.error(`Auto-scaling failed for server ${server.id}:`, error);
      }
    }

    logger.info(`Global auto-scaling completed: ${results.size} servers analyzed`);
    return results;
  }

  /**
   * Berechnet Trend einer Metrik
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    return slope;
  }
}

export default IntelligentAutoScalingService;
