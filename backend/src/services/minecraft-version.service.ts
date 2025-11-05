import axios from 'axios';
import { PrismaClient, MinecraftVersionType } from '@prisma/client';

const prisma = new PrismaClient();

interface MojangVersion {
  id: string;
  type: string;
  url: string;
  time: string;
  releaseTime: string;
}

interface MojangManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MojangVersion[];
}

/**
 * Minecraft Version Service
 * Managed alle verfügbaren Minecraft-Versionen
 * Holt automatisch die neuesten Versionen von Mojang's API
 */
export class MinecraftVersionService {
  private manifestUrl = process.env.MINECRAFT_MANIFEST_URL ||
    'https://launchermeta.mojang.com/mc/game/version_manifest.json';

  /**
   * Synchronisiert alle Minecraft Versionen von Mojang
   */
  async syncVersions(): Promise<void> {
    try {
      const response = await axios.get<MojangManifest>(this.manifestUrl);
      const manifest = response.data;

      for (const version of manifest.versions) {
        const versionType = version.type === 'snapshot'
          ? MinecraftVersionType.SNAPSHOT
          : MinecraftVersionType.VANILLA;

        await prisma.minecraftVersion.upsert({
          where: { version: version.id },
          create: {
            version: version.id,
            type: versionType,
            releaseDate: new Date(version.releaseTime),
            downloadUrl: version.url,
            isStable: version.type === 'release'
          },
          update: {
            downloadUrl: version.url
          }
        });
      }

      console.log(`Synced ${manifest.versions.length} Minecraft versions`);
    } catch (error) {
      console.error('Failed to sync Minecraft versions:', error);
      throw error;
    }
  }

  /**
   * Holt alle verfügbaren Versionen
   */
  async getAllVersions(type?: MinecraftVersionType) {
    return prisma.minecraftVersion.findMany({
      where: type ? { type } : undefined,
      orderBy: { releaseDate: 'desc' }
    });
  }

  /**
   * Holt eine spezifische Version
   */
  async getVersion(version: string) {
    return prisma.minecraftVersion.findUnique({
      where: { version }
    });
  }

  /**
   * Holt die neueste stabile Version
   */
  async getLatestStableVersion() {
    return prisma.minecraftVersion.findFirst({
      where: {
        type: MinecraftVersionType.VANILLA,
        isStable: true
      },
      orderBy: { releaseDate: 'desc' }
    });
  }

  /**
   * Holt Download-URL für eine Version
   */
  async getDownloadUrl(version: string): Promise<string | null> {
    try {
      const versionData = await prisma.minecraftVersion.findUnique({
        where: { version }
      });

      if (!versionData || !versionData.downloadUrl) {
        return null;
      }

      // Hole detaillierte Version-Info von Mojang
      const response = await axios.get(versionData.downloadUrl);
      const versionInfo = response.data;

      // Extrahiere Server JAR Download URL
      return versionInfo.downloads?.server?.url || null;
    } catch (error) {
      console.error(`Failed to get download URL for version ${version}:`, error);
      return null;
    }
  }
}
