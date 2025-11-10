import prisma from '../lib/prisma';
import axios from 'axios';
import crypto from 'crypto';
import type { Webhook, WebhookEvent, WebhookDelivery, DeliveryStatus } from '@prisma/client';

/**
 * Webhook Service
 *
 * Enables external integrations via webhooks
 * - Event-driven notifications
 * - Automatic retries
 * - Signature verification
 * - Delivery tracking
 */
class WebhookService {

  /**
   * Create a new webhook
   */
  async createWebhook(
    userId: string,
    name: string,
    url: string,
    events: WebhookEvent[],
    secret?: string
  ): Promise<Webhook> {
    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    return await prisma.webhook.create({
      data: {
        userId,
        name,
        url,
        secret: webhookSecret,
        events,
        enabled: true
      }
    });
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    data: Partial<{
      name: string;
      url: string;
      events: WebhookEvent[];
      enabled: boolean;
      retryCount: number;
      timeout: number;
    }>
  ): Promise<Webhook> {
    return await prisma.webhook.update({
      where: { id: webhookId },
      data
    });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await prisma.webhook.delete({
      where: { id: webhookId }
    });
  }

  /**
   * Get user's webhooks
   */
  async getUserWebhooks(userId: string): Promise<Webhook[]> {
    return await prisma.webhook.findMany({
      where: { userId },
      include: {
        deliveries: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(event: WebhookEvent, payload: any): Promise<void> {
    // Find all webhooks subscribed to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        enabled: true,
        events: { has: event }
      }
    });

    // Create delivery records and send webhooks
    const deliveries = await Promise.all(
      webhooks.map(webhook =>
        this.createAndSendDelivery(webhook, event, payload)
      )
    );
  }

  /**
   * Create delivery record and send webhook
   */
  private async createAndSendDelivery(
    webhook: Webhook,
    event: WebhookEvent,
    payload: any
  ): Promise<WebhookDelivery> {
    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        status: 'PENDING'
      }
    });

    // Send webhook asynchronously
    this.sendWebhook(delivery.id, webhook, payload).catch(error => {
      console.error(`Webhook delivery failed: ${delivery.id}`, error);
    });

    return delivery;
  }

  /**
   * Send webhook with retries
   */
  private async sendWebhook(deliveryId: string, webhook: Webhook, payload: any): Promise<void> {
    let delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId }
    });

    if (!delivery) return;

    const maxAttempts = webhook.retryCount;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        // Generate signature
        const signature = this.generateSignature(payload, webhook.secret || '');

        // Send request
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': delivery.event,
            'X-Webhook-Delivery-Id': delivery.id,
            'User-Agent': 'CraftHostPro-Webhooks/1.0'
          },
          timeout: webhook.timeout
        });

        // Update delivery as successful
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'DELIVERED',
            responseCode: response.status,
            responseBody: JSON.stringify(response.data).substring(0, 1000),
            attempts: attempt + 1,
            lastAttempt: new Date()
          }
        });

        return; // Success!

      } catch (error: any) {
        const isLastAttempt = attempt === maxAttempts;

        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: isLastAttempt ? 'FAILED' : 'RETRYING',
            responseCode: error.response?.status,
            responseBody: error.message?.substring(0, 1000),
            attempts: attempt + 1,
            lastAttempt: new Date()
          }
        });

        if (!isLastAttempt) {
          // Exponential backoff: 2^attempt seconds
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  }

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(payload: any, secret: string): string {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get webhook deliveries
   */
  async getWebhookDeliveries(
    webhookId: string,
    limit: number = 50
  ): Promise<WebhookDelivery[]> {
    return await prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true }
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (delivery.status === 'DELIVERED') {
      throw new Error('Delivery already successful');
    }

    // Reset delivery status
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PENDING',
        attempts: 0
      }
    });

    // Resend webhook
    await this.sendWebhook(deliveryId, delivery.webhook, delivery.payload);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string): Promise<any> {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId }
    });

    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'DELIVERED').length;
    const failed = deliveries.filter(d => d.status === 'FAILED').length;
    const pending = deliveries.filter(d => d.status === 'PENDING' || d.status === 'RETRYING').length;

    const successRate = total > 0 ? (delivered / total) * 100 : 0;

    return {
      webhookId,
      total,
      delivered,
      failed,
      pending,
      successRate: successRate.toFixed(2) + '%'
    };
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId: string): Promise<any> {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId }
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload = {
      event: 'TEST',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from CraftHost Pro',
        webhookId: webhook.id,
        webhookName: webhook.name
      }
    };

    const delivery = await this.createAndSendDelivery(webhook, 'SERVER_STARTED', testPayload);

    return {
      deliveryId: delivery.id,
      message: 'Test webhook sent. Check delivery status.'
    };
  }
}

export default new WebhookService();
