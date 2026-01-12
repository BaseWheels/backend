/**
 * Transfer Ownership MockIDRX Contract ke Backend Wallet
 *
 * Karena MockIDRX menggunakan Ownable (bukan AccessControl),
 * backend wallet harus menjadi owner untuk bisa mint.
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const MOCKIDRX_CONTRACT_ADDRESS = process.env.MOCKIDRX_CONTRACT_ADDRESS;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;

const ABI = [
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)"
];

async function transferOwnership() {
  console.log("🔄 Transfer MockIDRX Ownership to Backend");
  console.log("========================================\n");

  if (!OWNER_PRIVATE_KEY) {
    console.log("❌ Missing OWNER_PRIVATE_KEY in .env");
    console.log("\nUsage:");
    console.log("  1. Add to .env:");
    console.log("     OWNER_PRIVATE_KEY=0x...");
    console.log("     BACKEND_WALLET_ADDRESS=0x...");
    console.log("  2. Run: node scripts/transfer-ownership.js");
    process.exit(1);
  }

  if (!BACKEND_WALLET_ADDRESS) {
    console.log("❌ Missing BACKEND_WALLET_ADDRESS in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

  console.log("1️⃣ Current State:");
  console.log(`   Owner Wallet: ${ownerWallet.address}`);
  console.log(`   New Owner (Backend): ${BACKEND_WALLET_ADDRESS}\n`);

  // Check balance
  const balance = await provider.getBalance(ownerWallet.address);
  console.log(`   Owner Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.log("   ❌ No ETH for gas fees!");
    process.exit(1);
  }

  // Connect to contract
  const contract = new ethers.Contract(
    MOCKIDRX_CONTRACT_ADDRESS,
    ABI,
    ownerWallet
  );

  console.log("\n2️⃣ Contract Info:");
  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    const currentOwner = await contract.owner();

    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Current Owner: ${currentOwner}`);

    if (currentOwner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
      console.log(`\n   ❌ You are not the owner!`);
      console.log(`   Your wallet: ${ownerWallet.address}`);
      console.log(`   Contract owner: ${currentOwner}`);
      process.exit(1);
    }

    console.log(`   ✅ You are the owner`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    process.exit(1);
  }

  // Confirm
  console.log("\n⚠️  WARNING:");
  console.log("   After transfer, current owner wallet will lose all privileges!");
  console.log("   Only the new owner (backend) can mint tokens.");
  console.log("");
  console.log("   Are you sure? This action cannot be undone!");
  console.log("   Press Ctrl+C to cancel or wait 5 seconds to continue...\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Transfer ownership
  console.log("3️⃣ Transferring Ownership...");
  try {
    const tx = await contract.transferOwnership(BACKEND_WALLET_ADDRESS);
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);

    const receipt = await tx.wait();
    console.log(`   ✅ Transfer confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error) {
    console.log(`   ❌ Transfer failed: ${error.message}`);
    process.exit(1);
  }

  // Verify
  console.log("\n4️⃣ Verifying...");
  const newOwner = await contract.owner();
  console.log(`   New Owner: ${newOwner}`);

  if (newOwner.toLowerCase() === BACKEND_WALLET_ADDRESS.toLowerCase()) {
    console.log(`   ✅ SUCCESS! Backend is now the owner!`);
  } else {
    console.log(`   ❌ FAILED! Owner was not changed.`);
  }

  console.log("\n========================================");
  console.log("✅ Ownership transfer complete!");
  console.log("========================================");
  console.log("\nNext steps:");
  console.log("1. Backend can now mint MockIDRX tokens");
  console.log("2. Test check-in endpoint to verify minting works");
  console.log("3. SECURE: Remove OWNER_PRIVATE_KEY from .env");
}

transferOwnership().catch(console.error);
