import { prisma } from '../lib/prisma';
import axios from 'axios';

export class WorldManagementService {
  // Create world template
  async createWorldTemplate(data: {
    name: string;
    description: string;
    category: string;
    minecraftVersion: string;
    seed?: string;
    thumbnail?: string;
    downloadUrl: string;
    fileSize: number;
    createdBy?: string;
  }) {
    return prisma.worldTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category as any,
        minecraftVersion: data.minecraftVersion,
        seed: data.seed,
        thumbnail: data.thumbnail,
        downloadUrl: data.downloadUrl,
        fileSize: data.fileSize,
        createdBy: data.createdBy,
      },
    });
  }

  // Search world templates
  async searchTemplates(query?: string, filters?: {
    category?: string;
    minecraftVersion?: string;
    featured?: boolean;
  }) {
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (filters?.category) where.category = filters.category;
    if (filters?.minecraftVersion) where.minecraftVersion = filters.minecraftVersion;
    if (filters?.featured !== undefined) where.featured = filters.featured;

    return prisma.worldTemplate.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { downloads: 'desc' },
        { rating: 'desc' },
      ],
    });
  }

  // Get template by ID
  async getTemplate(id: string) {
    return prisma.worldTemplate.findUnique({
      where: { id },
    });
  }

  // Download and install world template
  async installWorldTemplate(templateId: string, serverId: string) {
    const template = await prisma.worldTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) throw new Error('Template not found');

    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId },
      include: { host: true },
    });

    if (!server) throw new Error('Server not found');

    // Increment download count
    await prisma.worldTemplate.update({
      where: { id: templateId },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    // Call agent to download and install world
    await axios.post(`http://${server.host.ipAddress}:4000/world/install`, {
      serverId,
      downloadUrl: template.downloadUrl,
      worldName: template.name,
    });

    return { success: true };
  }

  // Create server world record
  async createServerWorld(data: {
    serverId: string;
    name: string;
    dimension: string;
    seed?: string;
    size: number;
    generatorSettings?: any;
  }) {
    return prisma.serverWorld.create({
      data: {
        serverId: data.serverId,
        name: data.name,
        dimension: data.dimension as any,
        seed: data.seed,
        size: data.size,
        generatorSettings: data.generatorSettings,
      },
    });
  }

  // Get server worlds
  async getServerWorlds(serverId: string) {
    return prisma.serverWorld.findMany({
      where: { serverId },
      orderBy: { lastModified: 'desc' },
    });
  }

  // Update world
  async updateServerWorld(worldId: string, data: {
    active?: boolean;
    size?: number;
  }) {
    return prisma.serverWorld.update({
      where: { id: worldId },
      data: {
        ...data,
        lastModified: new Date(),
      },
    });
  }

  // Delete world
  async deleteServerWorld(worldId: string) {
    const world = await prisma.serverWorld.findUnique({
      where: { id: worldId },
    });

    if (!world) throw new Error('World not found');

    const server = await prisma.minecraftServer.findUnique({
      where: { id: world.serverId },
      include: { host: true },
    });

    if (!server) throw new Error('Server not found');

    // Call agent to delete world files
    await axios.post(`http://${server.host.ipAddress}:4000/world/delete`, {
      serverId: world.serverId,
      worldName: world.name,
      dimension: world.dimension,
    });

    return prisma.serverWorld.delete({
      where: { id: worldId },
    });
  }

  // Reset world
  async resetWorld(worldId: string) {
    const world = await prisma.serverWorld.findUnique({
      where: { id: worldId },
    });

    if (!world) throw new Error('World not found');

    const server = await prisma.minecraftServer.findUnique({
      where: { id: world.serverId },
      include: { host: true },
    });

    if (!server) throw new Error('Server not found');

    // Call agent to reset world
    await axios.post(`http://${server.host.ipAddress}:4000/world/reset`, {
      serverId: world.serverId,
      worldName: world.name,
      dimension: world.dimension,
      seed: world.seed,
    });

    return prisma.serverWorld.update({
      where: { id: worldId },
      data: {
        lastModified: new Date(),
      },
    });
  }

  // Get featured templates
  async getFeaturedTemplates(limit: number = 10) {
    return prisma.worldTemplate.findMany({
      where: { featured: true },
      orderBy: { downloads: 'desc' },
      take: limit,
    });
  }

  // Get popular templates
  async getPopularTemplates(limit: number = 20) {
    return prisma.worldTemplate.findMany({
      orderBy: { downloads: 'desc' },
      take: limit,
    });
  }
}

export const worldManagementService = new WorldManagementService();
