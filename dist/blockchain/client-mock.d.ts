/**
 * MOCK Blockchain Client for Testing UI Without Real Minting
 * Enable this in .env with: MOCK_BLOCKCHAIN=true
 */
/**
 * Mock mint a fragment NFT (no actual blockchain transaction)
 */
export declare function mintFragment(toAddress: string, fragmentType: number, amount?: number): Promise<string>;
/**
 * Mock mint a Car NFT (no actual blockchain transaction)
 */
export declare function mintCar(toAddress: string, tokenId: number, modelName: string, series: string): Promise<string>;
/**
 * Mock check if user has all fragment types
 */
export declare function checkAllParts(userAddress: string): Promise<boolean>;
/**
 * Mock burn fragments for assembly
 */
export declare function burnForAssembly(fromAddress: string): Promise<string>;
//# sourceMappingURL=client-mock.d.ts.map