// Audit Log Service für Compliance und Security
import prisma from '../lib/prisma.singleton';
import logger from '../lib/logger';

export class AuditLogService {
  /**
   * Erstelle einen Audit-Log-Eintrag
   */
  async log(data: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    logger.info('Audit log created', {
      action: data.action,
      resourceType: data.resourceType,
      userId: data.userId,
    });

    return auditLog;
  }

  /**
   * Hole Audit-Logs für einen User
   */
  async getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: any = { userId };

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.resourceType) {
      where.resourceType = options.resourceType;
    }

    if (options?.startDate || options?.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    };
  }

  /**
   * Hole Audit-Logs für eine Resource
   */
  async getResourceLogs(resourceType: string, resourceId: string, limit: number = 50) {
    return await prisma.auditLog.findMany({
      where: {
        resourceType,
        resourceId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Hole alle Audit-Logs (Admin)
   */
  async getAllLogs(options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.resourceType) {
      where.resourceType = options.resourceType;
    }

    if (options?.startDate || options?.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: options?.limit || 100,
      offset: options?.offset || 0,
    };
  }

  /**
   * Suche in Audit-Logs
   */
  async search(query: string, limit: number = 50) {
    // Suche in action, resourceType, resourceId
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: query, mode: 'insensitive' } },
          { resourceType: { contains: query, mode: 'insensitive' } },
          { resourceId: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs;
  }

  /**
   * Statistiken über Aktionen
   */
  async getActionStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const stats = await prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    return stats.map((stat) => ({
      action: stat.action,
      count: stat._count.action,
    }));
  }

  /**
   * Statistiken über User-Aktivität
   */
  async getUserActivityStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const stats = await prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 20,
    });

    // Hole User-Informationen
    const userIds = stats.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return stats.map((stat) => ({
      user: userMap.get(stat.userId),
      activityCount: stat._count.userId,
    }));
  }

  /**
   * Exportiere Audit-Logs als CSV
   */
  async exportToCSV(options?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<string> {
    const { logs } = await this.getAllLogs({
      userId: options?.userId,
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: 10000, // Max export
    });

    // CSV Header
    let csv = 'Timestamp,User,Action,Resource Type,Resource ID,IP Address,Details\n';

    // CSV Rows
    for (const log of logs) {
      const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
      csv += `"${log.timestamp.toISOString()}","${log.user.username}","${log.action}","${log.resourceType}","${log.resourceId || ''}","${log.ipAddress || ''}","${details}"\n`;
    }

    return csv;
  }

  /**
   * Lösche alte Audit-Logs (Retention Policy)
   */
  async cleanupOldLogs(daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('Cleaned up old audit logs', {
      deleted: result.count,
      cutoffDate,
    });

    return result.count;
  }

  /**
   * Häufig verwendete Audit-Log-Aktionen
   */
  static readonly Actions = {
    // User Actions
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_REGISTER: 'user.register',
    USER_UPDATE_PROFILE: 'user.update_profile',
    USER_CHANGE_PASSWORD: 'user.change_password',
    USER_ENABLE_2FA: 'user.enable_2fa',
    USER_DISABLE_2FA: 'user.disable_2fa',

    // Server Actions
    SERVER_CREATE: 'server.create',
    SERVER_DELETE: 'server.delete',
    SERVER_START: 'server.start',
    SERVER_STOP: 'server.stop',
    SERVER_RESTART: 'server.restart',
    SERVER_UPDATE: 'server.update',
    SERVER_UPDATE_RESOURCES: 'server.update_resources',

    // Backup Actions
    BACKUP_CREATE: 'backup.create',
    BACKUP_RESTORE: 'backup.restore',
    BACKUP_DELETE: 'backup.delete',

    // File Actions
    FILE_READ: 'file.read',
    FILE_WRITE: 'file.write',
    FILE_DELETE: 'file.delete',
    FILE_UPLOAD: 'file.upload',

    // Admin Actions
    ADMIN_USER_DELETE: 'admin.user.delete',
    ADMIN_USER_UPDATE: 'admin.user.update',
    ADMIN_HOST_CREATE: 'admin.host.create',
    ADMIN_HOST_DELETE: 'admin.host.delete',
  };
}

export default new AuditLogService();
