import prisma from '../lib/prisma';
import type { WorldTemplate, WorldType, ChunkPregeneration, PregenStatus } from '@prisma/client';
import axios from 'axios';

/**
 * World Management Service
 *
 * - World templates marketplace
 * - Chunk pre-generation
 * - World importing/exporting
 * - Custom world generation
 */
class WorldManagementService {

  /**
   * Create world template
   */
  async createWorldTemplate(
    name: string,
    description: string,
    minecraftVersion: string,
    worldType: WorldType,
    downloadUrl: string,
    options?: {
      seed?: string;
      size?: number;
      previewImage?: string;
      tags?: string[];
    }
  ): Promise<WorldTemplate> {
    return await prisma.worldTemplate.create({
      data: {
        name,
        description,
        minecraftVersion,
        worldType,
        downloadUrl,
        seed: options?.seed,
        size: options?.size || 0,
        previewImage: options?.previewImage,
        tags: options?.tags || [],
        featured: false
      }
    });
  }

  /**
   * Search world templates
   */
  async searchTemplates(
    query?: string,
    worldType?: WorldType,
    minecraftVersion?: string
  ): Promise<WorldTemplate[]> {
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (worldType) {
      where.worldType = worldType;
    }

    if (minecraftVersion) {
      where.minecraftVersion = minecraftVersion;
    }

    return await prisma.worldTemplate.findMany({
      where,
      orderBy: { downloads: 'desc' },
      take: 50
    });
  }

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(limit: number = 10): Promise<WorldTemplate[]> {
    return await prisma.worldTemplate.findMany({
      where: { featured: true },
      orderBy: { rating: 'desc' },
      take: limit
    });
  }

  /**
   * Download and apply world template to server
   */
  async applyTemplate(serverId: string, templateId: string): Promise<void> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const template = await prisma.worldTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // TODO: Implement world download and installation
    // 1. Download world file from URL
    // 2. Extract to server world directory via agent
    // 3. Update server.properties if needed
    // 4. Restart server

    // Update download count
    await prisma.worldTemplate.update({
      where: { id: templateId },
      data: { downloads: { increment: 1 } }
    });
  }

  /**
   * Start chunk pre-generation
   */
  async startPregeneration(
    serverId: string,
    radius: number,
    centerX: number = 0,
    centerZ: number = 0
  ): Promise<ChunkPregeneration> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.status !== 'RUNNING') {
      throw new Error('Server must be running for chunk pre-generation');
    }

    // Calculate total chunks
    const chunksTotal = this.calculateTotalChunks(radius);

    // Create pre-generation task
    const pregen = await prisma.chunkPregeneration.create({
      data: {
        serverId,
        radius,
        centerX,
        centerZ,
        chunksTotal,
        status: 'PENDING'
      }
    });

    // Start pre-generation
    this.executePregeneration(pregen.id).catch(error => {
      console.error(`Chunk pre-generation failed: ${pregen.id}`, error);
    });

    return pregen;
  }

  /**
   * Calculate total chunks to generate
   */
  private calculateTotalChunks(radius: number): number {
    // Chunks in a circle: π * r²
    return Math.floor(Math.PI * radius * radius);
  }

  /**
   * Execute chunk pre-generation
   */
  private async executePregeneration(pregenId: string): Promise<void> {
    try {
      const pregen = await prisma.chunkPregeneration.findUnique({
        where: { id: pregenId }
      });

      if (!pregen) return;

      // Update status to running
      await prisma.chunkPregeneration.update({
        where: { id: pregenId },
        data: { status: 'RUNNING' }
      });

      // TODO: Implement actual chunk generation
      // This would involve:
      // 1. Install Chunky plugin/mod on server
      // 2. Send command to start pre-generation
      // 3. Monitor progress via console output
      // 4. Update progress in database

      // Simulate progress
      const totalChunks = pregen.chunksTotal || 1000;
      for (let i = 0; i <= totalChunks; i += 100) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const progress = (i / totalChunks) * 100;
        await prisma.chunkPregeneration.update({
          where: { id: pregenId },
          data: {
            progress,
            chunksCompleted: i
          }
        });
      }

      // Complete
      await prisma.chunkPregeneration.update({
        where: { id: pregenId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          chunksCompleted: totalChunks,
          completedAt: new Date()
        }
      });

    } catch (error: any) {
      await prisma.chunkPregeneration.update({
        where: { id: pregenId },
        data: {
          status: 'FAILED',
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * Pause pre-generation
   */
  async pausePregeneration(pregenId: string): Promise<void> {
    await prisma.chunkPregeneration.update({
      where: { id: pregenId },
      data: { status: 'PAUSED' }
    });
  }

  /**
   * Resume pre-generation
   */
  async resumePregeneration(pregenId: string): Promise<void> {
    const pregen = await prisma.chunkPregeneration.findUnique({
      where: { id: pregenId }
    });

    if (pregen?.status === 'PAUSED') {
      await prisma.chunkPregeneration.update({
        where: { id: pregenId },
        data: { status: 'RUNNING' }
      });

      this.executePregeneration(pregenId).catch(error => {
        console.error(`Chunk pre-generation failed: ${pregenId}`, error);
      });
    }
  }

  /**
   * Cancel pre-generation
   */
  async cancelPregeneration(pregenId: string): Promise<void> {
    await prisma.chunkPregeneration.update({
      where: { id: pregenId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date()
      }
    });
  }

  /**
   * Get pre-generation status
   */
  async getPregenerationStatus(serverId: string): Promise<ChunkPregeneration[]> {
    return await prisma.chunkPregeneration.findMany({
      where: { serverId },
      orderBy: { startedAt: 'desc' },
      take: 10
    });
  }

  /**
   * Export world as template
   */
  async exportWorld(
    serverId: string,
    name: string,
    description: string,
    tags: string[]
  ): Promise<WorldTemplate> {
    const server = await prisma.minecraftServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // TODO: Implement world export
    // 1. Create backup of world
    // 2. Compress world files
    // 3. Upload to storage
    // 4. Create template record

    const template = await prisma.worldTemplate.create({
      data: {
        name,
        description,
        minecraftVersion: server.version,
        worldType: 'CUSTOM',
        downloadUrl: 'https://example.com/worlds/placeholder.zip',
        size: 0,
        tags
      }
    });

    return template;
  }

  /**
   * Rate world template
   */
  async rateTemplate(templateId: string, rating: number): Promise<void> {
    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    const template = await prisma.worldTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Calculate new average rating
    const totalRating = template.rating * template.ratingCount;
    const newRatingCount = template.ratingCount + 1;
    const newRating = (totalRating + rating) / newRatingCount;

    await prisma.worldTemplate.update({
      where: { id: templateId },
      data: {
        rating: newRating,
        ratingCount: newRatingCount
      }
    });
  }
}

export default new WorldManagementService();
