import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { checkAllParts, burnForAssembly, mintCar } from "../blockchain/client";
import { selectRandomAssembledCar, generateAssemblyTokenId } from "../config/assembly";

const router = Router();

/**
 * POST /assembly/forge
 * Assemble 5 fragments into a complete Car NFT
 */
router.post("/assembly/forge", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, walletAddress } = req;

    // 1. Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // 2. Check on-chain if user has all 5 fragment types (CRITICAL SECURITY)
    console.log(`Checking fragments for user ${walletAddress}...`);
    let hasAllParts: boolean;
    try {
      hasAllParts = await checkAllParts(walletAddress);
    } catch (error) {
      console.error("Failed to check fragments:", error);
      res.status(500).json({
        error: "Failed to verify fragments on blockchain",
      });
      return;
    }

    if (!hasAllParts) {
      res.status(400).json({
        error: "Insufficient fragments",
        message: "You need at least 1 of each fragment type (0-4) to assemble a car",
      });
      return;
    }

    // 3. Burn fragments on-chain
    console.log(`Burning fragments for user ${walletAddress}...`);
    let burnTxHash: string;
    try {
      burnTxHash = await burnForAssembly(walletAddress);
    } catch (error) {
      console.error("Failed to burn fragments:", error);
      res.status(500).json({
        error: "Failed to burn fragments on blockchain",
      });
      return;
    }

    // 4. Select random assembled car
    const assembledCar = selectRandomAssembledCar();
    const tokenId = generateAssemblyTokenId();

    // 5. Mint assembled Car NFT
    console.log(`Minting car ${assembledCar.modelName} for user ${walletAddress}...`);
    let mintTxHash: string;
    try {
      mintTxHash = await mintCar(
        walletAddress,
        tokenId,
        assembledCar.modelName,
        assembledCar.series
      );
    } catch (error) {
      console.error("Failed to mint car:", error);
      // CRITICAL: Fragments already burned! Log this for manual recovery
      console.error(`CRITICAL: User ${walletAddress} burned fragments but mint failed!`);
      console.error(`Burn TX: ${burnTxHash}, TokenId: ${tokenId}`);

      res.status(500).json({
        error: "Failed to mint assembled car on blockchain",
        burnTxHash,
        message: "Fragments were burned but car minting failed. Contact support.",
      });
      return;
    }

    // 6. Store assembled car in database
    await prisma.car.create({
      data: {
        tokenId,
        ownerId: userId,
        modelName: assembledCar.modelName,
        series: assembledCar.series,
        mintTxHash,
        isRedeemed: false,
      },
    });

    // 7. Return success response
    res.status(200).json({
      success: true,
      car: {
        tokenId,
        modelName: assembledCar.modelName,
        series: assembledCar.series,
        rarity: assembledCar.rarity,
        burnTxHash,
        mintTxHash,
      },
      message: `Successfully assembled a ${assembledCar.rarity} ${assembledCar.modelName}!`,
    });
  } catch (error) {
    console.error("Assembly error:", error);
    res.status(500).json({
      error: "Internal server error during assembly",
    });
  }
});

/**
 * GET /assembly/can-forge
 * Check if user can forge (has all fragments)
 */
router.get("/assembly/can-forge", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req;

    // Check on-chain
    const hasAllParts = await checkAllParts(walletAddress);

    res.status(200).json({
      canForge: hasAllParts,
      message: hasAllParts
        ? "You have all fragments needed for assembly!"
        : "You need 1 of each fragment type (0-4) to assemble",
    });
  } catch (error) {
    console.error("Can forge check error:", error);
    res.status(500).json({
      error: "Failed to check assembly eligibility",
    });
  }
});

export default router;
