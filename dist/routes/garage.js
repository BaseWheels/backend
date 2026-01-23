"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("../blockchain/client");
const router = (0, express_1.Router)();
/**
 * GET /garage/overview
 * Get complete overview of user's garage (cars + fragments)
 */
router.get("/garage/overview", auth_1.auth, async (req, res) => {
    try {
        const { userId, walletAddress } = req;
        // Get user with all related data
        const user = await prisma_1.prisma.user.findUnique({
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
        let mockIDRXBalance;
        try {
            mockIDRXBalance = await (0, client_1.getMockIDRXBalance)(walletAddress);
        }
        catch (error) {
            console.error("Failed to get MockIDRX balance:", error);
            mockIDRXBalance = 0; // Fallback to 0 if blockchain call fails
        }
        // Aggregate fragment counts by type
        const fragmentCounts = user.fragments.reduce((acc, fragment) => {
            acc[fragment.typeId] = (acc[fragment.typeId] || 0) + 1;
            return acc;
        }, {});
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
            }
            else if (car.series?.includes("German Engineering") || car.series?.includes("Supercar")) {
                rarity = "epic";
            }
            else if (car.series?.includes("JDM Legend") || car.series?.includes("Sport")) {
                rarity = "rare";
            }
            acc[rarity] = (acc[rarity] || 0) + 1;
            return acc;
        }, {});
        // Overview response
        res.status(200).json({
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                email: user.email,
                username: user.username,
                usernameSet: user.usernameSet,
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
    }
    catch (error) {
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
router.get("/garage/cars", auth_1.auth, async (req, res) => {
    try {
        const { userId } = req;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Get total count
        const totalCars = await prisma_1.prisma.car.count({
            where: { ownerId: userId },
        });
        // Get paginated cars
        const cars = await prisma_1.prisma.car.findMany({
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
            }
            else if (car.series?.includes("German Engineering") || car.series?.includes("Supercar")) {
                rarity = "epic";
            }
            else if (car.series?.includes("JDM Legend") || car.series?.includes("Sport")) {
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
    }
    catch (error) {
        console.error("Garage cars error:", error);
        res.status(500).json({
            error: "Failed to fetch cars",
        });
    }
});
/**
 * GET /garage/fragments
 * Get fragment inventory grouped by brand (for assembly)
 */
router.get("/garage/fragments", auth_1.auth, async (req, res) => {
    try {
        const { userId } = req;
        // Get all unused fragments
        const fragments = await prisma_1.prisma.fragment.findMany({
            where: { userId, isUsed: false },
            orderBy: { createdAt: 'desc' },
        });
        const fragmentTypeNames = {
            0: "Chassis",
            1: "Wheels",
            2: "Engine",
            3: "Body",
            4: "Interior",
        };
        // Group fragments by brand
        const fragmentsByBrand = {};
        fragments.forEach(fragment => {
            const key = fragment.brand;
            if (!fragmentsByBrand[key]) {
                fragmentsByBrand[key] = {
                    brand: fragment.brand,
                    series: fragment.series,
                    rarity: fragment.rarity,
                    fragments: [],
                    totalParts: 0,
                    canAssemble: false,
                };
            }
            // Find or create fragment type entry
            let typeEntry = fragmentsByBrand[key].fragments.find(f => f.typeId === fragment.typeId);
            if (!typeEntry) {
                typeEntry = {
                    typeId: fragment.typeId,
                    typeName: fragmentTypeNames[fragment.typeId] || `Type ${fragment.typeId}`,
                    count: 0,
                    ids: [],
                };
                fragmentsByBrand[key].fragments.push(typeEntry);
            }
            typeEntry.count++;
            typeEntry.ids.push(fragment.id);
        });
        // Calculate canAssemble and totalParts for each brand
        Object.values(fragmentsByBrand).forEach(brandData => {
            brandData.totalParts = brandData.fragments.reduce((sum, f) => sum + f.count, 0);
            // Check if has all 5 unique fragment types (0-4)
            const uniqueTypes = new Set(brandData.fragments.map(f => f.typeId));
            brandData.canAssemble = uniqueTypes.size === 5;
            // Sort fragments by typeId
            brandData.fragments.sort((a, b) => a.typeId - b.typeId);
        });
        // Convert to array and sort by canAssemble (ready first) then by totalParts
        const inventory = Object.values(fragmentsByBrand).sort((a, b) => {
            if (a.canAssemble !== b.canAssemble)
                return a.canAssemble ? -1 : 1;
            return b.totalParts - a.totalParts;
        });
        // Find brands that can be assembled
        const assemblableBrands = inventory.filter(b => b.canAssemble).map(b => b.brand);
        res.status(200).json({
            inventory,
            summary: {
                totalFragments: fragments.length,
                totalBrands: inventory.length,
                assemblableBrands,
                canAssembleAny: assemblableBrands.length > 0,
            },
        });
    }
    catch (error) {
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
router.get("/garage/car/:tokenId", auth_1.auth, async (req, res) => {
    try {
        const { userId } = req;
        const tokenId = parseInt(req.params.tokenId);
        if (isNaN(tokenId)) {
            res.status(400).json({ error: "Invalid token ID" });
            return;
        }
        // Get car
        const car = await prisma_1.prisma.car.findUnique({
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
        }
        else if (car.series?.includes("German Engineering") || car.series?.includes("Supercar")) {
            rarity = "epic";
        }
        else if (car.series?.includes("JDM Legend") || car.series?.includes("Sport")) {
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
    }
    catch (error) {
        console.error("Get car error:", error);
        res.status(500).json({
            error: "Failed to fetch car details",
        });
    }
});
exports.default = router;
//# sourceMappingURL=garage.js.map