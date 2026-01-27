"use strict";
/**
 * MOCK Blockchain Client for Testing UI Without Real Minting
 * Enable this in .env with: MOCK_BLOCKCHAIN=true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintFragment = mintFragment;
exports.mintCar = mintCar;
exports.checkAllParts = checkAllParts;
exports.burnForAssembly = burnForAssembly;
/**
 * Mock mint a fragment NFT (no actual blockchain transaction)
 */
async function mintFragment(toAddress, fragmentType, amount = 1) {
    console.log(`🎭 MOCK: Minting ${amount}x Fragment type ${fragmentType} to ${toAddress}`);
    // Simulate delay (like real blockchain)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Return fake transaction hash
    const fakeTxHash = `0xMOCK${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
    console.log(`✅ MOCK: Fragment minted! TX: ${fakeTxHash}`);
    return fakeTxHash;
}
/**
 * Mock mint a Car NFT (no actual blockchain transaction)
 */
async function mintCar(toAddress, tokenId, modelName, series) {
    console.log(`🎭 MOCK: Minting Car NFT to ${toAddress}`);
    console.log(`   - Token ID: ${tokenId}`);
    console.log(`   - Model: ${modelName} (${series})`);
    // Simulate delay (like real blockchain)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // Return fake transaction hash
    const fakeTxHash = `0xMOCK${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
    console.log(`✅ MOCK: Car NFT minted! TX: ${fakeTxHash}`);
    return fakeTxHash;
}
/**
 * Mock check if user has all fragment types
 */
async function checkAllParts(userAddress) {
    console.log(`🎭 MOCK: Checking fragments for ${userAddress}`);
    // Always return true for testing
    const hasAllParts = Math.random() > 0.5; // 50% chance
    console.log(`✅ MOCK: Has all parts: ${hasAllParts}`);
    return hasAllParts;
}
/**
 * Mock burn fragments for assembly
 */
async function burnForAssembly(fromAddress) {
    console.log(`🎭 MOCK: Burning fragments from ${fromAddress}`);
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const fakeTxHash = `0xMOCK${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
    console.log(`✅ MOCK: Fragments burned! TX: ${fakeTxHash}`);
    return fakeTxHash;
}
//# sourceMappingURL=client-mock.js.map