import { prisma } from '../lib/prisma';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

export class PluginMarketplaceService {
  // Create plugin
  async createPlugin(data: {
    name: string;
    description: string;
    longDescription?: string;
    version: string;
    author: string;
    authorId?: string;
    category: string;
    iconUrl?: string;
    screenshots?: string[];
    downloadUrl: string;
    sourceUrl?: string;
    documentationUrl?: string;
    minecraftVersions?: string[];
    dependencies?: string[];
    price?: number;
  }) {
    const slug = slugify(data.name, { lower: true, strict: true }) + '-' + nanoid(8);

    return prisma.plugin.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        longDescription: data.longDescription,
        version: data.version,
        author: data.author,
        authorId: data.authorId,
        category: data.category as any,
        iconUrl: data.iconUrl,
        screenshots: data.screenshots || [],
        downloadUrl: data.downloadUrl,
        sourceUrl: data.sourceUrl,
        documentationUrl: data.documentationUrl,
        minecraftVersions: data.minecraftVersions || [],
        dependencies: data.dependencies || [],
        price: data.price || 0,
      },
    });
  }

  // Search plugins
  async searchPlugins(query: string, filters?: {
    category?: string;
    minecraftVersion?: string;
    featured?: boolean;
    free?: boolean;
    verified?: boolean;
  }) {
    const where: any = {
      status: 'APPROVED',
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (filters?.category) where.category = filters.category;
    if (filters?.featured !== undefined) where.featured = filters.featured;
    if (filters?.verified !== undefined) where.verified = filters.verified;
    if (filters?.free) where.price = 0;
    if (filters?.minecraftVersion) {
      where.minecraftVersions = {
        has: filters.minecraftVersion,
      };
    }

    return prisma.plugin.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { downloads: 'desc' },
        { rating: 'desc' },
      ],
      take: 50,
    });
  }

  // Get plugin by slug
  async getPlugin(slug: string) {
    return prisma.plugin.findUnique({
      where: { slug },
      include: {
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // Install plugin
  async installPlugin(pluginId: string, serverId: string, config?: any) {
    const plugin = await prisma.plugin.findUnique({
      where: { id: pluginId },
    });

    if (!plugin) throw new Error('Plugin not found');

    // Increment download count
    await prisma.plugin.update({
      where: { id: pluginId },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    return prisma.pluginInstallation.create({
      data: {
        pluginId,
        serverId,
        version: plugin.version,
        config,
      },
    });
  }

  // Uninstall plugin
  async uninstallPlugin(pluginId: string, serverId: string) {
    return prisma.pluginInstallation.delete({
      where: {
        pluginId_serverId: {
          pluginId,
          serverId,
        },
      },
    });
  }

  // Get installed plugins
  async getInstalledPlugins(serverId: string) {
    return prisma.pluginInstallation.findMany({
      where: { serverId },
      include: {
        plugin: true,
      },
    });
  }

  // Add review
  async addReview(pluginId: string, userId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const review = await prisma.pluginReview.create({
      data: {
        pluginId,
        userId,
        rating,
        comment,
      },
    });

    // Update plugin rating
    await this.updatePluginRating(pluginId);

    return review;
  }

  // Update plugin rating
  private async updatePluginRating(pluginId: string) {
    const reviews = await prisma.pluginReview.findMany({
      where: { pluginId },
    });

    if (reviews.length === 0) return;

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.plugin.update({
      where: { id: pluginId },
      data: {
        rating: avgRating,
        reviewCount: reviews.length,
      },
    });
  }

  // Get featured plugins
  async getFeaturedPlugins(limit: number = 10) {
    return prisma.plugin.findMany({
      where: {
        featured: true,
        status: 'APPROVED',
      },
      orderBy: { downloads: 'desc' },
      take: limit,
    });
  }

  // Get popular plugins
  async getPopularPlugins(limit: number = 20) {
    return prisma.plugin.findMany({
      where: {
        status: 'APPROVED',
      },
      orderBy: { downloads: 'desc' },
      take: limit,
    });
  }

  // Get trending plugins (popular in last 7 days)
  async getTrendingPlugins(limit: number = 20) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return prisma.plugin.findMany({
      where: {
        status: 'APPROVED',
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { downloads: 'desc' },
      take: limit,
    });
  }

  // Approve plugin
  async approvePlugin(pluginId: string) {
    return prisma.plugin.update({
      where: { id: pluginId },
      data: { status: 'APPROVED' },
    });
  }

  // Reject plugin
  async rejectPlugin(pluginId: string) {
    return prisma.plugin.update({
      where: { id: pluginId },
      data: { status: 'REJECTED' },
    });
  }

  // Feature plugin
  async featurePlugin(pluginId: string, featured: boolean) {
    return prisma.plugin.update({
      where: { id: pluginId },
      data: { featured },
    });
  }

  // Verify plugin
  async verifyPlugin(pluginId: string, verified: boolean) {
    return prisma.plugin.update({
      where: { id: pluginId },
      data: { verified },
    });
  }
}

export const pluginMarketplaceService = new PluginMarketplaceService();
