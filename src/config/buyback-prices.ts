/**
 * Admin Buyback Pricing Configuration
 * Prices in IDRX (Rupiah) for buying back cars from users
 */

export const BUYBACK_PRICES = {
  common: 150000, // 150k IDRX
  rare: 300000, // 300k IDRX
  epic: 600000, // 600k IDRX
  legendary: 1200000, // 1.2M IDRX
} as const;

export type Rarity = keyof typeof BUYBACK_PRICES;

/**
 * Get buyback price for a specific rarity
 * @param rarity - Car rarity level
 * @returns Buyback price in IDRX
 */
export function getBuybackPrice(rarity: string): number {
  const normalizedRarity = rarity.toLowerCase() as Rarity;

  if (!(normalizedRarity in BUYBACK_PRICES)) {
    throw new Error(`Invalid rarity: ${rarity}`);
  }

  return BUYBACK_PRICES[normalizedRarity];
}

/**
 * Check if rarity is valid
 * @param rarity - Rarity string to check
 * @returns True if rarity is valid
 */
export function isValidRarity(rarity: string): boolean {
  return rarity.toLowerCase() in BUYBACK_PRICES;
}
