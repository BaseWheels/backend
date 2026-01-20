import { ethers } from "ethers";
import { carContract, mockIDRXContract, wallet, provider } from "./client";

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
export async function verifyIDRXAllowance(
  owner: string,
  amount: number
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals: number = await (mockIDRXContract as any).decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowance: bigint = await (mockIDRXContract as any).allowance(
      owner,
      wallet.address
    );

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
    // Get decimals for IDRX
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals: number = await (mockIDRXContract as any).decimals();
    const priceWei = ethers.parseUnits(price.toString(), decimals);

    // Step 1: Transfer IDRX from buyer to seller
    console.log(`Transferring ${price} IDRX from ${buyerAddress} to ${sellerAddress}...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idrxTx = await (mockIDRXContract as any).transferFrom(
      buyerAddress,
      sellerAddress,
      priceWei
    );
    await idrxTx.wait();
    console.log(`IDRX transfer successful: ${idrxTx.hash}`);

    // Step 2: Transfer car from seller to buyer
    console.log(`Transferring car tokenId ${tokenId} from ${sellerAddress} to ${buyerAddress}...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const carTx = await (carContract as any).transferFrom(
      sellerAddress,
      buyerAddress,
      tokenId
    );
    const receipt = await carTx.wait();
    console.log(`Car transfer successful: ${receipt.hash}`);

    return { txHash: receipt.hash };
  } catch (error) {
    console.error("Execute purchase error:", error);
    throw new Error(
      `Failed to execute marketplace purchase on-chain: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
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
            to.toLowerCase() === expectedBuyer.toLowerCase() &&
            Number(tokenId) === expectedTokenId
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
