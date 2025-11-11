/**
 * Marketplace Service
 * Manages marketplace listings, purchases, and reviews
 */

import { PrismaClient, MarketplaceType, ListingStatus, PurchaseStatus } from '@prisma/client';
import { logger } from '../lib/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class MarketplaceService {
  /**
   * Create a new marketplace listing
   */
  async createListing(sellerId: string, data: {
    listingType: MarketplaceType;
    itemId: string;
    name: string;
    description: string;
    price: number;
    currency?: string;
    category: string;
    tags?: string[];
  }) {
    // Validate seller owns the item (for templates, mods, etc.)
    await this.validateOwnership(sellerId, data.listingType, data.itemId);

    const listing = await prisma.marketplaceListing.create({
      data: {
        sellerId,
        listingType: data.listingType,
        itemId: data.itemId,
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency || 'USD',
        category: data.category,
        tags: data.tags || [],
        status: ListingStatus.PENDING
      }
    });

    logger.info(`Created marketplace listing: ${listing.id}`);
    return listing;
  }

  /**
   * Validate that user owns the item being listed
   */
  private async validateOwnership(userId: string, type: MarketplaceType, itemId: string): Promise<void> {
    switch (type) {
      case MarketplaceType.TEMPLATE:
        const template = await prisma.serverTemplate.findFirst({
          where: { id: itemId, createdBy: userId }
        });
        if (!template) throw new Error('Template not found or not owned by you');
        break;

      case MarketplaceType.MOD:
        const mod = await prisma.mod.findFirst({
          where: { id: itemId }
        });
        if (!mod) throw new Error('Mod not found');
        break;

      case MarketplaceType.SERVER:
        const server = await prisma.minecraftServer.findFirst({
          where: { id: itemId, userId }
        });
        if (!server) throw new Error('Server not found or not owned by you');
        break;

      default:
        break;
    }
  }

  /**
   * Update listing
   */
  async updateListing(listingId: string, sellerId: string, updates: {
    name?: string;
    description?: string;
    price?: number;
    tags?: string[];
    status?: ListingStatus;
  }) {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new Error('Unauthorized');
    }

    return prisma.marketplaceListing.update({
      where: { id: listingId },
      data: updates
    });
  }

  /**
   * Delete listing
   */
  async deleteListing(listingId: string, sellerId: string) {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new Error('Unauthorized');
    }

    await prisma.marketplaceListing.delete({
      where: { id: listingId }
    });

    return { success: true };
  }

  /**
   * Search listings
   */
  async searchListings(filters: {
    query?: string;
    type?: MarketplaceType;
    category?: string;
    tags?: string[];
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'rating' | 'downloads' | 'recent';
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      status: ListingStatus.APPROVED
    };

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } }
      ];
    }

    if (filters.type) {
      where.listingType = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    let orderBy: any = { createdAt: 'desc' };
    switch (filters.sortBy) {
      case 'price':
        orderBy = { price: 'asc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'downloads':
        orderBy = { downloads: 'desc' };
        break;
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: { reviews: true, purchases: true }
          }
        }
      }),
      prisma.marketplaceListing.count({ where })
    ]);

    return {
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get listing details
   */
  async getListing(listingId: string) {
    return prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { reviews: true, purchases: true }
        }
      }
    });
  }

  /**
   * Purchase an item
   */
  async purchaseItem(buyerId: string, listingId: string) {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== ListingStatus.APPROVED) {
      throw new Error('Listing is not available for purchase');
    }

    if (listing.sellerId === buyerId) {
      throw new Error('Cannot purchase your own listing');
    }

    // Check if already purchased
    const existingPurchase = await prisma.marketplacePurchase.findFirst({
      where: {
        listingId,
        buyerId,
        status: PurchaseStatus.COMPLETED
      }
    });

    if (existingPurchase) {
      throw new Error('Already purchased this item');
    }

    // Check user credits
    const credits = await prisma.userCredits.findUnique({
      where: { userId: buyerId }
    });

    if (!credits || credits.balance < listing.price) {
      throw new Error('Insufficient credits');
    }

    // Create transaction ID
    const transactionId = crypto.randomUUID();

    // Execute purchase in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct credits from buyer
      const buyerCredits = await tx.userCredits.update({
        where: { userId: buyerId },
        data: {
          balance: { decrement: listing.price }
        }
      });

      // Add credits to seller
      let sellerCredits = await tx.userCredits.findUnique({
        where: { userId: listing.sellerId }
      });

      if (!sellerCredits) {
        sellerCredits = await tx.userCredits.create({
          data: {
            userId: listing.sellerId,
            balance: listing.price
          }
        });
      } else {
        sellerCredits = await tx.userCredits.update({
          where: { userId: listing.sellerId },
          data: {
            balance: { increment: listing.price }
          }
        });
      }

      // Create purchase record
      const purchase = await tx.marketplacePurchase.create({
        data: {
          listingId,
          buyerId,
          price: listing.price,
          currency: listing.currency,
          transactionId,
          status: PurchaseStatus.COMPLETED
        }
      });

      // Update listing stats
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: {
          downloads: { increment: 1 }
        }
      });

      // Create credit transactions
      await tx.creditTransaction.createMany({
        data: [
          {
            creditsId: buyerCredits.id,
            amount: -listing.price,
            type: 'PURCHASE',
            description: `Purchased: ${listing.name}`,
            balanceAfter: buyerCredits.balance
          },
          {
            creditsId: sellerCredits.id,
            amount: listing.price,
            type: 'PURCHASE',
            description: `Sale: ${listing.name}`,
            balanceAfter: sellerCredits.balance
          }
        ]
      });

      return { purchase, buyerCredits, sellerCredits };
    });

    logger.info(`Purchase completed: ${transactionId}`);
    return result.purchase;
  }

  /**
   * Request refund
   */
  async requestRefund(buyerId: string, purchaseId: string, reason: string) {
    const purchase = await prisma.marketplacePurchase.findUnique({
      where: { id: purchaseId },
      include: { listing: true }
    });

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.buyerId !== buyerId) {
      throw new Error('Unauthorized');
    }

    if (purchase.status !== PurchaseStatus.COMPLETED) {
      throw new Error('Cannot refund this purchase');
    }

    // Check if within refund period (e.g., 24 hours)
    const hoursSincePurchase = (Date.now() - purchase.purchasedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSincePurchase > 24) {
      throw new Error('Refund period expired (24 hours)');
    }

    // Process refund
    await prisma.$transaction(async (tx) => {
      // Update purchase status
      await tx.marketplacePurchase.update({
        where: { id: purchaseId },
        data: { status: PurchaseStatus.REFUNDED }
      });

      // Refund buyer
      const buyerCredits = await tx.userCredits.update({
        where: { userId: buyerId },
        data: { balance: { increment: purchase.price } }
      });

      // Deduct from seller
      await tx.userCredits.update({
        where: { userId: purchase.listing.sellerId },
        data: { balance: { decrement: purchase.price } }
      });

      // Create transaction records
      await tx.creditTransaction.create({
        data: {
          creditsId: buyerCredits.id,
          amount: purchase.price,
          type: 'REFUND',
          description: `Refund: ${purchase.listing.name}`,
          balanceAfter: buyerCredits.balance,
          metadata: { reason }
        }
      });
    });

    logger.info(`Refund processed for purchase: ${purchaseId}`);
    return { success: true };
  }

  /**
   * Add review
   */
  async addReview(userId: string, listingId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if user purchased the item
    const purchase = await prisma.marketplacePurchase.findFirst({
      where: {
        listingId,
        buyerId: userId,
        status: PurchaseStatus.COMPLETED
      }
    });

    const isVerifiedPurchase = !!purchase;

    // Check if already reviewed
    const existing = await prisma.marketplaceReview.findUnique({
      where: {
        listingId_userId: { listingId, userId }
      }
    });

    if (existing) {
      throw new Error('Already reviewed this item');
    }

    const review = await prisma.marketplaceReview.create({
      data: {
        listingId,
        userId,
        rating,
        comment,
        isVerifiedPurchase
      }
    });

    // Update listing rating
    await this.updateListingRating(listingId);

    return review;
  }

  /**
   * Update listing rating
   */
  private async updateListingRating(listingId: string) {
    const reviews = await prisma.marketplaceReview.findMany({
      where: { listingId }
    });

    if (reviews.length === 0) return;

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length
      }
    });
  }

  /**
   * Get user's purchases
   */
  async getUserPurchases(userId: string) {
    return prisma.marketplacePurchase.findMany({
      where: { buyerId: userId },
      include: { listing: true },
      orderBy: { purchasedAt: 'desc' }
    });
  }

  /**
   * Get user's listings
   */
  async getUserListings(userId: string) {
    return prisma.marketplaceListing.findMany({
      where: { sellerId: userId },
      include: {
        _count: {
          select: { reviews: true, purchases: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get seller stats
   */
  async getSellerStats(sellerId: string) {
    const listings = await prisma.marketplaceListing.findMany({
      where: { sellerId },
      include: {
        purchases: {
          where: { status: PurchaseStatus.COMPLETED }
        },
        reviews: true
      }
    });

    const totalSales = listings.reduce((sum, l) =>
      sum + l.purchases.reduce((s, p) => s + p.price, 0), 0
    );

    const totalDownloads = listings.reduce((sum, l) => sum + l.downloads, 0);

    const allReviews = listings.flatMap(l => l.reviews);
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    return {
      totalListings: listings.length,
      activeListings: listings.filter(l => l.status === ListingStatus.APPROVED).length,
      totalSales,
      totalDownloads,
      totalReviews: allReviews.length,
      averageRating: Math.round(avgRating * 10) / 10
    };
  }

  /**
   * Admin: Approve listing
   */
  async approveListing(listingId: string) {
    return prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.APPROVED }
    });
  }

  /**
   * Admin: Reject listing
   */
  async rejectListing(listingId: string) {
    return prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.REJECTED }
    });
  }

  /**
   * Admin: Feature listing
   */
  async featureListing(listingId: string, featured: boolean) {
    return prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { isFeatured: featured }
    });
  }

  /**
   * Get featured listings
   */
  async getFeaturedListings(limit: number = 10) {
    return prisma.marketplaceListing.findMany({
      where: {
        status: ListingStatus.APPROVED,
        isFeatured: true
      },
      orderBy: { downloads: 'desc' },
      take: limit
    });
  }

  /**
   * Get trending listings
   */
  async getTrendingListings(days: number = 7, limit: number = 10) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const recentPurchases = await prisma.marketplacePurchase.groupBy({
      by: ['listingId'],
      where: {
        purchasedAt: { gte: since },
        status: PurchaseStatus.COMPLETED
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: limit
    });

    const listingIds = recentPurchases.map(p => p.listingId);

    return prisma.marketplaceListing.findMany({
      where: {
        id: { in: listingIds },
        status: ListingStatus.APPROVED
      },
      include: {
        _count: {
          select: { reviews: true, purchases: true }
        }
      }
    });
  }
}

export const marketplaceService = new MarketplaceService();
