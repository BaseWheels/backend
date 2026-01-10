"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carContract = exports.fragmentContract = exports.wallet = exports.provider = void 0;
exports.mintFragment = mintFragment;
exports.mintCar = mintCar;
exports.checkAllParts = checkAllParts;
exports.burnForAssembly = burnForAssembly;
const ethers_1 = require("ethers");
const config_1 = require("./config");
if (!process.env.RPC_URL) {
    throw new Error("Missing RPC_URL environment variable");
}
if (!process.env.BACKEND_PRIVATE_KEY) {
    throw new Error("Missing BACKEND_PRIVATE_KEY environment variable");
}
exports.provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL);
exports.wallet = new ethers_1.ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, exports.provider);
// Fragment Contract (ERC1155)
exports.fragmentContract = new ethers_1.ethers.Contract(config_1.FRAGMENT_CONTRACT_ADDRESS, config_1.FRAGMENT_CONTRACT_ABI, exports.wallet);
// Car Contract (ERC721)
exports.carContract = new ethers_1.ethers.Contract(config_1.CAR_CONTRACT_ADDRESS, config_1.CAR_CONTRACT_ABI, exports.wallet);
/**
 * Mint a fragment NFT to a user
 * @param toAddress - Recipient wallet address
 * @param fragmentType - Fragment type ID (0-4)
 * @param amount - Number of fragments to mint (default: 1)
 * @returns Transaction hash
 */
async function mintFragment(toAddress, fragmentType, amount = 1) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await exports.fragmentContract.mintFragment(toAddress, fragmentType, amount);
        const receipt = await tx.wait();
        return receipt.hash;
    }
    catch (error) {
        console.error("Mint fragment error:", error);
        throw new Error("Failed to mint fragment on-chain");
    }
}
/**
 * Mint a Car NFT to a user
 * @param toAddress - Recipient wallet address
 * @returns Object with tokenId and transaction hash
 * @note Contract auto-generates tokenId. ModelName/series stored off-chain in backend DB.
 */
async function mintCar(toAddress) {
    try {
        // Call contract - it returns tokenId directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await exports.carContract.mintCar(toAddress);
        const receipt = await tx.wait();
        // Parse logs to get tokenId from CarMinted event
        const iface = exports.carContract.interface;
        let tokenId = 0;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog({ topics: log.topics, data: log.data });
                if (parsed && parsed.name === "CarMinted") {
                    tokenId = Number(parsed.args[1]); // Second arg is tokenId
                    break;
                }
            }
            catch {
                // Skip logs that don't match
                continue;
            }
        }
        return {
            tokenId,
            txHash: receipt.hash
        };
    }
    catch (error) {
        console.error("Mint car error:", error);
        throw new Error("Failed to mint car NFT on-chain");
    }
}
/**
 * Check if user has all 5 fragment types (0-4) for assembly
 * @param userAddress - User wallet address to check
 * @returns Boolean - true if user has at least 1 of each fragment type
 */
async function checkAllParts(userAddress) {
    try {
        // Contract returns array of balances [CHASSIS, WHEELS, ENGINE, BODY, INTERIOR]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const balances = await exports.fragmentContract.checkAllParts(userAddress);
        // Check if user has at least 1 of each fragment type
        return balances.every((balance) => balance >= 1n);
    }
    catch (error) {
        console.error("Check all parts error:", error);
        throw new Error("Failed to check fragment balance on-chain");
    }
}
/**
 * Burn all 5 fragment types from user for assembly
 * @param fromAddress - User wallet address to burn from
 * @returns Transaction hash
 */
async function burnForAssembly(fromAddress) {
    try {
        // Burn 1 of each fragment type (0-4)
        const fragmentIds = [0, 1, 2, 3, 4]; // CHASSIS, WHEELS, ENGINE, BODY, INTERIOR
        const amounts = [1, 1, 1, 1, 1]; // 1 of each
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await exports.fragmentContract.burnForAssembly(fromAddress, fragmentIds, amounts);
        const receipt = await tx.wait();
        return receipt.hash;
    }
    catch (error) {
        console.error("Burn for assembly error:", error);
        throw new Error("Failed to burn fragments on-chain");
    }
}
//# sourceMappingURL=client.js.map