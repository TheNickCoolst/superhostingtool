import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import axios from 'axios';

const prisma = new PrismaClient();

export class NotificationService {
  private emailTransporter: any;

  constructor() {
    // Initialize email transporter if credentials are provided
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  // Send notification for an event
  async sendNotification(
    serverId: string,
    event: string,
    data: {
      serverName: string;
      message: string;
      details?: any;
    }
  ) {
    try {
      const configs = await prisma.notificationConfig.findMany({
        where: {
          OR: [
            { serverId },
            { serverId: null } // Global notifications
          ],
          enabled: true,
          events: {
            has: event
          }
        }
      });

      for (const config of configs) {
        switch (config.type) {
          case 'EMAIL':
            if (config.email) {
              await this.sendEmail(config.email, data);
            }
            break;

          case 'WEBHOOK':
            if (config.webhookUrl) {
              await this.sendWebhook(config.webhookUrl, event, data);
            }
            break;

          case 'DISCORD':
            if (config.webhookUrl) {
              await this.sendDiscordWebhook(config.webhookUrl, event, data);
            }
            break;
        }
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Send email notification
  private async sendEmail(to: string, data: any) {
    if (!this.emailTransporter) {
      console.warn('Email transporter not configured');
      return;
    }

    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@minecraft-hosting.com',
        to,
        subject: `Minecraft Server Alert: ${data.serverName}`,
        html: `
          <h2>${data.serverName}</h2>
          <p>${data.message}</p>
          ${data.details ? `<pre>${JSON.stringify(data.details, null, 2)}</pre>` : ''}
        `
      });

      console.log(`✅ Email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  // Send generic webhook
  private async sendWebhook(url: string, event: string, data: any) {
    try {
      await axios.post(url, {
        event,
        ...data,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Webhook sent to ${url}`);
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  // Send Discord webhook
  private async sendDiscordWebhook(url: string, event: string, data: any) {
    try {
      const color = this.getEventColor(event);

      await axios.post(url, {
        embeds: [{
          title: `🎮 ${data.serverName}`,
          description: data.message,
          color,
          fields: data.details ? Object.entries(data.details).map(([key, value]) => ({
            name: key,
            value: String(value),
            inline: true
          })) : [],
          timestamp: new Date().toISOString()
        }]
      });

      console.log(`✅ Discord webhook sent`);
    } catch (error) {
      console.error('Failed to send Discord webhook:', error);
    }
  }

  private getEventColor(event: string): number {
    const colors: any = {
      SERVER_STARTED: 0x00ff00,    // Green
      SERVER_STOPPED: 0xffa500,    // Orange
      SERVER_CRASHED: 0xff0000,    // Red
      BACKUP_COMPLETED: 0x0000ff,  // Blue
      BACKUP_FAILED: 0xff0000,     // Red
      HIGH_CPU_USAGE: 0xffff00,    // Yellow
      HIGH_RAM_USAGE: 0xffff00,    // Yellow
      LOW_TPS: 0xff6347             // Tomato
    };

    return colors[event] || 0x808080; // Gray default
  }

  // ==================== CRUD Operations ====================

  async getConfigs(userId: string) {
    return prisma.notificationConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createConfig(data: {
    userId: string;
    serverId?: string;
    type: string;
    email?: string;
    webhookUrl?: string;
    events: string[];
    enabled?: boolean;
  }) {
    return prisma.notificationConfig.create({
      data: {
        userId: data.userId,
        serverId: data.serverId,
        type: data.type as any,
        email: data.email,
        webhookUrl: data.webhookUrl,
        events: data.events as any[],
        enabled: data.enabled !== false
      }
    });
  }

  async updateConfig(id: string, data: any) {
    return prisma.notificationConfig.update({
      where: { id },
      data
    });
  }

  async deleteConfig(id: string) {
    return prisma.notificationConfig.delete({
      where: { id }
    });
  }
}

export default new NotificationService();
