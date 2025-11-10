import { prisma } from '../lib/prisma';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../lib/logger';

export class WebhookService {
  // Create webhook
  async createWebhook(organizationId: string, data: {
    name: string;
    url: string;
    events: string[];
    retryAttempts?: number;
  }) {
    const secret = crypto.randomBytes(32).toString('hex');

    return prisma.webhook.create({
      data: {
        organizationId,
        name: data.name,
        url: data.url,
        secret,
        events: data.events,
        retryAttempts: data.retryAttempts || 3,
      },
    });
  }

  // List webhooks
  async listWebhooks(organizationId: string) {
    return prisma.webhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update webhook
  async updateWebhook(id: string, data: {
    name?: string;
    url?: string;
    events?: string[];
    enabled?: boolean;
    retryAttempts?: number;
  }) {
    return prisma.webhook.update({
      where: { id },
      data,
    });
  }

  // Delete webhook
  async deleteWebhook(id: string) {
    return prisma.webhook.delete({
      where: { id },
    });
  }

  // Trigger webhook
  async trigger(organizationId: string, event: string, payload: any) {
    const webhooks = await prisma.webhook.findMany({
      where: {
        organizationId,
        enabled: true,
        events: {
          has: event,
        },
      },
    });

    for (const webhook of webhooks) {
      await this.deliver(webhook, event, payload);
    }
  }

  // Deliver webhook
  private async deliver(webhook: any, event: string, payload: any) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        status: 'PENDING',
      },
    });

    try {
      const signature = this.generateSignature(webhook.secret, payload);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': delivery.id,
        },
        timeout: 10000,
      });

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DELIVERED',
          statusCode: response.status,
          response: JSON.stringify(response.data).slice(0, 1000),
          deliveredAt: new Date(),
        },
      });

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggered: new Date(),
          failureCount: 0,
        },
      });

      logger.info('Webhook delivered', { webhookId: webhook.id, event, deliveryId: delivery.id });
    } catch (error: any) {
      logger.error('Webhook delivery failed', { webhookId: webhook.id, error: error.message });

      const attempts = delivery.attempts + 1;
      const shouldRetry = attempts < webhook.retryAttempts;

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: shouldRetry ? 'RETRYING' : 'FAILED',
          statusCode: error.response?.status,
          response: error.message,
          attempts,
          nextRetry: shouldRetry ? new Date(Date.now() + Math.pow(2, attempts) * 60000) : null,
        },
      });

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: {
            increment: 1,
          },
        },
      });

      // Retry if needed
      if (shouldRetry) {
        setTimeout(() => {
          this.retryDelivery(delivery.id);
        }, Math.pow(2, attempts) * 60000);
      }
    }
  }

  // Retry delivery
  private async retryDelivery(deliveryId: string) {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery || delivery.status !== 'RETRYING') return;

    await this.deliver(delivery.webhook, delivery.event, delivery.payload);
  }

  // Generate signature
  private generateSignature(secret: string, payload: any): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  // Verify signature
  verifySignature(secret: string, payload: any, signature: string): boolean {
    const expectedSignature = this.generateSignature(secret, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Get deliveries
  async getDeliveries(webhookId: string, limit: number = 100) {
    return prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Redeliver
  async redeliver(deliveryId: string) {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) throw new Error('Delivery not found');

    await this.deliver(delivery.webhook, delivery.event, delivery.payload);
  }
}

export const webhookService = new WebhookService();
