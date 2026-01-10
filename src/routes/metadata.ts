import { Router, Response, Request } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * GET /metadata/cars/:tokenId
 * OpenSea-compatible metadata endpoint for Car NFTs
 */
router.get("/metadata/cars/:tokenId", async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId!);

    if (isNaN(tokenId)) {
      res.status(400).json({ error: "Invalid token ID" });
      return;
    }

    // Get car from database
    const car = await prisma.car.findUnique({
      where: { tokenId },
    });

    if (!car) {
      res.status(404).json({ error: "Car not found" });
      return;
    }

    // Determine rarity based on model (you can customize this logic)
    let rarity = "common";
    if (car.series?.includes("Hypercar")) {
      rarity = "legendary";
    } else if (car.series?.includes("German Engineering")) {
      rarity = "epic";
    } else if (car.series?.includes("JDM Legend")) {
      rarity = "rare";
    }

    // Return OpenSea-compatible JSON metadata
    const metadata = {
      name: car.modelName || `Car #${tokenId}`,
      description: `${car.series || "Mystery"} series car from BaseWheels collection`,
      image: `https://your-cdn.com/cars/${tokenId}.png`, // TODO: Replace with actual image URL
      external_url: `https://your-website.com/cars/${tokenId}`,
      attributes: [
        {
          trait_type: "Series",
          value: car.series || "Unknown",
        },
        {
          trait_type: "Rarity",
          value: rarity,
        },
        {
          trait_type: "Redeemed",
          value: car.isRedeemed ? "Yes" : "No",
        },
        {
          trait_type: "Mint Transaction",
          value: car.mintTxHash || "N/A",
        },
      ],
    };

    res.status(200).json(metadata);
  } catch (error) {
    console.error("Metadata error:", error);
    res.status(500).json({
      error: "Failed to fetch metadata",
    });
  }
});

/**
 * GET /metadata/fragments/:tokenId
 * OpenSea-compatible metadata endpoint for Fragment NFTs
 */
router.get("/metadata/fragments/:tokenId", async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId!);

    if (isNaN(tokenId) || tokenId < 0 || tokenId > 4) {
      res.status(400).json({ error: "Invalid fragment type (must be 0-4)" });
      return;
    }

    const fragmentNames = [
      "Engine Fragment",
      "Chassis Fragment",
      "Wheels Fragment",
      "Body Fragment",
      "Electronics Fragment",
    ];

    const metadata = {
      name: fragmentNames[tokenId],
      description: `Fragment part ${tokenId} for assembling BaseWheels cars. Collect all 5 types to forge a complete car!`,
      image: `https://your-cdn.com/fragments/${tokenId}.png`, // TODO: Replace with actual image URL
      external_url: `https://your-website.com/fragments/${tokenId}`,
      attributes: [
        {
          trait_type: "Fragment Type",
          value: fragmentNames[tokenId],
        },
        {
          trait_type: "Type ID",
          value: tokenId,
        },
        {
          trait_type: "Rarity",
          value: "common",
        },
      ],
    };

    res.status(200).json(metadata);
  } catch (error) {
    console.error("Metadata error:", error);
    res.status(500).json({
      error: "Failed to fetch metadata",
    });
  }
});

export default router;
