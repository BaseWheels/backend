"use strict";
/**
 * Supply Configuration for RWA (Real World Asset) Management
 * This controls the maximum number of cars that can be minted per series
 * based on physical inventory availability.
 *
 * These limits can be updated when new physical inventory is restocked.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERIES_REFUND_BONUS = exports.SERIES_MAX_SUPPLY = void 0;
exports.updateSeriesMaxSupply = updateSeriesMaxSupply;
exports.getSupplyStatus = getSupplyStatus;
exports.SERIES_MAX_SUPPLY = {
    "Economy": 100, // 100 physical Economy cars available
    "Sport": 50, // 50 physical Sport cars available
    "Supercar": 20, // 20 physical Supercar cars available
    "Hypercar": 10, // 10 physical Hypercar cars available
};
/**
 * Refund bonus for users who choose to exchange fragments for MockIDRX
 * when a series is sold out
 */
exports.SERIES_REFUND_BONUS = {
    "Economy": 500000, // 500k IDRX bonus for Economy fragments
    "Sport": 1000000, // 1M IDRX bonus for Sport fragments
    "Supercar": 2000000, // 2M IDRX bonus for Supercar fragments
    "Hypercar": 5000000, // 5M IDRX bonus for Hypercar fragments
};
/**
 * Update series max supply (called when restocking physical inventory)
 * @param series - Series name
 * @param newMaxSupply - New maximum supply
 */
function updateSeriesMaxSupply(series, newMaxSupply) {
    if (!(series in exports.SERIES_MAX_SUPPLY)) {
        throw new Error(`Unknown series: ${series}`);
    }
    const oldMax = exports.SERIES_MAX_SUPPLY[series];
    exports.SERIES_MAX_SUPPLY[series] = newMaxSupply;
    console.log(`✅ Supply updated for ${series}: ${oldMax} → ${newMaxSupply}`);
}
/**
 * Get current supply status for a series
 * @param series - Series name
 * @param currentMinted - Current number of minted cars
 */
function getSupplyStatus(series, currentMinted) {
    const maxSupply = exports.SERIES_MAX_SUPPLY[series] || 0;
    const available = Math.max(0, maxSupply - currentMinted);
    const soldOut = currentMinted >= maxSupply;
    const almostSoldOut = available > 0 && available <= 10;
    return {
        series,
        currentMinted,
        maxSupply,
        available,
        soldOut,
        almostSoldOut,
        refundBonus: exports.SERIES_REFUND_BONUS[series] || 0,
    };
}
//# sourceMappingURL=supply.js.map