import prisma from '../lib/prisma';
import type { ServerNetwork, NetworkType, NetworkMember } from '@prisma/client';
import axios from 'axios';

/**
 * Multi-Server Network Service
 *
 * Enables BungeeCord/Velocity/Waterfall proxy networks
 * - Automatic proxy server setup
 * - Dynamic server registration
 * - Load balancing between game servers
 * - Cross-server player transfer
 */
class ServerNetworkService {

  /**
   * Create a new server network with proxy
   */
  async createNetwork(
    name: string,
    networkType: NetworkType,
    proxyHostId: string,
    proxyPort: number = 25577
  ): Promise<ServerNetwork> {
    // Create proxy server configuration
    const proxyConfig = this.generateProxyConfig(networkType);

    // Create network record
    const network = await prisma.serverNetwork.create({
      data: {
        name,
        networkType,
        proxyPort,
        description: `${networkType} network with automatic load balancing`
      }
    });

    return network;
  }

  /**
   * Generate proxy server configuration
   */
  private generateProxyConfig(networkType: NetworkType): any {
    switch (networkType) {
      case 'BUNGEECORD':
        return {
          listeners: [{
            query_port: 25577,
            motd: 'A BungeeCord Server',
            priorities: [],
            bind_local_address: true,
            host: '0.0.0.0:25577',
            max_players: 500,
            forced_hosts: {},
            tab_size: 60,
            force_default_server: false
          }],
          ip_forward: true,
          online_mode: true,
          disabled_commands: ['disabledcommandhere'],
          servers: {},
          timeout: 30000,
          player_limit: -1,
          permissions: {
            default: ['bungeecord.command.server', 'bungeecord.command.list'],
            admin: ['bungeecord.command.alert', 'bungeecord.command.end', 'bungeecord.command.ip', 'bungeecord.command.reload']
          },
          groups: {
            md_5: ['admin']
          }
        };

      case 'VELOCITY':
        return {
          config_version: '2.5',
          bind: '0.0.0.0:25577',
          motd: 'A Velocity Server',
          show_max_players: 500,
          online_mode: true,
          force_key_authentication: true,
          prevent_client_proxy_connections: false,
          player_info_forwarding_mode: 'MODERN',
          forwarding_secret_file: 'forwarding.secret',
          announce_forge: false,
          kick_existing_players: false,
          ping_passthrough: 'DISABLED',
          enable_player_address_logging: true,
          servers: {},
          try: ['lobby'],
          forced_hosts: {}
        };

      case 'WATERFALL':
        // Waterfall uses BungeeCord config format
        return this.generateProxyConfig('BUNGEECORD');

      default:
        throw new Error(`Unsupported network type: ${networkType}`);
    }
  }

  /**
   * Add server to network
   */
  async addServerToNetwork(
    networkId: string,
    serverId: string,
    serverName: string,
    priority: number = 0,
    restricted: boolean = false
  ): Promise<NetworkMember> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Add server to network
    const member = await prisma.networkMember.create({
      data: {
        networkId,
        serverId,
        serverName,
        priority,
        restricted
      }
    });

    // Update proxy configuration
    await this.updateProxyConfig(networkId);

    return member;
  }

  /**
   * Remove server from network
   */
  async removeServerFromNetwork(networkId: string, serverId: string): Promise<void> {
    await prisma.networkMember.delete({
      where: {
        networkId_serverId: {
          networkId,
          serverId
        }
      }
    });

    // Update proxy configuration
    await this.updateProxyConfig(networkId);
  }

  /**
   * Update proxy server configuration
   */
  async updateProxyConfig(networkId: string): Promise<void> {
    const network = await prisma.serverNetwork.findUnique({
      where: { id: networkId },
      include: {
        members: {
          include: {
            network: true
          }
        }
      }
    });

    if (!network) {
      throw new Error('Network not found');
    }

    // Generate updated config based on network type
    let config: any;

    if (network.networkType === 'BUNGEECORD' || network.networkType === 'WATERFALL') {
      config = this.generateProxyConfig(network.networkType);

      // Add servers to config
      config.servers = {};
      const priorities: string[] = [];

      for (const member of network.members) {
        const server = await prisma.minecraftServer.findUnique({
          where: { id: member.serverId },
          include: { host: true }
        });

        if (server) {
          config.servers[member.serverName] = {
            motd: server.name,
            address: `${server.host.ipAddress}:${server.port}`,
            restricted: member.restricted
          };

          priorities.push(member.serverName);
        }
      }

      // Sort by priority
      priorities.sort((a, b) => {
        const memberA = network.members.find(m => m.serverName === a);
        const memberB = network.members.find(m => m.serverName === b);
        return (memberB?.priority || 0) - (memberA?.priority || 0);
      });

      config.listeners[0].priorities = priorities;

    } else if (network.networkType === 'VELOCITY') {
      config = this.generateProxyConfig(network.networkType);

      // Add servers to config
      config.servers = {};
      const tryList: string[] = [];

      for (const member of network.members) {
        const server = await prisma.minecraftServer.findUnique({
          where: { id: member.serverId },
          include: { host: true }
        });

        if (server) {
          config.servers[member.serverName] = `${server.host.ipAddress}:${server.port}`;
          if (!member.restricted) {
            tryList.push(member.serverName);
          }
        }
      }

      config.try = tryList;
    }

    // TODO: Write config file to proxy server via agent
    // This would involve:
    // 1. Convert config object to appropriate format (YAML for BungeeCord, TOML for Velocity)
    // 2. Upload to proxy server
    // 3. Reload proxy server
  }

  /**
   * Get network details with members
   */
  async getNetwork(networkId: string): Promise<any> {
    const network = await prisma.serverNetwork.findUnique({
      where: { id: networkId },
      include: {
        members: {
          include: {
            network: true
          },
          orderBy: { priority: 'desc' }
        }
      }
    });

    if (!network) {
      throw new Error('Network not found');
    }

    // Fetch server details for each member
    const membersWithDetails = await Promise.all(
      network.members.map(async (member) => {
        const server = await prisma.minecraftServer.findUnique({
          where: { id: member.serverId },
          include: {
            host: true,
            stats: true
          }
        });

        return {
          ...member,
          server
        };
      })
    );

    return {
      ...network,
      members: membersWithDetails
    };
  }

  /**
   * Get all networks
   */
  async getAllNetworks(): Promise<ServerNetwork[]> {
    return await prisma.serverNetwork.findMany({
      include: {
        members: {
          orderBy: { priority: 'desc' }
        }
      }
    });
  }

  /**
   * Update server priority in network
   */
  async updateServerPriority(networkId: string, serverId: string, priority: number): Promise<void> {
    await prisma.networkMember.update({
      where: {
        networkId_serverId: {
          networkId,
          serverId
        }
      },
      data: { priority }
    });

    // Update proxy configuration
    await this.updateProxyConfig(networkId);
  }

  /**
   * Set server restriction
   */
  async setServerRestriction(networkId: string, serverId: string, restricted: boolean): Promise<void> {
    await prisma.networkMember.update({
      where: {
        networkId_serverId: {
          networkId,
          serverId
        }
      },
      data: { restricted }
    });

    // Update proxy configuration
    await this.updateProxyConfig(networkId);
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(networkId: string): Promise<any> {
    const network = await this.getNetwork(networkId);

    let totalPlayers = 0;
    let totalMaxPlayers = 0;
    let onlineServers = 0;

    for (const member of network.members) {
      if (member.server?.status === 'RUNNING') {
        onlineServers++;
        totalPlayers += member.server.stats?.onlinePlayers || 0;
        totalMaxPlayers += member.server.maxPlayers;
      }
    }

    return {
      networkId: network.id,
      networkName: network.name,
      networkType: network.networkType,
      totalServers: network.members.length,
      onlineServers,
      totalPlayers,
      totalMaxPlayers,
      averagePlayersPerServer: onlineServers > 0 ? totalPlayers / onlineServers : 0
    };
  }

  /**
   * Auto-balance players across servers
   * Suggests server redistribution based on current load
   */
  async suggestLoadBalancing(networkId: string): Promise<any[]> {
    const network = await this.getNetwork(networkId);
    const suggestions: any[] = [];

    // Calculate average load
    const runningServers = network.members.filter((m: any) => m.server?.status === 'RUNNING');
    if (runningServers.length < 2) {
      return []; // Need at least 2 servers for load balancing
    }

    const totalPlayers = runningServers.reduce((sum: number, m: any) => sum + (m.server?.stats?.onlinePlayers || 0), 0);
    const avgPlayers = totalPlayers / runningServers.length;

    // Find overloaded and underloaded servers
    for (const member of runningServers) {
      const players = member.server?.stats?.onlinePlayers || 0;
      const deviation = players - avgPlayers;

      if (Math.abs(deviation) > avgPlayers * 0.3) { // 30% deviation threshold
        suggestions.push({
          serverId: member.serverId,
          serverName: member.serverName,
          currentPlayers: players,
          targetPlayers: Math.round(avgPlayers),
          deviation: Math.round(deviation),
          action: deviation > 0 ? 'REDUCE_LOAD' : 'CAN_ACCEPT_MORE'
        });
      }
    }

    return suggestions;
  }

  /**
   * Deploy pre-configured network setup
   * Creates lobby + multiple game servers
   */
  async deployNetworkSetup(
    name: string,
    networkType: NetworkType,
    hostId: string,
    gameServerCount: number = 3
  ): Promise<ServerNetwork> {
    // Create network
    const network = await this.createNetwork(name, networkType, hostId);

    // TODO: Create and configure servers
    // 1. Create proxy server
    // 2. Create lobby server
    // 3. Create game servers
    // 4. Configure all servers
    // 5. Add all to network

    return network;
  }

  /**
   * Delete network
   */
  async deleteNetwork(networkId: string): Promise<void> {
    // Remove all members first
    await prisma.networkMember.deleteMany({
      where: { networkId }
    });

    // Delete network
    await prisma.serverNetwork.delete({
      where: { id: networkId }
    });
  }
}

export default new ServerNetworkService();
