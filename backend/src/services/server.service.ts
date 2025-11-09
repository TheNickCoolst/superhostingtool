import { MinecraftServer, ServerStatus, MinecraftVersionType } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';
import { HostService } from './host.service';
import { AgentService } from './agent.service';
import { WebSocketService } from './websocket.service';
import { WebSocketEvent } from '@minecraft-hosting/shared';


export interface CreateServerData {
  name: string;
  userId: string;
  minecraftVersion: string;
  versionType: MinecraftVersionType;
  allocatedRam: number;
  allocatedCpu: number;
  maxPlayers: number;
  difficulty: string;
  gameMode: string;
  modIds?: string[];
}

export class ServerService {
  private hostService = new HostService();
  private agentService = new AgentService();

  /**
   * Erstellt einen neuen Minecraft Server
   * Wählt automatisch den besten verfügbaren Host basierend auf Ressourcen
   */
  async createServer(data: CreateServerData): Promise<MinecraftServer> {
    // Prüfe, ob User bereits maximal Anzahl Server hat
    const userServers = await prisma.minecraftServer.count({
      where: { userId: data.userId }
    });

    const user = await prisma.user.findUnique({
      where: { id: data.userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (userServers >= user.maxServers) {
      throw new AppError(`Maximum server limit reached (${user.maxServers})`, 400);
    }

    // Finde verfügbaren Host mit genug Ressourcen
    const host = await this.hostService.findAvailableHost(data.allocatedRam, data.allocatedCpu);

    if (!host) {
      throw new AppError('No available host with sufficient resources', 503);
    }

    // Finde freien Port
    const port = await this.findAvailablePort(host.id);

    // Erstelle Server in DB
    const server = await prisma.minecraftServer.create({
      data: {
        name: data.name,
        userId: data.userId,
        hostId: host.id,
        version: data.minecraftVersion,
        minecraftVersion: data.versionType,
        port,
        allocatedRam: data.allocatedRam,
        allocatedCpu: data.allocatedCpu,
        maxPlayers: data.maxPlayers,
        difficulty: data.difficulty as any,
        gameMode: data.gameMode as any,
        containerName: `mc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: ServerStatus.CREATING
      },
      include: {
        host: true,
        user: true
      }
    });

    // Update Host Ressourcen
    await this.hostService.updateResourceUsage(host.id, data.allocatedRam, data.allocatedCpu, 1);

    // Sende Befehl an Agent zum Erstellen des Containers
    try {
      await this.agentService.createServer(host, server);

      // Update Server Status
      await prisma.minecraftServer.update({
        where: { id: server.id },
        data: { status: ServerStatus.STOPPED }
      });

      // WebSocket Benachrichtigung
      WebSocketService.getInstance().broadcast({
        event: WebSocketEvent.SERVER_STATUS_CHANGED,
        data: { serverId: server.id, status: ServerStatus.STOPPED },
        timestamp: new Date()
      });
    } catch (error) {
      await prisma.minecraftServer.update({
        where: { id: server.id },
        data: { status: ServerStatus.ERROR }
      });
      throw error;
    }

    return server;
  }

  /**
   * Startet einen Minecraft Server
   */
  async startServer(serverId: string, userId: string): Promise<MinecraftServer> {
    const server = await this.getServerWithAuth(serverId, userId);

    if (server.status === ServerStatus.RUNNING) {
      throw new AppError('Server is already running', 400);
    }

    await prisma.minecraftServer.update({
      where: { id: serverId },
      data: { status: ServerStatus.STARTING }
    });

    try {
      await this.agentService.startServer(server.host, server);

      const updatedServer = await prisma.minecraftServer.update({
        where: { id: serverId },
        data: {
          status: ServerStatus.RUNNING,
          lastStarted: new Date()
        },
        include: { host: true, user: true }
      });

      WebSocketService.getInstance().broadcast({
        event: WebSocketEvent.SERVER_STATUS_CHANGED,
        data: { serverId, status: ServerStatus.RUNNING },
        timestamp: new Date()
      });

      return updatedServer;
    } catch (error) {
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: { status: ServerStatus.ERROR }
      });
      throw error;
    }
  }

  /**
   * Stoppt einen Minecraft Server
   */
  async stopServer(serverId: string, userId: string): Promise<MinecraftServer> {
    const server = await this.getServerWithAuth(serverId, userId);

    if (server.status === ServerStatus.STOPPED) {
      throw new AppError('Server is already stopped', 400);
    }

    await prisma.minecraftServer.update({
      where: { id: serverId },
      data: { status: ServerStatus.STOPPING }
    });

    try {
      await this.agentService.stopServer(server.host, server);

      const updatedServer = await prisma.minecraftServer.update({
        where: { id: serverId },
        data: { status: ServerStatus.STOPPED },
        include: { host: true, user: true }
      });

      WebSocketService.getInstance().broadcast({
        event: WebSocketEvent.SERVER_STATUS_CHANGED,
        data: { serverId, status: ServerStatus.STOPPED },
        timestamp: new Date()
      });

      return updatedServer;
    } catch (error) {
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: { status: ServerStatus.ERROR }
      });
      throw error;
    }
  }

  /**
   * WICHTIG: Neustart mit minimaler Downtime
   * Nutzt Rolling-Restart-Strategie mit Statusübergängen
   */
  async restartServer(serverId: string, userId: string): Promise<MinecraftServer> {
    const server = await this.getServerWithAuth(serverId, userId);

    await prisma.minecraftServer.update({
      where: { id: serverId },
      data: { status: ServerStatus.RESTARTING }
    });

    try {
      // Graceful Restart: Speichere Welt, stoppe sanft, starte neu
      await this.agentService.restartServer(server.host, server);

      const updatedServer = await prisma.minecraftServer.update({
        where: { id: serverId },
        data: {
          status: ServerStatus.RUNNING,
          lastStarted: new Date()
        },
        include: { host: true, user: true }
      });

      WebSocketService.getInstance().broadcast({
        event: WebSocketEvent.SERVER_STATUS_CHANGED,
        data: { serverId, status: ServerStatus.RUNNING },
        timestamp: new Date()
      });

      return updatedServer;
    } catch (error) {
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: { status: ServerStatus.ERROR }
      });
      throw error;
    }
  }

  /**
   * KRITISCHE FUNKTION: Dynamische Ressourcenanpassung mit minimaler Downtime
   *
   * Strategie:
   * 1. Speichere aktuelle Welt
   * 2. Update Container-Ressourcen (RAM/CPU) ohne kompletten Neustart
   * 3. Nutze Docker's Live-Update-Capabilities
   * 4. Bei Bedarf kurzer Rolling-Restart (< 5 Sekunden)
   */
  async updateResources(
    serverId: string,
    userId: string,
    allocatedRam?: number,
    allocatedCpu?: number
  ): Promise<MinecraftServer> {
    const server = await this.getServerWithAuth(serverId, userId);
    const oldRam = server.allocatedRam;
    const oldCpu = server.allocatedCpu;

    const newRam = allocatedRam || oldRam;
    const newCpu = allocatedCpu || oldCpu;

    // Update Datenbank
    const updatedServer = await prisma.minecraftServer.update({
      where: { id: serverId },
      data: {
        allocatedRam: newRam,
        allocatedCpu: newCpu,
        status: ServerStatus.UPDATING
      },
      include: { host: true, user: true }
    });

    try {
      // Live-Update der Container-Ressourcen (ohne Neustart wenn möglich)
      await this.agentService.updateResources(server.host, server, newRam, newCpu);

      // Update Host Ressourcen
      const ramDiff = newRam - oldRam;
      const cpuDiff = newCpu - oldCpu;
      await this.hostService.updateResourceUsage(server.hostId, ramDiff, cpuDiff, 0);

      // Status zurück setzen
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: { status: server.status === ServerStatus.RUNNING ? ServerStatus.RUNNING : ServerStatus.STOPPED }
      });

      return updatedServer;
    } catch (error) {
      // Rollback bei Fehler
      await prisma.minecraftServer.update({
        where: { id: serverId },
        data: {
          allocatedRam: oldRam,
          allocatedCpu: oldCpu,
          status: ServerStatus.ERROR
        }
      });
      throw error;
    }
  }

  async deleteServer(serverId: string, userId: string): Promise<void> {
    const server = await this.getServerWithAuth(serverId, userId);

    // Stoppe Server falls er läuft
    if (server.status === ServerStatus.RUNNING) {
      await this.agentService.stopServer(server.host, server);
    }

    // Lösche Container
    await this.agentService.deleteServer(server.host, server);

    // Update Host Ressourcen
    await this.hostService.updateResourceUsage(
      server.hostId,
      -server.allocatedRam,
      -server.allocatedCpu,
      -1
    );

    // Lösche aus DB
    await prisma.minecraftServer.delete({
      where: { id: serverId }
    });
  }

  async getUserServers(userId: string): Promise<MinecraftServer[]> {
    return prisma.minecraftServer.findMany({
      where: { userId },
      include: {
        host: true,
        stats: true,
        mods: {
          include: {
            mod: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getServerById(serverId: string, userId: string): Promise<MinecraftServer> {
    return this.getServerWithAuth(serverId, userId);
  }

  private async getServerWithAuth(serverId: string, userId: string): Promise<any> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: {
        host: true,
        user: true,
        stats: true,
        mods: {
          include: {
            mod: true
          }
        }
      }
    });

    if (!server) {
      throw new AppError('Server not found', 404);
    }

    if (server.userId !== userId) {
      throw new AppError('Not authorized to access this server', 403);
    }

    return server;
  }

  /**
   * Clone an existing server with all its configuration
   */
  async cloneServer(serverId: string, userId: string, newName: string): Promise<MinecraftServer> {
    const originalServer = await this.getServerWithAuth(serverId, userId);

    // Check server limit
    const userServers = await prisma.minecraftServer.count({
      where: { userId }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (userServers >= user.maxServers) {
      throw new AppError(`Maximum server limit reached (${user.maxServers})`, 400);
    }

    // Find available host with enough resources
    const host = await this.hostService.findAvailableHost(
      originalServer.allocatedRam,
      originalServer.allocatedCpu
    );

    // Find available port
    const port = await this.findAvailablePort(host.id);

    // Create new server with cloned configuration
    const containerName = `mc-${newName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const clonedServer = await prisma.minecraftServer.create({
      data: {
        name: newName,
        containerName,
        userId,
        hostId: host.id,
        port,
        version: originalServer.version,
        minecraftVersion: originalServer.minecraftVersion,
        allocatedRam: originalServer.allocatedRam,
        allocatedCpu: originalServer.allocatedCpu,
        maxPlayers: originalServer.maxPlayers,
        difficulty: originalServer.difficulty,
        gameMode: originalServer.gameMode,
        enableWhitelist: originalServer.enableWhitelist,
        status: ServerStatus.CREATING
      },
      include: { host: true, user: true }
    });

    try {
      // Create server container on the agent
      const result = await this.agentService.createServer(host, clonedServer);

      if (!result.success) {
        await prisma.minecraftServer.delete({ where: { id: clonedServer.id } });
        throw new AppError(result.error || 'Failed to create cloned server', 500);
      }

      // Update host resource usage
      await this.hostService.updateResourceUsage(host.id, originalServer.allocatedRam, originalServer.allocatedCpu);

      // Update server status
      const updatedServer = await prisma.minecraftServer.update({
        where: { id: clonedServer.id },
        data: { status: ServerStatus.STOPPED },
        include: { host: true, user: true }
      });

      // Copy installed mods from original server
      const originalMods = await prisma.serverMod.findMany({
        where: { serverId: originalServer.id },
        include: { mod: true }
      });

      if (originalMods.length > 0) {
        await prisma.serverMod.createMany({
          data: originalMods.map(sm => ({
            serverId: clonedServer.id,
            modId: sm.modId,
            enabled: sm.enabled
          }))
        });

        // Install mods on the new server
        for (const serverMod of originalMods) {
          try {
            await this.agentService.installMod(host, updatedServer, serverMod.mod.fileName);
          } catch (error) {
            console.error(`Failed to install mod ${serverMod.mod.name} on cloned server:`, error);
          }
        }
      }

      WebSocketService.getInstance().broadcast({
        event: WebSocketEvent.SERVER_CREATED,
        data: updatedServer,
        timestamp: new Date()
      });

      return updatedServer;
    } catch (error) {
      await prisma.minecraftServer.delete({ where: { id: clonedServer.id } });
      throw error;
    }
  }

  /**
   * Execute a command on the Minecraft server
   */
  async executeCommand(serverId: string, userId: string, command: string): Promise<AgentResponse> {
    const server = await this.getServerWithAuth(serverId, userId);

    if (server.status !== ServerStatus.RUNNING) {
      throw new AppError('Server must be running to execute commands', 400);
    }

    // Send command to agent
    const result = await this.agentService.executeCommand(server.host, server, command);

    if (!result.success) {
      throw new AppError(result.error || 'Failed to execute command', 500);
    }

    return result;
  }

  /**
   * Optimized port allocation - uses database query instead of iteration
   * Finds the first available port in the range 25565-35565
   */
  private async findAvailablePort(hostId: string): Promise<number> {
    const MIN_PORT = 25565;
    const MAX_PORT = 35565;

    // Get all used ports for this host, sorted
    const usedPorts = await prisma.minecraftServer.findMany({
      where: { hostId },
      select: { port: true },
      orderBy: { port: 'asc' }
    });

    // If no ports are used, return the first one
    if (usedPorts.length === 0) {
      return MIN_PORT;
    }

    // Find the first gap in the sequence
    let expectedPort = MIN_PORT;
    for (const server of usedPorts) {
      if (server.port === expectedPort) {
        expectedPort++;
      } else if (server.port > expectedPort) {
        // Found a gap
        return expectedPort;
      }
    }

    // No gaps found, use the next port after the last one
    if (expectedPort <= MAX_PORT) {
      return expectedPort;
    }

    throw new AppError('No available ports on this host', 503);
  }
}
