import { prisma } from '../lib/prisma';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

export class BillingService {
  // Create invoice
  async createInvoice(organizationId: string, data: {
    amount: number;
    currency?: string;
    dueDate: Date;
    items: any[];
  }) {
    // Generate invoice number
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    return prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        amount: data.amount,
        currency: data.currency || 'USD',
        dueDate: data.dueDate,
        items: data.items,
      },
    });
  }

  // Get invoices for organization
  async getInvoices(organizationId: string, options?: {
    status?: string;
    limit?: number;
  }) {
    return prisma.invoice.findMany({
      where: {
        organizationId,
        status: options?.status as any,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      include: {
        payments: true,
      },
    });
  }

  // Process payment
  async processPayment(invoiceId: string, data: {
    amount: number;
    method: 'CREDIT_CARD' | 'PAYPAL' | 'STRIPE' | 'BANK_TRANSFER' | 'CRYPTO';
    transactionId?: string;
  }) {
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        method: data.method,
        transactionId: data.transactionId,
        status: 'PENDING',
      },
    });

    // Mark invoice as paid if full amount
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount, 0) + data.amount;

      if (totalPaid >= invoice.amount) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });
      }
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    return payment;
  }

  // Create Stripe checkout session
  async createStripeCheckout(organizationId: string, invoiceId: string, successUrl: string, cancelUrl: string) {
    if (!stripe) throw new Error('Stripe not configured');

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { organization: true },
    });

    if (!invoice) throw new Error('Invoice not found');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for ${invoice.organization.name}`,
            },
            unit_amount: Math.round(invoice.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        invoiceId,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  // Handle Stripe webhook
  async handleStripeWebhook(event: any) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { organizationId, invoiceId } = session.metadata;

      await this.processPayment(invoiceId, {
        amount: session.amount_total / 100,
        method: 'STRIPE',
        transactionId: session.payment_intent,
      });
    }
  }

  // Calculate usage bill
  async calculateUsageBill(organizationId: string, startDate: Date, endDate: Date) {
    // Get all servers for the organization
    const servers = await prisma.organizationServer.findMany({
      where: { organizationId },
    });

    const serverIds = servers.map(s => s.serverId);

    // Get server metrics for the period
    const metrics = await prisma.serverMetrics.findMany({
      where: {
        serverId: { in: serverIds },
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate costs
    const ramCostPerGbHour = 0.01; // $0.01 per GB per hour
    const cpuCostPerCoreHour = 0.02; // $0.02 per core per hour
    const storageCostPerGbMonth = 0.10; // $0.10 per GB per month

    let totalRamCost = 0;
    let totalCpuCost = 0;

    for (const metric of metrics) {
      const ramGb = metric.ramUsage / 1024;
      totalRamCost += ramGb * ramCostPerGbHour;
      totalCpuCost += metric.cpuUsage * cpuCostPerCoreHour;
    }

    // Get storage usage
    const backups = await prisma.backup.findMany({
      where: {
        serverId: { in: serverIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalStorageGb = backups.reduce((sum, b) => sum + b.size, 0) / (1024 * 1024 * 1024);
    const storageCost = totalStorageGb * storageCostPerGbMonth;

    const totalCost = totalRamCost + totalCpuCost + storageCost;

    return {
      ramCost: totalRamCost,
      cpuCost: totalCpuCost,
      storageCost,
      totalCost,
      breakdown: {
        ramUsage: metrics.reduce((sum, m) => sum + m.ramUsage, 0) / metrics.length,
        cpuUsage: metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length,
        storageGb: totalStorageGb,
      },
    };
  }

  // Auto-generate monthly invoice
  async autoGenerateMonthlyInvoice(organizationId: string) {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await this.calculateUsageBill(organizationId, lastMonth, thisMonth);

    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15); // Due on 15th of current month

    return this.createInvoice(organizationId, {
      amount: usage.totalCost,
      dueDate,
      items: [
        { description: 'RAM Usage', amount: usage.ramCost },
        { description: 'CPU Usage', amount: usage.cpuCost },
        { description: 'Storage', amount: usage.storageCost },
      ],
    });
  }

  // Mark invoice as overdue
  async checkOverdueInvoices() {
    const now = new Date();

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          lt: now,
        },
      },
    });

    for (const invoice of overdueInvoices) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      });
    }

    return overdueInvoices.length;
  }
}

export const billingService = new BillingService();
