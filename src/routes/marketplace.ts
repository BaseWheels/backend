import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import {
  verifyCarOwnership,
  verifyCarApproval,
  verifyIDRXAllowance,
  executePurchase,
} from "../blockchain/marketplace-client";
import { getMockIDRXBalance } from "../blockchain/client";

const router = Router();

/**
 * POST /api/marketplace/list
 * Create a new listing for a car NFT
 */
router.post("/marketplace/list", auth, async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req as AuthRequest;
    const { tokenId, price } = req.body;

    // 0. Validate auth
    if (!userId || !walletAddress) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 1. Validate input
    if (!tokenId || typeof tokenId !== "number") {
      res.status(400).json({
        error: "Token ID is required and must be a number",
      });
      return;
    }

    if (!price || typeof price !== "number" || price <= 0) {
      res.status(400).json({
        error: "Price is required and must be greater than 0",
      });
      return;
    }

    // 2. Check if car exists in database and user owns it
    const car = await prisma.car.findUnique({
      where: { tokenId },
      include: { listing: true },
    });

    if (!car) {
      res.status(404).json({
        error: "Car not found",
      });
      return;
    }

    if (car.ownerId !== userId) {
      res.status(403).json({
        error: "You do not own this car",
      });
      return;
    }

    if (car.isRedeemed) {
      res.status(400).json({
        error: "Car has been redeemed and cannot be listed",
      });
      return;
    }

    // 3. Check if car is already listed
    if (car.listing && car.listing.status === "active") {
      res.status(400).json({
        error: "Car is already listed for sale",
        listingId: car.listing.id,
      });
      return;
    }

    // 4. Verify on-chain ownership
    const ownsOnChain = await verifyCarOwnership(tokenId, walletAddress as string);
    if (!ownsOnChain) {
      res.status(400).json({
        error: "On-chain verification failed: you do not own this car",
      });
      return;
    }

    // 5. Create listing
    const listing = await prisma.listing.create({
      data: {
        carTokenId: tokenId,
        sellerId: userId,
        price: price,
        status: "active",
      },
      include: {
        car: true,
        seller: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    // 6. Return success with approval instructions
    res.status(201).json({
      success: true,
      listing,
      message: "Listing created successfully",
      nextSteps:
        "IMPORTANT: You must approve the backend wallet to transfer your NFT. " +
        "Call car.approve(BACKEND_WALLET_ADDRESS, tokenId) from your frontend.",
    });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({
      error: "Internal server error while creating listing",
    });
  }
});

/**
 * GET /api/marketplace/listings
 * Browse all active listings with pagination and filters
 */
router.get("/marketplace/listings", auth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const series = req.query.series as string;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined;
    const sortBy = (req.query.sortBy as string) || "newest";

    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "active",
    };

    if (series) {
      where.car = {
        series: series,
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Build orderBy clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "price_asc") {
      orderBy = { price: "asc" };
    } else if (sortBy === "price_desc") {
      orderBy = { price: "desc" };
    }

    // Query listings
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          car: true,
          seller: {
            select: {
              id: true,
              walletAddress: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.listing.count({ where }),
    ]);

    // Enrich listings with rarity
    const enrichedListings = listings.map((listing) => {
      let rarity = "common";
      if (listing.car.series?.toLowerCase().includes("hypercar")) {
        rarity = "legendary";
      } else if (listing.car.series?.toLowerCase().includes("supercar")) {
        rarity = "epic";
      } else if (listing.car.series?.toLowerCase().includes("sport")) {
        rarity = "rare";
      }

      return {
        ...listing,
        car: {
          ...listing.car,
          rarity,
        },
      };
    });

    res.json({
      listings: enrichedListings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get listings error:", error);
    res.status(500).json({
      error: "Internal server error while fetching listings",
    });
  }
});

/**
 * POST /api/marketplace/buy/:listingId
 * Purchase a car from the marketplace
 */
router.post("/marketplace/buy/:listingId", auth, async (req: Request, res: Response) => {
  try {
    const { userId: buyerUserId, walletAddress: buyerWallet } = req as AuthRequest;
    const listingId = parseInt(req.params.listingId as string);

    // 0. Validate auth
    if (!buyerUserId || !buyerWallet) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (isNaN(listingId)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }

    // STEP 1: Lock listing and change status to "processing"
    let listing;
    try {
      listing = await prisma.$transaction(async (tx) => {
        const listing = await tx.listing.findUnique({
          where: { id: listingId },
          include: {
            car: true,
            seller: true,
          },
        });

        if (!listing) {
          throw new Error("Listing not found");
        }

        if (listing.status !== "active") {
          throw new Error(`Listing is ${listing.status}, cannot purchase`);
        }

        if (listing.sellerId === buyerUserId) {
          throw new Error("Cannot buy your own listing");
        }

        // Mark as processing to prevent concurrent purchases
        await tx.listing.update({
          where: { id: listingId },
          data: { status: "processing" },
        });

        return listing;
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to lock listing",
      });
      return;
    }

    // STEP 2: Verify buyer has sufficient IDRX balance
    try {
      const balance = await getMockIDRXBalance(buyerWallet as string);
      if (balance < listing.price) {
        // Rollback to active
        await prisma.listing.update({
          where: { id: listingId },
          data: { status: "active" },
        });

        res.status(400).json({
          error: "Insufficient IDRX balance",
          required: listing.price,
          balance: balance,
        });
        return;
      }
    } catch (error) {
      // Rollback to active
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "active" },
      });

      console.error("Failed to check IDRX balance:", error);
      res.status(500).json({
        error: "Failed to verify IDRX balance",
      });
      return;
    }

    // STEP 3: Verify buyer has approved IDRX spending
    const hasAllowance = await verifyIDRXAllowance(buyerWallet as string, listing.price);
    if (!hasAllowance) {
      // Rollback to active
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "active" },
      });

      res.status(400).json({
        error: "Insufficient IDRX allowance. Please approve the backend wallet to spend IDRX.",
        required: listing.price,
      });
      return;
    }

    // STEP 4: Verify seller still owns the car on-chain
    const sellerOwns = await verifyCarOwnership(listing.carTokenId, listing.seller.walletAddress);
    if (!sellerOwns) {
      // Cancel listing - seller no longer owns car
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "cancelled" },
      });

      res.status(400).json({
        error: "Seller no longer owns this car. Listing has been cancelled.",
      });
      return;
    }

    // STEP 5: Verify car is approved for transfer
    const isApproved = await verifyCarApproval(listing.carTokenId);
    if (!isApproved) {
      // Rollback to active
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "active" },
      });

      res.status(400).json({
        error: "Car is not approved for transfer. Seller must approve the backend wallet.",
      });
      return;
    }

    // STEP 6: Execute atomic purchase on blockchain
    let txHash: string;
    try {
      const result = await executePurchase(
        listing.carTokenId,
        buyerWallet as string,
        listing.seller.walletAddress,
        listing.price
      );
      txHash = result.txHash;
    } catch (error) {
      // Rollback to active
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "active" },
      });

      console.error("Blockchain purchase failed:", error);
      res.status(500).json({
        error: "Failed to execute purchase on blockchain",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }

    // STEP 7: Finalize - update listing and car ownership in database
    try {
      await prisma.$transaction([
        prisma.listing.update({
          where: { id: listingId },
          data: {
            status: "sold",
            buyerId: buyerUserId,
            soldAt: new Date(),
            txHash: txHash,
          },
        }),
        prisma.car.update({
          where: { tokenId: listing.carTokenId },
          data: { ownerId: buyerUserId },
        }),
      ]);

      res.json({
        success: true,
        purchase: {
          listingId: listing.id,
          tokenId: listing.carTokenId,
          price: listing.price,
          txHash: txHash,
          seller: listing.seller.walletAddress,
          buyer: buyerWallet as string,
        },
        message: "Purchase successful!",
      });
    } catch (error) {
      console.error("CRITICAL: Purchase succeeded on-chain but database update failed!", error);
      console.error("Transaction hash:", txHash);
      console.error("Listing ID:", listingId);
      console.error("Buyer:", buyerUserId);

      res.status(500).json({
        error: "Purchase completed on blockchain but failed to update database",
        txHash: txHash,
        message: "Contact support with this transaction hash",
      });
    }
  } catch (error) {
    console.error("Buy listing error:", error);
    res.status(500).json({
      error: "Internal server error while purchasing",
    });
  }
});

/**
 * DELETE /api/marketplace/cancel/:listingId
 * Cancel an active listing
 */
router.delete("/marketplace/cancel/:listingId", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const listingId = parseInt(req.params.listingId as string);

    if (isNaN(listingId)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }

    // Use transaction to prevent race condition with purchase
    try {
      const listing = await prisma.$transaction(async (tx) => {
        const listing = await tx.listing.findUnique({
          where: { id: listingId },
        });

        if (!listing) {
          throw new Error("Listing not found");
        }

        if (listing.sellerId !== userId) {
          throw new Error("You are not the seller of this listing");
        }

        if (listing.status !== "active") {
          throw new Error(`Cannot cancel: listing is already ${listing.status}`);
        }

        // Update status to cancelled
        return await tx.listing.update({
          where: { id: listingId },
          data: {
            status: "cancelled",
            updatedAt: new Date(),
          },
        });
      });

      res.json({
        success: true,
        listing,
        message: "Listing cancelled successfully",
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to cancel listing",
      });
    }
  } catch (error) {
    console.error("Cancel listing error:", error);
    res.status(500).json({
      error: "Internal server error while cancelling listing",
    });
  }
});

/**
 * GET /api/marketplace/my-listings
 * Get user's listing history
 */
router.get("/marketplace/my-listings", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const statusFilter = (req.query.status as string) || "all";

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      sellerId: userId,
    };

    if (statusFilter !== "all") {
      where.status = statusFilter;
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        car: true,
        buyer: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by status
    const grouped = {
      active: listings.filter((l) => l.status === "active"),
      sold: listings.filter((l) => l.status === "sold"),
      cancelled: listings.filter((l) => l.status === "cancelled"),
      all: listings,
    };

    res.json({
      listings: statusFilter === "all" ? grouped : listings,
      stats: {
        active: grouped.active.length,
        sold: grouped.sold.length,
        cancelled: grouped.cancelled.length,
        total: listings.length,
      },
    });
  } catch (error) {
    console.error("Get my listings error:", error);
    res.status(500).json({
      error: "Internal server error while fetching your listings",
    });
  }
});

/**
 * GET /api/marketplace/listing/:listingId
 * Get detailed info about a specific listing
 */
router.get("/marketplace/listing/:listingId", auth, async (req: Request, res: Response) => {
  try {
    const listingId = parseInt(req.params.listingId as string);

    if (isNaN(listingId)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        car: true,
        seller: {
          select: {
            id: true,
            walletAddress: true,
            createdAt: true,
          },
        },
        buyer: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!listing) {
      res.status(404).json({
        error: "Listing not found",
      });
      return;
    }

    // Enrich with rarity
    let rarity = "common";
    if (listing.car.series?.toLowerCase().includes("hypercar")) {
      rarity = "legendary";
    } else if (listing.car.series?.toLowerCase().includes("supercar")) {
      rarity = "epic";
    } else if (listing.car.series?.toLowerCase().includes("sport")) {
      rarity = "rare";
    }

    res.json({
      listing: {
        ...listing,
        car: {
          ...listing.car,
          rarity,
        },
      },
    });
  } catch (error) {
    console.error("Get listing detail error:", error);
    res.status(500).json({
      error: "Internal server error while fetching listing",
    });
  }
});

export default router;
