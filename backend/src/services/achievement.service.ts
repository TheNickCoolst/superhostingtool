/**
 * Achievement Service
 * Gamification system for rewarding users
 */

import { PrismaClient, AchievementCategory, AchievementRarity } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

export class AchievementService {
  /**
   * Initialize default achievements
   */
  async initializeAchievements(): Promise<void> {
    const achievements = [
      // Server Management
      {
        name: 'First Steps',
        description: 'Create your first Minecraft server',
        icon: '🚀',
        category: AchievementCategory.SERVER_MANAGEMENT,
        points: 10,
        rarity: AchievementRarity.COMMON,
        requirement: { type: 'server_count', value: 1 }
      },
      {
        name: 'Server Enthusiast',
        description: 'Create 5 servers',
        icon: '🎮',
        category: AchievementCategory.SERVER_MANAGEMENT,
        points: 25,
        rarity: AchievementRarity.UNCOMMON,
        requirement: { type: 'server_count', value: 5 }
      },
      {
        name: 'Server Master',
        description: 'Manage 10 servers simultaneously',
        icon: '👑',
        category: AchievementCategory.SERVER_MANAGEMENT,
        points: 50,
        rarity: AchievementRarity.RARE,
        requirement: { type: 'server_count', value: 10 }
      },
      {
        name: 'Quick Deploy',
        description: 'Start a server in under 30 seconds',
        icon: '⚡',
        category: AchievementCategory.SERVER_MANAGEMENT,
        points: 15,
        rarity: AchievementRarity.UNCOMMON,
        requirement: { type: 'quick_start', value: 30 }
      },

      // Performance
      {
        name: 'Smooth Operator',
        description: 'Maintain 20 TPS for 24 hours',
        icon: '✨',
        category: AchievementCategory.PERFORMANCE,
        points: 30,
        rarity: AchievementRarity.RARE,
        requirement: { type: 'tps_uptime', value: 24 }
      },
      {
        name: 'Zero Downtime',
        description: 'Keep server running for 30 days straight',
        icon: '💎',
        category: AchievementCategory.PERFORMANCE,
        points: 100,
        rarity: AchievementRarity.EPIC,
        requirement: { type: 'uptime_days', value: 30 }
      },
      {
        name: 'Performance Wizard',
        description: 'Optimize server to use <50% resources while maintaining 20 TPS',
        icon: '🧙',
        category: AchievementCategory.PERFORMANCE,
        points: 75,
        rarity: AchievementRarity.EPIC,
        requirement: { type: 'efficient_performance', value: 50 }
      },

      // Community
      {
        name: 'Welcome Party',
        description: 'Host your first player',
        icon: '🎉',
        category: AchievementCategory.COMMUNITY,
        points: 10,
        rarity: AchievementRarity.COMMON,
        requirement: { type: 'total_players', value: 1 }
      },
      {
        name: 'Community Builder',
        description: 'Reach 50 unique players',
        icon: '🏘️',
        category: AchievementCategory.COMMUNITY,
        points: 40,
        rarity: AchievementRarity.RARE,
        requirement: { type: 'unique_players', value: 50 }
      },
      {
        name: 'Mega Server',
        description: 'Have 100+ players online simultaneously',
        icon: '🌟',
        category: AchievementCategory.COMMUNITY,
        points: 150,
        rarity: AchievementRarity.LEGENDARY,
        requirement: { type: 'peak_players', value: 100 }
      },

      // Longevity
      {
        name: 'Week One',
        description: 'Keep a server running for 7 days',
        icon: '📅',
        category: AchievementCategory.LONGEVITY,
        points: 20,
        rarity: AchievementRarity.COMMON,
        requirement: { type: 'uptime_days', value: 7 }
      },
      {
        name: 'Veteran',
        description: 'Account age: 90 days',
        icon: '🎖️',
        category: AchievementCategory.LONGEVITY,
        points: 50,
        rarity: AchievementRarity.RARE,
        requirement: { type: 'account_age_days', value: 90 }
      },
      {
        name: 'Legend',
        description: 'Account age: 365 days',
        icon: '🏆',
        category: AchievementRarity.LEGENDARY,
        points: 200,
        rarity: AchievementRarity.LEGENDARY,
        requirement: { type: 'account_age_days', value: 365 }
      },

      // Creativity
      {
        name: 'Mod Experimenter',
        description: 'Install 10 different mods',
        icon: '🔧',
        category: AchievementCategory.CREATIVITY,
        points: 25,
        rarity: AchievementRarity.UNCOMMON,
        requirement: { type: 'mods_installed', value: 10 }
      },
      {
        name: 'Template Creator',
        description: 'Create your first server template',
        icon: '📝',
        category: AchievementCategory.CREATIVITY,
        points: 30,
        rarity: AchievementRarity.UNCOMMON,
        requirement: { type: 'templates_created', value: 1 }
      },
      {
        name: 'Popular Creator',
        description: 'Have your template downloaded 100 times',
        icon: '⭐',
        category: AchievementCategory.CREATIVITY,
        points: 100,
        rarity: AchievementRarity.EPIC,
        requirement: { type: 'template_downloads', value: 100 }
      },

      // Special
      {
        name: 'Early Adopter',
        description: 'Join during beta period',
        icon: '🌅',
        category: AchievementCategory.SPECIAL,
        points: 50,
        rarity: AchievementRarity.RARE,
        requirement: { type: 'special', value: 'early_adopter' },
        isHidden: true
      },
      {
        name: 'Bug Hunter',
        description: 'Report a critical bug',
        icon: '🐛',
        category: AchievementCategory.SPECIAL,
        points: 75,
        rarity: AchievementRarity.EPIC,
        requirement: { type: 'special', value: 'bug_reporter' },
        isHidden: true
      },
      {
        name: 'Perfectionist',
        description: 'Complete all non-hidden achievements',
        icon: '💯',
        category: AchievementCategory.SPECIAL,
        points: 500,
        rarity: AchievementRarity.LEGENDARY,
        requirement: { type: 'special', value: 'all_achievements' },
        isHidden: true
      }
    ];

    for (const ach of achievements) {
      await prisma.achievement.upsert({
        where: { name: ach.name },
        create: ach as any,
        update: {}
      });
    }

    logger.info(`Initialized ${achievements.length} achievements`);
  }

  /**
   * Check and unlock achievements for a user
   */
  async checkAchievements(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          servers: {
            include: { stats: true }
          }
        }
      });

      if (!user) return;

      const achievements = await prisma.achievement.findMany({
        where: { isHidden: false }
      });

      for (const achievement of achievements) {
        await this.checkSingleAchievement(userId, achievement, user);
      }
    } catch (error) {
      logger.error(`Error checking achievements for user ${userId}:`, error);
    }
  }

  /**
   * Check a single achievement
   */
  private async checkSingleAchievement(userId: string, achievement: any, userData: any): Promise<void> {
    const req = achievement.requirement as any;

    let isEligible = false;
    let progress = 0;

    switch (req.type) {
      case 'server_count':
        const serverCount = userData.servers.length;
        progress = Math.min(1, serverCount / req.value);
        isEligible = serverCount >= req.value;
        break;

      case 'unique_players':
        // Would need player tracking implementation
        break;

      case 'peak_players':
        const maxPlayers = Math.max(...userData.servers.map((s: any) => s.stats?.onlinePlayers || 0));
        progress = Math.min(1, maxPlayers / req.value);
        isEligible = maxPlayers >= req.value;
        break;

      case 'uptime_days':
        // Check longest running server
        const now = Date.now();
        const uptimes = userData.servers.map((s: any) =>
          s.lastStarted ? (now - s.lastStarted.getTime()) / (1000 * 60 * 60 * 24) : 0
        );
        const maxUptime = Math.max(...uptimes);
        progress = Math.min(1, maxUptime / req.value);
        isEligible = maxUptime >= req.value;
        break;

      case 'account_age_days':
        const accountAge = (Date.now() - userData.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        progress = Math.min(1, accountAge / req.value);
        isEligible = accountAge >= req.value;
        break;

      case 'tps_uptime':
        // Would need TPS history tracking
        break;

      case 'templates_created':
        const templates = await prisma.serverTemplate.count({
          where: { createdBy: userId }
        });
        progress = Math.min(1, templates / req.value);
        isEligible = templates >= req.value;
        break;

      default:
        break;
    }

    // Create or update player achievement
    const existing = await prisma.playerAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    if (isEligible && !existing?.isCompleted) {
      if (existing) {
        await prisma.playerAchievement.update({
          where: { id: existing.id },
          data: {
            progress: 1,
            isCompleted: true,
            completedAt: new Date()
          }
        });
      } else {
        await prisma.playerAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: 1,
            isCompleted: true,
            completedAt: new Date()
          }
        });
      }

      // Create activity feed entry
      await prisma.activityFeed.create({
        data: {
          userId,
          activityType: 'ACHIEVEMENT_UNLOCKED',
          title: `Achievement Unlocked: ${achievement.name}`,
          description: achievement.description,
          metadata: { achievementId: achievement.id, points: achievement.points },
          isPublic: true
        }
      });

      logger.info(`User ${userId} unlocked achievement: ${achievement.name}`);
    } else if (!existing && progress > 0) {
      // Create progress tracking
      await prisma.playerAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          progress,
          isCompleted: false
        }
      });
    } else if (existing && !existing.isCompleted && progress !== existing.progress) {
      // Update progress
      await prisma.playerAchievement.update({
        where: { id: existing.id },
        data: { progress }
      });
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string) {
    const playerAchievements = await prisma.playerAchievement.findMany({
      where: { userId },
      include: { achievement: true }
    });

    const totalPoints = playerAchievements
      .filter(pa => pa.isCompleted)
      .reduce((sum, pa) => sum + pa.achievement.points, 0);

    return {
      totalPoints,
      completed: playerAchievements.filter(pa => pa.isCompleted).length,
      inProgress: playerAchievements.filter(pa => !pa.isCompleted).length,
      achievements: playerAchievements
    };
  }

  /**
   * Get all achievements with user progress
   */
  async getAllAchievementsWithProgress(userId: string) {
    const allAchievements = await prisma.achievement.findMany({
      where: { isHidden: false },
      orderBy: [
        { category: 'asc' },
        { points: 'asc' }
      ]
    });

    const userProgress = await prisma.playerAchievement.findMany({
      where: { userId }
    });

    const progressMap = new Map(userProgress.map(p => [p.achievementId, p]));

    return allAchievements.map(ach => ({
      ...ach,
      userProgress: progressMap.get(ach.id) || null
    }));
  }

  /**
   * Get leaderboard by achievement points
   */
  async getAchievementLeaderboard(limit: number = 100) {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { servers: true }
        }
      }
    });

    const userPoints = await Promise.all(
      users.map(async (user) => {
        const achievements = await this.getUserAchievements(user.id);
        return {
          userId: user.id,
          username: user.username,
          totalPoints: achievements.totalPoints,
          completedCount: achievements.completed,
          serverCount: user._count.servers
        };
      })
    );

    return userPoints
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
  }
}

export const achievementService = new AchievementService();
