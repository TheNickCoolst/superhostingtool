import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export class ApiKeyService {
  // Generate API key
  private generateKey(): string {
    return 'sk_' + crypto.randomBytes(32).toString('hex');
  }

  // Create API key
  async createApiKey(organizationId: string, data: {
    name: string;
    permissions?: string[];
    rateLimit?: number;
    expiresAt?: Date;
  }) {
    const key = this.generateKey();

    return prisma.apiKey.create({
      data: {
        organizationId,
        name: data.name,
        key,
        permissions: data.permissions || [],
        rateLimit: data.rateLimit || 1000,
        expiresAt: data.expiresAt,
      },
    });
  }

  // Validate API key
  async validateApiKey(key: string): Promise<{ valid: boolean; apiKey?: any; error?: string }> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: {
        organization: true,
      },
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    return { valid: true, apiKey };
  }

  // Check permission
  hasPermission(apiKey: any, permission: string): boolean {
    if (apiKey.permissions.includes('*')) return true;
    return apiKey.permissions.includes(permission);
  }

  // List API keys
  async listApiKeys(organizationId: string) {
    return prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        lastUsed: true,
        createdAt: true,
      },
    });
  }

  // Revoke API key
  async revokeApiKey(id: string) {
    return prisma.apiKey.delete({
      where: { id },
    });
  }

  // Update API key
  async updateApiKey(id: string, data: {
    name?: string;
    permissions?: string[];
    rateLimit?: number;
    expiresAt?: Date;
  }) {
    return prisma.apiKey.update({
      where: { id },
      data,
    });
  }

  // Rotate API key
  async rotateApiKey(id: string) {
    const newKey = this.generateKey();

    return prisma.apiKey.update({
      where: { id },
      data: { key: newKey },
    });
  }
}

export const apiKeyService = new ApiKeyService();
