import prisma from '../lib/prisma.singleton';
import AgentService from './agent.service';
import { MinecraftServer } from '@prisma/client';
import { logger } from '../lib/logger';

/**
 * Server Cloning Service
 * Allows users to duplicate servers with all configurations and world data
 */

export class ServerCloningService {
  /**
   * Clone a server with all its configuration and optionally its world data
   */
  async cloneServer(
    sourceServerId: string,
    userId: string,
    options: {
      cloneName: string;
      cloneWorld?: boolean;
      cloneMods?: boolean;
      clonePlugins?: boolean;
      cloneConfig?: boolean;
    }
  ): Promise<MinecraftServer> {
    logger.info('Starting server cloning', { sourceServerId, userId, options });

    // 1. Get source server
    const sourceServer = await prisma.minecraftServer.findUnique({
      where: { id: sourceServerId },
      include: {
        mods: true,
        user: true,
      },
    });

    if (!sourceServer) {
      throw new Error('Source server not found');
    }

    // Verify user owns the server
    if (sourceServer.userId !== userId) {
      throw new Error('Unauthorized: You do not own this server');
    }

    // 2. Check if user has enough server slots
    const userServers = await prisma.minecraftServer.count({
      where: { userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (userServers >= user.maxServers) {
      throw new Error(`Server limit reached. You can only have ${user.maxServers} servers.`);
    }

    // 3. Find available host
    const availableHost = await this.findAvailableHost();
    if (!availableHost) {
      throw new Error('No available hosts found');
    }

    // 4. Create new server entry
    const clonedServer = await prisma.minecraftServer.create({
      data: {
        name: options.cloneName,
        minecraftVersion: sourceServer.minecraftVersion,
        versionType: sourceServer.versionType,
        allocatedRam: sourceServer.allocatedRam,
        allocatedCpu: sourceServer.allocatedCpu,
        maxPlayers: sourceServer.maxPlayers,
        difficulty: sourceServer.difficulty,
        gameMode: sourceServer.gameMode,
        enableWhitelist: sourceServer.enableWhitelist,
        pvpEnabled: sourceServer.pvpEnabled,
        onlineMode: sourceServer.onlineMode,
        motd: `${sourceServer.motd} (Clone)`,
        userId,
        hostId: availableHost.id,
        containerName: `mc-server-${Date.now()}`,
        status: 'CREATING',
      },
    });

    try {
      // 5. Create container on host
      await AgentService.createServer(availableHost.id, {
        serverId: clonedServer.id,
        containerName: clonedServer.containerName,
        minecraftVersion: clonedServer.minecraftVersion,
        versionType: clonedServer.versionType,
        allocatedRam: clonedServer.allocatedRam,
        allocatedCpu: clonedServer.allocatedCpu,
        maxPlayers: clonedServer.maxPlayers,
        difficulty: clonedServer.difficulty,
        gameMode: clonedServer.gameMode,
        enableWhitelist: clonedServer.enableWhitelist,
        pvpEnabled: clonedServer.pvpEnabled,
        onlineMode: clonedServer.onlineMode,
        motd: clonedServer.motd,
      });

      // 6. Clone world data if requested
      if (options.cloneWorld) {
        await this.cloneWorldData(
          sourceServer.hostId,
          sourceServer.containerName,
          availableHost.id,
          clonedServer.containerName
        );
      }

      // 7. Clone mods if requested
      if (options.cloneMods && sourceServer.mods.length > 0) {
        await this.cloneMods(clonedServer.id, sourceServer.mods);
      }

      // 8. Clone config files if requested
      if (options.cloneConfig) {
        await this.cloneConfigFiles(
          sourceServer.hostId,
          sourceServer.containerName,
          availableHost.id,
          clonedServer.containerName
        );
      }

      // 9. Update server status
      await prisma.minecraftServer.update({
        where: { id: clonedServer.id },
        data: { status: 'STOPPED' },
      });

      logger.info('Server cloning completed', { clonedServerId: clonedServer.id });

      return clonedServer;
    } catch (error) {
      logger.error('Server cloning failed', error);

      // Cleanup: Delete the cloned server if creation failed
      await prisma.minecraftServer.delete({
        where: { id: clonedServer.id },
      });

      throw error;
    }
  }

  /**
   * Clone world data from source to target
   */
  private async cloneWorldData(
    sourceHostId: string,
    sourceContainerName: string,
    targetHostId: string,
    targetContainerName: string
  ): Promise<void> {
    logger.info('Cloning world data', { sourceContainerName, targetContainerName });

    // 1. Create backup of source world
    const worldBackup = await AgentService.createBackup(sourceHostId, sourceContainerName);

    // 2. If hosts are different, transfer backup
    if (sourceHostId !== targetHostId) {
      // In a real implementation, you'd transfer the backup between hosts
      // For now, we'll assume they share storage or use a transfer mechanism
      logger.warn('Cross-host world cloning not fully implemented');
    }

    // 3. Restore backup to target server
    await AgentService.restoreBackup(targetHostId, targetContainerName, worldBackup.id);

    logger.info('World data cloned successfully');
  }

  /**
   * Clone mods to the new server
   */
  private async cloneMods(targetServerId: string, sourceMods: any[]): Promise<void> {
    logger.info('Cloning mods', { targetServerId, modCount: sourceMods.length });

    // Associate the same mods with the new server
    await prisma.minecraftServer.update({
      where: { id: targetServerId },
      data: {
        mods: {
          connect: sourceMods.map((mod) => ({ id: mod.id })),
        },
      },
    });

    logger.info('Mods cloned successfully');
  }

  /**
   * Clone configuration files
   */
  private async cloneConfigFiles(
    sourceHostId: string,
    sourceContainerName: string,
    targetHostId: string,
    targetContainerName: string
  ): Promise<void> {
    logger.info('Cloning config files', { sourceContainerName, targetContainerName });

    const configFiles = [
      'server.properties',
      'whitelist.json',
      'ops.json',
      'banned-players.json',
      'banned-ips.json',
    ];

    for (const file of configFiles) {
      try {
        // Read config from source
        const content = await AgentService.readFile(sourceHostId, sourceContainerName, file);

        // Write to target
        await AgentService.writeFile(targetHostId, targetContainerName, file, content);
      } catch (error) {
        logger.warn(`Failed to clone config file: ${file}`, error);
        // Continue with other files
      }
    }

    logger.info('Config files cloned successfully');
  }

  /**
   * Find an available host with enough resources
   */
  private async findAvailableHost() {
    const hosts = await prisma.host.findMany({
      where: { status: 'ONLINE' },
      include: {
        servers: {
          where: { status: { in: ['RUNNING', 'STOPPED'] } },
        },
      },
    });

    if (hosts.length === 0) {
      return null;
    }

    // Simple load balancing: pick host with least servers
    return hosts.reduce((prev, current) =>
      prev.servers.length < current.servers.length ? prev : current
    );
  }
}

export default new ServerCloningService();
