// Service für Server-Gruppierung und Tags
import prisma from '../lib/prisma.singleton';
import logger from '../lib/logger';

export class ServerGroupsService {
  // ==================== Server Tags ====================

  /**
   * Füge einen Tag zu einem Server hinzu
   */
  async addTag(serverId: string, name: string, color?: string) {
    try {
      const tag = await prisma.serverTag.create({
        data: {
          serverId,
          name,
          color,
        },
      });

      logger.info('Tag added to server', { serverId, tagName: name });
      return tag;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Tag already exists on this server');
      }
      throw error;
    }
  }

  /**
   * Entferne einen Tag von einem Server
   */
  async removeTag(serverId: string, name: string) {
    const result = await prisma.serverTag.deleteMany({
      where: {
        serverId,
        name,
      },
    });

    logger.info('Tag removed from server', { serverId, tagName: name });
    return result.count > 0;
  }

  /**
   * Hole alle Tags eines Servers
   */
  async getServerTags(serverId: string) {
    return await prisma.serverTag.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Suche Server nach Tags
   */
  async findServersByTag(userId: string, tagName: string) {
    return await prisma.minecraftServer.findMany({
      where: {
        userId,
        tags: {
          some: {
            name: tagName,
          },
        },
      },
      include: {
        tags: true,
        stats: true,
      },
    });
  }

  // ==================== Server Favorites ====================

  /**
   * Füge Server zu Favoriten hinzu
   */
  async addFavorite(userId: string, serverId: string) {
    try {
      const favorite = await prisma.serverFavorite.create({
        data: {
          userId,
          serverId,
        },
      });

      logger.info('Server added to favorites', { userId, serverId });
      return favorite;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Server already in favorites');
      }
      throw error;
    }
  }

  /**
   * Entferne Server von Favoriten
   */
  async removeFavorite(userId: string, serverId: string) {
    const result = await prisma.serverFavorite.deleteMany({
      where: {
        userId,
        serverId,
      },
    });

    logger.info('Server removed from favorites', { userId, serverId });
    return result.count > 0;
  }

  /**
   * Hole alle Favoriten eines Users
   */
  async getUserFavorites(userId: string) {
    return await prisma.serverFavorite.findMany({
      where: { userId },
      include: {
        server: {
          include: {
            stats: true,
            tags: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Prüfe ob Server favorisiert ist
   */
  async isFavorite(userId: string, serverId: string): Promise<boolean> {
    const favorite = await prisma.serverFavorite.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });
    return favorite !== null;
  }

  // ==================== Server Groups ====================

  /**
   * Erstelle eine neue Server-Gruppe
   */
  async createGroup(userId: string, data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }) {
    const group = await prisma.serverGroup.create({
      data: {
        userId,
        ...data,
      },
    });

    logger.info('Server group created', { userId, groupId: group.id, name: data.name });
    return group;
  }

  /**
   * Aktualisiere eine Server-Gruppe
   */
  async updateGroup(groupId: string, userId: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  }) {
    const group = await prisma.serverGroup.update({
      where: {
        id: groupId,
        userId, // Sicherheit: Nur Owner kann updaten
      },
      data,
    });

    logger.info('Server group updated', { groupId });
    return group;
  }

  /**
   * Lösche eine Server-Gruppe
   */
  async deleteGroup(groupId: string, userId: string) {
    const result = await prisma.serverGroup.delete({
      where: {
        id: groupId,
        userId,
      },
    });

    logger.info('Server group deleted', { groupId });
    return result;
  }

  /**
   * Füge Server zu Gruppe hinzu
   */
  async addServerToGroup(groupId: string, serverId: string) {
    try {
      const member = await prisma.serverGroupMember.create({
        data: {
          groupId,
          serverId,
        },
      });

      logger.info('Server added to group', { groupId, serverId });
      return member;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Server already in group');
      }
      throw error;
    }
  }

  /**
   * Entferne Server aus Gruppe
   */
  async removeServerFromGroup(groupId: string, serverId: string) {
    const result = await prisma.serverGroupMember.deleteMany({
      where: {
        groupId,
        serverId,
      },
    });

    logger.info('Server removed from group', { groupId, serverId });
    return result.count > 0;
  }

  /**
   * Hole alle Gruppen eines Users
   */
  async getUserGroups(userId: string) {
    return await prisma.serverGroup.findMany({
      where: { userId },
      include: {
        servers: {
          include: {
            server: {
              include: {
                stats: true,
                tags: true,
              },
            },
          },
        },
        _count: {
          select: { servers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Hole eine spezifische Gruppe mit Servern
   */
  async getGroup(groupId: string, userId: string) {
    return await prisma.serverGroup.findFirst({
      where: {
        id: groupId,
        userId,
      },
      include: {
        servers: {
          include: {
            server: {
              include: {
                stats: true,
                tags: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Hole Server mit Tags und Gruppen
   */
  async getServerWithOrganization(serverId: string, userId: string) {
    return await prisma.minecraftServer.findFirst({
      where: {
        id: serverId,
        userId,
      },
      include: {
        tags: true,
        groups: {
          include: {
            group: true,
          },
        },
        favorites: {
          where: {
            userId,
          },
        },
      },
    });
  }

  // ==================== Smart Collections ====================

  /**
   * Hole kürzlich verwendete Server
   */
  async getRecentlyUsedServers(userId: string, limit: number = 5) {
    return await prisma.minecraftServer.findMany({
      where: {
        userId,
        lastStarted: { not: null },
      },
      include: {
        stats: true,
        tags: true,
      },
      orderBy: {
        lastStarted: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Hole laufende Server
   */
  async getRunningServers(userId: string) {
    return await prisma.minecraftServer.findMany({
      where: {
        userId,
        status: 'RUNNING',
      },
      include: {
        stats: true,
        tags: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Update Server-Farbe und Icon
   */
  async updateServerAppearance(serverId: string, userId: string, data: {
    color?: string;
    icon?: string;
  }) {
    const server = await prisma.minecraftServer.update({
      where: {
        id: serverId,
        userId,
      },
      data,
    });

    logger.info('Server appearance updated', { serverId });
    return server;
  }
}

export default new ServerGroupsService();
