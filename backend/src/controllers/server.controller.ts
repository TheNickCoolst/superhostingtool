import { Response, NextFunction } from 'express';
import { ServerService } from '../services/server.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class ServerController {
  private serverService = new ServerService();

  getUserServers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const servers = await this.serverService.getUserServers(userId);
      res.json({ servers });
    } catch (error) {
      next(error);
    }
  };

  getServerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const server = await this.serverService.getServerById(id, userId);
      res.json({ server });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ONE-CLICK SERVER CREATION
   * Erstellt einen komplett konfigurierten Server mit einer einzigen Anfrage
   */
  createServer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const {
        name,
        minecraftVersion,
        versionType,
        allocatedRam,
        allocatedCpu,
        maxPlayers,
        difficulty,
        gameMode,
        modIds
      } = req.body;

      const server = await this.serverService.createServer({
        name,
        userId,
        minecraftVersion,
        versionType,
        allocatedRam: allocatedRam || 2048, // Default 2GB
        allocatedCpu: allocatedCpu || 1, // Default 1 CPU
        maxPlayers: maxPlayers || 20,
        difficulty: difficulty || 'NORMAL',
        gameMode: gameMode || 'SURVIVAL',
        modIds
      });

      res.status(201).json({
        message: 'Server created successfully',
        server
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DYNAMISCHE RESSOURCEN-ANPASSUNG
   * Ändert RAM/CPU on-the-fly mit minimaler Downtime
   */
  updateResources = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { allocatedRam, allocatedCpu } = req.body;

      const server = await this.serverService.updateResources(
        id,
        userId,
        allocatedRam,
        allocatedCpu
      );

      res.json({
        message: 'Server resources updated successfully',
        server
      });
    } catch (error) {
      next(error);
    }
  };

  startServer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const server = await this.serverService.startServer(id, userId);

      res.json({
        message: 'Server started successfully',
        server
      });
    } catch (error) {
      next(error);
    }
  };

  stopServer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const server = await this.serverService.stopServer(id, userId);

      res.json({
        message: 'Server stopped successfully',
        server
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ROLLING RESTART
   * Neustart mit minimaler Downtime (~3-5 Sekunden)
   */
  restartServer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const server = await this.serverService.restartServer(id, userId);

      res.json({
        message: 'Server restarted successfully',
        server
      });
    } catch (error) {
      next(error);
    }
  };

  executeCommand = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { command } = req.body;
      const userId = req.user!.id;

      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Command is required and must be a string' });
      }

      const result = await this.serverService.executeCommand(id, userId, command);

      res.json({
        message: 'Command executed successfully',
        command,
        result: result.data
      });
    } catch (error) {
      next(error);
    }
  };

  cloneServer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user!.id;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Server name is required' });
      }

      const clonedServer = await this.serverService.cloneServer(id, userId, name);

      res.status(201).json({
        message: 'Server cloned successfully',
        server: clonedServer
      });
    } catch (error) {
      next(error);
    }
  };

  deleteServer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.serverService.deleteServer(id, userId);

      res.json({
        message: 'Server deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
