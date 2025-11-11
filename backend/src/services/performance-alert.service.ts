import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';

export class PerformanceAlertService {
  // Create alert
  async createAlert(data: {
    serverId: string;
    alertType: string;
    severity: string;
    message: string;
    metadata?: any;
  }) {
    const alert = await prisma.performanceAlert.create({
      data: {
        serverId: data.serverId,
        alertType: data.alertType as any,
        severity: data.severity as any,
        message: data.message,
        metadata: data.metadata,
      },
    });

    // Send notification
    const server = await prisma.minecraftServer.findUnique({
      where: { id: data.serverId },
      include: { user: true },
    });

    if (server) {
      await notificationService.sendNotification(server.userId, {
        type: 'SERVER_ALERT',
        title: `${data.alertType} Alert`,
        message: data.message,
        serverId: data.serverId,
        severity: data.severity,
      });
    }

    return alert;
  }

  // Check server health and create alerts
  async checkServerHealth(serverId: string) {
    const stats = await prisma.serverStats.findUnique({
      where: { serverId },
    });

    if (!stats) return;

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
    });

    if (!server) return;

    const alerts: any[] = [];

    // Check CPU
    const cpuPercent = (stats.cpuUsage / server.allocatedCpu) * 100;
    if (cpuPercent > 90) {
      alerts.push({
        serverId,
        alertType: 'HIGH_CPU',
        severity: 'CRITICAL',
        message: `CPU usage is at ${cpuPercent.toFixed(1)}%`,
        metadata: { cpuUsage: stats.cpuUsage, limit: server.allocatedCpu },
      });
    } else if (cpuPercent > 75) {
      alerts.push({
        serverId,
        alertType: 'HIGH_CPU',
        severity: 'WARNING',
        message: `CPU usage is at ${cpuPercent.toFixed(1)}%`,
        metadata: { cpuUsage: stats.cpuUsage, limit: server.allocatedCpu },
      });
    }

    // Check RAM
    const ramPercent = (stats.ramUsage / server.allocatedRam) * 100;
    if (ramPercent > 90) {
      alerts.push({
        serverId,
        alertType: 'HIGH_RAM',
        severity: 'CRITICAL',
        message: `RAM usage is at ${ramPercent.toFixed(1)}%`,
        metadata: { ramUsage: stats.ramUsage, limit: server.allocatedRam },
      });
    } else if (ramPercent > 80) {
      alerts.push({
        serverId,
        alertType: 'HIGH_RAM',
        severity: 'WARNING',
        message: `RAM usage is at ${ramPercent.toFixed(1)}%`,
        metadata: { ramUsage: stats.ramUsage, limit: server.allocatedRam },
      });
    }

    // Check TPS
    if (stats.tps < 15) {
      alerts.push({
        serverId,
        alertType: 'LOW_TPS',
        severity: 'CRITICAL',
        message: `Server TPS is critically low at ${stats.tps.toFixed(1)}`,
        metadata: { tps: stats.tps },
      });
    } else if (stats.tps < 18) {
      alerts.push({
        serverId,
        alertType: 'LOW_TPS',
        severity: 'WARNING',
        message: `Server TPS is low at ${stats.tps.toFixed(1)}`,
        metadata: { tps: stats.tps },
      });
    }

    // Create alerts
    for (const alert of alerts) {
      // Check if similar alert exists in last hour
      const existingAlert = await prisma.performanceAlert.findFirst({
        where: {
          serverId,
          alertType: alert.alertType,
          resolved: false,
          createdAt: {
            gte: new Date(Date.now() - 3600000), // 1 hour
          },
        },
      });

      if (!existingAlert) {
        await this.createAlert(alert);
      }
    }
  }

  // Get alerts for server
  async getAlerts(serverId: string, options?: {
    resolved?: boolean;
    severity?: string;
    limit?: number;
  }) {
    return prisma.performanceAlert.findMany({
      where: {
        serverId,
        resolved: options?.resolved,
        severity: options?.severity as any,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
    });
  }

  // Resolve alert
  async resolveAlert(alertId: string, acknowledgedBy?: string) {
    return prisma.performanceAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        acknowledgedBy,
      },
    });
  }

  // Auto-resolve old alerts
  async autoResolveOldAlerts(hoursOld: number = 24) {
    const cutoffDate = new Date(Date.now() - hoursOld * 3600000);

    return prisma.performanceAlert.updateMany({
      where: {
        resolved: false,
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  // Get alert statistics
  async getAlertStatistics(serverId: string, days: number = 7) {
    const startDate = new Date(Date.now() - days * 86400000);

    const alerts = await prisma.performanceAlert.findMany({
      where: {
        serverId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    const stats = {
      total: alerts.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      resolved: alerts.filter(a => a.resolved).length,
      unresolved: alerts.filter(a => !a.resolved).length,
    };

    for (const alert of alerts) {
      stats.byType[alert.alertType] = (stats.byType[alert.alertType] || 0) + 1;
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
    }

    return stats;
  }
}

export const performanceAlertService = new PerformanceAlertService();
