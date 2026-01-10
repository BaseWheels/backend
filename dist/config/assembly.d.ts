/**
 * Assembly Forge Configuration
 * Defines car models that can be assembled from 5 fragments
 */
export interface AssembledCar {
    modelName: string;
    series: string;
    rarity: "rare" | "epic" | "legendary";
    probability: number;
}
/**
 * Possible cars that can be assembled
 * Higher rarity = lower probability
 */
export declare const ASSEMBLED_CARS: AssembledCar[];
/**
 * Select a random assembled car based on probability distribution
 */
export declare function selectRandomAssembledCar(): AssembledCar;
/**
 * Generate a unique token ID for assembled car NFT
 */
export declare function generateAssemblyTokenId(): number;
//# sourceMappingURL=assembly.d.ts.map