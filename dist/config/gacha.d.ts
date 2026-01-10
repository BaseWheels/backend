/**
 * Gacha Box Configuration
 * Defines gacha box types, costs, and reward probabilities
 */
export interface GachaReward {
    rarity: "common" | "rare" | "epic" | "legendary";
    modelName: string;
    series: string;
    probability: number;
}
export interface GachaBox {
    type: "standard" | "premium" | "legendary";
    costCoins: number;
    rewards: GachaReward[];
}
/**
 * Gacha Box Types
 */
export declare const GACHA_BOXES: Record<string, GachaBox>;
/**
 * Select a random reward based on probability distribution
 */
export declare function selectRandomReward(rewards: GachaReward[]): GachaReward;
/**
 * Generate a unique token ID for NFT
 * Using timestamp + random number to ensure uniqueness
 */
export declare function generateTokenId(): number;
//# sourceMappingURL=gacha.d.ts.map