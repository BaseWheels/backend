"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("../blockchain/client");
// Daily check-in fragment reward pool
const DAILY_FRAGMENT_REWARDS = [
    { brand: "Honda Civic", series: "Economy", rarity: "common" },
    { brand: "Toyota Corolla", series: "Economy", rarity: "common" },
    { brand: "BMW M3", series: "Sport", rarity: "rare" },
];
const router = (0, express_1.Router)();
/**
 * POST /check-in
 * Daily check-in endpoint with fragment minting
 */
router.post("/check-in", auth_1.auth, async (req, res) => {
    try {
        const { userId, walletAddress } = req;
        // 1. Find or create user
        let user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            user = await prisma_1.prisma.user.create({
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
        // Randomly select fragment attributes from daily reward pool
        const fragmentReward = DAILY_FRAGMENT_REWARDS[Math.floor(Math.random() * DAILY_FRAGMENT_REWARDS.length)];
        // 4. Mint fragment on-chain
        let fragmentTxHash;
        try {
            fragmentTxHash = await (0, client_1.mintFragment)(walletAddress, fragmentType, 1);
        }
        catch (error) {
            console.error("Blockchain fragment mint failed:", error);
            res.status(500).json({
                error: "Failed to mint fragment on blockchain",
            });
            return;
        }
        // 5. Mint MockIDRX tokens on-chain
        let mockIDRXTxHash;
        try {
            mockIDRXTxHash = await (0, client_1.mintMockIDRX)(walletAddress, mockIDRXReward);
        }
        catch (error) {
            console.error("Blockchain MockIDRX mint failed:", error);
            res.status(500).json({
                error: "Failed to mint MockIDRX tokens on blockchain",
                fragmentTxHash, // Fragment was minted successfully
            });
            return;
        }
        // 6. Store fragment record and update lastCheckIn in a transaction
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.fragment.create({
                data: {
                    userId,
                    typeId: fragmentType,
                    brand: fragmentReward.brand,
                    series: fragmentReward.series,
                    rarity: fragmentReward.rarity,
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
        const mockIDRXBalance = await (0, client_1.getMockIDRXBalance)(walletAddress);
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
    }
    catch (error) {
        console.error("Check-in error:", error);
        res.status(500).json({
            error: "Internal server error during check-in",
        });
    }
});
exports.default = router;
//# sourceMappingURL=checkin.js.map