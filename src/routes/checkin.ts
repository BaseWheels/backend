import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { mintFragment, mintMockIDRX, getMockIDRXBalance } from "../blockchain/client";

const router = Router();

/**
 * POST /check-in
 * Daily check-in endpoint with fragment minting
 */
router.post("/check-in", auth, async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req as AuthRequest;

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
    const mockIDRXReward = Math.floor(Math.random() * 41) + 10; // MockIDRX: 10-50

    // 4. Mint fragment on-chain
    let fragmentTxHash: string;
    try {
      fragmentTxHash = await mintFragment(walletAddress, fragmentType, 1);
    } catch (error) {
      console.error("Blockchain fragment mint failed:", error);
      res.status(500).json({
        error: "Failed to mint fragment on blockchain",
      });
      return;
    }

    // 5. Mint MockIDRX tokens on-chain
    let mockIDRXTxHash: string;
    try {
      mockIDRXTxHash = await mintMockIDRX(walletAddress, mockIDRXReward);
    } catch (error) {
      console.error("Blockchain MockIDRX mint failed:", error);
      res.status(500).json({
        error: "Failed to mint MockIDRX tokens on blockchain",
        fragmentTxHash, // Fragment was minted successfully
      });
      return;
    }

    // 6. Store fragment record and update lastCheckIn in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.fragment.create({
        data: {
          userId,
          typeId: fragmentType,
          txHash: fragmentTxHash,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          lastCheckIn: now,
        },
      });
    });

    // 7. Get updated MockIDRX balance from blockchain
    const mockIDRXBalance = await getMockIDRXBalance(walletAddress);

    // 8. Return success response with all rewards
    res.status(200).json({
      success: true,
      rewards: {
        fragment: {
          type: fragmentType,
          txHash: fragmentTxHash,
        },
        mockIDRX: {
          earned: mockIDRXReward,
          total: mockIDRXBalance,
          txHash: mockIDRXTxHash,
        },
      },
      message: `Check-in successful! Earned ${mockIDRXReward} IDRX and 1 fragment.`,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      error: "Internal server error during check-in",
    });
  }
});

export default router;
