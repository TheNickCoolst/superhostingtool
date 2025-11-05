import { Response, NextFunction } from 'express';
import { HostService } from '../services/host.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class HostController {
  private hostService = new HostService();

  getAllHosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const hosts = await this.hostService.getAllHosts();
      res.json({ hosts });
    } catch (error) {
      next(error);
    }
  };

  getHostById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const host = await this.hostService.getHostById(id);
      res.json({ host });
    } catch (error) {
      next(error);
    }
  };

  updateHeartbeat = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.hostService.updateHostHeartbeat(id);
      res.json({ message: 'Heartbeat updated' });
    } catch (error) {
      next(error);
    }
  };
}
