"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("../blockchain/client");
const gacha_1 = require("../config/gacha");
const router = (0, express_1.Router)();
/**
 * POST /gacha/open
 * Open a gacha box and mint a random Car NFT
 */
router.post("/gacha/open", auth_1.auth, async (req, res) => {
    try {
        const { userId, walletAddress } = req;
        const { boxType } = req.body;
        // 1. Validate box type
        if (!boxType || !gacha_1.GACHA_BOXES[boxType]) {
            res.status(400).json({
                error: "Invalid box type",
                availableBoxes: Object.keys(gacha_1.GACHA_BOXES),
            });
            return;
        }
        const gachaBox = gacha_1.GACHA_BOXES[boxType];
        // 2. Get user
        const user = await prisma_1.prisma.user.findUnique({
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
        const reward = (0, gacha_1.selectRandomReward)(gachaBox.rewards);
        // 5. Mint Car NFT on-chain (contract auto-generates tokenId)
        let tokenId;
        let txHash;
        try {
            const result = await (0, client_1.mintCar)(walletAddress);
            tokenId = result.tokenId;
            txHash = result.txHash;
        }
        catch (error) {
            console.error("Blockchain mint failed:", error);
            res.status(500).json({
                error: "Failed to mint Car NFT on blockchain",
            });
            return;
        }
        // 6. Store car and deduct coins in a transaction
        const updatedUser = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
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
router.get("/gacha/boxes", auth_1.auth, async (req, res) => {
    try {
        const { userId } = req;
        // Get user coins
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { coins: true },
        });
        const boxes = Object.entries(gacha_1.GACHA_BOXES).map(([key, box]) => ({
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
    }
    catch (error) {
        console.error("Get boxes error:", error);
        res.status(500).json({
            error: "Failed to fetch gacha boxes",
        });
    }
});
exports.default = router;
//# sourceMappingURL=gacha.js.map