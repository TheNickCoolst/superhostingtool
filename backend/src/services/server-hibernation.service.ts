import { MinecraftServer, ServerStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AgentService } from './agent.service';
import { logger } from '../lib/logger';

/**
 * 💤 Server Hibernation Service
 *
 * Spart Kosten durch automatisches Schlafen-Legen inaktiver Server:
 * - Server ohne Spieler werden nach X Minuten in Hibernation versetzt
 * - Ressourcen werden freigegeben (Container gestoppt, aber Daten bleiben)
 * - Auto-Wake beim Verbindungsversuch (via Port-Forwarding/Proxy)
 * - Drastische Kosten-Reduktion bei wenig genutzten Servern
 */

export interface HibernationConfig {
  enabled: boolean;
  idleTimeMinutes: number; // Zeit ohne Spieler bis Hibernation
  autoWakeEnabled: boolean; // Auto-Wake bei Verbindungsversuch
  preserveRam: boolean; // RAM-Reservation beibehalten
  scheduleAllowedHours?: [number, number]; // z.B. [8, 22] für 8 Uhr bis 22 Uhr
}

export interface HibernationStatus {
  serverId: string;
  isHibernating: boolean;
  lastActivity?: Date;
  idleMinutes: number;
  estimatedSavings: number; // % der Kosten gespart
  wakeCount: number; // Wie oft wurde Server geweckt
  nextAutoWake?: Date;
}

export class ServerHibernationService {
  private agentService = new AgentService();

  // Default Config
  private readonly DEFAULT_CONFIG: HibernationConfig = {
    enabled: true,
    idleTimeMinutes: 15, // 15 Minuten ohne Spieler
    autoWakeEnabled: true,
    preserveRam: false, // RAM freigeben für maximale Ersparnis
    scheduleAllowedHours: undefined // Immer erlaubt
  };

  /**
   * Prüft ob Server in Hibernation versetzt werden sollte
   */
  async checkHibernationNeed(serverId: string, config?: Partial<HibernationConfig>): Promise<boolean> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (!finalConfig.enabled) {
      return false;
    }

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { stats: true }
    });

    if (!server || server.status !== ServerStatus.RUNNING) {
      return false;
    }

    // Prüfe Spieleranzahl
    if (server.stats && server.stats.onlinePlayers > 0) {
      return false;
    }

    // Prüfe Idle-Zeit
    const lastUpdated = server.stats?.lastUpdated || server.lastStarted || new Date();
    const idleMinutes = (Date.now() - lastUpdated.getTime()) / 1000 / 60;

    if (idleMinutes < finalConfig.idleTimeMinutes) {
      return false;
    }

    // Prüfe Zeitfenster
    if (finalConfig.scheduleAllowedHours) {
      const currentHour = new Date().getHours();
      const [startHour, endHour] = finalConfig.scheduleAllowedHours;

      if (currentHour < startHour || currentHour >= endHour) {
        logger.debug(`Server ${serverId}: Outside hibernation schedule`);
        return false;
      }
    }

    return true;
  }

  /**
   * Versetzt Server in Hibernation
   */
  async hibernateServer(serverId: string): Promise<HibernationStatus> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true, stats: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.status !== ServerStatus.RUNNING) {
      throw new Error(`Server must be running to hibernate (current: ${server.status})`);
    }

    logger.info(`Hibernating server ${server.name} (${serverId})`);

    try {
      // Stoppe Server gracefully
      await this.agentService.stopServer(server.host, server.containerName, true);

      // Update Status in DB
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: {
          status: ServerStatus.STOPPED,
          updatedAt: new Date()
        }
      });

      // Berechne Ersparnis (Container nicht laufend = ~70% Ersparnis)
      const estimatedSavings = 70;

      logger.info(`Server ${server.name} successfully hibernated. Estimated savings: ${estimatedSavings}%`);

      return {
        serverId,
        isHibernating: true,
        lastActivity: server.stats?.lastUpdated || server.lastStarted || undefined,
        idleMinutes: 0,
        estimatedSavings,
        wakeCount: 0
      };
    } catch (error) {
      logger.error(`Failed to hibernate server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Weckt Server aus Hibernation
   */
  async wakeServer(serverId: string, autoWake: boolean = false): Promise<void> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.status !== ServerStatus.STOPPED) {
      logger.warn(`Server ${serverId} is not hibernating (status: ${server.status})`);
      return;
    }

    logger.info(`Waking server ${server.name} (${serverId}) ${autoWake ? '[AUTO]' : '[MANUAL]'}`);

    try {
      // Starte Server
      await this.agentService.startServer(server.host, server.containerName);

      // Update Status
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: {
          status: ServerStatus.RUNNING,
          lastStarted: new Date()
        }
      });

      logger.info(`Server ${server.name} successfully woken up`);
    } catch (error) {
      logger.error(`Failed to wake server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Holt Hibernation-Status für Server
   */
  async getHibernationStatus(serverId: string): Promise<HibernationStatus> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { stats: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const isHibernating = server.status === ServerStatus.STOPPED;
    const lastActivity = server.stats?.lastUpdated || server.lastStarted || undefined;

    let idleMinutes = 0;
    if (lastActivity) {
      idleMinutes = (Date.now() - lastActivity.getTime()) / 1000 / 60;
    }

    // Schätze Ersparnis basierend auf Hibernation-Zeit
    const estimatedSavings = isHibernating ? 70 : 0;

    return {
      serverId,
      isHibernating,
      lastActivity,
      idleMinutes,
      estimatedSavings,
      wakeCount: 0 // TODO: Track in DB
    };
  }

  /**
   * Führt globalen Hibernation-Check für alle Server durch
   */
  async performGlobalHibernationCheck(): Promise<Map<string, boolean>> {
    const runningServers = await prisma.minecraftServer.findMany({
      where: { status: ServerStatus.RUNNING },
      include: { stats: true }
    });

    const results = new Map<string, boolean>();

    for (const server of runningServers) {
      try {
        const shouldHibernate = await this.checkHibernationNeed(server.id);

        if (shouldHibernate) {
          logger.info(`Server ${server.name} meets hibernation criteria. Hibernating...`);
          await this.hibernateServer(server.id);
          results.set(server.id, true);
        } else {
          results.set(server.id, false);
        }
      } catch (error) {
        logger.error(`Hibernation check failed for server ${server.id}:`, error);
        results.set(server.id, false);
      }
    }

    logger.info(`Global hibernation check completed: ${Array.from(results.values()).filter(v => v).length} servers hibernated`);
    return results;
  }

  /**
   * Berechnet Gesamt-Ersparnis durch Hibernation
   */
  async calculateTotalSavings(): Promise<{
    hibernatingServers: number;
    totalServers: number;
    estimatedMonthlySavings: number;
  }> {
    const totalServers = await prisma.minecraftServer.count();
    const hibernatingServers = await prisma.minecraftServer.count({
      where: { status: ServerStatus.STOPPED }
    });

    // Vereinfachte Kalkulation: 70% Ersparnis pro hibernierendem Server
    // Bei durchschnittlich $10/Monat pro Server
    const avgCostPerServer = 10;
    const savingsPerServer = avgCostPerServer * 0.7;
    const estimatedMonthlySavings = hibernatingServers * savingsPerServer;

    return {
      hibernatingServers,
      totalServers,
      estimatedMonthlySavings
    };
  }

  /**
   * Auto-Wake-Funktion für Proxy-Integration
   * Wird aufgerufen wenn jemand versucht sich zu verbinden
   */
  async handleConnectionAttempt(serverId: string): Promise<void> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.status === ServerStatus.STOPPED) {
      logger.info(`Connection attempt to hibernated server ${server.name}. Auto-waking...`);
      await this.wakeServer(serverId, true);
    }
  }
}

export default ServerHibernationService;
