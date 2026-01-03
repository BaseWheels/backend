import { ethers } from "ethers";
import {
  FRAGMENT_CONTRACT_ABI,
  FRAGMENT_CONTRACT_ADDRESS,
  CAR_CONTRACT_ABI,
  CAR_CONTRACT_ADDRESS
} from "./config";

if (!process.env.RPC_URL) {
  throw new Error("Missing RPC_URL environment variable");
}

if (!process.env.BACKEND_PRIVATE_KEY) {
  throw new Error("Missing BACKEND_PRIVATE_KEY environment variable");
}

export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
export const wallet = new ethers.Wallet(
  process.env.BACKEND_PRIVATE_KEY,
  provider
);

// Fragment Contract (ERC1155)
export const fragmentContract = new ethers.Contract(
  FRAGMENT_CONTRACT_ADDRESS,
  FRAGMENT_CONTRACT_ABI,
  wallet
);

// Car Contract (ERC721)
export const carContract = new ethers.Contract(
  CAR_CONTRACT_ADDRESS,
  CAR_CONTRACT_ABI,
  wallet
);

/**
 * Mint a fragment NFT to a user
 * @param toAddress - Recipient wallet address
 * @param fragmentType - Fragment type ID (0-4)
 * @param amount - Number of fragments to mint (default: 1)
 * @returns Transaction hash
 */
export async function mintFragment(
  toAddress: string,
  fragmentType: number,
  amount: number = 1
): Promise<string> {
  try {
    const tx = await fragmentContract.mint(toAddress, fragmentType, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Mint fragment error:", error);
    throw new Error("Failed to mint fragment on-chain");
  }
}

/**
 * Mint a Car NFT to a user
 * @param toAddress - Recipient wallet address
 * @param tokenId - Unique token ID for the car
 * @param modelName - Car model name (e.g., "Bugatti Chiron")
 * @param series - Car series (e.g., "Hypercar")
 * @returns Transaction hash
 */
export async function mintCar(
  toAddress: string,
  tokenId: number,
  modelName: string,
  series: string
): Promise<string> {
  try {
    const tx = await carContract.mintCar(toAddress, tokenId, modelName, series);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Mint car error:", error);
    throw new Error("Failed to mint car NFT on-chain");
  }
}

/**
 * Check if user has all 5 fragment types (0-4) for assembly
 * @param userAddress - User wallet address to check
 * @returns Boolean - true if user has all parts
 */
export async function checkAllParts(userAddress: string): Promise<boolean> {
  try {
    const hasAllParts = await fragmentContract.checkAllParts(userAddress);
    return hasAllParts;
  } catch (error) {
    console.error("Check all parts error:", error);
    throw new Error("Failed to check fragment balance on-chain");
  }
}

/**
 * Burn all 5 fragment types from user for assembly
 * @param fromAddress - User wallet address to burn from
 * @returns Transaction hash
 */
export async function burnForAssembly(fromAddress: string): Promise<string> {
  try {
    const tx = await fragmentContract.burnForAssembly(fromAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Burn for assembly error:", error);
    throw new Error("Failed to burn fragments on-chain");
  }
}
