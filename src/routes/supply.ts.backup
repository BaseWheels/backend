import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { auth, AuthRequest } from "../middleware/auth";
import { SERIES_MAX_SUPPLY, SERIES_REFUND_BONUS, getSupplyStatus } from "../config/supply";
import { getMockIDRXBalance } from "../blockchain/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/supply/status/:series
 * Get supply status for a specific series
 */
router.get("/supply/status/:series", auth, async (req: Request, res: Response) => {
  try {
    const series = req.params.series as string;

    if (!(series in SERIES_MAX_SUPPLY)) {
      res.status(400).json({ error: "Invalid series" });
      return;
    }

    // Count minted cars for this series
    const currentMinted = await prisma.car.count({
      where: { series: series },
    });

    // Get waiting list count
    const waitingListCount = await prisma.waitingList.count({
      where: { series: series, status: "waiting" },
    });

    const status = getSupplyStatus(series, currentMinted);

    res.json({
      ...status,
      waitingListCount,
    });
  } catch (error) {
    console.error("Get supply status error:", error);
    res.status(500).json({ error: "Failed to get supply status" });
  }
});

/**
 * GET /api/supply/status
 * Get supply status for all series
 */
router.get("/supply/status", auth, async (_: Request, res: Response) => {
  try {
    const allSeries = Object.keys(SERIES_MAX_SUPPLY);
    const statuses = await Promise.all(
      allSeries.map(async (series) => {
        const currentMinted = await prisma.car.count({
          where: { series },
        });
        const waitingListCount = await prisma.waitingList.count({
          where: { series, status: "waiting" },
        });
        return {
          ...getSupplyStatus(series, currentMinted),
          waitingListCount,
        };
      })
    );

    res.json({ series: statuses });
  } catch (error) {
    console.error("Get all supply status error:", error);
    res.status(500).json({ error: "Failed to get supply status" });
  }
});

/**
 * POST /api/supply/claim-refund
 * User chooses to refund fragments for MockIDRX bonus
 */
router.post("/supply/claim-refund", auth, async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req as AuthRequest;
    const { fragmentIds, series } = req.body;

    if (!userId || !walletAddress) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!fragmentIds || !Array.isArray(fragmentIds) || fragmentIds.length === 0) {
      res.status(400).json({ error: "Fragment IDs required" });
      return;
    }

    if (!(series in SERIES_REFUND_BONUS)) {
      res.status(400).json({ error: "Invalid series" });
      return;
    }

    // Verify user owns these fragments
    const fragments = await prisma.fragment.findMany({
      where: {
        id: { in: fragmentIds },
        userId,
        isUsed: false,
      },
    });

    if (fragments.length !== fragmentIds.length) {
      res.status(400).json({ error: "Invalid or already used fragments" });
      return;
    }

    // Verify all fragments match the series
    const allMatchSeries = fragments.every((f) => f.series === series);
    if (!allMatchSeries) {
      res.status(400).json({ error: "Not all fragments match the series" });
      return;
    }

    const refundBonus = SERIES_REFUND_BONUS[series] || 0;

    if (refundBonus === 0) {
      res.status(400).json({ error: "Refund bonus not configured for this series" });
      return;
    }

    // Execute refund in transaction
    await prisma.$transaction(async (tx) => {
      // Mark fragments as not used (return them)
      await tx.fragment.updateMany({
        where: { id: { in: fragmentIds } },
        data: { isUsed: false },
      });

      // Credit MockIDRX bonus
      await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: refundBonus } },
      });
    });

    // Get updated balance
    const onChainBalance = await getMockIDRXBalance(walletAddress as string);

    res.json({
      success: true,
      message: `Fragments returned + ${refundBonus.toLocaleString()} IDRX bonus credited!`,
      refundBonus,
      fragmentsReturned: fragmentIds.length,
      newBalance: onChainBalance,
    });
  } catch (error) {
    console.error("Claim refund error:", error);
    res.status(500).json({ error: "Failed to process refund" });
  }
});

/**
 * POST /api/supply/join-waitlist
 * User chooses to join waiting list for restock
 */
router.post("/supply/join-waitlist", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { fragmentIds, series } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!fragmentIds || !Array.isArray(fragmentIds) || fragmentIds.length === 0) {
      res.status(400).json({ error: "Fragment IDs required" });
      return;
    }

    if (!(series in SERIES_MAX_SUPPLY)) {
      res.status(400).json({ error: "Invalid series" });
      return;
    }

    // Verify user owns these fragments
    const fragments = await prisma.fragment.findMany({
      where: {
        id: { in: fragmentIds },
        userId,
        isUsed: false,
      },
    });

    if (fragments.length !== fragmentIds.length) {
      res.status(400).json({ error: "Invalid or already used fragments" });
      return;
    }

    // Verify all fragments match the series
    const allMatchSeries = fragments.every((f) => f.series === series);
    if (!allMatchSeries) {
      res.status(400).json({ error: "Not all fragments match the series" });
      return;
    }

    // Check if user is already in waiting list for this series
    const existingEntry = await prisma.waitingList.findFirst({
      where: {
        userId,
        series,
        status: "waiting",
      },
    });

    if (existingEntry) {
      res.status(400).json({
        error: "You are already in the waiting list for this series",
        position: existingEntry.position,
      });
      return;
    }

    // Get next position in queue
    const maxPosition = await prisma.waitingList.findFirst({
      where: { series, status: "waiting" },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = (maxPosition?.position || 0) + 1;

    // Add to waiting list
    const waitingEntry = await prisma.waitingList.create({
      data: {
        userId,
        series,
        fragmentIds: JSON.stringify(fragmentIds),
        position: nextPosition,
        status: "waiting",
      },
    });

    // Mark fragments as reserved (used)
    await prisma.fragment.updateMany({
      where: { id: { in: fragmentIds } },
      data: { isUsed: true },
    });

    res.json({
      success: true,
      message: `Added to waiting list for ${series} series`,
      position: waitingEntry.position,
      series,
      estimatedWaitTime: "Restocks typically happen within 30-60 days",
    });
  } catch (error) {
    console.error("Join waitlist error:", error);
    res.status(500).json({ error: "Failed to join waiting list" });
  }
});

/**
 * GET /api/supply/my-waitlist
 * Get user's waiting list entries
 */
router.get("/supply/my-waitlist", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const entries = await prisma.waitingList.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ entries });
  } catch (error) {
    console.error("Get waitlist error:", error);
    res.status(500).json({ error: "Failed to get waiting list" });
  }
});

export default router;
