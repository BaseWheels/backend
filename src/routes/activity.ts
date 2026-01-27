import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/activity/recent
 * Get recent activity feed (mints and redeems)
 */
router.get("/activity/recent", auth, async (_req: Request, res: Response) => {
  try {
    // Fetch recent minted cars (last 20)
    const recentMints = await prisma.car.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            walletAddress: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Fetch recent redeemed cars (last 20)
    const recentRedeems = await prisma.car.findMany({
      where: { isRedeemed: true },
      orderBy: { redeemedAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            walletAddress: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Fetch recent admin buybacks (last 20) with original seller info
    const recentBuybacks = await prisma.car.findMany({
      where: {
        soldToAdminAt: { not: null },
        soldByUserId: { not: null }, // Only show buybacks with tracked seller
      },
      orderBy: { soldToAdminAt: "desc" },
      take: 20,
    });

    // For each buyback, fetch the original seller info separately
    const buybacksWithSeller = await Promise.all(
      recentBuybacks.map(async (car) => {
        if (!car.soldByUserId) return null;

        const seller = await prisma.user.findUnique({
          where: { id: car.soldByUserId },
          select: {
            walletAddress: true,
            username: true,
            email: true,
          },
        });

        return { car, seller };
      })
    );

    // Transform to activity format
    const mintActivities = recentMints.map((car) => {
      // Use username/email if available, otherwise wallet address
      const displayName =
        car.user.username ||
        car.user.email ||
        `${car.user.walletAddress.slice(0, 6)}...${car.user.walletAddress.slice(-4)}`;

      return {
        id: `mint-${car.tokenId}`,
        type: "mint",
        user: displayName,
        action: `minted ${car.series || "a"} NFT`,
        carModel: car.modelName,
        series: car.series,
        timestamp: car.createdAt,
        avatar: getSeriesEmoji(car.series),
      };
    });

    const redeemActivities = recentRedeems
      .filter((car) => car.redeemedAt) // Only include cars with redeemedAt
      .map((car) => {
        // Use username/email if available, otherwise wallet address
        const displayName =
          car.user.username ||
          car.user.email ||
          `${car.user.walletAddress.slice(0, 6)}...${car.user.walletAddress.slice(-4)}`;

        return {
          id: `redeem-${car.tokenId}`,
          type: "redeem",
          user: displayName,
          action: `claimed physical ${car.series || ""} car`,
          carModel: car.modelName,
          series: car.series,
          timestamp: car.redeemedAt!,
          avatar: "🔥",
        };
      });

    const buybackActivities = buybacksWithSeller
      .filter((item) => item !== null && item.seller && item.car.soldToAdminAt)
      .map((item) => {
        const { car, seller } = item!;

        // Use username/email if available, otherwise wallet address
        const displayName =
          seller!.username ||
          seller!.email ||
          `${seller!.walletAddress.slice(0, 6)}...${seller!.walletAddress.slice(-4)}`;

        return {
          id: `buyback-${car.tokenId}`,
          type: "buyback",
          user: displayName,
          action: `sold ${car.series || "a"} car to admin`,
          carModel: car.modelName,
          series: car.series,
          timestamp: car.soldToAdminAt!,
          avatar: "💰",
          verified: true, // ✓ Verified badge for official admin buyback
        };
      });

    // Combine and sort by timestamp
    const allActivities = [...mintActivities, ...redeemActivities, ...buybackActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15); // Return top 15 activities

    // Format timestamps to relative time
    const formattedActivities = allActivities.map((activity) => ({
      ...activity,
      time: getRelativeTime(new Date(activity.timestamp)),
    }));

    res.json({
      activities: formattedActivities,
      total: allActivities.length,
    });
  } catch (error) {
    console.error("Activity feed error:", error);
    res.status(500).json({
      error: "Failed to fetch activity feed",
    });
  }
});

/**
 * GET /api/activity/history
 * Get user-specific transaction history (mints, redeems, marketplace)
 */
router.get("/activity/history", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;

    // Fetch user's minted cars (gacha wins)
    // Include cars currently owned AND cars sold to admin (so mint history doesn't disappear after selling)
    const userMints = await prisma.car.findMany({
      where: {
        OR: [{ ownerId: userId }, { soldByUserId: userId, soldToAdminAt: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Fetch user's redeemed cars
    const userRedeems = await prisma.car.findMany({
      where: {
        ownerId: userId,
        isRedeemed: true,
      },
      orderBy: { redeemedAt: "desc" },
      take: 50,
    });

    // Fetch marketplace listings created by user (sold by user)
    const userListings = await prisma.listing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        car: true,
      },
    });

    // Fetch marketplace purchases by user (bought by user)
    const userPurchases = await prisma.listing.findMany({
      where: {
        buyerId: userId,
        status: "sold",
      },
      orderBy: { soldAt: "desc" },
      take: 50,
      include: {
        car: true,
      },
    });

    // Transform to activity format
    const activities: any[] = [];

    // Mint activities (Gacha wins)
    userMints.forEach((car) => {
      activities.push({
        id: `mint-${car.tokenId}`,
        type: "gacha",
        action: "Won from Gacha",
        carModel: car.modelName,
        series: car.series,
        rarity: determineRarity(car.series),
        tokenId: car.tokenId,
        txHash: car.mintTxHash,
        timestamp: car.createdAt,
        icon: "🎰",
      });
    });

    // Redeem activities
    userRedeems.forEach((car) => {
      if (car.redeemedAt) {
        activities.push({
          id: `redeem-${car.tokenId}`,
          type: "redeem",
          action: "Claimed Physical Car",
          carModel: car.modelName,
          series: car.series,
          rarity: determineRarity(car.series),
          tokenId: car.tokenId,
          timestamp: car.redeemedAt,
          icon: "📦",
        });
      }
    });

    // Marketplace listing activities (selling)
    userListings.forEach((listing: any) => {
      const isSold = listing.status === "sold";
      activities.push({
        id: `list-${listing.id}`,
        type: isSold ? "sold" : "listed",
        action: isSold ? "Sold on Marketplace" : "Listed on Marketplace",
        carModel: listing.car.modelName,
        series: listing.car.series,
        rarity: determineRarity(listing.car.series),
        tokenId: listing.car.tokenId,
        price: listing.price,
        timestamp: isSold && listing.soldAt ? listing.soldAt : listing.createdAt,
        icon: isSold ? "💰" : "🏷️",
      });
    });

    // Marketplace purchase activities (buying)
    userPurchases.forEach((listing: any) => {
      activities.push({
        id: `buy-${listing.id}`,
        type: "purchased",
        action: "Purchased from Marketplace",
        carModel: listing.car.modelName,
        series: listing.car.series,
        rarity: determineRarity(listing.car.series),
        tokenId: listing.car.tokenId,
        price: listing.price,
        timestamp: listing.soldAt || listing.updatedAt,
        icon: "🛒",
      });
    });

    // Fetch user's admin buyback transactions
    const userBuybacks = await prisma.car.findMany({
      where: {
        soldToAdminAt: { not: null },
        soldByUserId: userId, // Only show buybacks where this user was the seller
      },
      orderBy: { soldToAdminAt: "desc" },
      take: 50,
    });

    // Admin buyback activities
    userBuybacks.forEach((car) => {
      if (car.soldToAdminAt) {
        activities.push({
          id: `buyback-${car.tokenId}`,
          type: "buyback",
          action: "Sold to Admin",
          carModel: car.modelName,
          series: car.series,
          rarity: determineRarity(car.series),
          tokenId: car.tokenId,
          timestamp: car.soldToAdminAt,
          icon: "💰",
        });
      }
    });

    // Fetch user's assembled cars (fragments that were used for assembly)
    const userAssembledCars = await prisma.fragment.findMany({
      where: {
        userId,
        isUsed: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Group assembled fragments by brand and approximate assembly time
    const assembledByBrandTime: Record<string, any> = {};
    userAssembledCars.forEach((fragment) => {
      const timeKey = Math.floor(fragment.createdAt.getTime() / 60000); // Round to minute
      const key = `${fragment.brand}-${timeKey}`;

      if (!assembledByBrandTime[key]) {
        assembledByBrandTime[key] = {
          brand: fragment.brand,
          series: fragment.series,
          timestamp: fragment.createdAt,
          count: 0,
        };
      }
      assembledByBrandTime[key].count++;
    });

    // Find assembly events (where 5 fragments were used at similar time)
    Object.values(assembledByBrandTime).forEach((assembly: any) => {
      if (assembly.count >= 5) {
        activities.push({
          id: `assembly-${assembly.brand}-${assembly.timestamp.getTime()}`,
          type: "assembly",
          action: "Assembled Car",
          carModel: assembly.brand,
          series: assembly.series,
          rarity: determineRarity(assembly.series),
          timestamp: assembly.timestamp,
          icon: "🔧",
        });
      }
    });

    // Sort all activities by timestamp
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Limit to 50 most recent

    // Format timestamps
    const formattedActivities = sortedActivities.map((activity) => ({
      ...activity,
      time: getRelativeTime(new Date(activity.timestamp)),
      date: new Date(activity.timestamp).toLocaleDateString(),
    }));

    res.json({
      activities: formattedActivities,
      total: formattedActivities.length,
      summary: {
        totalMints: userMints.length,
        totalRedeems: userRedeems.length,
        totalListings: userListings.length,
        totalSales: userListings.filter((l: any) => l.status === "sold").length,
        totalPurchases: userPurchases.length,
        totalBuybacks: userBuybacks.length,
        totalAssemblies: Object.values(assembledByBrandTime).filter((a: any) => a.count >= 5)
          .length,
      },
    });
  } catch (error) {
    console.error("User activity history error:", error);
    res.status(500).json({
      error: "Failed to fetch activity history",
    });
  }
});

/**
 * Helper: Determine rarity from series
 */
function determineRarity(series: string | null): string {
  if (!series) return "common";

  if (series.includes("Hypercar") || series.includes("Limited Edition")) {
    return "legendary";
  } else if (series.includes("German Engineering") || series.includes("Supercar")) {
    return "epic";
  } else if (series.includes("JDM Legend") || series.includes("Sport")) {
    return "rare";
  } else if (series.includes("Uncommon")) {
    return "uncommon";
  }
  return "common";
}

/**
 * Helper: Get emoji based on series
 */
function getSeriesEmoji(series: string | null): string {
  if (!series) return "🚗";

  const seriesLower = series.toLowerCase();
  if (seriesLower.includes("hypercar")) return "🏎️";
  if (seriesLower.includes("supercar")) return "🚀";
  if (seriesLower.includes("sport")) return "🏁";
  if (seriesLower.includes("economy")) return "🚙";
  return "🚗";
}

/**
 * Helper: Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default router;
