import { Request, Response, NextFunction } from 'express';
import { MinecraftVersionService } from '../services/minecraft-version.service';

export class VersionController {
  private versionService = new MinecraftVersionService();

  getAllVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.query;
      const versions = await this.versionService.getAllVersions(type as any);
      res.json({ versions });
    } catch (error) {
      next(error);
    }
  };

  getLatestVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const version = await this.versionService.getLatestStableVersion();
      res.json({ version });
    } catch (error) {
      next(error);
    }
  };

  syncVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.versionService.syncVersions();
      res.json({ message: 'Versions synchronized successfully' });
    } catch (error) {
      next(error);
    }
  };
}
