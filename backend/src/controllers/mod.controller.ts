import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';
import { AgentService } from '../services/agent.service';


export class ModController {
  private agentService = new AgentService();

  getAllMods = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { modLoader, minecraftVersion } = req.query;

      const mods = await prisma.mod.findMany({
        where: {
          ...(modLoader && { modLoader: modLoader as any }),
          ...(minecraftVersion && { minecraftVersion: minecraftVersion as string })
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ mods });
    } catch (error) {
      next(error);
    }
  };

  getModById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const mod = await prisma.mod.findUnique({
        where: { id }
      });

      if (!mod) {
        throw new AppError('Mod not found', 404);
      }

      res.json({ mod });
    } catch (error) {
      next(error);
    }
  };

  uploadMod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const { name, description, version, minecraftVersion, modLoader, author } = req.body;

      const mod = await prisma.mod.create({
        data: {
          name,
          description,
          version,
          minecraftVersion,
          modLoader,
          author,
          fileName: req.file.filename,
          fileSize: req.file.size,
          fileUrl: `/uploads/mods/${req.file.filename}`
        }
      });

      res.status(201).json({
        message: 'Mod uploaded successfully',
        mod
      });
    } catch (error) {
      next(error);
    }
  };

  installMod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { modId, serverId } = req.params;
      const userId = req.user!.id;

      // Prüfe, ob Server dem User gehört und lade Host-Informationen
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

      // Prüfe, ob Mod existiert
      const mod = await prisma.mod.findUnique({
        where: { id: modId }
      });

      if (!mod) {
        throw new AppError('Mod not found', 404);
      }

      // Prüfe, ob Mod-Loader kompatibel ist
      if (server.minecraftVersion !== mod.modLoader) {
        throw new AppError(`Server is running ${server.minecraftVersion}, but mod requires ${mod.modLoader}`, 400);
      }

      // Installiere Mod in der Datenbank
      const serverMod = await prisma.serverMod.create({
        data: {
          modId,
          serverId,
          enabled: true
        },
        include: {
          mod: true
        }
      });

      // Sende Installation an Agent
      try {
        const result = await this.agentService.installMod(server.host, server, mod.fileName);

        if (!result.success) {
          // Rollback: Entferne Mod aus Datenbank wenn Installation fehlschlägt
          await prisma.serverMod.delete({ where: { id: serverMod.id } });
          throw new AppError(result.error || 'Failed to install mod on server', 500);
        }
      } catch (error) {
        // Rollback bei Fehler
        await prisma.serverMod.delete({ where: { id: serverMod.id } });
        throw error;
      }

      res.status(201).json({
        message: 'Mod installed successfully',
        serverMod
      });
    } catch (error) {
      next(error);
    }
  };

  uninstallMod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { modId, serverId } = req.params;
      const userId = req.user!.id;

      // Prüfe, ob Server dem User gehört und lade Host-Informationen
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

      // Prüfe, ob Mod auf dem Server installiert ist
      const serverMod = await prisma.serverMod.findFirst({
        where: {
          modId,
          serverId
        },
        include: {
          mod: true
        }
      });

      if (!serverMod) {
        throw new AppError('Mod is not installed on this server', 404);
      }

      // Sende Deinstallation an Agent
      const result = await this.agentService.removeMod(server.host, server, serverMod.mod.fileName);

      if (!result.success) {
        throw new AppError(result.error || 'Failed to uninstall mod from server', 500);
      }

      // Entferne Mod aus Datenbank (nur wenn Agent-Call erfolgreich war)
      await prisma.serverMod.delete({
        where: { id: serverMod.id }
      });

      res.json({
        message: 'Mod uninstalled successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
