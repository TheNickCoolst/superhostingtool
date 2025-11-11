// AI-powered Server Optimization Service
import prisma from '../lib/prisma.singleton';
import logger from '../lib/logger';

export class AIOptimizationService {
  /**
   * Analysiere Server und erstelle Optimierungsempfehlungen
   */
  async analyzeServer(serverId: string) {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: {
        stats: true,
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 100, // Letzte 100 Metriken
        },
      },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const recommendations: any[] = [];

    // Analysiere RAM-Nutzung
    if (server.stats) {
      const ramUsagePercent = (server.stats.ramUsage / server.allocatedRam) * 100;

      if (ramUsagePercent > 90) {
        recommendations.push(
          await this.createRecommendation(serverId, {
            type: 'RAM_OPTIMIZATION',
            severity: 'CRITICAL',
            title: 'RAM-Auslastung kritisch',
            description: `Server nutzt ${ramUsagePercent.toFixed(1)}% des zugewiesenen RAMs. Erhöhen Sie den RAM um mindestens 1GB.`,
            estimatedImpact: 'Performance-Verbesserung um 30-50%, weniger Lags',
          })
        );
      } else if (ramUsagePercent < 50 && server.allocatedRam > 2048) {
        recommendations.push(
          await this.createRecommendation(serverId, {
            type: 'RAM_OPTIMIZATION',
            severity: 'LOW',
            title: 'RAM-Überallokation',
            description: `Server nutzt nur ${ramUsagePercent.toFixed(1)}% des RAMs. Sie könnten RAM reduzieren und Kosten sparen.`,
            estimatedImpact: 'Kostenersparnis ohne Performance-Verlust',
          })
        );
      }

      // Analysiere CPU-Nutzung
      const cpuUsagePercent = server.stats.cpuUsage;

      if (cpuUsagePercent > 90) {
        recommendations.push(
          await this.createRecommendation(serverId, {
            type: 'CPU_OPTIMIZATION',
            severity: 'HIGH',
            title: 'CPU-Auslastung zu hoch',
            description: `Server nutzt ${cpuUsagePercent.toFixed(1)}% CPU. Erhöhen Sie CPU-Cores oder optimieren Sie Plugins.`,
            estimatedImpact: 'TPS-Verbesserung, weniger Lag-Spikes',
          })
        );
      }

      // Analysiere TPS
      if (server.stats.tps < 18) {
        recommendations.push(
          await this.createRecommendation(serverId, {
            type: 'PLUGIN_OPTIMIZATION',
            severity: 'HIGH',
            title: 'Niedrige TPS erkannt',
            description: `Server läuft mit nur ${server.stats.tps.toFixed(1)} TPS (sollte 20 sein). Prüfen Sie Plugins und Redstone-Anlagen.`,
            estimatedImpact: 'Besseres Spielerlebnis, flüssigere Bewegungen',
          })
        );
      }
    }

    // Analysiere historische Metriken
    if (server.metrics.length > 0) {
      const avgCpu = server.metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / server.metrics.length;
      const avgRam = server.metrics.reduce((sum, m) => sum + m.ramUsage, 0) / server.metrics.length;

      // Erkenne Trends
      if (avgRam > server.allocatedRam * 0.85) {
        recommendations.push(
          await this.createRecommendation(serverId, {
            type: 'RAM_OPTIMIZATION',
            severity: 'MEDIUM',
            title: 'RAM-Nutzung steigt kontinuierlich',
            description: 'Analyse zeigt steigenden RAM-Verbrauch. Erwägen Sie präventive RAM-Erhöhung.',
            estimatedImpact: 'Vermeidung zukünftiger Crashes',
          })
        );
      }

      // Erkenne Entities/Chunks-Probleme
      const latestMetric = server.metrics[0];
      if (latestMetric.entities && latestMetric.entities > 1000) {
        recommendations.push(
          await this.createRecommendation(serverId, {
            type: 'WORLD_OPTIMIZATION',
            severity: 'MEDIUM',
            title: 'Zu viele Entities',
            description: `Server hat ${latestMetric.entities} Entities. Reduzieren Sie Mob-Farmen oder nutzen Sie Entity-Clearer.`,
            estimatedImpact: 'TPS-Verbesserung um 10-20%',
          })
        );
      }
    }

    // JVM-Flags Empfehlungen basierend auf RAM
    if (server.allocatedRam >= 4096) {
      const hasOptimizedFlags = await this.checkJVMFlags(serverId);
      if (!hasOptimizedFlags) {
        recommendations.push(
          await this.createRecommendation(serverId, {
            type: 'JVM_FLAGS',
            severity: 'MEDIUM',
            title: 'JVM-Flags nicht optimiert',
            description: 'Server könnte von optimierten JVM-Flags profitieren (G1GC, optimized heap settings).',
            estimatedImpact: 'Performance-Verbesserung um 15-25%',
          })
        );
      }
    }

    logger.info('Server analysis completed', {
      serverId,
      recommendations: recommendations.length,
    });

    return recommendations;
  }

  /**
   * Erstelle eine Optimierungsempfehlung
   */
  private async createRecommendation(serverId: string, data: any) {
    // Prüfe ob ähnliche Empfehlung bereits existiert
    const existing = await prisma.optimizationRecommendation.findFirst({
      where: {
        serverId,
        type: data.type,
        applied: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Letzte 24h
        },
      },
    });

    if (existing) {
      return existing; // Keine Duplikate
    }

    return await prisma.optimizationRecommendation.create({
      data: {
        serverId,
        ...data,
      },
    });
  }

  /**
   * Hole alle Empfehlungen für einen Server
   */
  async getRecommendations(serverId: string, includeApplied: boolean = false) {
    return await prisma.optimizationRecommendation.findMany({
      where: {
        serverId,
        applied: includeApplied ? undefined : false,
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Markiere Empfehlung als angewendet
   */
  async applyRecommendation(recommendationId: string) {
    const recommendation = await prisma.optimizationRecommendation.update({
      where: { id: recommendationId },
      data: {
        applied: true,
        appliedAt: new Date(),
      },
    });

    logger.info('Recommendation applied', { recommendationId });
    return recommendation;
  }

  /**
   * Auto-Optimize: Wende automatisch sichere Optimierungen an
   */
  async autoOptimize(serverId: string) {
    const recommendations = await this.getRecommendations(serverId);
    const appliedRecommendations: string[] = [];

    for (const rec of recommendations) {
      // Nur sichere, nicht-invasive Optimierungen automatisch anwenden
      if (rec.severity === 'LOW' || rec.type === 'JVM_FLAGS') {
        try {
          await this.applyOptimization(serverId, rec);
          await this.applyRecommendation(rec.id);
          appliedRecommendations.push(rec.title);
        } catch (error: any) {
          logger.error('Failed to apply optimization', {
            recommendationId: rec.id,
            error: error.message,
          });
        }
      }
    }

    return {
      applied: appliedRecommendations.length,
      recommendations: appliedRecommendations,
    };
  }

  /**
   * Wende eine spezifische Optimierung an
   */
  private async applyOptimization(serverId: string, recommendation: any) {
    switch (recommendation.type) {
      case 'RAM_OPTIMIZATION':
        // Implementiere RAM-Anpassung
        break;
      case 'CPU_OPTIMIZATION':
        // Implementiere CPU-Anpassung
        break;
      case 'JVM_FLAGS':
        // Implementiere JVM-Flags-Update
        break;
      // ... weitere Optimierungen
    }
  }

  /**
   * Prüfe JVM-Flags (Platzhalter)
   */
  private async checkJVMFlags(serverId: string): Promise<boolean> {
    // TODO: Implementiere Check für optimierte JVM-Flags
    return false;
  }

  /**
   * Predictive Scaling: Vorhersage von Ressourcenbedarf
   */
  async predictResourceNeeds(serverId: string): Promise<{
    recommendedRam: number;
    recommendedCpu: number;
    confidence: number;
  }> {
    const metrics = await prisma.serverMetrics.findMany({
      where: { serverId },
      orderBy: { timestamp: 'desc' },
      take: 1000, // Letzte 1000 Metriken
    });

    if (metrics.length < 10) {
      throw new Error('Not enough data for prediction');
    }

    // Einfache Vorhersage basierend auf Durchschnitt + Buffer
    const avgRam = metrics.reduce((sum, m) => sum + m.ramUsage, 0) / metrics.length;
    const maxRam = Math.max(...metrics.map(m => m.ramUsage));
    const avgCpu = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;

    // Empfehle 20% Buffer über dem Maximum
    const recommendedRam = Math.ceil((maxRam * 1.2) / 512) * 512; // Runde auf 512MB
    const recommendedCpu = avgCpu > 0.8 ? 2 : 1;

    const confidence = metrics.length / 1000; // Je mehr Daten, desto höher die Confidence

    return {
      recommendedRam,
      recommendedCpu,
      confidence,
    };
  }

  /**
   * Lösche alte angewendete Empfehlungen
   */
  async cleanupOldRecommendations(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.optimizationRecommendation.deleteMany({
      where: {
        applied: true,
        appliedAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('Cleaned up old recommendations', { deleted: result.count });
    return result.count;
  }
}

export default new AIOptimizationService();
