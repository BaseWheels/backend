import { ethers } from "ethers";
export declare const provider: ethers.JsonRpcProvider;
export declare const wallet: ethers.Wallet;
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
//# sourceMappingURL=client.d.ts.map