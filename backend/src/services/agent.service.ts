import axios from 'axios';
import { Host, MinecraftServer } from '@prisma/client';
import { AgentCommandType, AgentResponse } from '@minecraft-hosting/shared';

/**
 * Agent Service
 * Kommuniziert mit den Host-Agenten über REST API
 * Die Agenten laufen auf den einzelnen Hosts und verwalten Docker Container
 */
export class AgentService {
  /**
   * Erstellt einen neuen Minecraft Server Container auf dem Host
   */
  async createServer(host: Host, server: MinecraftServer): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.CREATE_SERVER, {
      serverId: server.id,
      containerName: server.containerName,
      minecraftVersion: server.version,
      versionType: server.minecraftVersion,
      port: server.port,
      allocatedRam: server.allocatedRam,
      allocatedCpu: server.allocatedCpu,
      maxPlayers: server.maxPlayers,
      difficulty: server.difficulty,
      gameMode: server.gameMode,
      enableWhitelist: server.enableWhitelist
    });
  }

  /**
   * Startet einen Server Container
   */
  async startServer(host: Host, server: MinecraftServer): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.START_SERVER, {
      serverId: server.id,
      containerName: server.containerName
    });
  }

  /**
   * Stoppt einen Server Container (graceful shutdown)
   */
  async stopServer(host: Host, server: MinecraftServer): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.STOP_SERVER, {
      serverId: server.id,
      containerName: server.containerName
    });
  }

  /**
   * WICHTIG: Rolling Restart mit minimaler Downtime
   * Der Agent führt folgende Schritte aus:
   * 1. Sende "save-all" Befehl an Minecraft Server
   * 2. Warte auf Bestätigung
   * 3. Stoppe Container graceful (mit SIGTERM, wartet auf sauberes Beenden)
   * 4. Starte Container neu
   * Gesamte Downtime: ~3-5 Sekunden
   */
  async restartServer(host: Host, server: MinecraftServer): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.RESTART_SERVER, {
      serverId: server.id,
      containerName: server.containerName,
      graceful: true // Wichtig für minimale Downtime
    });
  }

  /**
   * KRITISCH: Live-Update der Container-Ressourcen
   *
   * Docker erlaubt Live-Updates von:
   * - Memory Limits (--memory)
   * - CPU Limits (--cpus)
   *
   * Ohne Container-Neustart! Dies geschieht durch:
   * - docker update --memory=XG --cpus=Y container_name
   *
   * Nur bei drastischen Änderungen (z.B. > 50% Unterschied) wird ein
   * kurzer Rolling-Restart durchgeführt
   */
  async updateResources(
    host: Host,
    server: MinecraftServer,
    newRam: number,
    newCpu: number
  ): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.UPDATE_RESOURCES, {
      serverId: server.id,
      containerName: server.containerName,
      allocatedRam: newRam,
      allocatedCpu: newCpu,
      liveUpdate: true // Docker Live-Update nutzen
    });
  }

  /**
   * Führt einen Minecraft-Befehl im Server aus (z.B. /say, /op, etc.)
   */
  async executeCommand(host: Host, server: MinecraftServer, command: string): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.EXECUTE_COMMAND, {
      serverId: server.id,
      containerName: server.containerName,
      command
    });
  }

  /**
   * Erstellt ein Backup der Serverwelt
   */
  async createBackup(host: Host, server: MinecraftServer, backupName: string): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.CREATE_BACKUP, {
      serverId: server.id,
      containerName: server.containerName,
      backupName
    });
  }

  /**
   * Stellt ein Backup wieder her
   */
  async restoreBackup(host: Host, server: MinecraftServer, backupPath: string): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.RESTORE_BACKUP, {
      serverId: server.id,
      containerName: server.containerName,
      backupPath
    });
  }

  /**
   * Installiert einen Mod auf dem Server
   */
  async installMod(host: Host, server: MinecraftServer, modFileName: string): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.INSTALL_MOD, {
      serverId: server.id,
      containerName: server.containerName,
      modFileName
    });
  }

  /**
   * Entfernt einen Mod vom Server
   */
  async removeMod(host: Host, server: MinecraftServer, modFileName: string): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.REMOVE_MOD, {
      serverId: server.id,
      containerName: server.containerName,
      modFileName
    });
  }

  /**
   * Löscht einen Server Container komplett
   */
  async deleteServer(host: Host, server: MinecraftServer): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.CREATE_SERVER, {
      serverId: server.id,
      containerName: server.containerName,
      delete: true
    });
  }

  /**
   * Holt aktuelle Stats vom Server (RAM, CPU, TPS, Spieler)
   */
  async getStats(host: Host, server: MinecraftServer): Promise<AgentResponse> {
    return this.sendCommand(host, AgentCommandType.GET_STATS, {
      serverId: server.id,
      containerName: server.containerName
    });
  }

  /**
   * Sendet einen Befehl an den Host-Agent
   */
  private async sendCommand(host: Host, type: AgentCommandType, payload: any): Promise<AgentResponse> {
    try {
      const response = await axios.post(
        `http://${host.ipAddress}:4000/api/command`,
        {
          type,
          payload
        },
        {
          headers: {
            'Authorization': `Bearer ${host.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 Sekunden Timeout
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`Agent command failed for host ${host.name}:`, error.message);
      throw new Error(`Failed to communicate with host agent: ${error.message}`);
    }
  }
}
