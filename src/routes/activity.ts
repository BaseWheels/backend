import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";

const router = Router();

/**
 * GET /api/activity/recent
 * Get recent activity feed (mints and redeems)
 */
router.get("/activity/recent", auth, async (_req: Request, res: Response) => {
  try {
    // Fetch recent minted cars (last 20)
    const recentMints = await prisma.car.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            walletAddress: true,
            username: true,
            email: true,
          }
        }
      }
    });

    // Fetch recent redeemed cars (last 20)
    const recentRedeems = await prisma.car.findMany({
      where: { isRedeemed: true },
      orderBy: { redeemedAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            walletAddress: true,
            username: true,
            email: true,
          }
        }
      }
    });

    // Transform to activity format
    const mintActivities = recentMints.map(car => {
      // Use username/email if available, otherwise wallet address
      const displayName = car.user.username ||
                         car.user.email ||
                         `${car.user.walletAddress.slice(0, 6)}...${car.user.walletAddress.slice(-4)}`;

      return {
        id: `mint-${car.tokenId}`,
        type: 'mint',
        user: displayName,
        action: `minted ${car.series || 'a'} NFT`,
        carModel: car.modelName,
        series: car.series,
        timestamp: car.createdAt,
        avatar: getSeriesEmoji(car.series),
      };
    });

    const redeemActivities = recentRedeems
      .filter(car => car.redeemedAt) // Only include cars with redeemedAt
      .map(car => {
        // Use username/email if available, otherwise wallet address
        const displayName = car.user.username ||
                           car.user.email ||
                           `${car.user.walletAddress.slice(0, 6)}...${car.user.walletAddress.slice(-4)}`;

        return {
          id: `redeem-${car.tokenId}`,
          type: 'redeem',
          user: displayName,
          action: `claimed physical ${car.series || ''} car`,
          carModel: car.modelName,
          series: car.series,
          timestamp: car.redeemedAt!,
          avatar: '🔥',
        };
      });

    // Combine and sort by timestamp
    const allActivities = [...mintActivities, ...redeemActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15); // Return top 15 activities

    // Format timestamps to relative time
    const formattedActivities = allActivities.map(activity => ({
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
 * Helper: Get emoji based on series
 */
function getSeriesEmoji(series: string | null): string {
  if (!series) return '🚗';

  const seriesLower = series.toLowerCase();
  if (seriesLower.includes('hypercar')) return '🏎️';
  if (seriesLower.includes('supercar')) return '🚀';
  if (seriesLower.includes('sport')) return '🏁';
  if (seriesLower.includes('economy')) return '🚙';
  return '🚗';
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

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default router;
