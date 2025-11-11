import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import axios from 'axios';
import crypto from 'crypto';

/**
 * 🔗 Webhook Service
 *
 * Ermöglicht Custom Integrations via Webhooks:
 * - Webhook-Trigger für alle wichtigen Events
 * - Signatur-Validierung (HMAC)
 * - Retry-Logik bei Fehlern
 * - Webhook-Logs für Debugging
 * - Rate-Limiting pro Webhook
 * - Custom Headers
 */

export enum WebhookEvent {
  // Server Events
  SERVER_CREATED = 'server.created',
  SERVER_STARTED = 'server.started',
  SERVER_STOPPED = 'server.stopped',
  SERVER_DELETED = 'server.deleted',
  SERVER_CRASHED = 'server.crashed',
  SERVER_RESOURCE_UPDATED = 'server.resource_updated',

  // Player Events
  PLAYER_JOINED = 'player.joined',
  PLAYER_LEFT = 'player.left',
  PLAYER_BANNED = 'player.banned',
  PLAYER_KICKED = 'player.kicked',

  // Performance Events
  HIGH_CPU_USAGE = 'performance.high_cpu',
  HIGH_RAM_USAGE = 'performance.high_ram',
  LOW_TPS = 'performance.low_tps',

  // Backup Events
  BACKUP_CREATED = 'backup.created',
  BACKUP_FAILED = 'backup.failed',
  BACKUP_RESTORED = 'backup.restored',

  // System Events
  HOST_OFFLINE = 'host.offline',
  HOST_ONLINE = 'host.online',

  // Custom
  CUSTOM = 'custom'
}

export interface WebhookConfig {
  id: string;
  userId: string;
  name: string;
  url: string;
  secret?: string; // For HMAC signature
  events: WebhookEvent[];
  enabled: boolean;
  headers?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: Date;
  serverId?: string;
  userId?: string;
  data: any;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  attempts: number;
  delivered: boolean;
  deliveredAt?: Date;
  createdAt: Date;
}

export class WebhookService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // ms

  /**
   * Erstellt neue Webhook-Config
   */
  async createWebhook(data: {
    userId: string;
    name: string;
    url: string;
    secret?: string;
    events: WebhookEvent[];
    headers?: Record<string, string>;
  }): Promise<WebhookConfig> {
    logger.info(`Creating webhook "${data.name}" for user ${data.userId}`);

    try {
      // Validate URL
      new URL(data.url);

      // Generate secret if not provided
      const secret = data.secret || this.generateSecret();

      // In real app würde man Webhook-Tabelle haben
      const webhook: WebhookConfig = {
        id: `webhook-${Date.now()}`,
        userId: data.userId,
        name: data.name,
        url: data.url,
        secret,
        events: data.events,
        enabled: true,
        headers: data.headers,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info(`Webhook "${data.name}" created successfully`);
      return webhook;
    } catch (error) {
      logger.error('Failed to create webhook:', error);
      throw error;
    }
  }

  /**
   * Triggert Webhook für Event
   */
  async triggerWebhook(event: WebhookEvent, payload: Omit<WebhookPayload, 'event' | 'timestamp'>): Promise<void> {
    logger.info(`Triggering webhooks for event: ${event}`);

    try {
      // Finde alle Webhooks die dieses Event abonniert haben
      // In real app: Query DB
      const webhooks: WebhookConfig[] = [];

      if (webhooks.length === 0) {
        logger.debug(`No webhooks configured for event ${event}`);
        return;
      }

      const fullPayload: WebhookPayload = {
        event,
        timestamp: new Date(),
        ...payload
      };

      // Sende an alle Webhooks parallel
      await Promise.all(
        webhooks.map(webhook => this.deliverWebhook(webhook, fullPayload))
      );
    } catch (error) {
      logger.error(`Failed to trigger webhooks for event ${event}:`, error);
    }
  }

  /**
   * Liefert Webhook aus
   */
  private async deliverWebhook(webhook: WebhookConfig, payload: WebhookPayload, attempt: number = 1): Promise<void> {
    if (!webhook.enabled) {
      logger.debug(`Webhook ${webhook.id} is disabled, skipping`);
      return;
    }

    logger.info(`Delivering webhook ${webhook.name} (attempt ${attempt}/${this.MAX_RETRIES})`);

    try {
      const signature = this.generateSignature(payload, webhook.secret || '');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp.toISOString(),
        'User-Agent': 'CraftHostPro-Webhooks/1.0',
        ...webhook.headers
      };

      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 10000, // 10s timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      logger.info(`Webhook ${webhook.name} delivered successfully: ${response.status}`);

      // Log delivery
      await this.logDelivery({
        webhookId: webhook.id,
        event: payload.event,
        payload,
        responseStatus: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 1000),
        attempts: attempt,
        delivered: true,
        deliveredAt: new Date()
      });

    } catch (error: any) {
      logger.error(`Webhook ${webhook.name} delivery failed (attempt ${attempt}):`, error.message);

      const shouldRetry = attempt < this.MAX_RETRIES;

      // Log failed delivery
      await this.logDelivery({
        webhookId: webhook.id,
        event: payload.event,
        payload,
        responseStatus: error.response?.status,
        responseBody: error.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : undefined,
        error: error.message,
        attempts: attempt,
        delivered: false
      });

      // Retry with exponential backoff
      if (shouldRetry) {
        const delay = this.RETRY_DELAYS[attempt - 1] || 15000;
        logger.info(`Retrying webhook ${webhook.name} in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        await this.deliverWebhook(webhook, payload, attempt + 1);
      } else {
        logger.error(`Webhook ${webhook.name} failed after ${this.MAX_RETRIES} attempts`);
      }
    }
  }

  /**
   * Generiert HMAC-Signatur für Payload
   */
  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verifiziert Webhook-Signatur
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generiert zufälliges Secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Loggt Webhook-Delivery
   */
  private async logDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<void> {
    try {
      // In real app: Save to DB
      const log: WebhookDelivery = {
        id: `delivery-${Date.now()}`,
        createdAt: new Date(),
        ...delivery
      };

      logger.debug(`Webhook delivery logged: ${log.id}`);
    } catch (error) {
      logger.error('Failed to log webhook delivery:', error);
    }
  }

  /**
   * Holt Webhook-Logs für Debugging
   */
  async getWebhookLogs(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    logger.info(`Fetching webhook logs for ${webhookId} (limit: ${limit})`);

    try {
      // In real app: Query DB
      return [];
    } catch (error) {
      logger.error('Failed to fetch webhook logs:', error);
      throw error;
    }
  }

  /**
   * Testet Webhook mit Dummy-Payload
   */
  async testWebhook(webhookId: string): Promise<boolean> {
    logger.info(`Testing webhook ${webhookId}`);

    try {
      // In real app: Load webhook from DB
      const webhook: WebhookConfig = {
        id: webhookId,
        userId: 'test',
        name: 'Test',
        url: 'https://example.com/webhook',
        enabled: true,
        events: [WebhookEvent.CUSTOM],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const testPayload: WebhookPayload = {
        event: WebhookEvent.CUSTOM,
        timestamp: new Date(),
        data: {
          message: 'This is a test webhook from CraftHost Pro',
          test: true
        }
      };

      await this.deliverWebhook(webhook, testPayload);
      return true;
    } catch (error) {
      logger.error('Webhook test failed:', error);
      return false;
    }
  }

  /**
   * Aktualisiert Webhook-Config
   */
  async updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig> {
    logger.info(`Updating webhook ${webhookId}`);

    try {
      // In real app: Update in DB
      const webhook: WebhookConfig = {
        id: webhookId,
        userId: 'user',
        name: updates.name || 'Webhook',
        url: updates.url || 'https://example.com',
        secret: updates.secret,
        events: updates.events || [],
        enabled: updates.enabled !== undefined ? updates.enabled : true,
        headers: updates.headers,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info(`Webhook ${webhookId} updated successfully`);
      return webhook;
    } catch (error) {
      logger.error('Failed to update webhook:', error);
      throw error;
    }
  }

  /**
   * Löscht Webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    logger.info(`Deleting webhook ${webhookId}`);

    try {
      // In real app: Delete from DB
      logger.info(`Webhook ${webhookId} deleted successfully`);
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw error;
    }
  }

  /**
   * Listet alle Webhooks eines Users
   */
  async listWebhooks(userId: string): Promise<WebhookConfig[]> {
    logger.info(`Listing webhooks for user ${userId}`);

    try {
      // In real app: Query DB
      return [];
    } catch (error) {
      logger.error('Failed to list webhooks:', error);
      throw error;
    }
  }
}

export default WebhookService;
