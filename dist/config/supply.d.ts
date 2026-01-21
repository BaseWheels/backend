/**
 * Supply Configuration for RWA (Real World Asset) Management
 * This controls the maximum number of cars that can be minted per series
 * based on physical inventory availability.
 *
 * These limits can be updated when new physical inventory is restocked.
 */
export declare const SERIES_MAX_SUPPLY: Record<string, number>;
/**
 * Refund bonus for users who choose to exchange fragments for MockIDRX
 * when a series is sold out
 */
export declare const SERIES_REFUND_BONUS: Record<string, number>;
/**
 * Update series max supply (called when restocking physical inventory)
 * @param series - Series name
 * @param newMaxSupply - New maximum supply
 */
export declare function updateSeriesMaxSupply(series: string, newMaxSupply: number): void;
/**
 * Get current supply status for a series
 * @param series - Series name
 * @param currentMinted - Current number of minted cars
 */
export declare function getSupplyStatus(series: string, currentMinted: number): {
    series: string;
    currentMinted: number;
    maxSupply: number;
    available: number;
    soldOut: boolean;
    almostSoldOut: boolean;
    refundBonus: number;
};
//# sourceMappingURL=supply.d.ts.map