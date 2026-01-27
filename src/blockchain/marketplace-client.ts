import { ethers } from "ethers";
import { carContract, mockIDRXContract, wallet, provider } from "./client";

/**
 * Verify car ownership on-chain
 * @param tokenId - Car NFT token ID
 * @param expectedOwner - Expected owner wallet address
 * @returns True if expectedOwner owns the car
 */
export async function verifyCarOwnership(tokenId: number, expectedOwner: string): Promise<boolean> {
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
 * Check if car is approved for transfer by backend wallet
 * @param tokenId - Car NFT token ID
 * @returns True if car is approved to backend wallet
 */
export async function verifyCarApproval(tokenId: number): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approved: string = await (carContract as any).getApproved(tokenId);
    return approved.toLowerCase() === wallet.address.toLowerCase();
  } catch (error) {
    console.error("Verify car approval error:", error);
    return false;
  }
}

/**
 * Check if buyer has approved backend to spend IDRX
 * @param owner - Buyer wallet address
 * @param amount - Amount of IDRX needed (in token units, not wei)
 * @returns True if allowance is sufficient
 */
export async function verifyIDRXAllowance(owner: string, amount: number): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals: number = await (mockIDRXContract as any).decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowance: bigint = await (mockIDRXContract as any).allowance(owner, wallet.address);

    return allowance >= amountWei;
  } catch (error) {
    console.error("Verify IDRX allowance error:", error);
    return false;
  }
}

/**
 * Execute atomic purchase: transfer IDRX from buyer to seller, then transfer car from seller to buyer
 * @param tokenId - Car NFT token ID
 * @param buyerAddress - Buyer wallet address
 * @param sellerAddress - Seller wallet address
 * @param price - Price in IDRX (token units, not wei)
 * @returns Transaction hash of the car transfer
 */
export async function executePurchase(
  tokenId: number,
  buyerAddress: string,
  sellerAddress: string,
  price: number
): Promise<{ txHash: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals: number = await (mockIDRXContract as any).decimals();
    const priceWei = ethers.parseUnits(price.toString(), decimals);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowance = await (mockIDRXContract as any).allowance(buyerAddress, wallet.address);
    if (allowance < priceWei) {
      throw new Error(
        `Insufficient allowance. Has: ${allowance.toString()}, Needs: ${priceWei.toString()}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buyerBalance = await (mockIDRXContract as any).balanceOf(buyerAddress);
    if (buyerBalance < priceWei) {
      throw new Error(
        `Insufficient balance. Has: ${buyerBalance.toString()}, Needs: ${priceWei.toString()}`
      );
    }

    // Transfer IDRX from buyer to seller
    try {
      if (!wallet.provider) {
        throw new Error("Wallet provider not initialized");
      }
      const nonce1 = await wallet.provider.getTransactionCount(wallet.address, "pending");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const idrxTx = await (mockIDRXContract as any).transferFrom(
        buyerAddress,
        sellerAddress,
        priceWei,
        { nonce: nonce1 }
      );
      await idrxTx.wait();
    } catch (error) {
      throw new Error(
        `IDRX transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Transfer car from seller to buyer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentOwner = await (carContract as any).ownerOf(tokenId);
    if (currentOwner.toLowerCase() !== sellerAddress.toLowerCase()) {
      throw new Error(`Seller doesn't own the car. Current owner: ${currentOwner}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approvedAddress = await (carContract as any).getApproved(tokenId);
    if (approvedAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Car not approved to backend wallet. Approved to: ${approvedAddress}`);
    }

    try {
      if (!wallet.provider) {
        throw new Error("Wallet provider not initialized");
      }
      const nonce2 = await wallet.provider.getTransactionCount(wallet.address, "pending");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const carTx = await (carContract as any).transferFrom(sellerAddress, buyerAddress, tokenId, {
        nonce: nonce2,
      });
      const carReceipt = await carTx.wait();
      return { txHash: carReceipt.hash };
    } catch (error) {
      console.error("CRITICAL: IDRX transferred but car transfer failed!");
      throw new Error(
        `Car transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to execute marketplace purchase: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Verify a marketplace purchase transaction on-chain
 * @param txHash - Transaction hash to verify
 * @param expectedTokenId - Expected car token ID that was transferred
 * @param expectedBuyer - Expected buyer address
 * @returns True if transaction is valid and matches expectations
 */
export async function verifyPurchaseTransaction(
  txHash: string,
  expectedTokenId: number,
  expectedBuyer: string
): Promise<boolean> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      throw new Error("Transaction not found");
    }

    if (!receipt.status) {
      throw new Error("Transaction failed");
    }

    // Parse Transfer event from Car contract
    const iface = carContract.interface;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsed && parsed.name === "Transfer") {
          const [, to, tokenId] = parsed.args;
          return (
            to.toLowerCase() === expectedBuyer.toLowerCase() && Number(tokenId) === expectedTokenId
          );
        }
      } catch {
        continue;
      }
    }

    return false;
  } catch (error) {
    console.error("Verify purchase transaction error:", error);
    return false;
  }
}
