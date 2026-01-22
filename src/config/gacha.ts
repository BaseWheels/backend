/**
 * Gacha Box Configuration
 * Defines gacha box types, costs, and reward probabilities
 */

// Fragment type constants (matches smart contract)
export const FRAGMENT_TYPES = {
  CHASSIS: 0,
  WHEELS: 1,
  ENGINE: 2,
  BODY: 3,
  INTERIOR: 4,
} as const;

export type FragmentType = typeof FRAGMENT_TYPES[keyof typeof FRAGMENT_TYPES];

export const FRAGMENT_NAMES: Record<FragmentType, string> = {
  [FRAGMENT_TYPES.CHASSIS]: "Chassis",
  [FRAGMENT_TYPES.WHEELS]: "Wheels",
  [FRAGMENT_TYPES.ENGINE]: "Engine",
  [FRAGMENT_TYPES.BODY]: "Body",
  [FRAGMENT_TYPES.INTERIOR]: "Interior",
};

// Base reward interface
interface BaseReward {
  rarity: "common" | "rare" | "epic" | "legendary";
  probability: number; // 0-100
}

// Car reward
export interface CarReward extends BaseReward {
  rewardType: "car";
  modelName: string;
  series: string;
}

// Fragment reward
export interface FragmentReward extends BaseReward {
  rewardType: "fragment";
  fragmentType: FragmentType;
  amount: number;
  brand: string;   // Car brand this fragment belongs to (e.g., "Honda Civic")
  series: string;  // Car series (e.g., "Economy", "Sport")
}

export type GachaReward = CarReward | FragmentReward;

export interface GachaBox {
  type: "standard" | "rare" | "premium" | "legendary";
  costCoins: number;
  rewards: GachaReward[];
}

/**
 * Gacha Box Types
 */
export const GACHA_BOXES: Record<string, GachaBox> = {
  standard: {
    type: "standard",
    costCoins: 25000,
    rewards: [
      // Honda Civic Fragments (Economy)
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 12, brand: "Honda Civic", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 12, brand: "Honda Civic", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.BODY, amount: 1, probability: 10, brand: "Honda Civic", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.ENGINE, amount: 1, probability: 8, brand: "Honda Civic", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.INTERIOR, amount: 1, probability: 8, brand: "Honda Civic", series: "Economy" },
      // Toyota Corolla Fragments (Economy)
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 6, brand: "Toyota Corolla", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 6, brand: "Toyota Corolla", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.BODY, amount: 1, probability: 5, brand: "Toyota Corolla", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.ENGINE, amount: 1, probability: 4, brand: "Toyota Corolla", series: "Economy" },
      { rewardType: "fragment", rarity: "common", fragmentType: FRAGMENT_TYPES.INTERIOR, amount: 1, probability: 4, brand: "Toyota Corolla", series: "Economy" },
      // Cars (15% total)
      { rewardType: "car", rarity: "common", modelName: "Honda Civic", series: "Economy", probability: 5 },
      { rewardType: "car", rarity: "common", modelName: "Toyota Corolla", series: "Economy", probability: 5 },
      { rewardType: "car", rarity: "rare", modelName: "BMW M3", series: "Sport", probability: 5 },
    ],
  },
  rare: {
    type: "rare",
    costCoins: 30000,
    rewards: [
      // BMW M3 Fragments (Sport)
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 10, brand: "BMW M3", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 10, brand: "BMW M3", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.BODY, amount: 1, probability: 8, brand: "BMW M3", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.ENGINE, amount: 1, probability: 8, brand: "BMW M3", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.INTERIOR, amount: 1, probability: 6, brand: "BMW M3", series: "Sport" },
      // Audi RS6 Fragments (Sport)
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 6, brand: "Audi RS6", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 6, brand: "Audi RS6", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.BODY, amount: 1, probability: 4, brand: "Audi RS6", series: "Sport" },
      // Cars (42% total)
      { rewardType: "car", rarity: "rare", modelName: "BMW M3", series: "Sport", probability: 15 },
      { rewardType: "car", rarity: "rare", modelName: "Audi RS6", series: "Sport", probability: 12 },
      { rewardType: "car", rarity: "rare", modelName: "Mercedes AMG GT", series: "Sport", probability: 10 },
      { rewardType: "car", rarity: "epic", modelName: "Porsche 911 Turbo", series: "Supercar", probability: 5 },
    ],
  },
  premium: {
    type: "premium",
    costCoins: 35000,
    rewards: [
      // Porsche 911 Fragments (Sport)
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 10, brand: "Porsche 911", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 10, brand: "Porsche 911", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.BODY, amount: 1, probability: 8, brand: "Porsche 911", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.ENGINE, amount: 1, probability: 6, brand: "Porsche 911", series: "Sport" },
      { rewardType: "fragment", rarity: "rare", fragmentType: FRAGMENT_TYPES.INTERIOR, amount: 1, probability: 6, brand: "Porsche 911", series: "Sport" },
      // Ferrari F8 Fragments (Supercar)
      { rewardType: "fragment", rarity: "epic", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 5, brand: "Ferrari F8", series: "Supercar" },
      { rewardType: "fragment", rarity: "epic", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 5, brand: "Ferrari F8", series: "Supercar" },
      // Cars (50% total)
      { rewardType: "car", rarity: "rare", modelName: "Porsche 911", series: "Sport", probability: 20 },
      { rewardType: "car", rarity: "rare", modelName: "Mercedes AMG", series: "Luxury", probability: 10 },
      { rewardType: "car", rarity: "epic", modelName: "Ferrari F8", series: "Supercar", probability: 10 },
      { rewardType: "car", rarity: "epic", modelName: "Lamborghini Huracan", series: "Supercar", probability: 10 },
    ],
  },
  legendary: {
    type: "legendary",
    costCoins: 50000,
    rewards: [
      // McLaren 720S Fragments (Hypercar)
      { rewardType: "fragment", rarity: "epic", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 8, brand: "McLaren 720S", series: "Hypercar" },
      { rewardType: "fragment", rarity: "epic", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 8, brand: "McLaren 720S", series: "Hypercar" },
      { rewardType: "fragment", rarity: "epic", fragmentType: FRAGMENT_TYPES.BODY, amount: 1, probability: 6, brand: "McLaren 720S", series: "Hypercar" },
      { rewardType: "fragment", rarity: "epic", fragmentType: FRAGMENT_TYPES.ENGINE, amount: 1, probability: 4, brand: "McLaren 720S", series: "Hypercar" },
      { rewardType: "fragment", rarity: "epic", fragmentType: FRAGMENT_TYPES.INTERIOR, amount: 1, probability: 4, brand: "McLaren 720S", series: "Hypercar" },
      // Bugatti Chiron Fragments (Hypercar)
      { rewardType: "fragment", rarity: "legendary", fragmentType: FRAGMENT_TYPES.CHASSIS, amount: 1, probability: 3, brand: "Bugatti Chiron", series: "Hypercar" },
      { rewardType: "fragment", rarity: "legendary", fragmentType: FRAGMENT_TYPES.WHEELS, amount: 1, probability: 3, brand: "Bugatti Chiron", series: "Hypercar" },
      { rewardType: "fragment", rarity: "legendary", fragmentType: FRAGMENT_TYPES.ENGINE, amount: 1, probability: 2, brand: "Bugatti Chiron", series: "Hypercar" },
      { rewardType: "fragment", rarity: "legendary", fragmentType: FRAGMENT_TYPES.BODY, amount: 1, probability: 2, brand: "Bugatti Chiron", series: "Hypercar" },
      // Cars (60% total)
      { rewardType: "car", rarity: "epic", modelName: "McLaren 720S", series: "Hypercar", probability: 25 },
      { rewardType: "car", rarity: "legendary", modelName: "Bugatti Chiron", series: "Hypercar", probability: 20 },
      { rewardType: "car", rarity: "legendary", modelName: "Koenigsegg Jesko", series: "Hypercar", probability: 10 },
      { rewardType: "car", rarity: "legendary", modelName: "Pagani Huayra", series: "Limited Edition", probability: 5 },
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
  return rewards[0]!; // Non-null assertion since we know rewards array is not empty
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
