import { prisma } from '../lib/prisma';
import axios from 'axios';

export class ProxyServerService {
  // Create proxy server
  async createProxyServer(data: {
    name: string;
    type: 'BUNGEECORD' | 'VELOCITY' | 'WATERFALL';
    hostId: string;
    port: number;
    maxPlayers?: number;
    allocatedRam: number;
    config?: any;
  }) {
    const containerName = `proxy-${data.type.toLowerCase()}-${Date.now()}`;

    return prisma.proxyServer.create({
      data: {
        name: data.name,
        type: data.type,
        hostId: data.hostId,
        port: data.port,
        maxPlayers: data.maxPlayers || 500,
        allocatedRam: data.allocatedRam,
        containerName,
        config: data.config,
      },
    });
  }

  // Start proxy server
  async startProxyServer(proxyId: string) {
    const proxy = await prisma.proxyServer.findUnique({
      where: { id: proxyId },
      include: { linkedServers: true },
    });

    if (!proxy) throw new Error('Proxy server not found');

    // Get host
    const host = await prisma.host.findUnique({
      where: { id: proxy.hostId },
    });

    if (!host) throw new Error('Host not found');

    // Call agent to start proxy container
    try {
      await axios.post(`http://${host.ipAddress}:4000/proxy/start`, {
        proxyId: proxy.id,
        containerName: proxy.containerName,
        type: proxy.type,
        port: proxy.port,
        maxPlayers: proxy.maxPlayers,
        allocatedRam: proxy.allocatedRam,
        config: proxy.config,
      });

      await prisma.proxyServer.update({
        where: { id: proxyId },
        data: { status: 'RUNNING' },
      });

      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to start proxy: ${error.message}`);
    }
  }

  // Stop proxy server
  async stopProxyServer(proxyId: string) {
    const proxy = await prisma.proxyServer.findUnique({
      where: { id: proxyId },
    });

    if (!proxy) throw new Error('Proxy server not found');

    const host = await prisma.host.findUnique({
      where: { id: proxy.hostId },
    });

    if (!host) throw new Error('Host not found');

    try {
      await axios.post(`http://${host.ipAddress}:4000/proxy/stop`, {
        containerName: proxy.containerName,
      });

      await prisma.proxyServer.update({
        where: { id: proxyId },
        data: { status: 'STOPPED' },
      });

      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to stop proxy: ${error.message}`);
    }
  }

  // Link server to proxy
  async linkServer(proxyId: string, serverId: string, priority: number = 0) {
    return prisma.proxyServerLink.create({
      data: {
        proxyId,
        serverId,
        priority,
      },
    });
  }

  // Unlink server
  async unlinkServer(proxyId: string, serverId: string) {
    return prisma.proxyServerLink.delete({
      where: {
        proxyId_serverId: {
          proxyId,
          serverId,
        },
      },
    });
  }

  // Get linked servers
  async getLinkedServers(proxyId: string) {
    const links = await prisma.proxyServerLink.findMany({
      where: { proxyId },
      orderBy: { priority: 'desc' },
    });

    const serverIds = links.map(link => link.serverId);
    const servers = await prisma.minecraftServer.findMany({
      where: {
        id: {
          in: serverIds,
        },
      },
    });

    return servers;
  }

  // Update proxy config
  async updateProxyConfig(proxyId: string, config: any) {
    return prisma.proxyServer.update({
      where: { id: proxyId },
      data: { config },
    });
  }

  // Get proxy servers
  async getProxyServers() {
    return prisma.proxyServer.findMany({
      include: {
        linkedServers: true,
      },
    });
  }

  // Delete proxy server
  async deleteProxyServer(proxyId: string) {
    const proxy = await prisma.proxyServer.findUnique({
      where: { id: proxyId },
    });

    if (!proxy) throw new Error('Proxy server not found');

    // Stop if running
    if (proxy.status === 'RUNNING') {
      await this.stopProxyServer(proxyId);
    }

    return prisma.proxyServer.delete({
      where: { id: proxyId },
    });
  }
}

export const proxyServerService = new ProxyServerService();
