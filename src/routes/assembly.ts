import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { checkAllParts, burnForAssembly, mintCar } from "../blockchain/client";
import { SERIES_MAX_SUPPLY, SERIES_REFUND_BONUS, getSupplyStatus } from "../config/supply";

const router = Router();

/**
 * POST /assembly/forge
 * Assemble 5 fragments of a specific brand into a Car NFT
 */
router.post("/assembly/forge", auth, async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req as AuthRequest;
    const { brand } = req.body;

    // 1. Validate brand parameter
    if (!brand || typeof brand !== "string") {
      res.status(400).json({ error: "Brand is required" });
      return;
    }

    // 2. Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // 3. Check off-chain if user has all 5 fragment types for this brand
    const userFragments = await prisma.fragment.findMany({
      where: { userId, brand, isUsed: false },
    });

    // Group by typeId and check all 5 types exist
    const fragmentsByType: Record<number, { id: number }[]> = {};
    userFragments.forEach(f => {
      if (!fragmentsByType[f.typeId]) fragmentsByType[f.typeId] = [];
      fragmentsByType[f.typeId]!.push({ id: f.id });
    });

    const hasAllTypes = [0, 1, 2, 3, 4].every(typeId => (fragmentsByType[typeId]?.length ?? 0) >= 1);

    if (!hasAllTypes) {
      const missingTypes = [0, 1, 2, 3, 4].filter(t => !fragmentsByType[t]?.length);
      const typeNames = ["Chassis", "Wheels", "Engine", "Body", "Interior"];
      res.status(400).json({
        error: "Insufficient fragments",
        message: `Missing fragments for ${brand}: ${missingTypes.map(t => typeNames[t]).join(", ")}`,
        missingTypes,
      });
      return;
    }

    // 4. Also verify on-chain (CRITICAL SECURITY)
    console.log(`Checking on-chain fragments for user ${walletAddress}...`);
    let hasAllPartsOnChain: boolean;
    try {
      hasAllPartsOnChain = await checkAllParts(walletAddress);
    } catch (error) {
      console.error("Failed to check on-chain fragments:", error);
      res.status(500).json({
        error: "Failed to verify fragments on blockchain",
      });
      return;
    }

    if (!hasAllPartsOnChain) {
      res.status(400).json({
        error: "On-chain fragment verification failed",
        message: "Your on-chain fragment balance doesn't match. Please contact support.",
      });
      return;
    }

    // 5. Get brand details from first fragment
    const firstFragment = userFragments[0]!;
    const carSeries = firstFragment.series;
    const carRarity = firstFragment.rarity;

    // 5.5. Prepare fragment IDs for assembly
    const fragmentIdsToUse = [0, 1, 2, 3, 4].map(typeId => fragmentsByType[typeId]![0]!.id);

    // 5.6. Check supply cap (RWA management)
    const currentMinted = await prisma.car.count({
      where: {
        series: carSeries,
        soldToAdminAt: null, // Exclude cars sold to admin
      },
    });

    const supplyStatus = getSupplyStatus(carSeries, currentMinted);

    if (supplyStatus.soldOut) {
      // Series is sold out! Offer user 2 options
      const waitingListPosition = await prisma.waitingList.count({
        where: { series: carSeries, status: "waiting" },
      });

      res.status(409).json({
        error: "Series sold out",
        soldOut: true,
        series: carSeries,
        fragmentIds: fragmentIdsToUse,
        supplyStatus,
        options: [
          {
            type: "refund",
            title: "Get MockIDRX Bonus",
            description: `Exchange your fragments for ${SERIES_REFUND_BONUS[carSeries]?.toLocaleString()} IDRX bonus`,
            bonus: SERIES_REFUND_BONUS[carSeries] || 0,
          },
          {
            type: "waitlist",
            title: "Join Waiting List",
            description: "Keep your fragments and wait for restock notification",
            currentPosition: waitingListPosition + 1,
            estimatedWait: "30-60 days",
          },
        ],
        message: `${carSeries} series is sold out (${currentMinted}/${supplyStatus.maxSupply}). Choose an option to proceed.`,
      });
      return;
    }

    // 6. Burn fragments on-chain
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

    // 7. Mark fragments as used in database (one of each type)
    await prisma.fragment.updateMany({
      where: { id: { in: fragmentIdsToUse } },
      data: { isUsed: true },
    });

    // 8. Mint Car NFT (contract auto-generates tokenId)
    console.log(`Minting car ${brand} for user ${walletAddress}...`);
    let tokenId: number;
    let mintTxHash: string;
    try {
      const result = await mintCar(walletAddress);
      tokenId = result.tokenId;
      mintTxHash = result.txHash;
    } catch (error) {
      console.error("Failed to mint car:", error);
      // CRITICAL: Fragments already burned! Log this for manual recovery
      console.error(`CRITICAL: User ${walletAddress} burned fragments for ${brand} but mint failed!`);
      console.error(`Burn TX: ${burnTxHash}`);
      console.error(`Fragment IDs used: ${fragmentIdsToUse.join(", ")}`);

      res.status(500).json({
        error: "Failed to mint assembled car on blockchain",
        burnTxHash,
        message: "Fragments were burned but car minting failed. Contact support.",
      });
      return;
    }

    // 9. Store assembled car in database
    await prisma.car.create({
      data: {
        tokenId,
        ownerId: userId,
        modelName: brand,
        series: carSeries,
        mintTxHash,
        isRedeemed: false,
      },
    });

    // 10. Return success response
    res.status(200).json({
      success: true,
      car: {
        tokenId,
        modelName: brand,
        series: carSeries,
        rarity: carRarity,
        burnTxHash,
        mintTxHash,
      },
      message: `Successfully assembled a ${carRarity} ${brand}!`,
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
 * Check which brands user can forge
 */
router.get("/assembly/can-forge", auth, async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req as AuthRequest;

    // Check off-chain fragments grouped by brand
    const fragments = await prisma.fragment.findMany({
      where: { userId, isUsed: false },
    });

    // Group by brand
    const fragmentsByBrand: Record<string, Set<number>> = {};
    fragments.forEach(f => {
      if (!fragmentsByBrand[f.brand]) fragmentsByBrand[f.brand] = new Set();
      fragmentsByBrand[f.brand]!.add(f.typeId);
    });

    // Find brands with all 5 types
    const assemblableBrands = Object.entries(fragmentsByBrand)
      .filter(([, types]) => types.size === 5)
      .map(([brand]) => brand);

    // Also check on-chain
    let hasAllPartsOnChain = false;
    try {
      hasAllPartsOnChain = await checkAllParts(walletAddress);
    } catch (error) {
      console.error("Failed to check on-chain:", error);
    }

    res.status(200).json({
      canForge: assemblableBrands.length > 0 && hasAllPartsOnChain,
      assemblableBrands,
      hasOnChainFragments: hasAllPartsOnChain,
      message: assemblableBrands.length > 0
        ? `You can assemble: ${assemblableBrands.join(", ")}`
        : "Collect all 5 fragment types of the same brand to assemble",
    });
  } catch (error) {
    console.error("Can forge check error:", error);
    res.status(500).json({
      error: "Failed to check assembly eligibility",
    });
  }
});

export default router;
