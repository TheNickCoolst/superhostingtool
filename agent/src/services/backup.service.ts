import fs from 'fs-extra';
import path from 'path';
import tar from 'tar-fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { DockerService } from './docker.service';
import { AgentResponse } from '@minecraft-hosting/shared';

/**
 * Backup Service
 * Erstellt und restored Backups der Minecraft Server
 */
export class BackupService {
  private baseDir = process.env.SERVER_BASE_DIR || '/opt/minecraft-servers';
  private backupDir = path.join(this.baseDir, 'backups');

  constructor(private dockerService: DockerService) {
    this.ensureBackupDir();
  }

  private async ensureBackupDir() {
    await fs.ensureDir(this.backupDir);
  }

  /**
   * Erstellt ein Backup eines Servers
   *
   * Strategie:
   * 1. Sende "save-all" an Minecraft (flush alle Änderungen auf Disk)
   * 2. Kurze Pause (save-off) während Backup
   * 3. Erstelle TAR.GZ Archive der Welt
   * 4. Aktiviere Speichern wieder (save-on)
   *
   * Downtime: 0 Sekunden (Server läuft weiter)
   */
  async createBackup(containerName: string, backupName: string): Promise<AgentResponse> {
    try {
      console.log(`Creating backup: ${backupName}`);

      // 1. Speichere alle Chunks
      await this.dockerService.executeCommand(containerName, 'save-all');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Deaktiviere Auto-Save temporär
      await this.dockerService.executeCommand(containerName, 'save-off');

      // 3. Finde Server-Verzeichnis
      const serverId = containerName.replace('mc-', '').split('-')[0];
      const serverDir = path.join(this.baseDir, serverId);
      const backupPath = path.join(this.backupDir, `${backupName}.tar.gz`);

      // 4. Erstelle TAR.GZ Archive
      await this.createTarGz(serverDir, backupPath);

      // 5. Aktiviere Auto-Save wieder
      await this.dockerService.executeCommand(containerName, 'save-on');

      // 6. Hole Backup-Größe
      const stats = await fs.stat(backupPath);

      console.log(`Backup created: ${backupPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return {
        success: true,
        message: 'Backup created successfully',
        data: {
          backupPath,
          size: stats.size
        }
      };
    } catch (error: any) {
      // Stelle sicher, dass save-on wieder aktiviert wird
      try {
        await this.dockerService.executeCommand(containerName, 'save-on');
      } catch {}

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restored ein Backup
   *
   * WICHTIG: Server muss gestoppt sein!
   */
  async restoreBackup(containerName: string, backupPath: string): Promise<AgentResponse> {
    try {
      console.log(`Restoring backup: ${backupPath}`);

      // 1. Prüfe ob Backup existiert
      const fullBackupPath = path.join(this.backupDir, path.basename(backupPath));
      const exists = await fs.pathExists(fullBackupPath);

      if (!exists) {
        throw new Error('Backup file not found');
      }

      // 2. Finde Server-Verzeichnis
      const serverId = containerName.replace('mc-', '').split('-')[0];
      const serverDir = path.join(this.baseDir, serverId);

      // 3. Backup des aktuellen Zustands (Sicherheit)
      const emergencyBackup = path.join(
        this.backupDir,
        `emergency-${Date.now()}.tar.gz`
      );
      await this.createTarGz(serverDir, emergencyBackup);

      // 4. Lösche alte Welt-Daten
      const worldDirs = ['world', 'world_nether', 'world_the_end'];
      for (const dir of worldDirs) {
        const worldPath = path.join(serverDir, dir);
        if (await fs.pathExists(worldPath)) {
          await fs.remove(worldPath);
        }
      }

      // 5. Extrahiere Backup
      await this.extractTarGz(fullBackupPath, serverDir);

      console.log(`Backup restored successfully`);

      return {
        success: true,
        message: 'Backup restored successfully',
        data: {
          emergencyBackup
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Erstellt TAR.GZ Archive
   */
  private async createTarGz(sourceDir: string, targetPath: string): Promise<void> {
    const gzip = createGzip({ level: 6 }); // Kompressionslevel 6 (Balance zwischen Speed und Größe)
    const source = tar.pack(sourceDir);
    const destination = fs.createWriteStream(targetPath);

    await pipeline(source, gzip, destination);
  }

  /**
   * Extrahiert TAR.GZ Archive
   */
  private async extractTarGz(archivePath: string, targetDir: string): Promise<void> {
    const source = fs.createReadStream(archivePath);
    const gunzip = createGzip();
    const extract = tar.extract(targetDir);

    await pipeline(source, gunzip, extract);
  }
}
