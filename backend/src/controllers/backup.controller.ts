import { Response, NextFunction } from 'express';
import { PrismaClient, BackupType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { AgentService } from '../services/agent.service';

const prisma = new PrismaClient();

export class BackupController {
  private agentService = new AgentService();

  getServerBackups = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { serverId } = req.params;
      const userId = req.user!.id;

      // Prüfe, ob Server dem User gehört
      const server = await prisma.minecraftServer.findFirst({
        where: {
          id: serverId,
          userId
        }
      });

      if (!server) {
        throw new AppError('Server not found or unauthorized', 404);
      }

      const backups = await prisma.backup.findMany({
        where: { serverId },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ backups });
    } catch (error) {
      next(error);
    }
  };

  createBackup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { serverId } = req.params;
      const userId = req.user!.id;
      const { name } = req.body;

      // Prüfe, ob Server dem User gehört
      const server = await prisma.minecraftServer.findFirst({
        where: {
          id: serverId,
          userId
        },
        include: {
          host: true
        }
      });

      if (!server) {
        throw new AppError('Server not found or unauthorized', 404);
      }

      const backupName = name || `manual-backup-${new Date().toISOString()}`;

      // Erstelle Backup-Eintrag
      const backup = await prisma.backup.create({
        data: {
          serverId,
          name: backupName,
          size: 0,
          type: BackupType.MANUAL,
          filePath: `/backups/${serverId}/${backupName}.tar.gz`
        }
      });

      // Sende Backup-Befehl an Agent
      const result = await this.agentService.createBackup(server.host, server, backupName);

      if (result.success && result.data?.size) {
        await prisma.backup.update({
          where: { id: backup.id },
          data: {
            size: result.data.size,
            status: 'COMPLETED' as any
          }
        });
      }

      res.status(201).json({
        message: 'Backup created successfully',
        backup
      });
    } catch (error) {
      next(error);
    }
  };

  restoreBackup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { backupId } = req.params;
      const userId = req.user!.id;

      const backup = await prisma.backup.findUnique({
        where: { id: backupId },
        include: {
          server: {
            include: {
              host: true
            }
          }
        }
      });

      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      if (backup.server.userId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      // Sende Restore-Befehl an Agent
      await this.agentService.restoreBackup(backup.server.host, backup.server, backup.filePath);

      await prisma.backup.update({
        where: { id: backupId },
        data: {
          restoredAt: new Date()
        }
      });

      res.json({
        message: 'Backup restored successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  deleteBackup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { backupId } = req.params;
      const userId = req.user!.id;

      const backup = await prisma.backup.findUnique({
        where: { id: backupId },
        include: {
          server: true
        }
      });

      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      if (backup.server.userId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      await prisma.backup.delete({
        where: { id: backupId }
      });

      res.json({
        message: 'Backup deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
