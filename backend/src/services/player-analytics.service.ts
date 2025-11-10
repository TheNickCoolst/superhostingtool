import { prisma } from '../lib/prisma';

export class PlayerAnalyticsService {
  // Record daily analytics
  async recordDailyAnalytics(serverId: string, data: {
    uniquePlayers: number;
    peakPlayers: number;
    averagePlayers: number;
    totalPlaytime: number;
    newPlayers: number;
    returningPlayers: number;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate churn rate
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayData = await prisma.playerAnalytics.findUnique({
      where: {
        serverId_date: {
          serverId,
          date: yesterday,
        },
      },
    });

    let churnRate = 0;
    if (yesterdayData) {
      const playersLost = yesterdayData.uniquePlayers - data.returningPlayers;
      churnRate = (playersLost / yesterdayData.uniquePlayers) * 100;
    }

    return prisma.playerAnalytics.upsert({
      where: {
        serverId_date: {
          serverId,
          date: today,
        },
      },
      update: {
        uniquePlayers: data.uniquePlayers,
        peakPlayers: data.peakPlayers,
        averagePlayers: data.averagePlayers,
        totalPlaytime: data.totalPlaytime,
        newPlayers: data.newPlayers,
        returningPlayers: data.returningPlayers,
        churnRate,
      },
      create: {
        serverId,
        date: today,
        uniquePlayers: data.uniquePlayers,
        peakPlayers: data.peakPlayers,
        averagePlayers: data.averagePlayers,
        totalPlaytime: data.totalPlaytime,
        newPlayers: data.newPlayers,
        returningPlayers: data.returningPlayers,
        churnRate,
      },
    });
  }

  // Get analytics for date range
  async getAnalytics(serverId: string, startDate: Date, endDate: Date) {
    return prisma.playerAnalytics.findMany({
      where: {
        serverId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  // Get analytics summary
  async getAnalyticsSummary(serverId: string, days: number = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 86400000);

    const analytics = await this.getAnalytics(serverId, startDate, endDate);

    if (analytics.length === 0) {
      return null;
    }

    const summary = {
      totalUniquePlayers: analytics.reduce((sum, a) => sum + a.uniquePlayers, 0),
      averageUniquePlayers: analytics.reduce((sum, a) => sum + a.uniquePlayers, 0) / analytics.length,
      peakPlayers: Math.max(...analytics.map(a => a.peakPlayers)),
      totalPlaytime: analytics.reduce((sum, a) => sum + a.totalPlaytime, 0),
      averagePlaytime: analytics.reduce((sum, a) => sum + a.totalPlaytime, 0) / analytics.reduce((sum, a) => sum + a.uniquePlayers, 0) || 0,
      newPlayers: analytics.reduce((sum, a) => sum + a.newPlayers, 0),
      returningPlayers: analytics.reduce((sum, a) => sum + a.returningPlayers, 0),
      averageChurnRate: analytics.reduce((sum, a) => sum + (a.churnRate || 0), 0) / analytics.length,
      retentionRate: (analytics.reduce((sum, a) => sum + a.returningPlayers, 0) / analytics.reduce((sum, a) => sum + a.uniquePlayers, 0)) * 100 || 0,
    };

    return summary;
  }

  // Get growth trend
  async getGrowthTrend(serverId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 86400000);

    const analytics = await this.getAnalytics(serverId, startDate, endDate);

    if (analytics.length < 2) {
      return { trend: 'unknown', percentageChange: 0 };
    }

    const firstWeek = analytics.slice(0, 7);
    const lastWeek = analytics.slice(-7);

    const firstWeekAvg = firstWeek.reduce((sum, a) => sum + a.uniquePlayers, 0) / firstWeek.length;
    const lastWeekAvg = lastWeek.reduce((sum, a) => sum + a.uniquePlayers, 0) / lastWeek.length;

    const percentageChange = ((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100;

    return {
      trend: percentageChange > 5 ? 'growing' : percentageChange < -5 ? 'declining' : 'stable',
      percentageChange,
      firstWeekAvg,
      lastWeekAvg,
    };
  }

  // Get player activity patterns
  async getActivityPatterns(serverId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 86400000);

    const analytics = await this.getAnalytics(serverId, startDate, endDate);

    const dayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday

    for (const record of analytics) {
      const day = record.date.getDay();
      dayOfWeek[day] += record.uniquePlayers;
    }

    const averageByDay = dayOfWeek.map((count, day) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      averagePlayers: count / Math.ceil(analytics.length / 7),
    }));

    return averageByDay;
  }

  // Compare periods
  async comparePeriods(serverId: string, days: number = 7) {
    const now = new Date();
    const currentPeriodEnd = now;
    const currentPeriodStart = new Date(now.getTime() - days * 86400000);
    const previousPeriodEnd = currentPeriodStart;
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - days * 86400000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      this.getAnalyticsSummary(serverId, days),
      this.getAnalytics(serverId, previousPeriodStart, previousPeriodEnd),
    ]);

    const previousSummary = previousPeriod.length > 0 ? {
      averageUniquePlayers: previousPeriod.reduce((sum, a) => sum + a.uniquePlayers, 0) / previousPeriod.length,
      totalPlaytime: previousPeriod.reduce((sum, a) => sum + a.totalPlaytime, 0),
      newPlayers: previousPeriod.reduce((sum, a) => sum + a.newPlayers, 0),
    } : null;

    return {
      current: currentPeriod,
      previous: previousSummary,
      changes: currentPeriod && previousSummary ? {
        uniquePlayers: ((currentPeriod.averageUniquePlayers - previousSummary.averageUniquePlayers) / previousSummary.averageUniquePlayers) * 100,
        playtime: ((currentPeriod.totalPlaytime - previousSummary.totalPlaytime) / previousSummary.totalPlaytime) * 100,
        newPlayers: ((currentPeriod.newPlayers - previousSummary.newPlayers) / previousSummary.newPlayers) * 100,
      } : null,
    };
  }
}

export const playerAnalyticsService = new PlayerAnalyticsService();
