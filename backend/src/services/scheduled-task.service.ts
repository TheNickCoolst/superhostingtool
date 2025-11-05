import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import AgentService from './agent.service';
import BackupService from './backup.service';

const prisma = new PrismaClient();

export class ScheduledTaskService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  // Initialize all scheduled tasks from database
  async initializeTasks() {
    const tasks = await prisma.scheduledTask.findMany({
      where: { enabled: true },
      include: { server: true }
    });

    for (const task of tasks) {
      this.scheduleTask(task);
    }

    console.log(`✅ Initialized ${tasks.length} scheduled tasks`);
  }

  // Schedule a task
  scheduleTask(task: any) {
    try {
      if (this.scheduledJobs.has(task.id)) {
        this.scheduledJobs.get(task.id)?.stop();
      }

      const job = cron.schedule(task.cronExpression, async () => {
        await this.executeTask(task);
      });

      this.scheduledJobs.set(task.id, job);

      // Update next run time
      this.updateNextRun(task.id);
    } catch (error) {
      console.error(`Failed to schedule task ${task.id}:`, error);
    }
  }

  // Execute a task
  async executeTask(task: any) {
    try {
      console.log(`Executing scheduled task: ${task.name} (${task.taskType})`);

      const server = await prisma.minecraftServer.findUnique({
        where: { id: task.serverId },
        include: { host: true }
      });

      if (!server) {
        console.error(`Server not found for task ${task.id}`);
        return;
      }

      switch (task.taskType) {
        case 'BACKUP':
          await AgentService.createBackup(server.host, server, `scheduled-${Date.now()}`);
          break;

        case 'RESTART':
          if (server.status === 'RUNNING') {
            await AgentService.restartServer(server.host, server);
          }
          break;

        case 'COMMAND':
          if (server.status === 'RUNNING' && task.command) {
            await AgentService.executeCommand(server.host, server, task.command);
          }
          break;

        case 'ANNOUNCEMENT':
          if (server.status === 'RUNNING' && task.command) {
            await AgentService.executeCommand(
              server.host,
              server,
              `say ${task.command}`
            );
          }
          break;
      }

      // Update last run time
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { lastRun: new Date() }
      });

      this.updateNextRun(task.id);
    } catch (error) {
      console.error(`Failed to execute task ${task.id}:`, error);
    }
  }

  // Calculate and update next run time
  private async updateNextRun(taskId: string) {
    // This is a simplified version
    // In production, you'd calculate the actual next run based on cron expression
    const task = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
    if (task) {
      // For now, just set it to 1 hour from now as a placeholder
      const nextRun = new Date(Date.now() + 3600000);
      await prisma.scheduledTask.update({
        where: { id: taskId },
        data: { nextRun }
      });
    }
  }

  // ==================== CRUD Operations ====================

  async getTasks(serverId: string) {
    return prisma.scheduledTask.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTask(id: string) {
    return prisma.scheduledTask.findUnique({
      where: { id }
    });
  }

  async createTask(data: {
    serverId: string;
    name: string;
    taskType: string;
    cronExpression: string;
    command?: string;
    enabled?: boolean;
  }) {
    const task = await prisma.scheduledTask.create({
      data: {
        serverId: data.serverId,
        name: data.name,
        taskType: data.taskType as any,
        cronExpression: data.cronExpression,
        command: data.command,
        enabled: data.enabled !== false
      },
      include: { server: true }
    });

    if (task.enabled) {
      this.scheduleTask(task);
    }

    return task;
  }

  async updateTask(id: string, data: any) {
    const task = await prisma.scheduledTask.update({
      where: { id },
      data,
      include: { server: true }
    });

    // Reschedule if enabled
    if (task.enabled) {
      this.scheduleTask(task);
    } else {
      // Stop if disabled
      this.scheduledJobs.get(id)?.stop();
      this.scheduledJobs.delete(id);
    }

    return task;
  }

  async deleteTask(id: string) {
    // Stop the scheduled job
    this.scheduledJobs.get(id)?.stop();
    this.scheduledJobs.delete(id);

    return prisma.scheduledTask.delete({
      where: { id }
    });
  }

  // Manually trigger a task
  async triggerTask(id: string) {
    const task = await prisma.scheduledTask.findUnique({
      where: { id },
      include: { server: true }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    await this.executeTask(task);
  }

  // Stop all scheduled tasks
  stopAll() {
    for (const [id, job] of this.scheduledJobs.entries()) {
      job.stop();
    }
    this.scheduledJobs.clear();
    console.log('⏹️  All scheduled tasks stopped');
  }
}

export default new ScheduledTaskService();
