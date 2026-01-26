"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = auth;
const server_auth_1 = require("@privy-io/server-auth");
const prisma_1 = require("../lib/prisma");
const privyAppId = process.env.PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;
if (!privyAppId || !privyAppSecret) {
    throw new Error("Missing PRIVY_APP_ID or PRIVY_APP_SECRET");
}
const privy = new server_auth_1.PrivyClient(privyAppId, privyAppSecret);
async function auth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({ error: "No token provided" });
            return;
        }
        const claims = await privy.verifyAuthToken(token);
        const user = await privy.getUser(claims.userId);
        // Get embedded wallet info
        const embeddedWallet = user.linkedAccounts?.find((account) => account.type === 'wallet' && account.walletClientType === 'privy');
        const walletAddress = embeddedWallet?.address || user.wallet?.address;
        const walletId = embeddedWallet?.id; // Privy's internal wallet ID (NOT the blockchain address!)
        if (!walletAddress) {
            res.status(400).json({ error: "User has no linked wallet" });
            return;
        }
        // Extract email and username from Privy user
        const email = user.email?.address || null;
        let username = null;
        // Priority: Twitter > Discord > Email username
        if (user.twitter?.username) {
            username = user.twitter.username || null;
        }
        else if (user.discord?.username) {
            username = user.discord.username || null;
        }
        else if (email) {
            username = email.split('@')[0] || null;
        }
        // Check if user already exists
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { id: claims.userId },
            select: { usernameSet: true, username: true },
        });
        // Auto-create user in database if doesn't exist (just-in-time provisioning)
        // Only update username if it hasn't been manually set by user
        await prisma_1.prisma.user.upsert({
            where: { id: claims.userId },
            update: {
                walletAddress: walletAddress.toLowerCase(),
                email,
                // Only update username if user hasn't manually set it
                ...(existingUser?.usernameSet ? {} : { username }),
            },
            create: {
                id: claims.userId,
                walletAddress: walletAddress.toLowerCase(),
                email,
                username,
                coins: 0, // Starting coins
            },
        });
        req.userId = claims.userId;
        req.walletAddress = walletAddress.toLowerCase();
        req.walletId = walletId; // For gasless transactions
        next();
    }
    catch (error) {
        console.error("Auth error:", error);
        res.status(401).json({ error: "Unauthorized" });
    }
}
//# sourceMappingURL=auth.js.map