import prisma from '../lib/prisma.singleton';
import { AgentService } from './agent.service';
import { logger } from '../lib/logger';
import { MinecraftServer } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Server Import/Export Service
 * Allows users to export server configurations and share them with others
 */

export interface ServerExportData {
  version: string;
  exportDate: Date;
  server: {
    name: string;
    minecraftVersion: string;
    versionType: string;
    allocatedRam: number;
    allocatedCpu: number;
    maxPlayers: number;
    difficulty: string;
    gameMode: string;
    enableWhitelist: boolean;
    pvpEnabled: boolean;
    onlineMode: boolean;
    motd: string;
  };
  mods?: Array<{
    name: string;
    version: string;
    fileName: string;
  }>;
  config?: {
    serverProperties?: Record<string, any>;
    whitelist?: string[];
    ops?: string[];
  };
  worldIncluded: boolean;
  checksum: string;
}

export class ServerImportExportService {
  private readonly EXPORT_VERSION = '1.0.0';
  private agentService = new AgentService();

  /**
   * Export a server configuration to a shareable format
   */
  async exportServer(
    serverId: string,
    userId: string,
    options: {
      includeWorld?: boolean;
      includeMods?: boolean;
      includeConfig?: boolean;
    } = {}
  ): Promise<ServerExportData> {
    logger.info('Exporting server', { serverId, userId, options });

    // Get server
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: {
        mods: true,
      },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Verify ownership
    if (server.userId !== userId) {
      throw new Error('Unauthorized: You do not own this server');
    }

    // Build export data
    const exportData: ServerExportData = {
      version: this.EXPORT_VERSION,
      exportDate: new Date(),
      server: {
        name: server.name,
        minecraftVersion: server.minecraftVersion,
        versionType: server.versionType,
        allocatedRam: server.allocatedRam,
        allocatedCpu: server.allocatedCpu,
        maxPlayers: server.maxPlayers,
        difficulty: server.difficulty,
        gameMode: server.gameMode,
        enableWhitelist: server.enableWhitelist,
        pvpEnabled: server.pvpEnabled,
        onlineMode: server.onlineMode,
        motd: server.motd,
      },
      worldIncluded: options.includeWorld || false,
      checksum: '', // Will be calculated below
    };

    // Include mods if requested
    if (options.includeMods && server.mods.length > 0) {
      exportData.mods = server.mods.map((mod) => ({
        name: mod.name,
        version: mod.version,
        fileName: mod.fileName,
      }));
    }

    // Include config if requested
    if (options.includeConfig) {
      exportData.config = await this.exportConfig(server.hostId, server.containerName);
    }

    // Calculate checksum for integrity verification
    exportData.checksum = this.calculateChecksum(exportData);

    logger.info('Server export completed', { serverId });

    return exportData;
  }

  /**
   * Import a server from export data
   */
  async importServer(
    userId: string,
    exportData: ServerExportData,
    serverName?: string
  ): Promise<MinecraftServer> {
    logger.info('Importing server', { userId, exportVersion: exportData.version });

    // Validate export version
    if (exportData.version !== this.EXPORT_VERSION) {
      throw new Error(`Unsupported export version: ${exportData.version}`);
    }

    // Verify checksum
    const calculatedChecksum = this.calculateChecksum({
      ...exportData,
      checksum: '',
    });

    if (calculatedChecksum !== exportData.checksum) {
      throw new Error('Export data corrupted: checksum mismatch');
    }

    // Check user's server limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userServers = await prisma.minecraftServer.count({
      where: { userId },
    });

    if (userServers >= user.maxServers) {
      throw new Error(`Server limit reached. You can only have ${user.maxServers} servers.`);
    }

    // Find available host
    const availableHost = await this.findAvailableHost();
    if (!availableHost) {
      throw new Error('No available hosts found');
    }

    // Create server
    const importedServer = await prisma.minecraftServer.create({
      data: {
        name: serverName || exportData.server.name,
        minecraftVersion: exportData.server.minecraftVersion,
        versionType: exportData.server.versionType,
        allocatedRam: exportData.server.allocatedRam,
        allocatedCpu: exportData.server.allocatedCpu,
        maxPlayers: exportData.server.maxPlayers,
        difficulty: exportData.server.difficulty,
        gameMode: exportData.server.gameMode,
        enableWhitelist: exportData.server.enableWhitelist,
        pvpEnabled: exportData.server.pvpEnabled,
        onlineMode: exportData.server.onlineMode,
        motd: exportData.server.motd,
        userId,
        hostId: availableHost.id,
        containerName: `mc-server-${Date.now()}`,
        status: 'CREATING',
      },
    });

    try {
      // Create container
      await this.agentService.createServer(availableHost.id, {
        serverId: importedServer.id,
        containerName: importedServer.containerName,
        minecraftVersion: importedServer.minecraftVersion,
        versionType: importedServer.versionType,
        allocatedRam: importedServer.allocatedRam,
        allocatedCpu: importedServer.allocatedCpu,
        maxPlayers: importedServer.maxPlayers,
        difficulty: importedServer.difficulty,
        gameMode: importedServer.gameMode,
        enableWhitelist: importedServer.enableWhitelist,
        pvpEnabled: importedServer.pvpEnabled,
        onlineMode: importedServer.onlineMode,
        motd: importedServer.motd,
      });

      // Import config if included
      if (exportData.config) {
        await this.importConfig(
          availableHost.id,
          importedServer.containerName,
          exportData.config
        );
      }

      // Import mods if included
      if (exportData.mods && exportData.mods.length > 0) {
        await this.importMods(importedServer.id, exportData.mods);
      }

      // Update status
      await prisma.minecraftServer.update({
        where: { id: importedServer.id },
        data: { status: 'STOPPED' },
      });

      logger.info('Server import completed', { importedServerId: importedServer.id });

      return importedServer;
    } catch (error) {
      logger.error('Server import failed', error);

      // Cleanup
      await prisma.minecraftServer.delete({
        where: { id: importedServer.id },
      });

      throw error;
    }
  }

  /**
   * Export server configuration files
   */
  private async exportConfig(
    hostId: string,
    containerName: string
  ): Promise<Record<string, any>> {
    const config: Record<string, any> = {};

    try {
      // Read server.properties
      const serverProperties = await this.agentService.readFile(
        hostId,
        containerName,
        'server.properties'
      );
      config.serverProperties = this.parseProperties(serverProperties);
    } catch (error) {
      logger.warn('Could not read server.properties', error);
    }

    try {
      // Read whitelist
      const whitelist = await this.agentService.readFile(hostId, containerName, 'whitelist.json');
      config.whitelist = JSON.parse(whitelist);
    } catch (error) {
      logger.warn('Could not read whitelist.json', error);
    }

    try {
      // Read ops
      const ops = await this.agentService.readFile(hostId, containerName, 'ops.json');
      config.ops = JSON.parse(ops);
    } catch (error) {
      logger.warn('Could not read ops.json', error);
    }

    return config;
  }

  /**
   * Import server configuration files
   */
  private async importConfig(
    hostId: string,
    containerName: string,
    config: Record<string, any>
  ): Promise<void> {
    // Write server.properties
    if (config.serverProperties) {
      const propertiesStr = this.stringifyProperties(config.serverProperties);
      await this.agentService.writeFile(hostId, containerName, 'server.properties', propertiesStr);
    }

    // Write whitelist
    if (config.whitelist) {
      await this.agentService.writeFile(
        hostId,
        containerName,
        'whitelist.json',
        JSON.stringify(config.whitelist, null, 2)
      );
    }

    // Write ops
    if (config.ops) {
      await this.agentService.writeFile(
        hostId,
        containerName,
        'ops.json',
        JSON.stringify(config.ops, null, 2)
      );
    }
  }

  /**
   * Import mods (placeholder - would need actual mod files)
   */
  private async importMods(serverId: string, mods: any[]): Promise<void> {
    logger.info('Importing mods metadata', { serverId, modCount: mods.length });
    // In a real implementation, you would fetch and install the actual mod files
    // For now, just log the mods that would be installed
  }

  /**
   * Parse .properties file format
   */
  private parseProperties(content: string): Record<string, string> {
    const properties: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        properties[key.trim()] = valueParts.join('=').trim();
      }
    });

    return properties;
  }

  /**
   * Stringify properties to .properties format
   */
  private stringifyProperties(properties: Record<string, string>): string {
    return Object.entries(properties)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }

  /**
   * Calculate checksum for export data integrity
   */
  private calculateChecksum(data: Partial<ServerExportData>): string {
    const json = JSON.stringify(data);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Find an available host
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

    return hosts.reduce((prev, current) =>
      prev.servers.length < current.servers.length ? prev : current
    );
  }

  /**
   * Generate a shareable export file
   */
  async generateExportFile(exportData: ServerExportData): Promise<Buffer> {
    const json = JSON.stringify(exportData, null, 2);
    return Buffer.from(json, 'utf-8');
  }

  /**
   * Parse an export file
   */
  async parseExportFile(fileBuffer: Buffer): Promise<ServerExportData> {
    try {
      const json = fileBuffer.toString('utf-8');
      const exportData: ServerExportData = JSON.parse(json);
      return exportData;
    } catch (error) {
      throw new Error('Invalid export file format');
    }
  }
}

export default new ServerImportExportService();
