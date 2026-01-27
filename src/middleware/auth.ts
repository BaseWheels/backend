import { Request, Response, NextFunction } from "express";
import { PrivyClient } from "@privy-io/server-auth";
import { prisma } from "../lib/prisma";

const privyAppId = process.env.PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;

if (!privyAppId || !privyAppSecret) {
  throw new Error("Missing PRIVY_APP_ID or PRIVY_APP_SECRET");
}

const privy = new PrivyClient(privyAppId, privyAppSecret);

export interface AuthRequest extends Request {
  userId: string;
  walletAddress: string;
  walletId?: string; // Privy wallet ID for gasless transactions
}

export async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);

    // Get embedded wallet info
    const embeddedWallet = user.linkedAccounts?.find(
      (account: any) => account.type === "wallet" && account.walletClientType === "privy"
    ) as any;

    const walletAddress = embeddedWallet?.address || user.wallet?.address;
    const walletId = embeddedWallet?.id; // Privy's internal wallet ID (NOT the blockchain address!)

    if (!walletAddress) {
      res.status(400).json({ error: "User has no linked wallet" });
      return;
    }

    // Extract email and username from Privy user
    const email = user.email?.address || null;
    let username: string | null = null;

    // Priority: Twitter > Discord > Email username
    if (user.twitter?.username) {
      username = user.twitter.username || null;
    } else if (user.discord?.username) {
      username = user.discord.username || null;
    } else if (email) {
      username = email.split("@")[0] || null;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: claims.userId },
      select: { usernameSet: true, username: true },
    });

    // Auto-create user in database if doesn't exist (just-in-time provisioning)
    // Only update username if it hasn't been manually set by user
    await prisma.user.upsert({
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

    (req as AuthRequest).userId = claims.userId;
    (req as AuthRequest).walletAddress = walletAddress.toLowerCase();
    (req as AuthRequest).walletId = walletId; // For gasless transactions

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}
