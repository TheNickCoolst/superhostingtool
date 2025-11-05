import cron from 'node-cron';
import { ServerStatus, BackupType } from '@prisma/client';
import { AgentService } from './agent.service';


/**
 * Backup Scheduler
 * Führt automatisch Backups für alle laufenden Server durch
 */
export class BackupScheduler {
  private agentService = new AgentService();
  private cronJob: cron.ScheduledTask | null = null;

  start() {
    // Jeden Tag um 3 Uhr morgens automatische Backups erstellen
    this.cronJob = cron.schedule('0 3 * * *', async () => {
      console.log('Starting automatic backup process...');
      await this.performAutomaticBackups();
    });

    console.log('Backup scheduler initialized');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Backup scheduler stopped');
    }
  }

  private async performAutomaticBackups() {
    try {
      // Hole alle laufenden Server
      const servers = await prisma.minecraftServer.findMany({
        where: {
          status: {
            in: [ServerStatus.RUNNING, ServerStatus.STOPPED]
          }
        },
        include: {
          host: true
        }
      });

      console.log(`Creating backups for ${servers.length} servers...`);

      for (const server of servers) {
        try {
          const backupName = `auto-backup-${new Date().toISOString().split('T')[0]}`;

          // Erstelle Backup-Eintrag in DB
          const backup = await prisma.backup.create({
            data: {
              serverId: server.id,
              name: backupName,
              size: 0, // Wird später aktualisiert
              type: BackupType.AUTOMATIC,
              filePath: `/backups/${server.id}/${backupName}.tar.gz`
            }
          });

          // Sende Backup-Befehl an Agent
          const result = await this.agentService.createBackup(server.host, server, backupName);

          if (result.success && result.data?.size) {
            // Update Backup mit tatsächlicher Größe
            await prisma.backup.update({
              where: { id: backup.id },
              data: {
                size: result.data.size,
                status: 'COMPLETED' as any
              }
            });
          }

          console.log(`Backup created for server ${server.name}: ${backupName}`);
        } catch (error) {
          console.error(`Failed to backup server ${server.name}:`, error);
        }
      }

      console.log('Automatic backup process completed');

      // Lösche alte Backups (älter als 30 Tage)
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Automatic backup process failed:', error);
    }
  }

  private async cleanupOldBackups() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedBackups = await prisma.backup.deleteMany({
      where: {
        type: BackupType.AUTOMATIC,
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`Deleted ${deletedBackups.count} old backups`);
  }
}
