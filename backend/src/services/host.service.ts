import { PrismaClient, Host, HostStatus } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class HostService {
  /**
   * Findet den besten verfügbaren Host basierend auf Ressourcen
   * Berücksichtigt: RAM, CPU, aktuelle Last, Region
   */
  async findAvailableHost(requiredRam: number, requiredCpu: number): Promise<Host | null> {
    const hosts = await prisma.host.findMany({
      where: {
        status: HostStatus.ONLINE,
        AND: [
          {
            totalRam: {
              gte: prisma.host.fields.usedRam
            }
          }
        ]
      }
    });

    // Filtere Hosts mit genug freien Ressourcen
    const availableHosts = hosts.filter(host => {
      const freeRam = host.totalRam - host.usedRam;
      const freeCpu = host.totalCpu - host.usedCpu;
      return freeRam >= requiredRam && freeCpu >= requiredCpu && host.activeServers < host.maxServers;
    });

    if (availableHosts.length === 0) {
      return null;
    }

    // Wähle Host mit der niedrigsten Auslastung (Load Balancing)
    availableHosts.sort((a, b) => {
      const loadA = (a.usedRam / a.totalRam + a.usedCpu / a.totalCpu) / 2;
      const loadB = (b.usedRam / b.totalRam + b.usedCpu / b.totalCpu) / 2;
      return loadA - loadB;
    });

    return availableHosts[0];
  }

  async updateResourceUsage(
    hostId: string,
    ramDelta: number,
    cpuDelta: number,
    serverDelta: number
  ): Promise<Host> {
    const host = await prisma.host.findUnique({
      where: { id: hostId }
    });

    if (!host) {
      throw new AppError('Host not found', 404);
    }

    const newUsedRam = host.usedRam + ramDelta;
    const newUsedCpu = host.usedCpu + cpuDelta;
    const newActiveServers = host.activeServers + serverDelta;

    // Prüfe Limits
    if (newUsedRam > host.totalRam || newUsedCpu > host.totalCpu) {
      throw new AppError('Host resource limit exceeded', 400);
    }

    return prisma.host.update({
      where: { id: hostId },
      data: {
        usedRam: newUsedRam,
        usedCpu: newUsedCpu,
        activeServers: newActiveServers,
        status: this.calculateHostStatus(newUsedRam, host.totalRam, newUsedCpu, host.totalCpu)
      }
    });
  }

  private calculateHostStatus(usedRam: number, totalRam: number, usedCpu: number, totalCpu: number): HostStatus {
    const ramUsagePercent = (usedRam / totalRam) * 100;
    const cpuUsagePercent = (usedCpu / totalCpu) * 100;

    if (ramUsagePercent > 90 || cpuUsagePercent > 90) {
      return HostStatus.OVERLOADED;
    }

    return HostStatus.ONLINE;
  }

  async getAllHosts(): Promise<Host[]> {
    return prisma.host.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getHostById(hostId: string): Promise<Host> {
    const host = await prisma.host.findUnique({
      where: { id: hostId }
    });

    if (!host) {
      throw new AppError('Host not found', 404);
    }

    return host;
  }

  async updateHostHeartbeat(hostId: string): Promise<void> {
    await prisma.host.update({
      where: { id: hostId },
      data: {
        lastHeartbeat: new Date(),
        status: HostStatus.ONLINE
      }
    });
  }
}
