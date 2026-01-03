import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { mintCar } from "../blockchain/client";
import { GACHA_BOXES, selectRandomReward, generateTokenId } from "../config/gacha";

const router = Router();

/**
 * POST /gacha/open
 * Open a gacha box and mint a random Car NFT
 */
router.post("/gacha/open", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, walletAddress } = req;
    const { boxType } = req.body;

    // 1. Validate box type
    if (!boxType || !GACHA_BOXES[boxType]) {
      res.status(400).json({
        error: "Invalid box type",
        availableBoxes: Object.keys(GACHA_BOXES),
      });
      return;
    }

    const gachaBox = GACHA_BOXES[boxType];

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // 3. Check if user has enough coins
    if (user.coins < gachaBox.costCoins) {
      res.status(400).json({
        error: "Insufficient coins",
        required: gachaBox.costCoins,
        current: user.coins,
        needed: gachaBox.costCoins - user.coins,
      });
      return;
    }

    // 4. Randomly select a reward
    const reward = selectRandomReward(gachaBox.rewards);
    const tokenId = generateTokenId();

    // 5. Mint Car NFT on-chain
    let txHash: string;
    try {
      txHash = await mintCar(
        walletAddress,
        tokenId,
        reward.modelName,
        reward.series
      );
    } catch (error) {
      console.error("Blockchain mint failed:", error);
      res.status(500).json({
        error: "Failed to mint Car NFT on blockchain",
      });
      return;
    }

    // 6. Store car and deduct coins in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Create car record
      await tx.car.create({
        data: {
          tokenId,
          ownerId: userId,
          modelName: reward.modelName,
          series: reward.series,
          mintTxHash: txHash,
        },
      });

      // Deduct coins
      return await tx.user.update({
        where: { id: userId },
        data: {
          coins: { decrement: gachaBox.costCoins },
        },
      });
    });

    // 7. Return success response
    res.status(200).json({
      success: true,
      boxType,
      reward: {
        tokenId,
        modelName: reward.modelName,
        series: reward.series,
        rarity: reward.rarity,
        txHash,
      },
      coins: {
        spent: gachaBox.costCoins,
        remaining: updatedUser.coins,
      },
      message: `Congratulations! You got a ${reward.rarity} ${reward.modelName}!`,
    });
  } catch (error) {
    console.error("Gacha error:", error);
    res.status(500).json({
      error: "Internal server error during gacha",
    });
  }
});

/**
 * GET /gacha/boxes
 * Get available gacha box types and their costs
 */
router.get("/gacha/boxes", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req;

    // Get user coins
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    const boxes = Object.entries(GACHA_BOXES).map(([key, box]) => ({
      type: key,
      costCoins: box.costCoins,
      canAfford: user ? user.coins >= box.costCoins : false,
      rewards: box.rewards.map((r) => ({
        rarity: r.rarity,
        modelName: r.modelName,
        series: r.series,
        probability: `${r.probability}%`,
      })),
    }));

    res.status(200).json({
      userCoins: user?.coins || 0,
      boxes,
    });
  } catch (error) {
    console.error("Get boxes error:", error);
    res.status(500).json({
      error: "Failed to fetch gacha boxes",
    });
  }
});

export default router;
