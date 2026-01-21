/**
 * Verify car ownership on-chain
 * @param tokenId - Car NFT token ID
 * @param expectedOwner - Expected owner wallet address
 * @returns True if expectedOwner owns the car
 */
export declare function verifyCarOwnership(tokenId: number, expectedOwner: string): Promise<boolean>;
/**
 * Check if car is approved for transfer by backend wallet
 * @param tokenId - Car NFT token ID
 * @returns True if car is approved to backend wallet
 */
export declare function verifyCarApproval(tokenId: number): Promise<boolean>;
/**
 * Check if buyer has approved backend to spend IDRX
 * @param owner - Buyer wallet address
 * @param amount - Amount of IDRX needed (in token units, not wei)
 * @returns True if allowance is sufficient
 */
export declare function verifyIDRXAllowance(owner: string, amount: number): Promise<boolean>;
/**
 * Execute atomic purchase: transfer IDRX from buyer to seller, then transfer car from seller to buyer
 * @param tokenId - Car NFT token ID
 * @param buyerAddress - Buyer wallet address
 * @param sellerAddress - Seller wallet address
 * @param price - Price in IDRX (token units, not wei)
 * @returns Transaction hash of the car transfer
 */
export declare function executePurchase(tokenId: number, buyerAddress: string, sellerAddress: string, price: number): Promise<{
    txHash: string;
}>;
/**
 * Verify a marketplace purchase transaction on-chain
 * @param txHash - Transaction hash to verify
 * @param expectedTokenId - Expected car token ID that was transferred
 * @param expectedBuyer - Expected buyer address
 * @returns True if transaction is valid and matches expectations
 */
export declare function verifyPurchaseTransaction(txHash: string, expectedTokenId: number, expectedBuyer: string): Promise<boolean>;
//# sourceMappingURL=marketplace-client.d.ts.map