import { prisma } from '../lib/prisma';
import { nanoid } from 'nanoid';
import slugify from 'slugify';

export class OrganizationService {
  // Create organization
  async createOrganization(data: {
    name: string;
    description?: string;
    ownerId: string;
  }) {
    const slug = slugify(data.name, { lower: true, strict: true }) + '-' + nanoid(8);

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        members: {
          create: {
            userId: data.ownerId,
            role: 'OWNER',
            permissions: ['*'], // All permissions
          },
        },
        quotas: {
          create: [
            { resourceType: 'SERVERS', limit: 5, used: 0 },
            { resourceType: 'RAM_GB', limit: 32, used: 0 },
            { resourceType: 'STORAGE_GB', limit: 100, used: 0 },
            { resourceType: 'BANDWIDTH_GB', limit: 1000, used: 0 },
            { resourceType: 'BACKUPS', limit: 50, used: 0 },
            { resourceType: 'API_REQUESTS', limit: 10000, used: 0, resetPeriod: 'DAILY' },
          ],
        },
      },
      include: {
        members: true,
        quotas: true,
      },
    });

    return organization;
  }

  // Get organization by slug
  async getOrganization(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        members: true,
        teams: {
          include: {
            members: true,
          },
        },
        quotas: true,
        servers: true,
      },
    });
  }

  // Add member to organization
  async addMember(organizationId: string, userId: string, role: string, invitedBy: string) {
    return prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role: role as any,
        invitedBy,
      },
    });
  }

  // Remove member
  async removeMember(organizationId: string, userId: string) {
    return prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  // Update member role
  async updateMemberRole(organizationId: string, userId: string, role: string) {
    return prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: { role: role as any },
    });
  }

  // Create team
  async createTeam(organizationId: string, data: {
    name: string;
    description?: string;
    color?: string;
    permissions?: string[];
  }) {
    return prisma.team.create({
      data: {
        organizationId,
        ...data,
      },
    });
  }

  // Add member to team
  async addTeamMember(teamId: string, userId: string) {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId,
      },
    });
  }

  // Check quota
  async checkQuota(organizationId: string, resourceType: string, amount: number = 1): Promise<boolean> {
    const quota = await prisma.resourceQuota.findUnique({
      where: {
        organizationId_resourceType: {
          organizationId,
          resourceType: resourceType as any,
        },
      },
    });

    if (!quota) return true; // No quota set

    return (quota.used + amount) <= quota.limit;
  }

  // Increment quota usage
  async incrementQuota(organizationId: string, resourceType: string, amount: number = 1) {
    return prisma.resourceQuota.update({
      where: {
        organizationId_resourceType: {
          organizationId,
          resourceType: resourceType as any,
        },
      },
      data: {
        used: {
          increment: amount,
        },
      },
    });
  }

  // Decrement quota usage
  async decrementQuota(organizationId: string, resourceType: string, amount: number = 1) {
    return prisma.resourceQuota.update({
      where: {
        organizationId_resourceType: {
          organizationId,
          resourceType: resourceType as any,
        },
      },
      data: {
        used: {
          decrement: amount,
        },
      },
    });
  }

  // Check permissions
  async hasPermission(userId: string, organizationId: string, permission: string): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) return false;

    // Owners and admins have all permissions
    if (member.role === 'OWNER' || member.role === 'ADMIN') return true;

    // Check if user has wildcard permission
    if (member.permissions.includes('*')) return true;

    // Check specific permission
    return member.permissions.includes(permission);
  }

  // Upgrade plan
  async upgradePlan(organizationId: string, plan: string) {
    const quotaLimits = {
      FREE: { servers: 5, ram: 32, storage: 100, bandwidth: 1000 },
      STARTER: { servers: 10, ram: 64, storage: 250, bandwidth: 5000 },
      PROFESSIONAL: { servers: 50, ram: 256, storage: 1000, bandwidth: 25000 },
      ENTERPRISE: { servers: -1, ram: -1, storage: -1, bandwidth: -1 }, // Unlimited
    };

    const limits = quotaLimits[plan as keyof typeof quotaLimits];

    await prisma.organization.update({
      where: { id: organizationId },
      data: { plan: plan as any },
    });

    // Update quotas
    await prisma.resourceQuota.updateMany({
      where: { organizationId, resourceType: 'SERVERS' },
      data: { limit: limits.servers },
    });

    await prisma.resourceQuota.updateMany({
      where: { organizationId, resourceType: 'RAM_GB' },
      data: { limit: limits.ram },
    });

    await prisma.resourceQuota.updateMany({
      where: { organizationId, resourceType: 'STORAGE_GB' },
      data: { limit: limits.storage },
    });

    await prisma.resourceQuota.updateMany({
      where: { organizationId, resourceType: 'BANDWIDTH_GB' },
      data: { limit: limits.bandwidth },
    });
  }
}

export const organizationService = new OrganizationService();
