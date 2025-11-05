import { DockerService } from './docker.service';
import Docker from 'dockerode';
import { AgentResponse } from '@minecraft-hosting/shared';

/**
 * Monitoring Service
 * Überwacht Server-Performance und Ressourcen-Nutzung
 */
export class MonitoringService {
  private docker: Docker;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(private dockerService: DockerService) {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  /**
   * Startet kontinuierliches Monitoring
   */
  start() {
    // Alle 10 Sekunden Stats sammeln
    this.monitoringInterval = setInterval(async () => {
      await this.collectStats();
    }, 10000);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * Sammelt Stats von allen laufenden Containern
   */
  private async collectStats() {
    try {
      const containers = await this.docker.listContainers({
        filters: { name: ['mc-'] }
      });

      for (const containerInfo of containers) {
        const container = this.docker.getContainer(containerInfo.Id);
        const stats = await container.stats({ stream: false });

        // Berechne CPU und Memory Usage
        const cpuUsage = this.calculateCpuUsage(stats);
        const memoryUsage = this.calculateMemoryUsage(stats);

        console.log(`[${containerInfo.Names[0]}] CPU: ${cpuUsage.toFixed(2)}%, RAM: ${memoryUsage.toFixed(2)} MB`);

        // TODO: Sende Stats an Backend via WebSocket oder API
      }
    } catch (error) {
      console.error('Failed to collect stats:', error);
    }
  }

  /**
   * Holt aktuelle Stats für einen spezifischen Server
   */
  async getServerStats(containerName: string): Promise<AgentResponse> {
    try {
      const container = this.docker.getContainer(containerName);
      const stats = await container.stats({ stream: false });
      const info = await container.inspect();

      const cpuUsage = this.calculateCpuUsage(stats);
      const memoryUsage = this.calculateMemoryUsage(stats);
      const uptime = this.calculateUptime(info);

      return {
        success: true,
        data: {
          cpuUsage,
          ramUsage: memoryUsage,
          uptime,
          status: info.State.Status,
          // Minecraft-spezifische Stats würden hier hinzugefügt
          // (z.B. TPS, Online-Spieler durch RCON)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Berechnet CPU-Nutzung in Prozent
   */
  private calculateCpuUsage(stats: any): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage -
                        stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * cpuCount * 100;
    }

    return 0;
  }

  /**
   * Berechnet Memory-Nutzung in MB
   */
  private calculateMemoryUsage(stats: any): number {
    const memoryUsage = stats.memory_stats.usage || 0;
    return memoryUsage / (1024 * 1024); // Bytes to MB
  }

  /**
   * Berechnet Uptime in Sekunden
   */
  private calculateUptime(info: any): number {
    const startedAt = new Date(info.State.StartedAt);
    const now = new Date();
    return Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  }
}
