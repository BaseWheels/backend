import { ethers } from "ethers";
export declare const provider: ethers.JsonRpcProvider;
export declare const wallet: ethers.Wallet;
export declare const mockIDRXContract: ethers.Contract;
export declare const fragmentContract: ethers.Contract;
export declare const carContract: ethers.Contract;
/**
 * Mint a fragment NFT to a user
 * @param toAddress - Recipient wallet address
 * @param fragmentType - Fragment type ID (0-4)
 * @param amount - Number of fragments to mint (default: 1)
 * @returns Transaction hash
 */
export declare function mintFragment(toAddress: string, fragmentType: number, amount?: number): Promise<string>;
/**
 * Mint a Car NFT to a user
 * @param toAddress - Recipient wallet address
 * @returns Object with tokenId and transaction hash
 * @note Contract auto-generates tokenId. ModelName/series stored off-chain in backend DB.
 */
export declare function mintCar(toAddress: string): Promise<{
    tokenId: number;
    txHash: string;
}>;
/**
 * Check if user has all 5 fragment types (0-4) for assembly
 * @param userAddress - User wallet address to check
 * @returns Boolean - true if user has at least 1 of each fragment type
 */
export declare function checkAllParts(userAddress: string): Promise<boolean>;
/**
 * Burn all 5 fragment types from user for assembly
 * @param fromAddress - User wallet address to burn from
 * @returns Transaction hash
 */
export declare function burnForAssembly(fromAddress: string): Promise<string>;
/**
 * Get MockIDRX token balance for a user
 * @param userAddress - User wallet address
 * @returns Balance in token units (e.g., 100.5 IDRX)
 */
export declare function getMockIDRXBalance(userAddress: string): Promise<number>;
/**
 * Mint MockIDRX tokens to a user (for check-in rewards)
 * @param toAddress - Recipient wallet address
 * @param amount - Amount of tokens to mint (in token units, e.g., 10 = 10 IDRX)
 * @returns Transaction hash
 * @note Requires backend wallet to be contract owner
 */
export declare function mintMockIDRX(toAddress: string, amount: number): Promise<string>;
/**
 * Verify a transfer transaction to treasury wallet
 * @param txHash - Transaction hash to verify
 * @param expectedSender - Expected address that sent tokens
 * @param expectedAmount - Expected amount transferred (in token units)
 * @returns True if transfer is valid
 */
export declare function verifyTransferTransaction(txHash: string, expectedSender: string, expectedAmount: number): Promise<boolean>;
/**
 * Verify a burn transaction on-chain (DEPRECATED - use verifyTransferTransaction instead)
 * @param txHash - Transaction hash to verify
 * @param expectedBurner - Expected address that burned tokens
 * @param expectedAmount - Expected amount burned (in token units)
 * @returns True if burn is valid
 */
export declare function verifyBurnTransaction(txHash: string, expectedBurner: string, expectedAmount: number): Promise<boolean>;
/**
 * Burn MockIDRX tokens from a user (for gacha purchases)
 * @deprecated Use verifyBurnTransaction instead - let user burn on frontend
 * @param fromAddress - User wallet address to burn tokens from
 * @param amount - Amount of tokens to burn (in token units, e.g., 100 = 100 IDRX)
 * @returns Transaction hash
 * @note User must approve backend wallet first before this can work
 */
export declare function burnMockIDRX(fromAddress: string, amount: number): Promise<string>;
/**
 * Claim faucet for user (backend pays gas)
 * @param userAddress - User wallet address to receive faucet
 * @param amount - Amount to mint (default: 1,000,000 IDRX)
 * @returns Transaction hash
 * @note Backend wallet pays gas, cooldown tracked on-chain in contract
 */
export declare function claimFaucetForUser(userAddress: string, amount?: number): Promise<string>;
//# sourceMappingURL=client.d.ts.map