import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  body: any;
  params: any;
  query: any;
  file?: any;
  files?: any;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: UserRole;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Alias for backward compatibility
export const authenticateToken = authenticate;

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware to check if the authenticated user has access to a specific server
 * Checks if the user is the owner of the server or an admin
 */
export const authorizeServerAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const serverId = req.params.serverId || req.params.id;

    if (!serverId) {
      return res.status(400).json({ error: 'Server ID required' });
    }

    // Admins have access to all servers
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Check if server exists and user is the owner
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      select: { userId: true }
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this server' });
    }

    next();
  } catch (error) {
    next(error);
  }
};
