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
        const walletAddress = user.wallet?.address;
        if (!walletAddress) {
            res.status(400).json({ error: "User has no linked wallet" });
            return;
        }
        // Auto-create user in database if doesn't exist (just-in-time provisioning)
        await prisma_1.prisma.user.upsert({
            where: { id: claims.userId },
            update: {
                walletAddress: walletAddress.toLowerCase(),
            },
            create: {
                id: claims.userId,
                walletAddress: walletAddress.toLowerCase(),
                coins: 0, // Starting coins
            },
        });
        req.userId = claims.userId;
        req.walletAddress = walletAddress.toLowerCase();
        next();
    }
    catch (error) {
        console.error("Auth error:", error);
        res.status(401).json({ error: "Unauthorized" });
    }
}
//# sourceMappingURL=auth.js.map