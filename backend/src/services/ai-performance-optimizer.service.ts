import { MinecraftServer, ServerStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AgentService } from './agent.service';
import { logger } from '../lib/logger';

/**
 * 🤖 AI-Powered Performance Optimizer
 *
 * Intelligentes System zur automatischen Erkennung und Behebung von Performance-Problemen
 * - Erkennt Lag-Quellen (TPS-Drops, hohe Entity-Counts, Chunk-Probleme)
 * - Gibt automatische Optimierungsempfehlungen
 * - Kann selbstständig Optimierungen durchführen (wenn aktiviert)
 */

export interface PerformanceIssue {
  type: 'LOW_TPS' | 'HIGH_RAM' | 'HIGH_CPU' | 'TOO_MANY_ENTITIES' | 'CHUNK_OVERLOAD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation: string;
  autoFixAvailable: boolean;
  autoFixCommand?: string;
}

export interface PerformanceAnalysis {
  serverId: string;
  timestamp: Date;
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  healthScore: number; // 0-100
  issues: PerformanceIssue[];
  optimizationApplied: boolean;
  predictedNextIssue?: string;
}

export class AIPerformanceOptimizerService {
  private agentService = new AgentService();

  /**
   * Analysiert Server-Performance mit AI-gestützten Algorithmen
   */
  async analyzeServerPerformance(serverId: string): Promise<PerformanceAnalysis> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { stats: true, host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Hole die letzten 30 Metriken für Trend-Analyse
    const recentMetrics = await prisma.serverMetrics.findMany({
      where: { serverId },
      orderBy: { timestamp: 'desc' },
      take: 30
    });

    const issues: PerformanceIssue[] = [];
    let healthScore = 100;

    // 1. TPS-Analyse (sollte bei 20.0 liegen)
    if (server.stats) {
      if (server.stats.tps < 15) {
        issues.push({
          type: 'LOW_TPS',
          severity: server.stats.tps < 10 ? 'CRITICAL' : 'HIGH',
          description: `Server läuft mit ${server.stats.tps.toFixed(1)} TPS (sollte 20.0 sein)`,
          recommendation: 'Reduziere Entities, optimiere Chunks oder erhöhe CPU',
          autoFixAvailable: true,
          autoFixCommand: 'kill @e[type=!player]' // Entfernt Items/Mobs außer Spieler
        });
        healthScore -= server.stats.tps < 10 ? 30 : 15;
      }
    }

    // 2. RAM-Analyse
    const ramUsagePercent = (server.stats?.ramUsage || 0) / server.allocatedRam * 100;
    if (ramUsagePercent > 90) {
      issues.push({
        type: 'HIGH_RAM',
        severity: ramUsagePercent > 95 ? 'CRITICAL' : 'HIGH',
        description: `RAM-Auslastung bei ${ramUsagePercent.toFixed(1)}%`,
        recommendation: 'Erhöhe allocatedRam oder führe Garbage Collection durch',
        autoFixAvailable: true,
        autoFixCommand: 'gc' // Erzwingt Java Garbage Collection
      });
      healthScore -= ramUsagePercent > 95 ? 25 : 12;
    }

    // 3. CPU-Analyse
    const cpuUsagePercent = (server.stats?.cpuUsage || 0) / server.allocatedCpu * 100;
    if (cpuUsagePercent > 85) {
      issues.push({
        type: 'HIGH_CPU',
        severity: cpuUsagePercent > 95 ? 'CRITICAL' : 'HIGH',
        description: `CPU-Auslastung bei ${cpuUsagePercent.toFixed(1)}%`,
        recommendation: 'Erhöhe allocatedCpu oder optimiere Server-Plugins',
        autoFixAvailable: false
      });
      healthScore -= cpuUsagePercent > 95 ? 20 : 10;
    }

    // 4. Entity-Analyse (zu viele Entities = Lag)
    const avgEntities = recentMetrics.reduce((sum, m) => sum + (m.entities || 0), 0) / (recentMetrics.length || 1);
    if (avgEntities > 1000) {
      issues.push({
        type: 'TOO_MANY_ENTITIES',
        severity: avgEntities > 2000 ? 'HIGH' : 'MEDIUM',
        description: `Zu viele Entities: ${Math.round(avgEntities)} (empfohlen: <500)`,
        recommendation: 'Entferne unnötige Items, Mobs oder aktiviere Entity-Clearing',
        autoFixAvailable: true,
        autoFixCommand: 'kill @e[type=item,distance=..100]'
      });
      healthScore -= avgEntities > 2000 ? 15 : 8;
    }

    // 5. Chunk-Analyse
    const avgChunks = recentMetrics.reduce((sum, m) => sum + (m.chunks || 0), 0) / (recentMetrics.length || 1);
    if (avgChunks > 5000) {
      issues.push({
        type: 'CHUNK_OVERLOAD',
        severity: 'MEDIUM',
        description: `Viele geladene Chunks: ${Math.round(avgChunks)}`,
        recommendation: 'Reduziere View-Distance in server.properties',
        autoFixAvailable: false
      });
      healthScore -= 8;
    }

    // Predict next issue based on trends
    const predictedIssue = this.predictNextIssue(recentMetrics);

    // Bestimme Overall Health
    const overallHealth = this.calculateOverallHealth(healthScore);

    return {
      serverId,
      timestamp: new Date(),
      overallHealth,
      healthScore: Math.max(0, healthScore),
      issues,
      optimizationApplied: false,
      predictedNextIssue: predictedIssue
    };
  }

  /**
   * Führt automatische Optimierungen durch
   */
  async autoOptimizeServer(serverId: string, applyFixes: boolean = false): Promise<PerformanceAnalysis> {
    const analysis = await this.analyzeServerPerformance(serverId);

    if (!applyFixes || analysis.issues.length === 0) {
      return analysis;
    }

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server || server.status !== ServerStatus.RUNNING) {
      logger.warn(`Cannot auto-optimize server ${serverId}: Not running`);
      return analysis;
    }

    let appliedFixes = 0;

    // Wende Auto-Fixes an
    for (const issue of analysis.issues) {
      if (issue.autoFixAvailable && issue.autoFixCommand) {
        try {
          logger.info(`Applying auto-fix for ${issue.type} on server ${serverId}: ${issue.autoFixCommand}`);
          await this.agentService.executeCommand(server.host, server.containerName, issue.autoFixCommand);
          appliedFixes++;
        } catch (error) {
          logger.error(`Failed to apply auto-fix for ${issue.type}:`, error);
        }
      }
    }

    analysis.optimizationApplied = appliedFixes > 0;

    logger.info(`Auto-optimization completed for server ${serverId}: ${appliedFixes} fixes applied`);

    return analysis;
  }

  /**
   * Vorhersage des nächsten Problems basierend auf Trends
   */
  private predictNextIssue(metrics: any[]): string | undefined {
    if (metrics.length < 5) return undefined;

    // Analysiere Trends
    const ramTrend = this.calculateTrend(metrics.map(m => m.ramUsage));
    const cpuTrend = this.calculateTrend(metrics.map(m => m.cpuUsage));
    const tpsTrend = this.calculateTrend(metrics.map(m => m.tps));

    // Wenn RAM stark steigt
    if (ramTrend > 5) {
      return 'Warnung: RAM-Auslastung steigt kontinuierlich. Mögliches Memory Leak erkannt.';
    }

    // Wenn TPS stark fällt
    if (tpsTrend < -2) {
      return 'Warnung: TPS fällt kontinuierlich. Server könnte bald laggen.';
    }

    // Wenn CPU stark steigt
    if (cpuTrend > 3) {
      return 'Warnung: CPU-Auslastung steigt. Mögliche Endlosschleife oder ineffiziente Plugins.';
    }

    return undefined;
  }

  /**
   * Berechnet Trend (Steigung) einer Metrik
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

  /**
   * Berechnet Overall Health basierend auf Score
   */
  private calculateOverallHealth(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'FAIR';
    if (score >= 25) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Führt periodische Gesundheitschecks für alle laufenden Server durch
   */
  async performGlobalHealthCheck(): Promise<Map<string, PerformanceAnalysis>> {
    const runningServers = await prisma.minecraftServer.findMany({
      where: { status: ServerStatus.RUNNING },
      include: { stats: true }
    });

    const results = new Map<string, PerformanceAnalysis>();

    for (const server of runningServers) {
      try {
        const analysis = await this.analyzeServerPerformance(server.id);
        results.set(server.id, analysis);

        // Auto-optimize kritische Server
        if (analysis.overallHealth === 'CRITICAL' || analysis.overallHealth === 'POOR') {
          logger.warn(`Server ${server.name} (${server.id}) has ${analysis.overallHealth} health. Auto-optimizing...`);
          await this.autoOptimizeServer(server.id, true);
        }
      } catch (error) {
        logger.error(`Health check failed for server ${server.id}:`, error);
      }
    }

    return results;
  }
}

export default AIPerformanceOptimizerService;
