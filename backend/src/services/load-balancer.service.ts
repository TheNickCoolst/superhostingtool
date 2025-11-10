import prisma from '../lib/prisma';
import type { LoadBalancer, LBTarget, LBAlgorithm } from '@prisma/client';

/**
 * Load Balancer Service
 *
 * - Multiple load balancing algorithms
 * - Health checks
 * - Sticky sessions
 * - Dynamic target management
 */
class LoadBalancerService {

  /**
   * Create load balancer
   */
  async createLoadBalancer(
    name: string,
    algorithm: LBAlgorithm = 'ROUND_ROBIN',
    options?: {
      healthCheck?: boolean;
      stickySession?: boolean;
    }
  ): Promise<LoadBalancer> {
    return await prisma.loadBalancer.create({
      data: {
        name,
        algorithm,
        enabled: true,
        healthCheck: options?.healthCheck ?? true,
        stickySession: options?.stickySession ?? false
      }
    });
  }

  /**
   * Update load balancer
   */
  async updateLoadBalancer(
    lbId: string,
    updates: Partial<LoadBalancer>
  ): Promise<LoadBalancer> {
    return await prisma.loadBalancer.update({
      where: { id: lbId },
      data: updates
    });
  }

  /**
   * Delete load balancer
   */
  async deleteLoadBalancer(lbId: string): Promise<void> {
    await prisma.loadBalancer.delete({
      where: { id: lbId }
    });
  }

  /**
   * Add target to load balancer
   */
  async addTarget(
    lbId: string,
    serverId: string,
    weight: number = 1
  ): Promise<LBTarget> {
    return await prisma.lBTarget.create({
      data: {
        loadBalancerId: lbId,
        serverId,
        weight,
        enabled: true
      }
    });
  }

  /**
   * Remove target from load balancer
   */
  async removeTarget(lbId: string, serverId: string): Promise<void> {
    await prisma.lBTarget.delete({
      where: {
        loadBalancerId_serverId: {
          loadBalancerId: lbId,
          serverId
        }
      }
    });
  }

  /**
   * Update target weight
   */
  async updateTargetWeight(lbId: string, serverId: string, weight: number): Promise<void> {
    await prisma.lBTarget.update({
      where: {
        loadBalancerId_serverId: {
          loadBalancerId: lbId,
          serverId
        }
      },
      data: { weight }
    });
  }

  /**
   * Enable/disable target
   */
  async toggleTarget(lbId: string, serverId: string, enabled: boolean): Promise<void> {
    await prisma.lBTarget.update({
      where: {
        loadBalancerId_serverId: {
          loadBalancerId: lbId,
          serverId
        }
      },
      data: { enabled }
    });
  }

  /**
   * Get next target using configured algorithm
   */
  async getNextTarget(lbId: string, clientIp?: string): Promise<string | null> {
    const lb = await prisma.loadBalancer.findUnique({
      where: { id: lbId },
      include: {
        targets: {
          where: { enabled: true }
        }
      }
    });

    if (!lb || lb.targets.length === 0) {
      return null;
    }

    // Filter healthy targets
    const healthyTargets = await this.filterHealthyTargets(lb.targets);

    if (healthyTargets.length === 0) {
      return null;
    }

    switch (lb.algorithm) {
      case 'ROUND_ROBIN':
        return this.roundRobin(healthyTargets);
      case 'LEAST_CONNECTIONS':
        return await this.leastConnections(healthyTargets);
      case 'IP_HASH':
        return this.ipHash(healthyTargets, clientIp || '');
      case 'WEIGHTED':
        return this.weighted(healthyTargets);
      default:
        return this.roundRobin(healthyTargets);
    }
  }

  /**
   * Round-robin algorithm
   */
  private roundRobin(targets: LBTarget[]): string {
    // Simple implementation: random for now
    // In production, maintain state for true round-robin
    const index = Math.floor(Math.random() * targets.length);
    return targets[index].serverId;
  }

  /**
   * Least connections algorithm
   */
  private async leastConnections(targets: LBTarget[]): Promise<string> {
    // Find server with least active connections
    const serversWithStats = await Promise.all(
      targets.map(async (target) => {
        const stats = await prisma.serverStats.findUnique({
          where: { serverId: target.serverId }
        });
        return {
          serverId: target.serverId,
          connections: stats?.onlinePlayers || 0
        };
      })
    );

    serversWithStats.sort((a, b) => a.connections - b.connections);
    return serversWithStats[0].serverId;
  }

  /**
   * IP hash algorithm
   */
  private ipHash(targets: LBTarget[], clientIp: string): string {
    // Hash client IP to consistently route to same server
    const hash = this.simpleHash(clientIp);
    const index = hash % targets.length;
    return targets[index].serverId;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Weighted random algorithm
   */
  private weighted(targets: LBTarget[]): string {
    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const target of targets) {
      random -= target.weight;
      if (random <= 0) {
        return target.serverId;
      }
    }

    return targets[0].serverId;
  }

  /**
   * Filter healthy targets
   */
  private async filterHealthyTargets(targets: LBTarget[]): Promise<LBTarget[]> {
    const healthy: LBTarget[] = [];

    for (const target of targets) {
      const server = await prisma.minecraftServer.findUnique({
        where: { id: target.serverId }
      });

      if (server && server.status === 'RUNNING') {
        healthy.push(target);
      }
    }

    return healthy;
  }

  /**
   * Get load balancer details
   */
  async getLoadBalancer(lbId: string): Promise<any> {
    const lb = await prisma.loadBalancer.findUnique({
      where: { id: lbId },
      include: {
        targets: true
      }
    });

    if (!lb) return null;

    // Get server details for each target
    const targetsWithDetails = await Promise.all(
      lb.targets.map(async (target) => {
        const server = await prisma.minecraftServer.findUnique({
          where: { id: target.serverId },
          include: {
            host: true,
            stats: true
          }
        });

        return {
          ...target,
          server
        };
      })
    );

    return {
      ...lb,
      targets: targetsWithDetails
    };
  }

  /**
   * Get all load balancers
   */
  async getAllLoadBalancers(): Promise<LoadBalancer[]> {
    return await prisma.loadBalancer.findMany({
      include: {
        targets: true
      }
    });
  }

  /**
   * Get load balancer statistics
   */
  async getStats(lbId: string): Promise<any> {
    const lb = await this.getLoadBalancer(lbId);

    if (!lb) {
      throw new Error('Load balancer not found');
    }

    const totalTargets = lb.targets.length;
    const enabledTargets = lb.targets.filter((t: any) => t.enabled).length;
    const healthyTargets = lb.targets.filter((t: any) =>
      t.server?.status === 'RUNNING'
    ).length;

    const totalPlayers = lb.targets.reduce((sum: number, t: any) =>
      sum + (t.server?.stats?.onlinePlayers || 0), 0
    );

    return {
      loadBalancerId: lb.id,
      algorithm: lb.algorithm,
      totalTargets,
      enabledTargets,
      healthyTargets,
      totalPlayers,
      healthStatus: healthyTargets > 0 ? 'HEALTHY' : 'UNHEALTHY'
    };
  }
}

export default new LoadBalancerService();
