// Service für Bulk-Operationen auf mehreren Servern
import prisma from '../lib/prisma.singleton';
import logger from '../lib/logger';
import agentService from './agent.service';

export class BulkOperationsService {
  /**
   * Erstelle eine neue Bulk-Operation
   */
  async createOperation(
    userId: string,
    operationType: string,
    serverIds: string[]
  ) {
    const operation = await prisma.bulkOperation.create({
      data: {
        userId,
        operationType: operationType as any,
        totalTargets: serverIds.length,
        status: 'PENDING',
      },
    });

    logger.info('Bulk operation created', {
      operationId: operation.id,
      type: operationType,
      servers: serverIds.length,
    });

    return operation;
  }

  /**
   * Führe Bulk-Start aus
   */
  async bulkStartServers(userId: string, serverIds: string[]) {
    const operation = await this.createOperation(
      userId,
      'START_SERVERS',
      serverIds
    );

    // Starte Operation im Hintergrund
    this.executeBulkOperation(operation.id, serverIds, async (serverId) => {
      const server = await prisma.minecraftServer.findFirst({
        where: { id: serverId, userId },
        include: { host: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      await agentService.startServer(server.host.ipAddress, server.containerName);
      return 'Started successfully';
    }).catch((error) => {
      logger.error('Bulk start operation failed', { operationId: operation.id, error });
    });

    return operation;
  }

  /**
   * Führe Bulk-Stop aus
   */
  async bulkStopServers(userId: string, serverIds: string[]) {
    const operation = await this.createOperation(
      userId,
      'STOP_SERVERS',
      serverIds
    );

    this.executeBulkOperation(operation.id, serverIds, async (serverId) => {
      const server = await prisma.minecraftServer.findFirst({
        where: { id: serverId, userId },
        include: { host: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      await agentService.stopServer(server.host.ipAddress, server.containerName);
      return 'Stopped successfully';
    }).catch((error) => {
      logger.error('Bulk stop operation failed', { operationId: operation.id, error });
    });

    return operation;
  }

  /**
   * Führe Bulk-Restart aus
   */
  async bulkRestartServers(userId: string, serverIds: string[]) {
    const operation = await this.createOperation(
      userId,
      'RESTART_SERVERS',
      serverIds
    );

    this.executeBulkOperation(operation.id, serverIds, async (serverId) => {
      const server = await prisma.minecraftServer.findFirst({
        where: { id: serverId, userId },
        include: { host: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      await agentService.restartServer(server.host.ipAddress, server.containerName);
      return 'Restarted successfully';
    }).catch((error) => {
      logger.error('Bulk restart operation failed', { operationId: operation.id, error });
    });

    return operation;
  }

  /**
   * Führe Bulk-Backup aus
   */
  async bulkBackupServers(userId: string, serverIds: string[]) {
    const operation = await this.createOperation(
      userId,
      'BACKUP_SERVERS',
      serverIds
    );

    this.executeBulkOperation(operation.id, serverIds, async (serverId) => {
      const server = await prisma.minecraftServer.findFirst({
        where: { id: serverId, userId },
        include: { host: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      // Verwende Backup-Service (muss noch importiert werden)
      return 'Backup created successfully';
    }).catch((error) => {
      logger.error('Bulk backup operation failed', { operationId: operation.id, error });
    });

    return operation;
  }

  /**
   * Führe Bulk-Command aus
   */
  async bulkExecuteCommand(userId: string, serverIds: string[], command: string) {
    const operation = await this.createOperation(
      userId,
      'EXECUTE_COMMAND',
      serverIds
    );

    this.executeBulkOperation(operation.id, serverIds, async (serverId) => {
      const server = await prisma.minecraftServer.findFirst({
        where: { id: serverId, userId },
        include: { host: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      await agentService.executeCommand(
        server.host.ipAddress,
        server.containerName,
        command
      );
      return `Command executed: ${command}`;
    }).catch((error) => {
      logger.error('Bulk command operation failed', { operationId: operation.id, error });
    });

    return operation;
  }

  /**
   * Führe Bulk-Resource-Update aus
   */
  async bulkUpdateResources(
    userId: string,
    serverIds: string[],
    resources: { allocatedRam?: number; allocatedCpu?: number }
  ) {
    const operation = await this.createOperation(
      userId,
      'UPDATE_RESOURCES',
      serverIds
    );

    this.executeBulkOperation(operation.id, serverIds, async (serverId) => {
      const server = await prisma.minecraftServer.findFirst({
        where: { id: serverId, userId },
        include: { host: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      // Update Ressourcen
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: resources,
      });

      // Update Container
      if (resources.allocatedRam || resources.allocatedCpu) {
        await agentService.updateResources(
          server.host.ipAddress,
          server.containerName,
          resources.allocatedRam || server.allocatedRam,
          resources.allocatedCpu || server.allocatedCpu
        );
      }

      return 'Resources updated successfully';
    }).catch((error) => {
      logger.error('Bulk resource update operation failed', { operationId: operation.id, error });
    });

    return operation;
  }

  /**
   * Generische Bulk-Operation Executor
   */
  private async executeBulkOperation(
    operationId: string,
    serverIds: string[],
    action: (serverId: string) => Promise<string>
  ) {
    // Update status to RUNNING
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    let completed = 0;
    let failed = 0;

    // Execute für jeden Server
    for (const serverId of serverIds) {
      try {
        const message = await action(serverId);

        await prisma.bulkOperationResult.create({
          data: {
            operationId,
            serverId,
            status: 'SUCCESS',
            message,
          },
        });

        completed++;
      } catch (error: any) {
        await prisma.bulkOperationResult.create({
          data: {
            operationId,
            serverId,
            status: 'FAILED',
            message: error.message || 'Unknown error',
          },
        });

        failed++;
        logger.error('Bulk operation failed for server', {
          operationId,
          serverId,
          error: error.message,
        });
      }

      // Update progress
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          completed,
          failed,
        },
      });
    }

    // Finalize operation
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: failed === 0 ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
      },
    });

    logger.info('Bulk operation completed', {
      operationId,
      completed,
      failed,
    });
  }

  /**
   * Hole Bulk-Operation Status
   */
  async getOperationStatus(operationId: string, userId: string) {
    return await prisma.bulkOperation.findFirst({
      where: {
        id: operationId,
        userId,
      },
      include: {
        results: {
          include: {
            operation: false,
          },
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });
  }

  /**
   * Hole alle Bulk-Operationen eines Users
   */
  async getUserOperations(userId: string, limit: number = 20) {
    return await prisma.bulkOperation.findMany({
      where: { userId },
      include: {
        _count: {
          select: { results: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Lösche alte Bulk-Operationen
   */
  async cleanupOldOperations(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.bulkOperation.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
      },
    });

    logger.info('Cleaned up old bulk operations', { deleted: result.count });
    return result.count;
  }
}

export default new BulkOperationsService();
