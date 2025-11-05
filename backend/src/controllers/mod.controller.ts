import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';


export class ModController {
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

      // Prüfe, ob Mod existiert
      const mod = await prisma.mod.findUnique({
        where: { id: modId }
      });

      if (!mod) {
        throw new AppError('Mod not found', 404);
      }

      // Installiere Mod
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

      // TODO: Sende Installation an Agent

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

      // Deinstalliere Mod
      await prisma.serverMod.deleteMany({
        where: {
          modId,
          serverId
        }
      });

      // TODO: Sende Deinstallation an Agent

      res.json({
        message: 'Mod uninstalled successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
