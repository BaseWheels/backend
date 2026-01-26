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
      message: "Users must approve this address to use gasless transactions"
    });
  } catch (error: any) {
    console.error("Get server wallet error:", error);
    res.status(500).json({
      error: "Failed to get server wallet",
      details: error.message
    });
  }
});

/**
 * POST /api/gasless/claim-faucet
 * Relay claimFaucet transaction with gas sponsorship
 */
router.post("/gasless/claim-faucet", auth, async (req: Request, res: Response) => {
  try {
    const { walletId, walletAddress } = req as AuthRequest;
    if (!walletId || !walletAddress) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    // Encode claimFaucet() function call
    const iface = new ethers.Interface(MOCKIDRX_CONTRACT_ABI);
    const data = iface.encodeFunctionData("claimFaucet", []);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletId,
      {
        to: MOCKIDRX_CONTRACT_ADDRESS,
        data,
      },
      84532 // Base Sepolia
    );

    res.json({
      success: true,
      txHash,
      message: "Faucet claimed successfully (gasless!)",
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
      details: error.message
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
      details: error.message
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

    console.log(`[payForSpin] Server calling payForSpinOnBehalfOf for user ${walletAddress}, amount: ${amount}`);

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
    if (error.message?.includes("Insufficient balance") || error.message?.includes("insufficient balance")) {
      errorMessage = "Insufficient MockIDRX balance";
    } else if (error.message?.includes("insufficient allowance") || error.message?.includes("not approved")) {
      errorMessage = "Please approve server wallet first";
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message
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
      details: error.message
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
      details: error.message
    });
  }
});

export default router;
