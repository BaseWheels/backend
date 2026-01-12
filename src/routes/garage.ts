import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";
import { getMockIDRXBalance } from "../blockchain/client";

const router = Router();

/**
 * GET /garage/overview
 * Get complete overview of user's garage (cars + fragments)
 */
router.get("/garage/overview", auth, async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req as AuthRequest;

    // Get user with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cars: {
          orderBy: { tokenId: 'desc' },
        },
        fragments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get MockIDRX balance from blockchain
    let mockIDRXBalance: number;
    try {
      mockIDRXBalance = await getMockIDRXBalance(walletAddress);
    } catch (error) {
      console.error("Failed to get MockIDRX balance:", error);
      mockIDRXBalance = 0; // Fallback to 0 if blockchain call fails
    }

    // Aggregate fragment counts by type
    const fragmentCounts = user.fragments.reduce((acc, fragment) => {
      acc[fragment.typeId] = (acc[fragment.typeId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Fragment names
    const fragmentNames = [
      "Engine",
      "Chassis",
      "Wheels",
      "Body",
      "Electronics"
    ];

    // Calculate rarity distribution
    const rarityCount = user.cars.reduce((acc, car) => {
      let rarity = "common";
      if (car.series?.includes("Hypercar") || car.series?.includes("Limited Edition")) {
        rarity = "legendary";
      } else if (car.series?.includes("German Engineering") || car.series?.includes("Supercar")) {
        rarity = "epic";
      } else if (car.series?.includes("JDM Legend") || car.series?.includes("Sport")) {
        rarity = "rare";
      }
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Overview response
    res.status(200).json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        mockIDRX: mockIDRXBalance,
        lastCheckIn: user.lastCheckIn,
        createdAt: user.createdAt,
      },
      stats: {
        totalCars: user.cars.length,
        totalFragments: user.fragments.length,
        fragmentsByType: Array.from({ length: 5 }, (_, i) => ({
          typeId: i,
          name: fragmentNames[i],
          count: fragmentCounts[i] || 0,
        })),
        canAssemble: Object.keys(fragmentCounts).length === 5 &&
                     Object.values(fragmentCounts).every(count => count >= 1),
        rarityDistribution: rarityCount,
      },
      recentCars: user.cars.slice(0, 5).map(car => ({
        tokenId: car.tokenId,
        modelName: car.modelName,
        series: car.series,
        isRedeemed: car.isRedeemed,
        mintTxHash: car.mintTxHash,
      })),
      recentFragments: user.fragments.slice(0, 10).map(fragment => ({
        id: fragment.id,
        typeId: fragment.typeId,
        typeName: fragmentNames[fragment.typeId],
        txHash: fragment.txHash,
        createdAt: fragment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Garage overview error:", error);
    res.status(500).json({
      error: "Failed to fetch garage overview",
    });
  }
});

/**
 * GET /garage/cars
 * Get all cars owned by user with pagination
 */
router.get("/garage/cars", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const totalCars = await prisma.car.count({
      where: { ownerId: userId },
    });

    // Get paginated cars
    const cars = await prisma.car.findMany({
      where: { ownerId: userId },
      orderBy: { tokenId: 'desc' },
      skip,
      take: limit,
    });

    // Enrich car data with metadata
    const enrichedCars = cars.map(car => {
      // Determine rarity
      let rarity = "common";
      if (car.series?.includes("Hypercar") || car.series?.includes("Limited Edition")) {
        rarity = "legendary";
      } else if (car.series?.includes("German Engineering") || car.series?.includes("Supercar")) {
        rarity = "epic";
      } else if (car.series?.includes("JDM Legend") || car.series?.includes("Sport")) {
        rarity = "rare";
      }

      return {
        tokenId: car.tokenId,
        modelName: car.modelName,
        series: car.series,
        rarity,
        isRedeemed: car.isRedeemed,
        mintTxHash: car.mintTxHash,
        imageUrl: `https://your-cdn.com/cars/${car.tokenId}.png`, // TODO: Replace with actual CDN
        metadataUrl: `/metadata/cars/${car.tokenId}`,
      };
    });

    res.status(200).json({
      cars: enrichedCars,
      pagination: {
        total: totalCars,
        page,
        limit,
        totalPages: Math.ceil(totalCars / limit),
        hasMore: skip + cars.length < totalCars,
      },
    });
  } catch (error) {
    console.error("Garage cars error:", error);
    res.status(500).json({
      error: "Failed to fetch cars",
    });
  }
});

/**
 * GET /garage/fragments
 * Get fragment inventory with counts by type
 */
router.get("/garage/fragments", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;

    // Get all fragments
    const fragments = await prisma.fragment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by type
    const fragmentsByType = fragments.reduce((acc, fragment) => {
      if (!acc[fragment.typeId]) {
        acc[fragment.typeId] = [];
      }
      acc[fragment.typeId]!.push({
        id: fragment.id,
        txHash: fragment.txHash,
        createdAt: fragment.createdAt,
      });
      return acc;
    }, {} as Record<number, any[]>);

    const fragmentNames = [
      "Engine Fragment",
      "Chassis Fragment",
      "Wheels Fragment",
      "Body Fragment",
      "Electronics Fragment"
    ];

    const fragmentDescriptions = [
      "The heart of any vehicle. Powers your dreams forward.",
      "The backbone that holds everything together.",
      "Round and round they go. Your ticket to the road.",
      "The shell that makes heads turn.",
      "The brain that brings it all to life."
    ];

    // Format response
    const inventory = Array.from({ length: 5 }, (_, typeId) => ({
      typeId,
      name: fragmentNames[typeId],
      description: fragmentDescriptions[typeId],
      count: fragmentsByType[typeId]?.length || 0,
      fragments: fragmentsByType[typeId] || [],
      imageUrl: `https://your-cdn.com/fragments/${typeId}.png`, // TODO: Replace with actual CDN
      metadataUrl: `/metadata/fragments/${typeId}`,
    }));

    // Check if can assemble
    const canAssemble = inventory.every(item => item.count >= 1);
    const missingFragments = inventory
      .filter(item => item.count === 0)
      .map(item => item.name);

    res.status(200).json({
      inventory,
      summary: {
        totalFragments: fragments.length,
        uniqueTypes: Object.keys(fragmentsByType).length,
        canAssemble,
        missingFragments,
      },
    });
  } catch (error) {
    console.error("Garage fragments error:", error);
    res.status(500).json({
      error: "Failed to fetch fragments",
    });
  }
});

/**
 * GET /garage/car/:tokenId
 * Get detailed information about a specific car
 */
router.get("/garage/car/:tokenId", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const tokenId = parseInt(req.params.tokenId!);

    if (isNaN(tokenId)) {
      res.status(400).json({ error: "Invalid token ID" });
      return;
    }

    // Get car
    const car = await prisma.car.findUnique({
      where: { tokenId },
    });

    if (!car) {
      res.status(404).json({ error: "Car not found" });
      return;
    }

    // Verify ownership
    if (car.ownerId !== userId) {
      res.status(403).json({ error: "You don't own this car" });
      return;
    }

    // Determine rarity
    let rarity = "common";
    if (car.series?.includes("Hypercar") || car.series?.includes("Limited Edition")) {
      rarity = "legendary";
    } else if (car.series?.includes("German Engineering") || car.series?.includes("Supercar")) {
      rarity = "epic";
    } else if (car.series?.includes("JDM Legend") || car.series?.includes("Sport")) {
      rarity = "rare";
    }

    res.status(200).json({
      tokenId: car.tokenId,
      modelName: car.modelName,
      series: car.series,
      rarity,
      isRedeemed: car.isRedeemed,
      mintTxHash: car.mintTxHash,
      imageUrl: `https://your-cdn.com/cars/${car.tokenId}.png`,
      metadataUrl: `/metadata/cars/${car.tokenId}`,
      openseaUrl: `https://testnets.opensea.io/assets/base-sepolia/${process.env.CAR_CONTRACT_ADDRESS}/${car.tokenId}`,
    });
  } catch (error) {
    console.error("Get car error:", error);
    res.status(500).json({
      error: "Failed to fetch car details",
    });
  }
});

export default router;
