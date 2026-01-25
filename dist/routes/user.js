"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/user/profile
 * Get user profile information
 */
router.get("/user/profile", auth_1.auth, async (req, res) => {
    try {
        const { userId } = req;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                walletAddress: true,
                email: true,
                username: true,
                usernameSet: true,
                coins: true,
                lastCheckIn: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
/**
 * PUT /api/user/profile
 * Update user profile (shipping information)
 */
router.put("/user/profile", auth_1.auth, async (req, res) => {
    try {
        const { userId } = req;
        const { shippingName, shippingPhone, shippingAddress } = req.body;
        // Validate shipping information
        if (!shippingName || typeof shippingName !== "string") {
            res.status(400).json({ error: "Full name is required" });
            return;
        }
        if (!shippingPhone || typeof shippingPhone !== "string") {
            res.status(400).json({ error: "Phone number is required" });
            return;
        }
        if (!shippingAddress || typeof shippingAddress !== "string") {
            res.status(400).json({ error: "Delivery address is required" });
            return;
        }
        // Trim inputs
        const trimmedName = shippingName.trim();
        const trimmedPhone = shippingPhone.trim();
        const trimmedAddress = shippingAddress.trim();
        // Validate lengths
        if (trimmedName.length < 2) {
            res.status(400).json({ error: "Full name must be at least 2 characters" });
            return;
        }
        if (trimmedName.length > 100) {
            res.status(400).json({ error: "Full name must be at most 100 characters" });
            return;
        }
        if (trimmedPhone.length < 8) {
            res.status(400).json({ error: "Phone number must be at least 8 characters" });
            return;
        }
        if (trimmedPhone.length > 20) {
            res.status(400).json({ error: "Phone number must be at most 20 characters" });
            return;
        }
        if (trimmedAddress.length < 10) {
            res.status(400).json({ error: "Delivery address must be at least 10 characters" });
            return;
        }
        if (trimmedAddress.length > 500) {
            res.status(400).json({ error: "Delivery address must be at most 500 characters" });
            return;
        }
        // Update user shipping info
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                shippingName: trimmedName,
                shippingPhone: trimmedPhone,
                shippingAddress: trimmedAddress,
            },
            select: {
                id: true,
                shippingName: true,
                shippingPhone: true,
                shippingAddress: true,
            },
        });
        res.json({
            message: "Shipping information updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: "Failed to update shipping information" });
    }
});
/**
 * POST /api/user/set-username
 * Set username (one-time only, REQUIRED after first login)
 *
 * IMPORTANT: This is a one-time operation that cannot be undone.
 * - User MUST set username after first login (enforced in frontend)
 * - Username can only contain alphanumeric characters and underscores
 * - Once set (usernameSet = true), it cannot be changed
 * - This prevents username from being overridden by Privy auth updates
 */
router.post("/user/set-username", auth_1.auth, async (req, res) => {
    try {
        const { userId } = req;
        const { username } = req.body;
        // Validate username
        if (!username || typeof username !== "string") {
            res.status(400).json({ error: "Username is required" });
            return;
        }
        // Trim and validate length
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) {
            res.status(400).json({ error: "Username must be at least 3 characters" });
            return;
        }
        if (trimmedUsername.length > 20) {
            res.status(400).json({ error: "Username must be at most 20 characters" });
            return;
        }
        // Validate alphanumeric (allow underscores)
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
            res.status(400).json({
                error: "Username can only contain letters, numbers, and underscores"
            });
            return;
        }
        // Get current user
        const currentUser = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { usernameSet: true, username: true },
        });
        if (!currentUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Check if username was already set
        if (currentUser.usernameSet) {
            res.status(403).json({
                error: "Username has already been set and cannot be changed",
                currentUsername: currentUser.username,
            });
            return;
        }
        // Check if username is already taken (case-sensitive)
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                username: trimmedUsername,
                id: {
                    not: userId, // Exclude current user
                },
            },
        });
        if (existingUser) {
            res.status(409).json({ error: "Username is already taken" });
            return;
        }
        // Update username and set flag
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                username: trimmedUsername,
                usernameSet: true,
            },
            select: {
                id: true,
                username: true,
                usernameSet: true,
            },
        });
        res.json({
            message: "Username set successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Set username error:", error);
        res.status(500).json({ error: "Failed to set username" });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map