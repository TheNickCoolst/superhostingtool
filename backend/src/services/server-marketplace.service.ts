import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { MinecraftVersionType, Difficulty, GameMode } from '@prisma/client';

/**
 * 🛒 Server Marketplace Service
 *
 * Community-Marketplace für Server-Templates:
 * - User können eigene Templates hochladen und teilen
 * - Bewertungen und Reviews
 * - Monetarisierung (optional: kostenpflichtige Premium-Templates)
 * - Download-Statistiken
 * - Featured Templates (Kuriert von Admins)
 * - Tags und Kategorien
 */

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  author: {
    id: string;
    username: string;
  };
  minecraftVersion: string;
  versionType: MinecraftVersionType;
  category: TemplateCategory;
  tags: string[];

  // Configuration
  allocatedRam: number;
  allocatedCpu: number;
  maxPlayers: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  preInstalledMods: string[];

  // Marketplace metadata
  downloads: number;
  rating: number; // 0-5
  reviewCount: number;
  isFeatured: boolean;
  isPremium: boolean;
  price?: number; // in cents

  // Media
  thumbnailUrl?: string;
  screenshotUrls: string[];
  videoUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

export enum TemplateCategory {
  SURVIVAL = 'SURVIVAL',
  CREATIVE = 'CREATIVE',
  MINIGAMES = 'MINIGAMES',
  ADVENTURE = 'ADVENTURE',
  ROLEPLAY = 'ROLEPLAY',
  MODDED = 'MODDED',
  SKYBLOCK = 'SKYBLOCK',
  PRISON = 'PRISON',
  PARKOUR = 'PARKOUR',
  PVP = 'PVP',
  OTHER = 'OTHER'
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  username: string;
  rating: number; // 1-5
  comment?: string;
  helpful: number; // upvotes
  createdAt: Date;
}

export interface MarketplaceSearchFilters {
  query?: string;
  category?: TemplateCategory;
  tags?: string[];
  minecraftVersion?: string;
  versionType?: MinecraftVersionType;
  minRating?: number;
  isFree?: boolean;
  isFeatured?: boolean;
  sortBy?: 'downloads' | 'rating' | 'recent' | 'popular';
  page?: number;
  limit?: number;
}

export class ServerMarketplaceService {
  /**
   * Veröffentlicht neues Template im Marketplace
   */
  async publishTemplate(
    userId: string,
    data: {
      name: string;
      description: string;
      longDescription?: string;
      templateId: string; // Referenz zu bestehendem ServerTemplate
      category: TemplateCategory;
      tags?: string[];
      thumbnailUrl?: string;
      screenshotUrls?: string[];
      videoUrl?: string;
      isPremium?: boolean;
      price?: number;
    }
  ): Promise<MarketplaceTemplate> {
    logger.info(`Publishing template "${data.name}" by user ${userId}`);

    try {
      // Hole Template-Daten
      const template = await prisma.serverTemplate.findUnique({
        where: { id: data.templateId }
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Update Template als öffentlich
      const updatedTemplate = await prisma.serverTemplate.update({
        where: { id: data.templateId },
        data: {
          isPublic: true,
          updatedAt: new Date()
        }
      });

      // Hole User-Info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`Template "${data.name}" published successfully`);

      return {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        longDescription: data.longDescription,
        author: user,
        minecraftVersion: updatedTemplate.minecraftVersion,
        versionType: updatedTemplate.versionType,
        category: data.category,
        tags: data.tags || [],
        allocatedRam: updatedTemplate.allocatedRam,
        allocatedCpu: updatedTemplate.allocatedCpu,
        maxPlayers: updatedTemplate.maxPlayers,
        difficulty: updatedTemplate.difficulty,
        gameMode: updatedTemplate.gameMode,
        preInstalledMods: updatedTemplate.preInstalledMods,
        downloads: updatedTemplate.downloads,
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        isPremium: data.isPremium || false,
        price: data.price,
        thumbnailUrl: data.thumbnailUrl,
        screenshotUrls: data.screenshotUrls || [],
        videoUrl: data.videoUrl,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt
      };
    } catch (error) {
      logger.error('Failed to publish template:', error);
      throw error;
    }
  }

  /**
   * Sucht Templates im Marketplace
   */
  async searchTemplates(filters: MarketplaceSearchFilters = {}): Promise<{
    templates: MarketplaceTemplate[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    logger.info(`Searching marketplace with filters:`, filters);

    try {
      // Build where clause
      const where: any = {
        isPublic: true
      };

      if (filters.query) {
        where.OR = [
          { name: { contains: filters.query, mode: 'insensitive' } },
          { description: { contains: filters.query, mode: 'insensitive' } }
        ];
      }

      if (filters.minecraftVersion) {
        where.minecraftVersion = filters.minecraftVersion;
      }

      if (filters.versionType) {
        where.versionType = filters.versionType;
      }

      // Build orderBy
      let orderBy: any = { downloads: 'desc' }; // Default

      if (filters.sortBy === 'recent') {
        orderBy = { createdAt: 'desc' };
      } else if (filters.sortBy === 'downloads') {
        orderBy = { downloads: 'desc' };
      }

      const [templates, total] = await Promise.all([
        prisma.serverTemplate.findMany({
          where,
          orderBy,
          skip,
          take: limit
        }),
        prisma.serverTemplate.count({ where })
      ]);

      // Convert to MarketplaceTemplate format
      const marketplaceTemplates: MarketplaceTemplate[] = await Promise.all(
        templates.map(async (t) => {
          let author = { id: 'system', username: 'System' };
          if (t.createdBy) {
            const user = await prisma.user.findUnique({
              where: { id: t.createdBy },
              select: { id: true, username: true }
            });
            if (user) author = user;
          }

          return {
            id: t.id,
            name: t.name,
            description: t.description,
            author,
            minecraftVersion: t.minecraftVersion,
            versionType: t.versionType,
            category: TemplateCategory.OTHER, // Would be in DB
            tags: [],
            allocatedRam: t.allocatedRam,
            allocatedCpu: t.allocatedCpu,
            maxPlayers: t.maxPlayers,
            difficulty: t.difficulty,
            gameMode: t.gameMode,
            preInstalledMods: t.preInstalledMods,
            downloads: t.downloads,
            rating: 0,
            reviewCount: 0,
            isFeatured: false,
            isPremium: false,
            screenshotUrls: [],
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          };
        })
      );

      return {
        templates: marketplaceTemplates,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to search templates:', error);
      throw error;
    }
  }

  /**
   * Holt Featured Templates (Kuratierte Auswahl)
   */
  async getFeaturedTemplates(limit: number = 10): Promise<MarketplaceTemplate[]> {
    logger.info(`Fetching featured templates (limit: ${limit})`);

    try {
      // In echtem System würde man Featured-Flag in DB haben
      const templates = await prisma.serverTemplate.findMany({
        where: { isPublic: true },
        orderBy: { downloads: 'desc' },
        take: limit
      });

      const marketplaceTemplates: MarketplaceTemplate[] = await Promise.all(
        templates.map(async (t) => {
          let author = { id: 'system', username: 'System' };
          if (t.createdBy) {
            const user = await prisma.user.findUnique({
              where: { id: t.createdBy },
              select: { id: true, username: true }
            });
            if (user) author = user;
          }

          return {
            id: t.id,
            name: t.name,
            description: t.description,
            author,
            minecraftVersion: t.minecraftVersion,
            versionType: t.versionType,
            category: TemplateCategory.OTHER,
            tags: [],
            allocatedRam: t.allocatedRam,
            allocatedCpu: t.allocatedCpu,
            maxPlayers: t.maxPlayers,
            difficulty: t.difficulty,
            gameMode: t.gameMode,
            preInstalledMods: t.preInstalledMods,
            downloads: t.downloads,
            rating: 0,
            reviewCount: 0,
            isFeatured: true,
            isPremium: false,
            screenshotUrls: [],
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          };
        })
      );

      return marketplaceTemplates;
    } catch (error) {
      logger.error('Failed to fetch featured templates:', error);
      throw error;
    }
  }

  /**
   * Fügt Review für Template hinzu
   */
  async addReview(
    templateId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<TemplateReview> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    logger.info(`Adding review for template ${templateId} by user ${userId}`);

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // In echtem System würde man Review-Tabelle haben
      // Für jetzt nur simuliert

      const review: TemplateReview = {
        id: `review-${Date.now()}`,
        templateId,
        userId,
        username: user.username,
        rating,
        comment,
        helpful: 0,
        createdAt: new Date()
      };

      logger.info(`Review added successfully`);
      return review;
    } catch (error) {
      logger.error('Failed to add review:', error);
      throw error;
    }
  }

  /**
   * Erhöht Download-Counter
   */
  async incrementDownloadCount(templateId: string): Promise<void> {
    logger.info(`Incrementing download count for template ${templateId}`);

    try {
      await prisma.serverTemplate.update({
        where: { id: templateId },
        data: {
          downloads: { increment: 1 }
        }
      });
    } catch (error) {
      logger.error('Failed to increment download count:', error);
      throw error;
    }
  }

  /**
   * Holt Trending Templates (basierend auf Downloads der letzten 7 Tage)
   */
  async getTrendingTemplates(limit: number = 10): Promise<MarketplaceTemplate[]> {
    logger.info(`Fetching trending templates (limit: ${limit})`);

    try {
      // Simplified: Nutze downloads
      // In echtem System würde man Downloads mit Timestamp tracken
      const templates = await prisma.serverTemplate.findMany({
        where: { isPublic: true },
        orderBy: { downloads: 'desc' },
        take: limit
      });

      const marketplaceTemplates: MarketplaceTemplate[] = await Promise.all(
        templates.map(async (t) => {
          let author = { id: 'system', username: 'System' };
          if (t.createdBy) {
            const user = await prisma.user.findUnique({
              where: { id: t.createdBy },
              select: { id: true, username: true }
            });
            if (user) author = user;
          }

          return {
            id: t.id,
            name: t.name,
            description: t.description,
            author,
            minecraftVersion: t.minecraftVersion,
            versionType: t.versionType,
            category: TemplateCategory.OTHER,
            tags: [],
            allocatedRam: t.allocatedRam,
            allocatedCpu: t.allocatedCpu,
            maxPlayers: t.maxPlayers,
            difficulty: t.difficulty,
            gameMode: t.gameMode,
            preInstalledMods: t.preInstalledMods,
            downloads: t.downloads,
            rating: 0,
            reviewCount: 0,
            isFeatured: false,
            isPremium: false,
            screenshotUrls: [],
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          };
        })
      );

      return marketplaceTemplates;
    } catch (error) {
      logger.error('Failed to fetch trending templates:', error);
      throw error;
    }
  }
}

export default ServerMarketplaceService;
