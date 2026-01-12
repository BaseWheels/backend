import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { mintCar, getMockIDRXBalance, verifyBurnTransaction } from "../blockchain/client";
import { GACHA_BOXES, selectRandomReward } from "../config/gacha";

const router = Router();

/**
 * POST /gacha/open
 * Open a gacha box and mint a random Car NFT
 */
router.post("/gacha/open", auth, async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req as AuthRequest;
    const { boxType, burnTxHash } = req.body;

    // 1. Validate box type
    if (!boxType || !GACHA_BOXES[boxType]) {
      res.status(400).json({
        error: "Invalid box type",
        availableBoxes: Object.keys(GACHA_BOXES),
      });
      return;
    }

    // 2. Validate burn transaction hash
    if (!burnTxHash || typeof burnTxHash !== "string") {
      res.status(400).json({
        error: "Burn transaction hash is required",
      });
      return;
    }

    const gachaBox = GACHA_BOXES[boxType];

    // 3. Verify burn transaction on-chain
    try {
      const isValid = await verifyBurnTransaction(
        burnTxHash,
        walletAddress,
        gachaBox.costCoins
      );

      if (!isValid) {
        res.status(400).json({
          error: "Invalid burn transaction",
        });
        return;
      }
    } catch (error) {
      console.error("Failed to verify burn transaction:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to verify burn transaction",
      });
      return;
    }

    // 5. Randomly select a reward
    const reward = selectRandomReward(gachaBox.rewards);

    // 6. Mint Car NFT on-chain (contract auto-generates tokenId)
    let tokenId: number;
    let txHash: string;
    try {
      const result = await mintCar(walletAddress);
      tokenId = result.tokenId;
      txHash = result.txHash;
    } catch (error) {
      console.error("Blockchain mint failed:", error);
      // CRITICAL: MockIDRX already burned! Log this for manual recovery
      console.error(`CRITICAL: User ${walletAddress} burned ${gachaBox.costCoins} IDRX but mint failed!`);
      console.error(`Burn TX: ${burnTxHash}`);
      res.status(500).json({
        error: "Failed to mint Car NFT on blockchain",
        burnTxHash,
        message: "MockIDRX was burned but car minting failed. Contact support.",
      });
      return;
    }

    // 7. Store car record in database
    await prisma.car.create({
      data: {
        tokenId,
        ownerId: userId,
        modelName: reward.modelName,
        series: reward.series,
        mintTxHash: txHash,
      },
    });

    // 8. Get updated MockIDRX balance
    const updatedBalance = await getMockIDRXBalance(walletAddress);

    // 9. Return success response
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
      mockIDRX: {
        spent: gachaBox.costCoins,
        remaining: updatedBalance,
        burnTxHash,
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
router.get("/gacha/boxes", auth, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req as AuthRequest;

    // Get user MockIDRX balance from blockchain
    let mockIDRXBalance: number;
    try {
      mockIDRXBalance = await getMockIDRXBalance(walletAddress);
    } catch (error) {
      console.error("Failed to get MockIDRX balance:", error);
      res.status(500).json({
        error: "Failed to get MockIDRX balance from blockchain",
      });
      return;
    }

    const boxes = Object.entries(GACHA_BOXES).map(([key, box]) => ({
      type: key,
      costCoins: box.costCoins,
      canAfford: mockIDRXBalance >= box.costCoins,
      rewards: box.rewards.map((r) => ({
        rarity: r.rarity,
        modelName: r.modelName,
        series: r.series,
        probability: `${r.probability}%`,
      })),
    }));

    res.status(200).json({
      userMockIDRX: mockIDRXBalance,
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
