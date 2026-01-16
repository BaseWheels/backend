import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { mintCar, mintFragment, getMockIDRXBalance, verifyBurnTransaction } from "../blockchain/client";
import { GACHA_BOXES, selectRandomReward, FRAGMENT_NAMES, CarReward, FragmentReward } from "../config/gacha";

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

    // 6. Mint reward based on type (Car NFT or Fragment)
    let txHash: string;
    let rewardResponse: object;

    if (reward.rewardType === "car") {
      // Mint Car NFT
      const carReward = reward as CarReward;
      let tokenId: number;
      try {
        const result = await mintCar(walletAddress);
        tokenId = result.tokenId;
        txHash = result.txHash;
      } catch (error) {
        console.error("Blockchain mint failed:", error);
        console.error(`CRITICAL: User ${walletAddress} burned ${gachaBox.costCoins} IDRX but mint failed!`);
        console.error(`Burn TX: ${burnTxHash}`);
        res.status(500).json({
          error: "Failed to mint Car NFT on blockchain",
          burnTxHash,
          message: "MockIDRX was burned but car minting failed. Contact support.",
        });
        return;
      }

      // Store car record in database
      await prisma.car.create({
        data: {
          tokenId,
          ownerId: userId,
          modelName: carReward.modelName,
          series: carReward.series,
          mintTxHash: txHash,
        },
      });

      rewardResponse = {
        rewardType: "car",
        tokenId,
        modelName: carReward.modelName,
        series: carReward.series,
        rarity: carReward.rarity,
        txHash,
      };
    } else {
      // Mint Fragment
      const fragmentReward = reward as FragmentReward;
      try {
        txHash = await mintFragment(walletAddress, fragmentReward.fragmentType, fragmentReward.amount);
      } catch (error) {
        console.error("Blockchain mint failed:", error);
        console.error(`CRITICAL: User ${walletAddress} burned ${gachaBox.costCoins} IDRX but fragment mint failed!`);
        console.error(`Burn TX: ${burnTxHash}`);
        res.status(500).json({
          error: "Failed to mint Fragment on blockchain",
          burnTxHash,
          message: "MockIDRX was burned but fragment minting failed. Contact support.",
        });
        return;
      }

      // Store fragment records in database (one record per fragment amount)
      const fragmentRecords = [];
      for (let i = 0; i < fragmentReward.amount; i++) {
        fragmentRecords.push({
          userId,
          typeId: fragmentReward.fragmentType,
          brand: fragmentReward.brand,
          series: fragmentReward.series,
          rarity: fragmentReward.rarity,
          txHash,
        });
      }
      await prisma.fragment.createMany({ data: fragmentRecords });

      const fragmentName = FRAGMENT_NAMES[fragmentReward.fragmentType];
      rewardResponse = {
        rewardType: "fragment",
        fragmentType: fragmentReward.fragmentType,
        fragmentName,
        brand: fragmentReward.brand,
        series: fragmentReward.series,
        amount: fragmentReward.amount,
        rarity: fragmentReward.rarity,
        txHash,
      };
    }

    // 7. Get updated MockIDRX balance
    const updatedBalance = await getMockIDRXBalance(walletAddress);

    // 8. Build success message
    const message = reward.rewardType === "car"
      ? `Congratulations! You got a ${reward.rarity} ${(reward as CarReward).modelName}!`
      : `Congratulations! You got ${(reward as FragmentReward).amount}x ${reward.rarity} ${(reward as FragmentReward).brand} ${FRAGMENT_NAMES[(reward as FragmentReward).fragmentType]} Fragment!`;

    // 9. Return success response
    res.status(200).json({
      success: true,
      boxType,
      reward: rewardResponse,
      mockIDRX: {
        spent: gachaBox.costCoins,
        remaining: updatedBalance,
        burnTxHash,
      },
      message,
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
      rewards: box.rewards.map((r) => {
        if (r.rewardType === "car") {
          const carReward = r as CarReward;
          return {
            rewardType: "car",
            rarity: carReward.rarity,
            modelName: carReward.modelName,
            series: carReward.series,
            probability: `${carReward.probability}%`,
          };
        } else {
          const fragmentReward = r as FragmentReward;
          return {
            rewardType: "fragment",
            rarity: fragmentReward.rarity,
            fragmentType: fragmentReward.fragmentType,
            fragmentName: FRAGMENT_NAMES[fragmentReward.fragmentType],
            brand: fragmentReward.brand,
            series: fragmentReward.series,
            amount: fragmentReward.amount,
            probability: `${fragmentReward.probability}%`,
          };
        }
      }),
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
