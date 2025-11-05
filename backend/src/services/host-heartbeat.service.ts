import { PrismaClient, HostStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Host Heartbeat Service
 * Überwacht die Verfügbarkeit der Hosts
 * Markiert Hosts als offline, wenn kein Heartbeat empfangen wurde
 */
export class HostHeartbeatService {
  private interval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_TIMEOUT = 60000; // 1 Minute

  start() {
    // Prüfe alle 30 Sekunden
    this.interval = setInterval(async () => {
      await this.checkHeartbeats();
    }, 30000);

    console.log('Host heartbeat service initialized');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('Host heartbeat service stopped');
    }
  }

  private async checkHeartbeats() {
    try {
      const hosts = await prisma.host.findMany({
        where: {
          status: {
            not: HostStatus.MAINTENANCE
          }
        }
      });

      const now = new Date();

      for (const host of hosts) {
        const lastHeartbeat = host.lastHeartbeat;

        if (!lastHeartbeat) {
          // Kein Heartbeat empfangen - markiere als offline
          await this.markHostOffline(host.id);
          continue;
        }

        const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();

        if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          // Heartbeat zu alt - markiere als offline
          await this.markHostOffline(host.id);
        }
      }
    } catch (error) {
      console.error('Heartbeat check failed:', error);
    }
  }

  private async markHostOffline(hostId: string) {
    await prisma.host.update({
      where: { id: hostId },
      data: {
        status: HostStatus.OFFLINE
      }
    });

    console.log(`Host ${hostId} marked as offline due to missing heartbeat`);
  }
}
