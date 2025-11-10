import prisma from '../lib/prisma';
import type { Organization, OrganizationMember, PlanType, OrgRole } from '@prisma/client';

/**
 * Organization Service (Multi-Tenancy)
 *
 * - White-label support
 * - Organization management
 * - Team collaboration
 * - Usage-based billing
 */
class OrganizationService {

  /**
   * Create organization
   */
  async createOrganization(
    name: string,
    slug: string,
    ownerId: string,
    plan: PlanType = 'FREE'
  ): Promise<Organization> {
    // Check if slug is available
    const existing = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existing) {
      throw new Error('Organization slug already exists');
    }

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        plan,
        maxUsers: this.getPlanLimits(plan).maxUsers,
        maxServers: this.getPlanLimits(plan).maxServers,
        features: this.getPlanFeatures(plan)
      }
    });

    // Add owner as member
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: ownerId,
        role: 'OWNER',
        permissions: ['*'] // All permissions
      }
    });

    return org;
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: PlanType): { maxUsers: number; maxServers: number } {
    const limits = {
      FREE: { maxUsers: 3, maxServers: 2 },
      STARTER: { maxUsers: 10, maxServers: 10 },
      PRO: { maxUsers: 50, maxServers: 100 },
      ENTERPRISE: { maxUsers: -1, maxServers: -1 } // Unlimited
    };

    return limits[plan];
  }

  /**
   * Get plan features
   */
  private getPlanFeatures(plan: PlanType): string[] {
    const features = {
      FREE: ['basic_servers', 'basic_backups'],
      STARTER: ['basic_servers', 'basic_backups', 'monitoring', 'scheduled_tasks'],
      PRO: ['basic_servers', 'basic_backups', 'monitoring', 'scheduled_tasks', 'advanced_analytics', 'priority_support', 'custom_branding'],
      ENTERPRISE: ['*'] // All features
    };

    return features[plan];
  }

  /**
   * Update organization
   */
  async updateOrganization(
    orgId: string,
    updates: Partial<{
      name: string;
      logoUrl: string;
      customDomain: string;
      theme: any;
    }>
  ): Promise<Organization> {
    return await prisma.organization.update({
      where: { id: orgId },
      data: updates
    });
  }

  /**
   * Upgrade organization plan
   */
  async upgradePlan(orgId: string, newPlan: PlanType): Promise<Organization> {
    const limits = this.getPlanLimits(newPlan);
    const features = this.getPlanFeatures(newPlan);

    return await prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: newPlan,
        maxUsers: limits.maxUsers,
        maxServers: limits.maxServers,
        features
      }
    });
  }

  /**
   * Add member to organization
   */
  async addMember(
    orgId: string,
    userId: string,
    role: OrgRole = 'MEMBER',
    permissions: string[] = []
  ): Promise<OrganizationMember> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check member limit
    if (org.maxUsers !== -1 && org.members.length >= org.maxUsers) {
      throw new Error('Organization has reached maximum member limit');
    }

    return await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId,
        role,
        permissions
      }
    });
  }

  /**
   * Remove member from organization
   */
  async removeMember(orgId: string, userId: string): Promise<void> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId
        }
      }
    });

    if (!member) {
      throw new Error('Member not found');
    }

    if (member.role === 'OWNER') {
      throw new Error('Cannot remove organization owner');
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId
        }
      }
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgRole,
    permissions: string[]
  ): Promise<OrganizationMember> {
    return await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId
        }
      },
      data: { role, permissions }
    });
  }

  /**
   * Get organization members
   */
  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    return await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      orderBy: { joinedAt: 'asc' }
    });
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    orgId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId
        }
      }
    });

    if (!member) return false;

    // Owner has all permissions
    if (member.role === 'OWNER') return true;

    // Check if has wildcard permission
    if (member.permissions.includes('*')) return true;

    // Check specific permission
    return member.permissions.includes(permission);
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<any[]> {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true
      }
    });

    return memberships.map(m => ({
      ...m.organization,
      role: m.role,
      permissions: m.permissions
    }));
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    return await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: true
      }
    });
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(orgId: string, newOwnerId: string): Promise<void> {
    // Find current owner
    const currentOwner = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        role: 'OWNER'
      }
    });

    if (!currentOwner) {
      throw new Error('Current owner not found');
    }

    // Update current owner to admin
    await prisma.organizationMember.update({
      where: { id: currentOwner.id },
      data: { role: 'ADMIN' }
    });

    // Update new owner
    await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: newOwnerId
        }
      },
      data: {
        role: 'OWNER',
        permissions: ['*']
      }
    });
  }

  /**
   * Delete organization
   */
  async deleteOrganization(orgId: string): Promise<void> {
    // Delete all members
    await prisma.organizationMember.deleteMany({
      where: { organizationId: orgId }
    });

    // Delete organization
    await prisma.organization.delete({
      where: { id: orgId }
    });
  }

  /**
   * Get organization usage statistics
   */
  async getUsageStats(orgId: string): Promise<any> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get servers created by org members
    const memberIds = org.members.map(m => m.userId);
    const servers = await prisma.minecraftServer.findMany({
      where: { userId: { in: memberIds } }
    });

    const runningServers = servers.filter(s => s.status === 'RUNNING').length;

    return {
      organizationId: org.id,
      plan: org.plan,
      members: {
        current: org.members.length,
        limit: org.maxUsers === -1 ? 'Unlimited' : org.maxUsers
      },
      servers: {
        current: servers.length,
        limit: org.maxServers === -1 ? 'Unlimited' : org.maxServers,
        running: runningServers
      },
      features: org.features
    };
  }
}

export default new OrganizationService();
