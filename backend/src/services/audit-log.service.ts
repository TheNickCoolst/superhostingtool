import { prisma } from '../lib/prisma';

export class AuditLogService {
  // Log an action
  async log(data: {
    organizationId: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  }) {
    return prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
        severity: data.severity || 'INFO',
      },
    });
  }

  // Get logs for organization
  async getLogs(organizationId: string, options: {
    userId?: string;
    action?: string;
    resource?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { organizationId };

    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = { contains: options.action };
    if (options.resource) where.resource = options.resource;
    if (options.severity) where.severity = options.severity;
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.limit || 100,
        skip: options.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  // Get logs by user
  async getUserLogs(userId: string, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  // Get critical logs
  async getCriticalLogs(organizationId: string, limit: number = 50) {
    return prisma.auditLog.findMany({
      where: {
        organizationId,
        severity: 'CRITICAL',
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  // Delete old logs
  async deleteOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });
  }

  // Export logs
  async exportLogs(organizationId: string, format: 'json' | 'csv' = 'json') {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
    });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'userId', 'action', 'resource', 'resourceId', 'severity'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.timestamp.toISOString(),
        log.userId || '',
        log.action,
        log.resource,
        log.resourceId || '',
        log.severity,
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}

export const auditLogService = new AuditLogService();
