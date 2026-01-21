/**
 * Gacha Box Configuration
 * Defines gacha box types, costs, and reward probabilities
 */
export declare const FRAGMENT_TYPES: {
    readonly CHASSIS: 0;
    readonly WHEELS: 1;
    readonly ENGINE: 2;
    readonly BODY: 3;
    readonly INTERIOR: 4;
};
export type FragmentType = typeof FRAGMENT_TYPES[keyof typeof FRAGMENT_TYPES];
export declare const FRAGMENT_NAMES: Record<FragmentType, string>;
interface BaseReward {
    rarity: "common" | "rare" | "epic" | "legendary";
    probability: number;
}
export interface CarReward extends BaseReward {
    rewardType: "car";
    modelName: string;
    series: string;
}
export interface FragmentReward extends BaseReward {
    rewardType: "fragment";
    fragmentType: FragmentType;
    amount: number;
    brand: string;
    series: string;
}
export type GachaReward = CarReward | FragmentReward;
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
export {};
//# sourceMappingURL=gacha.d.ts.map