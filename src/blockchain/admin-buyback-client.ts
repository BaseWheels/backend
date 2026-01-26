import { ethers } from "ethers";
import { carContract, wallet, mintMockIDRX } from "./client";

/**
 * Verify car ownership on-chain
 * @param tokenId - Car NFT token ID
 * @param expectedOwner - Expected owner wallet address
 * @returns True if expectedOwner owns the car
 */
export async function verifyCarOwnership(
  tokenId: number,
  expectedOwner: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owner: string = await (carContract as any).ownerOf(tokenId);
    return owner.toLowerCase() === expectedOwner.toLowerCase();
  } catch (error) {
    console.error("Verify car ownership error:", error);
    return false;
  }
}

/**
 * Transfer car NFT from user to admin wallet (gasless - backend pays gas)
 * @param fromAddress - User wallet address (current owner)
 * @param tokenId - Car NFT token ID
 * @returns Transaction hash
 */
export async function transferCarToAdmin(
  fromAddress: string,
  tokenId: number
): Promise<string> {
  try {
    console.log("=== transferCarToAdmin START ===");
    console.log("From:", fromAddress);
    console.log("To (Admin):", wallet.address);
    console.log("TokenId:", tokenId);

    // Verify ownership before transfer
    const isOwner = await verifyCarOwnership(tokenId, fromAddress);
    if (!isOwner) {
      throw new Error(`User ${fromAddress} does not own car tokenId ${tokenId}`);
    }

    // Check if backend has approval to transfer this NFT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approved: string = await (carContract as any).getApproved(tokenId);
    const isApprovedForAll: boolean = await (carContract as any).isApprovedForAll(fromAddress, wallet.address);

    console.log("Approved address:", approved);
    console.log("Is approved for all:", isApprovedForAll);

    if (approved.toLowerCase() !== wallet.address.toLowerCase() && !isApprovedForAll) {
      throw new Error(
        "Backend not approved to transfer this NFT. User must approve backend wallet first."
      );
    }

    // Explicitly fetch latest nonce to prevent nonce conflicts
    const nonce = await wallet.getNonce('pending');
    console.log(`[transferCarToAdmin] Using nonce: ${nonce}`);

    // Transfer NFT from user to admin wallet using safeTransferFrom
    // Backend wallet executes the transfer (pays gas)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (carContract as any)["safeTransferFrom(address,address,uint256)"](
      fromAddress,
      wallet.address,
      tokenId,
      { nonce: nonce }
    );

    console.log("Transfer tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log(`Transfer confirmed. Gas used: ${receipt.gasUsed.toString()}`);
    console.log("=== transferCarToAdmin SUCCESS ===");

    return receipt.hash;
  } catch (error) {
    console.error("Transfer car to admin error:", error);
    console.error("=== transferCarToAdmin FAILED ===");
    throw new Error(
      `Failed to transfer car to admin: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Execute admin buyback: Transfer NFT to admin, mint IDRX to user
 * @param userAddress - User wallet address
 * @param tokenId - Car NFT token ID
 * @param buybackPrice - Price to pay user in IDRX
 * @returns Object with both transaction hashes
 */
export async function executeAdminBuyback(
  userAddress: string,
  tokenId: number,
  buybackPrice: number
): Promise<{ nftTxHash: string; idrxTxHash: string }> {
  try {
    console.log("=== executeAdminBuyback START ===");
    console.log("User:", userAddress);
    console.log("TokenId:", tokenId);
    console.log("Buyback Price:", buybackPrice);

    // Step 1: Transfer NFT from user to admin
    console.log("Step 1: Transferring NFT to admin...");
    const nftTxHash = await transferCarToAdmin(userAddress, tokenId);
    console.log("NFT transfer successful:", nftTxHash);

    // CRITICAL: Wait 1 second to ensure nonce is updated in network
    // This prevents ethers.js from returning stale/cached nonce
    console.log("Waiting 1 second for nonce update...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Mint IDRX to user
    console.log("Step 2: Minting IDRX to user...");
    const idrxTxHash = await mintMockIDRX(userAddress, buybackPrice);
    console.log("IDRX mint successful:", idrxTxHash);

    console.log("=== executeAdminBuyback SUCCESS ===");

    return {
      nftTxHash,
      idrxTxHash,
    };
  } catch (error) {
    console.error("Execute admin buyback error:", error);
    console.error("=== executeAdminBuyback FAILED ===");

    // Check which step failed
    if (error instanceof Error && error.message.includes("transfer")) {
      throw new Error(`NFT transfer failed: ${error.message}`);
    } else if (error instanceof Error && error.message.includes("mint")) {
      // CRITICAL: NFT already transferred but IDRX mint failed
      console.error("⚠️ CRITICAL: NFT transferred but IDRX mint failed!");
      console.error("⚠️ Admin received NFT but user didn't receive IDRX!");
      throw new Error(`IDRX mint failed after NFT transfer: ${error.message}`);
    }

    throw new Error(
      `Failed to execute admin buyback: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get admin wallet address
 * @returns Admin wallet address
 */
export function getAdminWalletAddress(): string {
  return wallet.address;
}
