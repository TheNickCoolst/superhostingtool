import { PrismaClient } from '@prisma/client';
import { AgentService } from './agent.service';

const prisma = new PrismaClient();

export class PlayerManagementService {
  // ==================== Whitelist Management ====================

  async getWhitelist(serverId: string) {
    return prisma.playerWhitelist.findMany({
      where: { serverId },
      orderBy: { addedAt: 'desc' }
    });
  }

  async addToWhitelist(serverId: string, playerName: string, playerUuid?: string) {
    const entry = await prisma.playerWhitelist.create({
      data: {
        serverId,
        playerName,
        playerUuid
      }
    });

    // Sync with Minecraft server
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });
    if (server && server.status === 'RUNNING') {
      await AgentService.executeCommand(
        server.host,
        server,
        `whitelist add ${playerName}`
      );
    }

    return entry;
  }

  async removeFromWhitelist(serverId: string, playerName: string) {
    await prisma.playerWhitelist.deleteMany({
      where: { serverId, playerName }
    });

    // Sync with Minecraft server
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });
    if (server && server.status === 'RUNNING') {
      await AgentService.executeCommand(
        server.host,
        server,
        `whitelist remove ${playerName}`
      );
    }
  }

  // ==================== Ban Management ====================

  async getBans(serverId: string) {
    return prisma.playerBan.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async banPlayer(serverId: string, playerName: string, reason?: string, bannedBy?: string, expiresAt?: Date) {
    const ban = await prisma.playerBan.create({
      data: {
        serverId,
        playerName,
        reason,
        bannedBy,
        expiresAt
      }
    });

    // Sync with Minecraft server
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });
    if (server && server.status === 'RUNNING') {
      const reasonText = reason ? ` ${reason}` : '';
      await AgentService.executeCommand(
        server.host,
        server,
        `ban ${playerName}${reasonText}`
      );
    }

    return ban;
  }

  async unbanPlayer(serverId: string, playerName: string) {
    await prisma.playerBan.deleteMany({
      where: { serverId, playerName }
    });

    // Sync with Minecraft server
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });
    if (server && server.status === 'RUNNING') {
      await AgentService.executeCommand(
        server.host,
        server,
        `pardon ${playerName}`
      );
    }
  }

  // ==================== Operator Management ====================

  async getOperators(serverId: string) {
    return prisma.playerOperator.findMany({
      where: { serverId },
      orderBy: { addedAt: 'desc' }
    });
  }

  async addOperator(serverId: string, playerName: string, playerUuid?: string, level: number = 4) {
    const op = await prisma.playerOperator.create({
      data: {
        serverId,
        playerName,
        playerUuid,
        level
      }
    });

    // Sync with Minecraft server
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });
    if (server && server.status === 'RUNNING') {
      await AgentService.executeCommand(
        server.host,
        server,
        `op ${playerName}`
      );
    }

    return op;
  }

  async removeOperator(serverId: string, playerName: string) {
    await prisma.playerOperator.deleteMany({
      where: { serverId, playerName }
    });

    // Sync with Minecraft server
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });
    if (server && server.status === 'RUNNING') {
      await AgentService.executeCommand(
        server.host,
        server,
        `deop ${playerName}`
      );
    }
  }
}

export default new PlayerManagementService();
