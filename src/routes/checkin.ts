import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { mintFragment } from "../blockchain/client";

const router = Router();

/**
 * POST /check-in
 * Daily check-in endpoint with fragment minting
 */
router.post("/check-in", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, walletAddress } = req;

    // 1. Find or create user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          walletAddress,
        },
      });
    }

    // 2. Check 24-hour cooldown
    const now = new Date();
    const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const timeSinceLastCheckin = now.getTime() - user.lastCheckIn.getTime();

    if (timeSinceLastCheckin < cooldownMs) {
      const remainingMs = cooldownMs - timeSinceLastCheckin;
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

      res.status(429).json({
        error: "Check-in cooldown active",
        remainingHours,
        nextCheckInAt: new Date(user.lastCheckIn.getTime() + cooldownMs).toISOString(),
      });
      return;
    }

    // 3. Randomly select rewards
    const fragmentType = Math.floor(Math.random() * 5); // Fragment type: 0-4
    const coinsReward = Math.floor(Math.random() * 41) + 10; // Coins: 10-50

    // 4. Mint fragment on-chain
    let txHash: string;
    try {
      txHash = await mintFragment(walletAddress, fragmentType, 1);
    } catch (error) {
      console.error("Blockchain mint failed:", error);
      res.status(500).json({
        error: "Failed to mint fragment on blockchain",
      });
      return;
    }

    // 5. Store fragment record, add coins, and update lastCheckIn in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.fragment.create({
        data: {
          userId,
          typeId: fragmentType,
          txHash,
        },
      });

      return await tx.user.update({
        where: { id: userId },
        data: {
          lastCheckIn: now,
          coins: { increment: coinsReward }, // Add coins to user balance
        },
      });
    });

    // 6. Return success response with all rewards
    res.status(200).json({
      success: true,
      rewards: {
        fragment: {
          type: fragmentType,
          txHash,
        },
        coins: {
          earned: coinsReward,
          total: updatedUser.coins,
        },
      },
      message: `Check-in successful! Earned ${coinsReward} coins and 1 fragment.`,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      error: "Internal server error during check-in",
    });
  }
});

export default router;
