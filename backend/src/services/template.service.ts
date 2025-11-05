import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TemplateService {
  // Get all public templates
  async getPublicTemplates() {
    return prisma.serverTemplate.findMany({
      where: { isPublic: true },
      orderBy: { downloads: 'desc' }
    });
  }

  // Get template by ID
  async getTemplate(id: string) {
    return prisma.serverTemplate.findUnique({
      where: { id }
    });
  }

  // Create a new template
  async createTemplate(data: {
    name: string;
    description: string;
    minecraftVersion: string;
    versionType: string;
    allocatedRam: number;
    allocatedCpu: number;
    maxPlayers?: number;
    difficulty?: string;
    gameMode?: string;
    enableWhitelist?: boolean;
    preInstalledMods?: string[];
    serverProperties?: any;
    isPublic?: boolean;
    createdBy?: string;
  }) {
    return prisma.serverTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        minecraftVersion: data.minecraftVersion,
        versionType: data.versionType as any,
        allocatedRam: data.allocatedRam,
        allocatedCpu: data.allocatedCpu,
        maxPlayers: data.maxPlayers || 20,
        difficulty: (data.difficulty || 'NORMAL') as any,
        gameMode: (data.gameMode || 'SURVIVAL') as any,
        enableWhitelist: data.enableWhitelist || false,
        preInstalledMods: data.preInstalledMods || [],
        serverProperties: data.serverProperties,
        isPublic: data.isPublic !== false,
        createdBy: data.createdBy
      }
    });
  }

  // Update template
  async updateTemplate(id: string, data: any) {
    return prisma.serverTemplate.update({
      where: { id },
      data
    });
  }

  // Delete template
  async deleteTemplate(id: string) {
    return prisma.serverTemplate.delete({
      where: { id }
    });
  }

  // Increment download counter
  async incrementDownloads(id: string) {
    return prisma.serverTemplate.update({
      where: { id },
      data: {
        downloads: {
          increment: 1
        }
      }
    });
  }
}

export default new TemplateService();
