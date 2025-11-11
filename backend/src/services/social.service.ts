/**
 * Social Service
 * Manages friendships, guilds, and social interactions
 */

import { PrismaClient, FriendshipStatus, GuildRole } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

export class SocialService {
  // ==================== FRIENDSHIPS ====================

  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    if (existing) {
      throw new Error('Friend request already exists');
    }

    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: FriendshipStatus.PENDING
      }
    });

    // Create activity
    await prisma.activityFeed.create({
      data: {
        userId,
        activityType: 'FRIEND_ADDED',
        title: 'Sent friend request',
        isPublic: false
      }
    });

    return friendship;
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId: string, friendshipId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId }
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    if (friendship.friendId !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: FriendshipStatus.ACCEPTED,
        acceptedAt: new Date()
      }
    });

    // Create activities for both users
    await Promise.all([
      prisma.activityFeed.create({
        data: {
          userId: friendship.userId,
          activityType: 'FRIEND_ADDED',
          title: 'Friend request accepted',
          isPublic: false
        }
      }),
      prisma.activityFeed.create({
        data: {
          userId: friendship.friendId,
          activityType: 'FRIEND_ADDED',
          title: 'Friend request accepted',
          isPublic: false
        }
      })
    ]);

    return updated;
  }

  /**
   * Remove friend or decline request
   */
  async removeFriend(userId: string, friendshipId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId }
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    if (friendship.userId !== userId && friendship.friendId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.friendship.delete({
      where: { id: friendshipId }
    });

    return { success: true };
  }

  /**
   * Get user's friends
   */
  async getFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: FriendshipStatus.ACCEPTED },
          { friendId: userId, status: FriendshipStatus.ACCEPTED }
        ]
      }
    });

    const friendIds = friendships.map(f =>
      f.userId === userId ? f.friendId : f.userId
    );

    const friends = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: {
        id: true,
        username: true,
        createdAt: true,
        _count: {
          select: { servers: true }
        }
      }
    });

    return friends;
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userId: string) {
    return prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: FriendshipStatus.PENDING
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
  }

  // ==================== GUILDS ====================

  /**
   * Create a guild
   */
  async createGuild(userId: string, data: {
    name: string;
    tag: string;
    description: string;
    isPublic?: boolean;
  }) {
    // Check if user is already in a guild
    const existingMembership = await prisma.guildMember.findFirst({
      where: { userId }
    });

    if (existingMembership) {
      throw new Error('Already in a guild. Leave your current guild first.');
    }

    const guild = await prisma.guild.create({
      data: {
        name: data.name,
        tag: data.tag,
        description: data.description,
        ownerId: userId,
        isPublic: data.isPublic ?? true,
        members: {
          create: {
            userId,
            role: GuildRole.OWNER
          }
        }
      },
      include: {
        members: true
      }
    });

    // Create activity
    await prisma.activityFeed.create({
      data: {
        userId,
        activityType: 'GUILD_JOINED',
        title: `Created guild [${data.tag}] ${data.name}`,
        isPublic: true
      }
    });

    return guild;
  }

  /**
   * Join a guild
   */
  async joinGuild(userId: string, guildId: string) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: true
      }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    if (guild.members.length >= guild.maxMembers) {
      throw new Error('Guild is full');
    }

    // Check if user is already in a guild
    const existingMembership = await prisma.guildMember.findFirst({
      where: { userId }
    });

    if (existingMembership) {
      throw new Error('Already in a guild');
    }

    const member = await prisma.guildMember.create({
      data: {
        guildId,
        userId,
        role: GuildRole.RECRUIT
      }
    });

    // Create activity
    await prisma.activityFeed.create({
      data: {
        userId,
        activityType: 'GUILD_JOINED',
        title: `Joined guild [${guild.tag}] ${guild.name}`,
        isPublic: true
      }
    });

    return member;
  }

  /**
   * Leave guild
   */
  async leaveGuild(userId: string, guildId: string) {
    const membership = await prisma.guildMember.findFirst({
      where: { userId, guildId }
    });

    if (!membership) {
      throw new Error('Not a member of this guild');
    }

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { members: true }
    });

    if (!guild) {
      throw new Error('Guild not found');
    }

    // If owner is leaving and there are other members, transfer ownership
    if (membership.role === GuildRole.OWNER && guild.members.length > 1) {
      const newOwner = guild.members.find(m =>
        m.userId !== userId && m.role === GuildRole.OFFICER
      ) || guild.members.find(m => m.userId !== userId);

      if (newOwner) {
        await prisma.guildMember.update({
          where: { id: newOwner.id },
          data: { role: GuildRole.OWNER }
        });

        await prisma.guild.update({
          where: { id: guildId },
          data: { ownerId: newOwner.userId }
        });
      }
    }

    // If last member, delete guild
    if (guild.members.length === 1) {
      await prisma.guild.delete({
        where: { id: guildId }
      });
    } else {
      await prisma.guildMember.delete({
        where: { id: membership.id }
      });
    }

    return { success: true };
  }

  /**
   * Update guild member role
   */
  async updateMemberRole(ownerId: string, guildId: string, memberId: string, newRole: GuildRole) {
    const ownerMembership = await prisma.guildMember.findFirst({
      where: { userId: ownerId, guildId, role: GuildRole.OWNER }
    });

    if (!ownerMembership) {
      throw new Error('Only guild owner can change roles');
    }

    const member = await prisma.guildMember.findFirst({
      where: { userId: memberId, guildId }
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Can't change owner role directly
    if (member.role === GuildRole.OWNER) {
      throw new Error('Cannot change owner role');
    }

    return prisma.guildMember.update({
      where: { id: member.id },
      data: { role: newRole }
    });
  }

  /**
   * Kick member from guild
   */
  async kickMember(ownerId: string, guildId: string, memberId: string) {
    const ownerMembership = await prisma.guildMember.findFirst({
      where: {
        userId: ownerId,
        guildId,
        role: { in: [GuildRole.OWNER, GuildRole.OFFICER] }
      }
    });

    if (!ownerMembership) {
      throw new Error('Insufficient permissions');
    }

    const member = await prisma.guildMember.findFirst({
      where: { userId: memberId, guildId }
    });

    if (!member) {
      throw new Error('Member not found');
    }

    if (member.role === GuildRole.OWNER) {
      throw new Error('Cannot kick guild owner');
    }

    await prisma.guildMember.delete({
      where: { id: member.id }
    });

    return { success: true };
  }

  /**
   * Get guild info
   */
  async getGuild(guildId: string) {
    return prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                createdAt: true
              }
            }
          },
          orderBy: [
            { role: 'asc' },
            { joinedAt: 'asc' }
          ]
        },
        servers: true
      }
    });
  }

  /**
   * Search guilds
   */
  async searchGuilds(query: string, onlyPublic: boolean = true) {
    return prisma.guild.findMany({
      where: {
        AND: [
          onlyPublic ? { isPublic: true } : {},
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { tag: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      include: {
        _count: {
          select: { members: true, servers: true }
        }
      },
      take: 50
    });
  }

  /**
   * Get user's guild
   */
  async getUserGuild(userId: string) {
    const membership = await prisma.guildMember.findFirst({
      where: { userId },
      include: {
        guild: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              }
            },
            servers: true
          }
        }
      }
    });

    return membership?.guild || null;
  }

  /**
   * Add server to guild
   */
  async addServerToGuild(userId: string, guildId: string, serverId: string) {
    const membership = await prisma.guildMember.findFirst({
      where: { userId, guildId }
    });

    if (!membership) {
      throw new Error('Not a member of this guild');
    }

    // Verify user owns the server
    const server = await prisma.minecraftServer.findFirst({
      where: { id: serverId, userId }
    });

    if (!server) {
      throw new Error('Server not found or not owned by you');
    }

    // Check if already added
    const existing = await prisma.guildServer.findFirst({
      where: { guildId, serverId }
    });

    if (existing) {
      throw new Error('Server already in guild');
    }

    return prisma.guildServer.create({
      data: {
        guildId,
        serverId
      }
    });
  }

  /**
   * Remove server from guild
   */
  async removeServerFromGuild(userId: string, guildId: string, serverId: string) {
    const membership = await prisma.guildMember.findFirst({
      where: { userId, guildId }
    });

    if (!membership) {
      throw new Error('Not a member of this guild');
    }

    const guildServer = await prisma.guildServer.findFirst({
      where: { guildId, serverId }
    });

    if (!guildServer) {
      throw new Error('Server not in guild');
    }

    // Verify user owns the server or is guild owner/officer
    const server = await prisma.minecraftServer.findFirst({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.userId !== userId && ![GuildRole.OWNER, GuildRole.OFFICER].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    await prisma.guildServer.delete({
      where: { id: guildServer.id }
    });

    return { success: true };
  }

  // ==================== CHAT ====================

  /**
   * Send chat message
   */
  async sendMessage(senderId: string, recipientId?: string, guildId?: string, content?: string) {
    if (!recipientId && !guildId) {
      throw new Error('Must specify recipient or guild');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (content.length > 2000) {
      throw new Error('Message too long (max 2000 characters)');
    }

    return prisma.chatMessage.create({
      data: {
        senderId,
        recipientId,
        guildId,
        content: content.trim()
      }
    });
  }

  /**
   * Get direct messages
   */
  async getDirectMessages(userId: string, otherUserId: string, limit: number = 50) {
    return prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId }
        ]
      },
      orderBy: { sentAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get guild messages
   */
  async getGuildMessages(guildId: string, limit: number = 100) {
    return prisma.chatMessage.findMany({
      where: { guildId },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(userId: string, senderId: string) {
    return prisma.chatMessage.updateMany({
      where: {
        recipientId: userId,
        senderId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string) {
    return prisma.chatMessage.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });
  }
}

export const socialService = new SocialService();
