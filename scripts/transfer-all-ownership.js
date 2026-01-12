/**
 * Transfer Ownership - All Contracts ke Backend Wallet
 *
 * Script ini akan transfer ownership untuk Car dan Fragment contracts
 * ke backend wallet agar backend bisa mint NFTs.
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;

const ABI = [
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)"
];

async function transferOwnership(contractName, contractAddress, ownerWallet) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📦 ${contractName} Contract`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Address: ${contractAddress}\n`);

  const contract = new ethers.Contract(contractAddress, ABI, ownerWallet);

  // Get contract info
  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    const currentOwner = await contract.owner();

    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Current Owner: ${currentOwner}\n`);

    // Check if already transferred
    if (currentOwner.toLowerCase() === BACKEND_WALLET_ADDRESS.toLowerCase()) {
      console.log("✅ Backend wallet is already the owner!");
      console.log("   No transfer needed.\n");
      return true;
    }

    // Check if we are the owner
    if (currentOwner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
      console.log(`❌ You are not the owner!`);
      console.log(`   Your wallet: ${ownerWallet.address}`);
      console.log(`   Contract owner: ${currentOwner}`);
      return false;
    }

    console.log(`✅ You are the owner. Proceeding with transfer...\n`);

    // Transfer ownership
    console.log(`🔄 Transferring ownership to: ${BACKEND_WALLET_ADDRESS}`);
    const tx = await contract.transferOwnership(BACKEND_WALLET_ADDRESS);
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);

    const receipt = await tx.wait();
    console.log(`   ✅ Transfer confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // Verify
    const newOwner = await contract.owner();
    if (newOwner.toLowerCase() === BACKEND_WALLET_ADDRESS.toLowerCase()) {
      console.log(`   ✅ Verification: Backend is now the owner!\n`);
      return true;
    } else {
      console.log(`   ❌ Verification failed! Owner was not changed.\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log("🔄 Transfer Ownership - All Contracts");
  console.log("========================================\n");

  // Validation
  if (!OWNER_PRIVATE_KEY) {
    console.log("❌ Missing OWNER_PRIVATE_KEY in .env");
    console.log("\nUsage:");
    console.log("  1. Add to .env:");
    console.log("     OWNER_PRIVATE_KEY=0x...");
    console.log("     BACKEND_WALLET_ADDRESS=0x...");
    console.log("  2. Run: node scripts/transfer-all-ownership.js");
    process.exit(1);
  }

  if (!BACKEND_WALLET_ADDRESS) {
    console.log("❌ Missing BACKEND_WALLET_ADDRESS in .env");
    process.exit(1);
  }

  // Connect
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

  console.log(`Owner Wallet: ${ownerWallet.address}`);
  console.log(`Backend Wallet: ${BACKEND_WALLET_ADDRESS}\n`);

  // Check balance
  const balance = await provider.getBalance(ownerWallet.address);
  console.log(`Owner Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.log("❌ No ETH for gas fees!");
    console.log("   Get ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    process.exit(1);
  }

  // Warning
  console.log("\n⚠️  WARNING:");
  console.log("   After transfer, current owner wallet will lose all privileges!");
  console.log("   Only the new owner (backend) can mint NFTs.");
  console.log("");
  console.log("   Press Ctrl+C to cancel or wait 5 seconds to continue...\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Transfer Car contract
  const carSuccess = await transferOwnership(
    "BaseWheelsCars (ERC721)",
    CAR_CONTRACT_ADDRESS,
    ownerWallet
  );

  // Transfer Fragment contract
  const fragmentSuccess = await transferOwnership(
    "BaseWheelsFragments (ERC1155)",
    FRAGMENT_CONTRACT_ADDRESS,
    ownerWallet
  );

  // Summary
  console.log(`${"=".repeat(50)}`);
  console.log("📊 SUMMARY");
  console.log(`${"=".repeat(50)}`);
  console.log(`Car Contract: ${carSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Fragment Contract: ${fragmentSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`${"=".repeat(50)}\n`);

  if (carSuccess && fragmentSuccess) {
    console.log("🎉 All ownership transfers complete!");
    console.log("\nNext steps:");
    console.log("1. Run: node scripts/inspect-contracts.js (verify)");
    console.log("2. Test backend endpoints (check-in, gacha)");
    console.log("3. SECURE: Remove OWNER_PRIVATE_KEY from .env");
  } else {
    console.log("⚠️  Some transfers failed. Check errors above.");
  }
}

main().catch(console.error);
