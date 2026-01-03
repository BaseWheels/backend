/**
 * Gacha Box Configuration
 * Defines gacha box types, costs, and reward probabilities
 */

export interface GachaReward {
  rarity: "common" | "rare" | "epic" | "legendary";
  modelName: string;
  series: string;
  probability: number; // 0-100
}

export interface GachaBox {
  type: "standard" | "premium" | "legendary";
  costCoins: number;
  rewards: GachaReward[];
}

/**
 * Gacha Box Types
 */
export const GACHA_BOXES: Record<string, GachaBox> = {
  standard: {
    type: "standard",
    costCoins: 50,
    rewards: [
      { rarity: "common", modelName: "Honda Civic", series: "Economy", probability: 50 },
      { rarity: "common", modelName: "Toyota Corolla", series: "Economy", probability: 30 },
      { rarity: "rare", modelName: "BMW M3", series: "Sport", probability: 15 },
      { rarity: "rare", modelName: "Audi A4", series: "Luxury", probability: 5 },
    ],
  },
  premium: {
    type: "premium",
    costCoins: 150,
    rewards: [
      { rarity: "rare", modelName: "Porsche 911", series: "Sport", probability: 40 },
      { rarity: "rare", modelName: "Mercedes AMG", series: "Luxury", probability: 30 },
      { rarity: "epic", modelName: "Ferrari F8", series: "Supercar", probability: 20 },
      { rarity: "epic", modelName: "Lamborghini Huracan", series: "Supercar", probability: 10 },
    ],
  },
  legendary: {
    type: "legendary",
    costCoins: 500,
    rewards: [
      { rarity: "epic", modelName: "McLaren 720S", series: "Hypercar", probability: 50 },
      { rarity: "legendary", modelName: "Bugatti Chiron", series: "Hypercar", probability: 30 },
      { rarity: "legendary", modelName: "Koenigsegg Jesko", series: "Hypercar", probability: 15 },
      { rarity: "legendary", modelName: "Pagani Huayra", series: "Limited Edition", probability: 5 },
    ],
  },
};

/**
 * Select a random reward based on probability distribution
 */
export function selectRandomReward(rewards: GachaReward[]): GachaReward {
  const totalProbability = rewards.reduce((sum, r) => sum + r.probability, 0);
  let random = Math.random() * totalProbability;

  for (const reward of rewards) {
    random -= reward.probability;
    if (random <= 0) {
      return reward;
    }
  }

  // Fallback to first reward (should never happen)
  return rewards[0];
}

/**
 * Generate a unique token ID for NFT
 * Using timestamp + random number to ensure uniqueness
 */
export function generateTokenId(): number {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return parseInt(`${timestamp}${random}`.slice(-15)); // Ensure it fits in int range
}
