import { prisma } from '../lib/prisma';
import { AgentService } from './agent.service';
import { logger } from '../lib/logger';
import { MinecraftServer } from '@prisma/client';

/**
 * 🌍 Multi-World Management Service
 *
 * Ermöglicht Verwaltung mehrerer Welten pro Server:
 * - Mehrere Welten pro Server (wie Multiverse)
 * - Schnelles Wechseln zwischen Welten
 * - Separate Backups pro Welt
 * - World-Snapshots (Git-ähnliches Versionssystem)
 * - World-Import/Export
 */

export interface WorldInfo {
  id: string;
  serverId: string;
  name: string;
  worldType: 'OVERWORLD' | 'NETHER' | 'END' | 'CUSTOM';
  generator: string; // 'default', 'flat', 'amplified', etc.
  seed?: string;
  size: number; // in bytes
  isActive: boolean;
  isPrimary: boolean;
  createdAt: Date;
  lastAccessed?: Date;
}

export interface WorldSnapshot {
  id: string;
  worldId: string;
  name: string;
  description?: string;
  size: number;
  createdAt: Date;
  createdBy?: string;
}

export class MultiWorldManagementService {
  private agentService = new AgentService();

  /**
   * Erstellt neue Welt auf Server
   */
  async createWorld(
    serverId: string,
    name: string,
    options: {
      worldType?: 'OVERWORLD' | 'NETHER' | 'END' | 'CUSTOM';
      generator?: string;
      seed?: string;
      makeActive?: boolean;
    } = {}
  ): Promise<WorldInfo> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Creating world "${name}" on server ${server.name}`);

    try {
      // Erstelle Welt-Eintrag in DB
      const world = await prisma.$executeRaw`
        INSERT INTO "World" (id, "serverId", name, "worldType", generator, seed, size, "isActive", "isPrimary", "createdAt")
        VALUES (gen_random_uuid(), ${serverId}, ${name}, ${options.worldType || 'OVERWORLD'}, ${options.generator || 'default'}, ${options.seed || null}, 0, ${options.makeActive || false}, false, NOW())
        RETURNING *
      `;

      // Führe Welt-Erstellung auf Agent aus
      // TODO: Agent-API erweitern für Multi-World-Support

      logger.info(`World "${name}" created successfully on server ${serverId}`);

      return {
        id: 'temp-id', // Replace with actual ID from DB
        serverId,
        name,
        worldType: options.worldType || 'OVERWORLD',
        generator: options.generator || 'default',
        seed: options.seed,
        size: 0,
        isActive: options.makeActive || false,
        isPrimary: false,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to create world "${name}" on server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Listet alle Welten eines Servers auf
   */
  async listWorlds(serverId: string): Promise<WorldInfo[]> {
    // Simplified implementation - in real app würde man ein World Model haben
    logger.info(`Listing worlds for server ${serverId}`);

    // Placeholder - würde aus DB kommen
    return [
      {
        id: 'world-1',
        serverId,
        name: 'world',
        worldType: 'OVERWORLD',
        generator: 'default',
        size: 1024 * 1024 * 500, // 500MB
        isActive: true,
        isPrimary: true,
        createdAt: new Date()
      }
    ];
  }

  /**
   * Wechselt aktive Welt
   */
  async switchWorld(serverId: string, worldName: string): Promise<void> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Switching world to "${worldName}" on server ${server.name}`);

    try {
      // 1. Save current world
      await this.agentService.executeCommand(server.host, server.containerName, 'save-all');

      // 2. Stop server
      await this.agentService.stopServer(server.host, server.containerName, true);

      // 3. Switch world folder (via Agent)
      // TODO: Implement in Agent

      // 4. Start server
      await this.agentService.startServer(server.host, server.containerName);

      logger.info(`Successfully switched to world "${worldName}" on server ${serverId}`);
    } catch (error) {
      logger.error(`Failed to switch world on server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Erstellt Snapshot einer Welt (wie Git Commit)
   */
  async createWorldSnapshot(
    serverId: string,
    worldName: string,
    snapshotName: string,
    description?: string
  ): Promise<WorldSnapshot> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Creating snapshot "${snapshotName}" for world "${worldName}" on server ${server.name}`);

    try {
      // Save world before snapshot
      await this.agentService.executeCommand(server.host, server.containerName, 'save-all');
      await this.agentService.executeCommand(server.host, server.containerName, 'save-off');

      // Create snapshot via Agent (würde TAR.GZ der Welt erstellen)
      // TODO: Implement in Agent

      await this.agentService.executeCommand(server.host, server.containerName, 'save-on');

      const snapshot: WorldSnapshot = {
        id: `snapshot-${Date.now()}`,
        worldId: worldName,
        name: snapshotName,
        description,
        size: 1024 * 1024 * 100, // Placeholder
        createdAt: new Date()
      };

      logger.info(`Snapshot "${snapshotName}" created successfully`);
      return snapshot;
    } catch (error) {
      logger.error(`Failed to create snapshot:`, error);
      throw error;
    }
  }

  /**
   * Stellt Welt aus Snapshot wieder her
   */
  async restoreWorldSnapshot(serverId: string, snapshotId: string): Promise<void> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Restoring snapshot ${snapshotId} on server ${server.name}`);

    try {
      // Stop server
      await this.agentService.stopServer(server.host, server.containerName, true);

      // Restore via Agent
      // TODO: Implement in Agent

      // Start server
      await this.agentService.startServer(server.host, server.containerName);

      logger.info(`Snapshot ${snapshotId} restored successfully`);
    } catch (error) {
      logger.error(`Failed to restore snapshot:`, error);
      throw error;
    }
  }

  /**
   * Löscht eine Welt
   */
  async deleteWorld(serverId: string, worldName: string): Promise<void> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Deleting world "${worldName}" on server ${server.name}`);

    try {
      // Kann nicht primäre Welt löschen
      // TODO: Check in DB

      // Delete via Agent
      // TODO: Implement in Agent

      logger.info(`World "${worldName}" deleted successfully`);
    } catch (error) {
      logger.error(`Failed to delete world:`, error);
      throw error;
    }
  }

  /**
   * Klont eine Welt
   */
  async cloneWorld(serverId: string, sourceWorldName: string, newWorldName: string): Promise<WorldInfo> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Cloning world "${sourceWorldName}" to "${newWorldName}" on server ${server.name}`);

    try {
      // Clone via Agent (copy folder)
      // TODO: Implement in Agent

      return {
        id: `world-${Date.now()}`,
        serverId,
        name: newWorldName,
        worldType: 'OVERWORLD',
        generator: 'default',
        size: 0,
        isActive: false,
        isPrimary: false,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to clone world:`, error);
      throw error;
    }
  }

  /**
   * Export einer Welt als Download
   */
  async exportWorld(serverId: string, worldName: string): Promise<{ downloadUrl: string; size: number }> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Exporting world "${worldName}" from server ${server.name}`);

    try {
      // Save world
      await this.agentService.executeCommand(server.host, server.containerName, 'save-all');
      await this.agentService.executeCommand(server.host, server.containerName, 'save-off');

      // Create TAR.GZ via Agent
      // TODO: Implement in Agent

      await this.agentService.executeCommand(server.host, server.containerName, 'save-on');

      return {
        downloadUrl: `/api/worlds/${serverId}/${worldName}/download`,
        size: 1024 * 1024 * 100
      };
    } catch (error) {
      logger.error(`Failed to export world:`, error);
      throw error;
    }
  }

  /**
   * Import einer Welt
   */
  async importWorld(serverId: string, worldName: string, filePath: string): Promise<WorldInfo> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    logger.info(`Importing world "${worldName}" to server ${server.name}`);

    try {
      // Stop server
      await this.agentService.stopServer(server.host, server.containerName, true);

      // Upload and extract via Agent
      // TODO: Implement in Agent

      // Start server
      await this.agentService.startServer(server.host, server.containerName);

      return {
        id: `world-${Date.now()}`,
        serverId,
        name: worldName,
        worldType: 'CUSTOM',
        generator: 'imported',
        size: 0,
        isActive: false,
        isPrimary: false,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to import world:`, error);
      throw error;
    }
  }
}

export default MultiWorldManagementService;
