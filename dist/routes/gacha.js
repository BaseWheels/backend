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
        const { boxType, paymentTxHash } = req.body;
        // 1. Validate box type
        if (!boxType || !gacha_1.GACHA_BOXES[boxType]) {
            res.status(400).json({
                error: "Invalid box type",
                availableBoxes: Object.keys(gacha_1.GACHA_BOXES),
            });
            return;
        }
        // 2. Validate payment transaction hash
        if (!paymentTxHash || typeof paymentTxHash !== "string") {
            res.status(400).json({
                error: "Payment transaction hash is required",
            });
            return;
        }
        const gachaBox = gacha_1.GACHA_BOXES[boxType];
        // 3. Verify payment transaction on-chain (transfer to treasury OR burn)
        try {
            let isValid = false;
            // Try transfer verification first (new gasless method)
            try {
                isValid = await (0, client_1.verifyTransferTransaction)(paymentTxHash, walletAddress, gachaBox.costCoins);
            }
            catch (transferError) {
                console.log("Transfer verification failed, trying burn verification...");
                // Fallback to burn verification (backward compatibility)
                try {
                    isValid = await (0, client_1.verifyBurnTransaction)(paymentTxHash, walletAddress, gachaBox.costCoins);
                }
                catch (burnError) {
                    throw transferError; // Throw original transfer error
                }
            }
            if (!isValid) {
                res.status(400).json({
                    error: "Invalid payment transaction",
                });
                return;
            }
        }
        catch (error) {
            console.error("Failed to verify payment transaction:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Failed to verify payment transaction",
            });
            return;
        }
        // 5. Randomly select a reward
        const reward = (0, gacha_1.selectRandomReward)(gachaBox.rewards);
        // 6. Mint reward based on type (Car NFT or Fragment)
        let txHash;
        let rewardResponse;
        if (reward.rewardType === "car") {
            // Mint Car NFT
            const carReward = reward;
            let tokenId;
            try {
                const result = await (0, client_1.mintCar)(walletAddress);
                tokenId = result.tokenId;
                txHash = result.txHash;
            }
            catch (error) {
                console.error("Blockchain mint failed:", error);
                console.error(`CRITICAL: User ${walletAddress} paid ${gachaBox.costCoins} IDRX but mint failed!`);
                console.error(`Payment TX: ${paymentTxHash}`);
                res.status(500).json({
                    error: "Failed to mint Car NFT on blockchain",
                    paymentTxHash,
                    message: "MockIDRX was paid but car minting failed. Contact support.",
                });
                return;
            }
            // Store car record in database
            await prisma_1.prisma.car.create({
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
        }
        else {
            // Mint Fragment
            const fragmentReward = reward;
            try {
                txHash = await (0, client_1.mintFragment)(walletAddress, fragmentReward.fragmentType, fragmentReward.amount);
            }
            catch (error) {
                console.error("Blockchain mint failed:", error);
                console.error(`CRITICAL: User ${walletAddress} paid ${gachaBox.costCoins} IDRX but fragment mint failed!`);
                console.error(`Payment TX: ${paymentTxHash}`);
                res.status(500).json({
                    error: "Failed to mint Fragment on blockchain",
                    paymentTxHash,
                    message: "MockIDRX was paid but fragment minting failed. Contact support.",
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
            await prisma_1.prisma.fragment.createMany({ data: fragmentRecords });
            const fragmentName = gacha_1.FRAGMENT_NAMES[fragmentReward.fragmentType];
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
        const updatedBalance = await (0, client_1.getMockIDRXBalance)(walletAddress);
        // 8. Build success message
        const message = reward.rewardType === "car"
            ? `Congratulations! You got a ${reward.rarity} ${reward.modelName}!`
            : `Congratulations! You got ${reward.amount}x ${reward.rarity} ${reward.brand} ${gacha_1.FRAGMENT_NAMES[reward.fragmentType]} Fragment!`;
        // 9. Return success response
        res.status(200).json({
            success: true,
            boxType,
            reward: rewardResponse,
            mockIDRX: {
                spent: gachaBox.costCoins,
                remaining: updatedBalance,
                paymentTxHash,
            },
            message,
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
        const { walletAddress } = req;
        // Get user MockIDRX balance from blockchain
        let mockIDRXBalance;
        try {
            mockIDRXBalance = await (0, client_1.getMockIDRXBalance)(walletAddress);
        }
        catch (error) {
            console.error("Failed to get MockIDRX balance:", error);
            res.status(500).json({
                error: "Failed to get MockIDRX balance from blockchain",
            });
            return;
        }
        const boxes = Object.entries(gacha_1.GACHA_BOXES).map(([key, box]) => ({
            type: key,
            costCoins: box.costCoins,
            canAfford: mockIDRXBalance >= box.costCoins,
            rewards: box.rewards.map((r) => {
                if (r.rewardType === "car") {
                    const carReward = r;
                    return {
                        rewardType: "car",
                        rarity: carReward.rarity,
                        modelName: carReward.modelName,
                        series: carReward.series,
                        probability: `${carReward.probability}%`,
                    };
                }
                else {
                    const fragmentReward = r;
                    return {
                        rewardType: "fragment",
                        rarity: fragmentReward.rarity,
                        fragmentType: fragmentReward.fragmentType,
                        fragmentName: gacha_1.FRAGMENT_NAMES[fragmentReward.fragmentType],
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