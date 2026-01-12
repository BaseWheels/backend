/**
 * Add Backend Wallet as Minter
 *
 * Script untuk menambahkan backend wallet sebagai authorized minter
 * untuk Car dan Fragment contracts.
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;

// Try different authorization methods
const ADD_MINTER_ABI = [
  "function addMinter(address account) external",
  "function setMinter(address account, bool status) external",
  "function isMinter(address account) external view returns (bool)",
  "function minters(address account) external view returns (bool)",
  "function owner() external view returns (address)",
];

async function checkMinterStatus(contract, address, contractName) {
  console.log(`\n📋 Checking current minter status for ${contractName}...\n`);

  // Try isMinter()
  try {
    const isMinter = await contract.isMinter(address);
    console.log(`   isMinter(backend): ${isMinter ? '✅ YES' : '❌ NO'}`);
    return isMinter;
  } catch (error) {
    // Function might not exist
  }

  // Try minters() mapping
  try {
    const minterStatus = await contract.minters(address);
    console.log(`   minters[backend]: ${minterStatus ? '✅ YES' : '❌ NO'}`);
    return minterStatus;
  } catch (error) {
    // Function might not exist
  }

  console.log(`   ⚠️  Cannot determine minter status`);
  return false;
}

async function addMinter(contract, address, contractName) {
  console.log(`\n🔄 Adding backend as minter for ${contractName}...\n`);

  // Method 1: Try addMinter()
  try {
    console.log(`   Trying addMinter()...`);
    const tx = await contract.addMinter(address);
    console.log(`   ⏳ TX: ${tx.hash}`);
    await tx.wait();
    console.log(`   ✅ Backend added as minter via addMinter()!`);
    return true;
  } catch (error) {
    if (error.message.includes("already a minter") || error.message.includes("already has")) {
      console.log(`   ✅ Backend is already a minter!`);
      return true;
    }
    console.log(`   ❌ addMinter() failed: ${error.message.substring(0, 80)}`);
  }

  // Method 2: Try setMinter(address, true)
  try {
    console.log(`   Trying setMinter(address, true)...`);
    const tx = await contract.setMinter(address, true);
    console.log(`   ⏳ TX: ${tx.hash}`);
    await tx.wait();
    console.log(`   ✅ Backend added as minter via setMinter()!`);
    return true;
  } catch (error) {
    console.log(`   ❌ setMinter() failed: ${error.message.substring(0, 80)}`);
  }

  return false;
}

async function main() {
  console.log("🔐 Add Backend Wallet as Minter");
  console.log("========================================\n");

  // Validation
  if (!OWNER_PRIVATE_KEY) {
    console.log("❌ Missing OWNER_PRIVATE_KEY in .env");
    console.log("\nUsage:");
    console.log("  1. Add to .env:");
    console.log("     OWNER_PRIVATE_KEY=0x...");
    console.log("     BACKEND_WALLET_ADDRESS=0x...");
    console.log("  2. Run: node scripts/add-minter.js");
    process.exit(1);
  }

  if (!BACKEND_WALLET_ADDRESS) {
    console.log("❌ Missing BACKEND_WALLET_ADDRESS in .env");
    process.exit(1);
  }

  // Connect
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

  console.log("📡 Connecting to Base Sepolia...");
  console.log(`✅ Owner wallet: ${ownerWallet.address}\n`);

  // Check balance
  const balance = await provider.getBalance(ownerWallet.address);
  console.log(`💰 Owner balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.error("❌ Owner wallet has no ETH for gas fees!");
    console.log("   Get ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    process.exit(1);
  }

  console.log("📝 Backend wallet to authorize:");
  console.log(`   ${BACKEND_WALLET_ADDRESS}\n`);

  // Process Car Contract
  console.log("1️⃣ Car Contract (ERC721)");
  console.log(`   Address: ${CAR_CONTRACT_ADDRESS}`);

  const carContract = new ethers.Contract(
    CAR_CONTRACT_ADDRESS,
    ADD_MINTER_ABI,
    ownerWallet
  );

  // Check current owner
  try {
    const owner = await carContract.owner();
    console.log(`   Current Owner: ${owner}`);

    if (owner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
      console.log(`   ⚠️  You are not the owner! Cannot add minter.`);
      console.log(`   Your wallet: ${ownerWallet.address}`);
    } else {
      console.log(`   ✅ You are the owner\n`);

      // Check current status
      const isAlreadyMinter = await checkMinterStatus(carContract, BACKEND_WALLET_ADDRESS, "Car");

      if (!isAlreadyMinter) {
        // Add minter
        const carSuccess = await addMinter(carContract, BACKEND_WALLET_ADDRESS, "Car");

        if (carSuccess) {
          // Verify
          await checkMinterStatus(carContract, BACKEND_WALLET_ADDRESS, "Car");
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Process Fragment Contract
  console.log("\n2️⃣ Fragment Contract (ERC1155)");
  console.log(`   Address: ${FRAGMENT_CONTRACT_ADDRESS}`);

  const fragmentContract = new ethers.Contract(
    FRAGMENT_CONTRACT_ADDRESS,
    ADD_MINTER_ABI,
    ownerWallet
  );

  // Check current owner
  try {
    const owner = await fragmentContract.owner();
    console.log(`   Current Owner: ${owner}`);

    if (owner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
      console.log(`   ⚠️  You are not the owner! Cannot add minter.`);
      console.log(`   Your wallet: ${ownerWallet.address}`);
    } else {
      console.log(`   ✅ You are the owner\n`);

      // Check current status
      const isAlreadyMinter = await checkMinterStatus(fragmentContract, BACKEND_WALLET_ADDRESS, "Fragment");

      if (!isAlreadyMinter) {
        // Add minter
        const fragmentSuccess = await addMinter(fragmentContract, BACKEND_WALLET_ADDRESS, "Fragment");

        if (fragmentSuccess) {
          // Verify
          await checkMinterStatus(fragmentContract, BACKEND_WALLET_ADDRESS, "Fragment");
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log("\n========================================");
  console.log("🎉 Process complete!");
  console.log("========================================");
  console.log("\nNext steps:");
  console.log("1. Verify with: node scripts/inspect-contracts.js");
  console.log("2. Test backend endpoints (check-in, gacha)");
  console.log("3. SECURE: Remove OWNER_PRIVATE_KEY from .env");
}

main().catch(console.error);
