import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/redeem/shipping-info
 * Get user's shipping information
 */
router.get("/redeem/shipping-info", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        shippingName: true,
        shippingPhone: true,
        shippingAddress: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      hasShippingInfo: !!(user.shippingName && user.shippingPhone && user.shippingAddress),
      shippingInfo: {
        name: user.shippingName || "",
        phone: user.shippingPhone || "",
        address: user.shippingAddress || "",
      },
    });
  } catch (error) {
    console.error("Get shipping info error:", error);
    res.status(500).json({ error: "Failed to get shipping information" });
  }
});

/**
 * POST /api/redeem/shipping-info
 * Save or update user's shipping information
 */
router.post("/redeem/shipping-info", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { name, phone, address } = req.body;

    // Validation
    if (!name || !phone || !address) {
      res.status(400).json({ error: "Name, phone, and address are required" });
      return;
    }

    if (name.trim().length < 3) {
      res.status(400).json({ error: "Name must be at least 3 characters" });
      return;
    }

    if (phone.trim().length < 10) {
      res.status(400).json({ error: "Phone number must be at least 10 digits" });
      return;
    }

    if (address.trim().length < 10) {
      res.status(400).json({ error: "Address must be at least 10 characters" });
      return;
    }

    // Update user shipping info
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        shippingName: name.trim(),
        shippingPhone: phone.trim(),
        shippingAddress: address.trim(),
      },
      select: {
        shippingName: true,
        shippingPhone: true,
        shippingAddress: true,
      },
    });

    res.json({
      message: "Shipping information saved successfully",
      shippingInfo: {
        name: updatedUser.shippingName,
        phone: updatedUser.shippingPhone,
        address: updatedUser.shippingAddress,
      },
    });
  } catch (error) {
    console.error("Save shipping info error:", error);
    res.status(500).json({ error: "Failed to save shipping information" });
  }
});

/**
 * POST /api/redeem/claim-physical
 * Claim physical car and burn NFT
 */
router.post("/redeem/claim-physical", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const { tokenId } = req.body;

    if (!tokenId && tokenId !== 0) {
      res.status(400).json({ error: "Token ID is required" });
      return;
    }

    // Get user to check shipping info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        shippingName: true,
        shippingPhone: true,
        shippingAddress: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if user has shipping info
    if (!user.shippingName || !user.shippingPhone || !user.shippingAddress) {
      res.status(400).json({
        error: "Please provide shipping information first",
        needsShippingInfo: true,
      });
      return;
    }

    // Get car
    const car = await prisma.car.findUnique({
      where: { tokenId: parseInt(tokenId) },
    });

    if (!car) {
      res.status(404).json({ error: "NFT not found" });
      return;
    }

    // Check ownership
    if (car.ownerId !== userId) {
      res.status(403).json({ error: "You don't own this NFT" });
      return;
    }

    // Check if already redeemed
    if (car.isRedeemed) {
      res.status(400).json({ error: "NFT has already been redeemed for physical car" });
      return;
    }

    // Check if listed on marketplace
    const listing = await prisma.listing.findUnique({
      where: { carTokenId: parseInt(tokenId) },
    });

    if (listing && listing.status === "active") {
      res.status(400).json({
        error: "Cannot redeem NFT that is listed on marketplace. Please delist it first.",
      });
      return;
    }

    // Mark as redeemed (burn NFT)
    const redeemedCar = await prisma.car.update({
      where: { tokenId: parseInt(tokenId) },
      data: {
        isRedeemed: true,
        redeemedAt: new Date(),
      },
    });

    res.json({
      message: `Physical ${car.series} ${car.modelName} claimed successfully! We will ship it to your address.`,
      car: {
        tokenId: redeemedCar.tokenId,
        modelName: redeemedCar.modelName,
        series: redeemedCar.series,
        isRedeemed: redeemedCar.isRedeemed,
        redeemedAt: redeemedCar.redeemedAt,
      },
      shippingInfo: {
        name: user.shippingName,
        phone: user.shippingPhone,
        address: user.shippingAddress,
      },
    });
  } catch (error) {
    console.error("Claim physical error:", error);
    res.status(500).json({ error: "Failed to claim physical car" });
  }
});

export default router;
