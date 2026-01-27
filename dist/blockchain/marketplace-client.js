"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCarOwnership = verifyCarOwnership;
exports.verifyCarApproval = verifyCarApproval;
exports.verifyIDRXAllowance = verifyIDRXAllowance;
exports.executePurchase = executePurchase;
exports.verifyPurchaseTransaction = verifyPurchaseTransaction;
const ethers_1 = require("ethers");
const client_1 = require("./client");
/**
 * Verify car ownership on-chain
 * @param tokenId - Car NFT token ID
 * @param expectedOwner - Expected owner wallet address
 * @returns True if expectedOwner owns the car
 */
async function verifyCarOwnership(tokenId, expectedOwner) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const owner = await client_1.carContract.ownerOf(tokenId);
        return owner.toLowerCase() === expectedOwner.toLowerCase();
    }
    catch (error) {
        console.error("Verify car ownership error:", error);
        return false;
    }
}
/**
 * Check if car is approved for transfer by backend wallet
 * @param tokenId - Car NFT token ID
 * @returns True if car is approved to backend wallet
 */
async function verifyCarApproval(tokenId) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const approved = await client_1.carContract.getApproved(tokenId);
        return approved.toLowerCase() === client_1.wallet.address.toLowerCase();
    }
    catch (error) {
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
async function verifyIDRXAllowance(owner, amount) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decimals = await client_1.mockIDRXContract.decimals();
        const amountWei = ethers_1.ethers.parseUnits(amount.toString(), decimals);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allowance = await client_1.mockIDRXContract.allowance(owner, client_1.wallet.address);
        return allowance >= amountWei;
    }
    catch (error) {
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
async function executePurchase(tokenId, buyerAddress, sellerAddress, price) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decimals = await client_1.mockIDRXContract.decimals();
        const priceWei = ethers_1.ethers.parseUnits(price.toString(), decimals);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allowance = await client_1.mockIDRXContract.allowance(buyerAddress, client_1.wallet.address);
        if (allowance < priceWei) {
            throw new Error(`Insufficient allowance. Has: ${allowance.toString()}, Needs: ${priceWei.toString()}`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buyerBalance = await client_1.mockIDRXContract.balanceOf(buyerAddress);
        if (buyerBalance < priceWei) {
            throw new Error(`Insufficient balance. Has: ${buyerBalance.toString()}, Needs: ${priceWei.toString()}`);
        }
        // Transfer IDRX from buyer to seller
        try {
            if (!client_1.wallet.provider) {
                throw new Error("Wallet provider not initialized");
            }
            const nonce1 = await client_1.wallet.provider.getTransactionCount(client_1.wallet.address, "pending");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const idrxTx = await client_1.mockIDRXContract.transferFrom(buyerAddress, sellerAddress, priceWei, { nonce: nonce1 });
            await idrxTx.wait();
        }
        catch (error) {
            throw new Error(`IDRX transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        // Transfer car from seller to buyer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentOwner = await client_1.carContract.ownerOf(tokenId);
        if (currentOwner.toLowerCase() !== sellerAddress.toLowerCase()) {
            throw new Error(`Seller doesn't own the car. Current owner: ${currentOwner}`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const approvedAddress = await client_1.carContract.getApproved(tokenId);
        if (approvedAddress.toLowerCase() !== client_1.wallet.address.toLowerCase()) {
            throw new Error(`Car not approved to backend wallet. Approved to: ${approvedAddress}`);
        }
        try {
            if (!client_1.wallet.provider) {
                throw new Error("Wallet provider not initialized");
            }
            const nonce2 = await client_1.wallet.provider.getTransactionCount(client_1.wallet.address, "pending");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const carTx = await client_1.carContract.transferFrom(sellerAddress, buyerAddress, tokenId, {
                nonce: nonce2,
            });
            const carReceipt = await carTx.wait();
            return { txHash: carReceipt.hash };
        }
        catch (error) {
            console.error("CRITICAL: IDRX transferred but car transfer failed!");
            throw new Error(`Car transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    catch (error) {
        throw new Error(`Failed to execute marketplace purchase: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Verify a marketplace purchase transaction on-chain
 * @param txHash - Transaction hash to verify
 * @param expectedTokenId - Expected car token ID that was transferred
 * @param expectedBuyer - Expected buyer address
 * @returns True if transaction is valid and matches expectations
 */
async function verifyPurchaseTransaction(txHash, expectedTokenId, expectedBuyer) {
    try {
        const receipt = await client_1.provider.getTransactionReceipt(txHash);
        if (!receipt) {
            throw new Error("Transaction not found");
        }
        if (!receipt.status) {
            throw new Error("Transaction failed");
        }
        // Parse Transfer event from Car contract
        const iface = client_1.carContract.interface;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog({
                    topics: log.topics,
                    data: log.data,
                });
                if (parsed && parsed.name === "Transfer") {
                    const [, to, tokenId] = parsed.args;
                    return (to.toLowerCase() === expectedBuyer.toLowerCase() && Number(tokenId) === expectedTokenId);
                }
            }
            catch {
                continue;
            }
        }
        return false;
    }
    catch (error) {
        console.error("Verify purchase transaction error:", error);
        return false;
    }
}
//# sourceMappingURL=marketplace-client.js.map