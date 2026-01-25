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
 * POST /api/gasless/claim-faucet
 * Relay claimFaucet transaction with gas sponsorship
 */
router.post("/gasless/claim-faucet", auth, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as AuthRequest).walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address not found" });
    }

    // Encode claimFaucet() function call
    const iface = new ethers.Interface(MOCKIDRX_CONTRACT_ABI);
    const data = iface.encodeFunctionData("claimFaucet", []);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletAddress,
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
    const walletAddress = (req as AuthRequest).walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address not found" });
    }

    const { spender, amount } = req.body;
    if (!spender || !amount) {
      return res.status(400).json({ error: "Missing spender or amount" });
    }

    // Encode approve(spender, amount) function call
    const iface = new ethers.Interface(MOCKIDRX_CONTRACT_ABI);
    const amountWei = ethers.parseUnits(amount.toString(), 18); // MockIDRX has 18 decimals
    const data = iface.encodeFunctionData("approve", [spender, amountWei]);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletAddress,
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
 * Relay payForSpin() transaction with gas sponsorship
 */
router.post("/gasless/pay-for-spin", auth, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as AuthRequest).walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address not found" });
    }

    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Missing amount" });
    }

    // Encode payForSpin(amount) function call
    const iface = new ethers.Interface(MOCKIDRX_CONTRACT_ABI);
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const data = iface.encodeFunctionData("payForSpin", [amountWei]);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletAddress,
      {
        to: MOCKIDRX_CONTRACT_ADDRESS,
        data,
      },
      84532
    );

    res.json({
      success: true,
      txHash,
      message: "Paid for spin successfully (gasless!)",
    });
  } catch (error: any) {
    console.error("Pay for spin relay error:", error);

    let errorMessage = "Failed to pay for spin";
    if (error.message?.includes("Insufficient balance")) {
      errorMessage = "Insufficient MockIDRX balance";
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
    const walletAddress = (req as AuthRequest).walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address not found" });
    }

    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Missing amount" });
    }

    // Encode burn(amount) function call
    const iface = new ethers.Interface(MOCKIDRX_CONTRACT_ABI);
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const data = iface.encodeFunctionData("burn", [amountWei]);

    // Send gasless transaction
    const txHash = await sendGaslessTransaction(
      walletAddress,
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
    const walletAddress = (req as AuthRequest).walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address not found" });
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
      walletAddress,
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
