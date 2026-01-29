/**
 * Gasless Transaction Relay API
 * Relays user transactions with Privy gas sponsorship
 */

import { Router, Request, Response } from "express";
import { auth, AuthRequest } from "../middleware/auth";
import { sendGaslessTransaction } from "../blockchain/privy-client";
import { ethers } from "ethers";
import {
  MOCKIDRX_CONTRACT_ADDRESS,
  MOCKIDRX_CONTRACT_ABI,
  CAR_CONTRACT_ADDRESS,
  CAR_CONTRACT_ABI,
} from "../blockchain/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = Router();

/**
 * GET /api/gasless/server-wallet
 * Get server wallet address for user approval
 */
router.get("/gasless/server-wallet", async (_req: Request, res: Response) => {
  try {
    const { wallet } = await import("../blockchain/client");

    res.json({
      success: true,
      serverWallet: wallet.address,
      message: "Users must approve this address to use gasless transactions",
    });
  } catch (error: any) {
    console.error("Get server wallet error:", error);
    res.status(500).json({
      error: "Failed to get server wallet",
      details: error.message,
    });
  }
});

/**
 * POST /api/gasless/claim-faucet
 * Claim faucet for user (backend pays gas, no Privy needed!)
 * Cooldown: 24 hours tracked in database
 */
router.post("/gasless/claim-faucet", auth, async (req: Request, res: Response) => {
  try {
    const { walletAddress, userId } = req as AuthRequest;
    if (!walletAddress || !userId) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    // Import backend mint function
    const { claimFaucetForUser } = await import("../blockchain/client");

    // Check cooldown from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastFaucetClaim: true },
    });

    if (user?.lastFaucetClaim) {
      const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
      const timeSinceLastClaim = Date.now() - user.lastFaucetClaim.getTime();

      if (timeSinceLastClaim < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - timeSinceLastClaim;
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

        return res.status(400).json({
          error: "Faucet cooldown active",
          details: `Cooldown aktif! Coba lagi dalam ${remainingHours} jam.`,
          remainingSeconds: Math.ceil(remainingMs / 1000),
        });
      }
    }

    // Backend wallet mints 1,000,000 IDRX to user (backend pays gas!)
    const txHash = await claimFaucetForUser(walletAddress, 1_000_000);

    // Update last claim time in database
    await prisma.user.update({
      where: { id: userId },
      data: { lastFaucetClaim: new Date() },
    });

    res.json({
      success: true,
      txHash,
      message: "Faucet claimed successfully! +1,000,000 IDRX",
    });
  } catch (error: any) {
    console.error("Claim faucet relay error:", error);

    // Parse error messages
    let errorMessage = "Failed to claim faucet";
    if (error.message?.includes("Faucet cooldown active")) {
      errorMessage = "Cooldown aktif! Coba lagi setelah 24 jam.";
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
    });
  }
});

/**
 * GET /api/gasless/faucet-status
 * Check faucet cooldown status without claiming
 * Returns: canClaim, cooldownSeconds, lastClaimTime
 */
router.get("/gasless/faucet-status", auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    if (!userId) {
      return res.status(400).json({ error: "User not found" });
    }

    // Get user's last faucet claim time from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastFaucetClaim: true },
    });

    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
    let canClaim = true;
    let cooldownSeconds = 0;

    if (user?.lastFaucetClaim) {
      const timeSinceLastClaim = Date.now() - user.lastFaucetClaim.getTime();

      if (timeSinceLastClaim < COOLDOWN_MS) {
        canClaim = false;
        const remainingMs = COOLDOWN_MS - timeSinceLastClaim;
        cooldownSeconds = Math.ceil(remainingMs / 1000);
      }
    }

    res.json({
      canClaim,
      cooldownSeconds,
      lastClaimTime: user?.lastFaucetClaim || null,
      message: canClaim
        ? "Ready to claim!"
        : `Cooldown active. ${Math.ceil(cooldownSeconds / 3600)} hours remaining.`,
    });
  } catch (error: any) {
    console.error("Check faucet status error:", error);
    res.status(500).json({
      error: "Failed to check faucet status",
      details: error.message,
    });
  }
});

/**
 * POST /api/gasless/request-starter-eth
 * Send starter ETH to user for gas fees (one-time, 0.001 ETH)
 */
router.post("/gasless/request-starter-eth", auth, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req as AuthRequest;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    const { sendStarterETH } = await import("../blockchain/client");

    // Send 0.001 ETH to user (skip if they already have enough)
    const txHash = await sendStarterETH(walletAddress, "0.001");

    if (!txHash) {
      return res.json({
        success: true,
        message: "User already has sufficient ETH for gas",
        skipped: true,
      });
    }

    res.json({
      success: true,
      txHash,
      message: "Starter ETH sent! You can now approve transactions.",
    });
  } catch (error: any) {
    console.error("Send starter ETH error:", error);
    res.status(500).json({
      error: "Failed to send starter ETH",
      details: error.message,
    });
  }
});

/**
 * POST /api/gasless/approve-mockidrx
 * Relay approve() transaction for MockIDRX with gas sponsorship
 */
router.post("/gasless/approve-mockidrx", auth, async (req: Request, res: Response) => {
  try {
    const { walletId, walletAddress } = req as AuthRequest;
    if (!walletId || !walletAddress) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    const { spender, amount } = req.body;
    if (!spender || !amount) {
      return res.status(400).json({ error: "Missing spender or amount" });
    }

    // Encode approve(spender, amount) function call
    const iface = new ethers.Interface(MOCKIDRX_CONTRACT_ABI);
    const amountWei = ethers.parseUnits(amount.toString(), 2); // MockIDRXv2 has 2 decimals
    const data = iface.encodeFunctionData("approve", [spender, amountWei]);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletId,
      {
        to: MOCKIDRX_CONTRACT_ADDRESS,
        data,
      },
      84532
    );

    res.json({
      success: true,
      txHash,
      message: "MockIDRX approved successfully (gasless!)",
    });
  } catch (error: any) {
    console.error("Approve MockIDRX relay error:", error);
    res.status(500).json({
      error: "Failed to approve MockIDRX",
      details: error.message,
    });
  }
});

/**
 * POST /api/gasless/pay-for-spin
 * Server wallet pays gas and calls payForSpinOnBehalfOf()
 * User must approve server wallet first!
 */
router.post("/gasless/pay-for-spin", auth, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req as AuthRequest;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Missing amount" });
    }

    // Import server wallet and contract
    const { mockIDRXContract } = await import("../blockchain/client");

    // Convert amount to token units (MockIDRXv2 has 2 decimals)
    const amountWei = ethers.parseUnits(amount.toString(), 2);

    console.log(
      `[payForSpin] Server calling payForSpinOnBehalfOf for user ${walletAddress}, amount: ${amount}`
    );

    // Server wallet calls payForSpinOnBehalfOf (server pays gas!)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (mockIDRXContract as any).payForSpinOnBehalfOf(walletAddress, amountWei);
    console.log(`[payForSpin] Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[payForSpin] Transaction confirmed. Gas used: ${receipt.gasUsed}`);

    res.json({
      success: true,
      txHash: receipt.hash,
      message: "Paid for spin successfully (server gasless!)",
    });
  } catch (error: any) {
    console.error("Pay for spin relay error:", error);

    let errorMessage = "Failed to pay for spin";
    if (
      error.message?.includes("Insufficient balance") ||
      error.message?.includes("insufficient balance")
    ) {
      errorMessage = "Insufficient MockIDRX balance";
    } else if (
      error.message?.includes("insufficient allowance") ||
      error.message?.includes("not approved")
    ) {
      errorMessage = "Please approve server wallet first";
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
    });
  }
});

/**
 * POST /api/gasless/burn-mockidrx
 * Relay burn() transaction with gas sponsorship
 */
router.post("/gasless/burn-mockidrx", auth, async (req: Request, res: Response) => {
  try {
    const { walletId, walletAddress } = req as AuthRequest;
    if (!walletId || !walletAddress) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Missing amount" });
    }

    // Encode burn(amount) function call
    const iface = new ethers.Interface(MOCKIDRX_CONTRACT_ABI);
    const amountWei = ethers.parseUnits(amount.toString(), 2); // MockIDRXv2 has 2 decimals
    const data = iface.encodeFunctionData("burn", [amountWei]);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletId,
      {
        to: MOCKIDRX_CONTRACT_ADDRESS,
        data,
      },
      84532
    );

    res.json({
      success: true,
      txHash,
      message: "Tokens burned successfully (gasless!)",
    });
  } catch (error: any) {
    console.error("Burn MockIDRX relay error:", error);

    let errorMessage = "Failed to burn tokens";
    if (error.message?.includes("insufficient balance")) {
      errorMessage = "Insufficient MockIDRX balance";
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
    });
  }
});

/**
 * POST /api/gasless/approve-car-nft
 * Relay approve() transaction for Car NFT with gas sponsorship
 */
router.post("/gasless/approve-car-nft", auth, async (req: Request, res: Response) => {
  try {
    const { walletId, walletAddress } = req as AuthRequest;
    if (!walletId || !walletAddress) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    const { spender, tokenId } = req.body;
    if (!spender || tokenId === undefined) {
      return res.status(400).json({ error: "Missing spender or tokenId" });
    }

    // Encode approve(spender, tokenId) function call for ERC721
    const iface = new ethers.Interface(CAR_CONTRACT_ABI);
    const data = iface.encodeFunctionData("approve", [spender, tokenId]);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletId,
      {
        to: CAR_CONTRACT_ADDRESS,
        data,
      },
      84532
    );

    res.json({
      success: true,
      txHash,
      message: "Car NFT approved successfully (gasless!)",
    });
  } catch (error: any) {
    console.error("Approve Car NFT relay error:", error);
    res.status(500).json({
      error: "Failed to approve Car NFT",
      details: error.message,
    });
  }
});

export default router;
