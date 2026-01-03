import { Request, Response, NextFunction } from "express";
import { PrivyClient } from "@privy-io/server-auth";

const privyAppId = process.env.PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;

if (!privyAppId || !privyAppSecret) {
  throw new Error("Missing PRIVY_APP_ID or PRIVY_APP_SECRET");
}

const privy = new PrivyClient(privyAppId, privyAppSecret);

export interface AuthRequest extends Request {
  userId: string;
  walletAddress: string;
}

export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    (req as AuthRequest).userId = claims.userId;
    (req as AuthRequest).walletAddress = walletAddress.toLowerCase();

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}
