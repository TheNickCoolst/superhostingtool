/**
 * Marketplace Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { marketplaceService } from '../services/marketplace.service';
import { logger } from '../lib/logger';

const router = express.Router();

// ==================== LISTINGS ====================

/**
 * GET /api/marketplace/search
 * Search marketplace listings
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const filters = {
      query: req.query.q as string,
      type: req.query.type as any,
      category: req.query.category as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      sortBy: req.query.sortBy as any,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const result = await marketplaceService.searchListings(filters);
    res.json(result);
  } catch (error: any) {
    logger.error('Error searching listings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/listings/:id
 * Get listing details
 */
router.get('/listings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await marketplaceService.getListing(id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error: any) {
    logger.error('Error fetching listing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/marketplace/listings
 * Create a new listing
 */
router.post('/listings', authenticateToken, async (req, res) => {
  try {
    const sellerId = (req as any).user.id;
    const listing = await marketplaceService.createListing(sellerId, req.body);
    res.json(listing);
  } catch (error: any) {
    logger.error('Error creating listing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/marketplace/listings/:id
 * Update listing
 */
router.put('/listings/:id', authenticateToken, async (req, res) => {
  try {
    const sellerId = (req as any).user.id;
    const { id } = req.params;

    const listing = await marketplaceService.updateListing(id, sellerId, req.body);
    res.json(listing);
  } catch (error: any) {
    logger.error('Error updating listing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/marketplace/listings/:id
 * Delete listing
 */
router.delete('/listings/:id', authenticateToken, async (req, res) => {
  try {
    const sellerId = (req as any).user.id;
    const { id } = req.params;

    const result = await marketplaceService.deleteListing(id, sellerId);
    res.json(result);
  } catch (error: any) {
    logger.error('Error deleting listing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/featured
 * Get featured listings
 */
router.get('/featured', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const listings = await marketplaceService.getFeaturedListings(limit);
    res.json(listings);
  } catch (error: any) {
    logger.error('Error fetching featured listings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/trending
 * Get trending listings
 */
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const limit = parseInt(req.query.limit as string) || 10;
    const listings = await marketplaceService.getTrendingListings(days, limit);
    res.json(listings);
  } catch (error: any) {
    logger.error('Error fetching trending listings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PURCHASES ====================

/**
 * POST /api/marketplace/purchase/:listingId
 * Purchase an item
 */
router.post('/purchase/:listingId', authenticateToken, async (req, res) => {
  try {
    const buyerId = (req as any).user.id;
    const { listingId } = req.params;

    const purchase = await marketplaceService.purchaseItem(buyerId, listingId);
    res.json(purchase);
  } catch (error: any) {
    logger.error('Error purchasing item:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/purchases
 * Get user's purchases
 */
router.get('/purchases', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const purchases = await marketplaceService.getUserPurchases(userId);
    res.json(purchases);
  } catch (error: any) {
    logger.error('Error fetching purchases:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/marketplace/purchases/:id/refund
 * Request refund
 */
router.post('/purchases/:id/refund', authenticateToken, async (req, res) => {
  try {
    const buyerId = (req as any).user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await marketplaceService.requestRefund(buyerId, id, reason);
    res.json(result);
  } catch (error: any) {
    logger.error('Error requesting refund:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== REVIEWS ====================

/**
 * POST /api/marketplace/listings/:listingId/reviews
 * Add review
 */
router.post('/listings/:listingId/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { listingId } = req.params;
    const { rating, comment } = req.body;

    const review = await marketplaceService.addReview(userId, listingId, rating, comment);
    res.json(review);
  } catch (error: any) {
    logger.error('Error adding review:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== SELLER ====================

/**
 * GET /api/marketplace/seller/listings
 * Get seller's listings
 */
router.get('/seller/listings', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const listings = await marketplaceService.getUserListings(userId);
    res.json(listings);
  } catch (error: any) {
    logger.error('Error fetching seller listings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/seller/stats
 * Get seller statistics
 */
router.get('/seller/stats', authenticateToken, async (req, res) => {
  try {
    const sellerId = (req as any).user.id;
    const stats = await marketplaceService.getSellerStats(sellerId);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching seller stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/seller/:sellerId/stats
 * Get another seller's public stats
 */
router.get('/seller/:sellerId/stats', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const stats = await marketplaceService.getSellerStats(sellerId);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching seller stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ====================

/**
 * POST /api/marketplace/admin/listings/:id/approve
 * Approve listing (Admin only)
 */
router.post('/admin/listings/:id/approve', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const listing = await marketplaceService.approveListing(id);
    res.json(listing);
  } catch (error: any) {
    logger.error('Error approving listing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/marketplace/admin/listings/:id/reject
 * Reject listing (Admin only)
 */
router.post('/admin/listings/:id/reject', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const listing = await marketplaceService.rejectListing(id);
    res.json(listing);
  } catch (error: any) {
    logger.error('Error rejecting listing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/marketplace/admin/listings/:id/feature
 * Feature/unfeature listing (Admin only)
 */
router.post('/admin/listings/:id/feature', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { featured } = req.body;

    const listing = await marketplaceService.featureListing(id, featured);
    res.json(listing);
  } catch (error: any) {
    logger.error('Error featuring listing:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
