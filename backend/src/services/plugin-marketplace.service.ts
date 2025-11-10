import prisma from '../lib/prisma';
import axios from 'axios';
import type { MarketplacePlugin, PluginVersion, ModLoader } from '@prisma/client';

interface CurseForgePlugin {
  id: number;
  name: string;
  slug: string;
  summary: string;
  description: string;
  downloadCount: number;
  categories: string[];
  authors: { name: string; url: string }[];
  links: { websiteUrl?: string };
  logo: { url: string };
  gameVersions: string[];
}

interface ModrinthPlugin {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  downloads: number;
  categories: string[];
  author: string;
  icon_url: string;
  source_url?: string;
  game_versions: string[];
  loaders: string[];
}

/**
 * Plugin Marketplace Service
 *
 * Integrates with CurseForge and Modrinth APIs
 * - One-click plugin installation
 * - Automatic updates
 * - Dependency resolution
 * - Rating and reviews
 */
class PluginMarketplaceService {
  private readonly curseforgeApiKey = process.env.CURSEFORGE_API_KEY || '';
  private readonly curseforgeBaseUrl = 'https://api.curseforge.com/v1';
  private readonly modrinthBaseUrl = 'https://api.modrinth.com/v2';

  /**
   * Sync plugins from CurseForge
   */
  async syncFromCurseForge(limit: number = 50): Promise<number> {
    if (!this.curseforgeApiKey) {
      console.warn('CurseForge API key not configured');
      return 0;
    }

    try {
      const response = await axios.get(`${this.curseforgeBaseUrl}/mods/search`, {
        headers: {
          'x-api-key': this.curseforgeApiKey
        },
        params: {
          gameId: 432, // Minecraft
          classId: 6, // Mods
          sortField: 'downloadCount',
          sortOrder: 'desc',
          pageSize: limit
        }
      });

      const plugins: CurseForgePlugin[] = response.data.data;
      let syncedCount = 0;

      for (const plugin of plugins) {
        await this.importCurseForgePlugin(plugin);
        syncedCount++;
      }

      return syncedCount;
    } catch (error) {
      console.error('Failed to sync from CurseForge:', error);
      return 0;
    }
  }

  /**
   * Sync plugins from Modrinth
   */
  async syncFromModrinth(limit: number = 50): Promise<number> {
    try {
      const response = await axios.get(`${this.modrinthBaseUrl}/search`, {
        params: {
          facets: '[["project_type:mod"]]',
          limit,
          index: 'downloads'
        }
      });

      const plugins: ModrinthPlugin[] = response.data.hits;
      let syncedCount = 0;

      for (const plugin of plugins) {
        await this.importModrinthPlugin(plugin);
        syncedCount++;
      }

      return syncedCount;
    } catch (error) {
      console.error('Failed to sync from Modrinth:', error);
      return 0;
    }
  }

  /**
   * Import plugin from CurseForge
   */
  private async importCurseForgePlugin(plugin: CurseForgePlugin): Promise<MarketplacePlugin> {
    const category = this.mapCategoryToPrisma(plugin.categories[0] || 'utility');

    return await prisma.marketplacePlugin.upsert({
      where: { curseforgeId: plugin.id.toString() },
      update: {
        name: plugin.name,
        description: plugin.summary,
        longDescription: plugin.description,
        downloads: plugin.downloadCount,
        iconUrl: plugin.logo?.url,
        sourceUrl: plugin.links?.websiteUrl,
        author: plugin.authors[0]?.name || 'Unknown',
        authorUrl: plugin.authors[0]?.url,
        minecraftVersions: plugin.gameVersions,
        updatedAt: new Date()
      },
      create: {
        name: plugin.name,
        slug: plugin.slug,
        description: plugin.summary,
        longDescription: plugin.description,
        category,
        author: plugin.authors[0]?.name || 'Unknown',
        authorUrl: plugin.authors[0]?.url,
        iconUrl: plugin.logo?.url,
        sourceUrl: plugin.links?.websiteUrl,
        minecraftVersions: plugin.gameVersions,
        modLoaders: ['FORGE', 'FABRIC'] as ModLoader[],
        curseforgeId: plugin.id.toString(),
        downloads: plugin.downloadCount,
        verified: true
      }
    });
  }

  /**
   * Import plugin from Modrinth
   */
  private async importModrinthPlugin(plugin: ModrinthPlugin): Promise<MarketplacePlugin> {
    const category = this.mapCategoryToPrisma(plugin.categories[0] || 'utility');
    const modLoaders = plugin.loaders.map(l => l.toUpperCase()) as ModLoader[];

    return await prisma.marketplacePlugin.upsert({
      where: { modrinthId: plugin.id },
      update: {
        name: plugin.title,
        description: plugin.description,
        longDescription: plugin.body,
        downloads: plugin.downloads,
        iconUrl: plugin.icon_url,
        sourceUrl: plugin.source_url,
        minecraftVersions: plugin.game_versions,
        modLoaders,
        updatedAt: new Date()
      },
      create: {
        name: plugin.title,
        slug: plugin.slug,
        description: plugin.description,
        longDescription: plugin.body,
        category,
        author: plugin.author,
        iconUrl: plugin.icon_url,
        sourceUrl: plugin.source_url,
        minecraftVersions: plugin.game_versions,
        modLoaders,
        modrinthId: plugin.id,
        downloads: plugin.downloads,
        verified: true
      }
    });
  }

  /**
   * Map category string to Prisma enum
   */
  private mapCategoryToPrisma(category: string): any {
    const mapping: Record<string, string> = {
      'optimization': 'OPTIMIZATION',
      'technology': 'TECHNOLOGY',
      'magic': 'MAGIC',
      'adventure': 'ADVENTURE',
      'decoration': 'DECORATION',
      'utility': 'UTILITY',
      'world-gen': 'WORLD_GEN',
      'mobs': 'MOBS',
      'items': 'ITEMS',
      'economy': 'ECONOMY',
      'admin': 'ADMIN_TOOLS',
      'gameplay': 'GAMEPLAY'
    };

    return mapping[category.toLowerCase()] || 'UTILITY';
  }

  /**
   * Search plugins in marketplace
   */
  async searchPlugins(query: string, category?: string, modLoader?: ModLoader): Promise<MarketplacePlugin[]> {
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (category) {
      where.category = category;
    }

    if (modLoader) {
      where.modLoaders = { has: modLoader };
    }

    return await prisma.marketplacePlugin.findMany({
      where,
      include: {
        versions: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      take: 50,
      orderBy: { downloads: 'desc' }
    });
  }

  /**
   * Get plugin details
   */
  async getPluginDetails(pluginId: string): Promise<MarketplacePlugin | null> {
    return await prisma.marketplacePlugin.findUnique({
      where: { id: pluginId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Install plugin on server
   */
  async installPlugin(serverId: string, pluginId: string, versionId?: string): Promise<void> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const plugin = await prisma.marketplacePlugin.findUnique({
      where: { id: pluginId },
      include: { versions: true }
    });

    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Find compatible version
    let version: PluginVersion | undefined;

    if (versionId) {
      version = plugin.versions.find(v => v.id === versionId);
    } else {
      // Auto-select compatible version
      version = plugin.versions.find(v =>
        v.minecraftVersion === server.version &&
        v.modLoader === server.minecraftVersion
      );

      if (!version) {
        // Fallback to latest version
        version = plugin.versions[0];
      }
    }

    if (!version) {
      throw new Error('No compatible plugin version found');
    }

    // Create installation record
    await prisma.pluginInstallation.create({
      data: {
        serverId,
        pluginId,
        versionId: version.id,
        status: 'PENDING'
      }
    });

    // Update download count
    await prisma.marketplacePlugin.update({
      where: { id: pluginId },
      data: { downloads: { increment: 1 } }
    });

    await prisma.pluginVersion.update({
      where: { id: version.id },
      data: { downloads: { increment: 1 } }
    });

    // TODO: Trigger actual plugin download and installation via agent
    // This would involve:
    // 1. Download plugin file from URL
    // 2. Upload to server via agent API
    // 3. Place in mods/plugins folder
    // 4. Update installation status
  }

  /**
   * Uninstall plugin from server
   */
  async uninstallPlugin(serverId: string, pluginId: string): Promise<void> {
    const installation = await prisma.pluginInstallation.findUnique({
      where: {
        serverId_pluginId: {
          serverId,
          pluginId
        }
      }
    });

    if (!installation) {
      throw new Error('Plugin not installed on this server');
    }

    // Update status to uninstalling
    await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: { status: 'UNINSTALLING' }
    });

    // TODO: Trigger actual plugin removal via agent

    // Delete installation record
    await prisma.pluginInstallation.delete({
      where: { id: installation.id }
    });
  }

  /**
   * Get installed plugins for server
   */
  async getInstalledPlugins(serverId: string): Promise<any[]> {
    return await prisma.pluginInstallation.findMany({
      where: { serverId },
      include: {
        plugin: {
          include: {
            versions: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });
  }

  /**
   * Get featured plugins
   */
  async getFeaturedPlugins(limit: number = 10): Promise<MarketplacePlugin[]> {
    return await prisma.marketplacePlugin.findMany({
      where: { featured: true },
      include: {
        versions: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      take: limit,
      orderBy: { downloads: 'desc' }
    });
  }

  /**
   * Get top plugins by category
   */
  async getTopPluginsByCategory(category: string, limit: number = 10): Promise<MarketplacePlugin[]> {
    return await prisma.marketplacePlugin.findMany({
      where: { category: category as any },
      include: {
        versions: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      take: limit,
      orderBy: { downloads: 'desc' }
    });
  }

  /**
   * Check for plugin updates
   */
  async checkForUpdates(serverId: string): Promise<any[]> {
    const installations = await this.getInstalledPlugins(serverId);
    const updates: any[] = [];

    for (const installation of installations) {
      const latestVersion = installation.plugin.versions[0];

      if (latestVersion && latestVersion.id !== installation.versionId) {
        updates.push({
          plugin: installation.plugin,
          currentVersion: installation.versionId,
          latestVersion: latestVersion
        });
      }
    }

    return updates;
  }

  /**
   * Auto-update all plugins on server
   */
  async autoUpdatePlugins(serverId: string): Promise<number> {
    const updates = await this.checkForUpdates(serverId);
    let updatedCount = 0;

    for (const update of updates) {
      try {
        await this.uninstallPlugin(serverId, update.plugin.id);
        await this.installPlugin(serverId, update.plugin.id, update.latestVersion.id);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update plugin ${update.plugin.name}:`, error);
      }
    }

    return updatedCount;
  }
}

export default new PluginMarketplaceService();
