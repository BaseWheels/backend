/**
 * Verify Backend Setup - Check all prerequisites
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;

const ABI = [
  "function authorizedMinters(address) external view returns (bool)",
  "function owner() external view returns (address)"
];

async function verifySetup() {
  console.log("🔍 Backend Setup Verification");
  console.log("========================================\n");

  // 1. Check environment variables
  console.log("1️⃣ Environment Variables:");
  console.log(`   RPC_URL: ${RPC_URL}`);
  console.log(`   CAR_CONTRACT: ${CAR_CONTRACT_ADDRESS}`);
  console.log(`   FRAGMENT_CONTRACT: ${FRAGMENT_CONTRACT_ADDRESS}`);

  if (!BACKEND_PRIVATE_KEY) {
    console.log("   ❌ BACKEND_PRIVATE_KEY not set!");
    process.exit(1);
  }
  console.log("   ✅ BACKEND_PRIVATE_KEY is set");

  // 2. Connect to network
  console.log("\n2️⃣ Network Connection:");
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    const network = await provider.getNetwork();
    console.log(`   ✅ Connected to chain ID: ${network.chainId}`);

    if (network.chainId !== 84532n) {
      console.log("   ⚠️  WARNING: Expected Base Sepolia (84532), got different chain!");
    }
  } catch (error) {
    console.log(`   ❌ Failed to connect: ${error.message}`);
    process.exit(1);
  }

  // 3. Check backend wallet
  console.log("\n3️⃣ Backend Wallet:");
  const wallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);
  console.log(`   Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`   Balance: ${balanceEth} ETH`);

  if (balance === 0n) {
    console.log("   ❌ No ETH for gas fees!");
    console.log("   → Get ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
  } else if (parseFloat(balanceEth) < 0.01) {
    console.log("   ⚠️  Low balance! Recommend at least 0.1 ETH");
  } else {
    console.log("   ✅ Sufficient balance");
  }

  // 4. Check Car Contract authorization
  console.log("\n4️⃣ Car Contract (ERC721):");
  const carContract = new ethers.Contract(CAR_CONTRACT_ADDRESS, ABI, provider);

  try {
    const owner = await carContract.owner();
    console.log(`   Owner: ${owner}`);

    const isAuthorized = await carContract.authorizedMinters(wallet.address);
    console.log(`   Is Backend Wallet Authorized? ${isAuthorized ? '✅ YES' : '❌ NO'}`);

    if (!isAuthorized) {
      console.log("   → Run: node scripts/authorize-minter.js");
    }
  } catch (error) {
    console.log(`   ❌ Failed to check: ${error.message}`);
  }

  // 5. Check Fragment Contract authorization
  console.log("\n5️⃣ Fragment Contract (ERC1155):");
  const fragmentContract = new ethers.Contract(FRAGMENT_CONTRACT_ADDRESS, ABI, provider);

  try {
    const owner = await fragmentContract.owner();
    console.log(`   Owner: ${owner}`);

    const isAuthorized = await fragmentContract.authorizedMinters(wallet.address);
    console.log(`   Is Backend Wallet Authorized? ${isAuthorized ? '✅ YES' : '❌ NO'}`);

    if (!isAuthorized) {
      console.log("   → Run: node scripts/authorize-minter.js");
    }
  } catch (error) {
    console.log(`   ❌ Failed to check: ${error.message}`);
  }

  console.log("\n========================================");
  console.log("Verification complete!");
  console.log("========================================");
}

verifySetup().catch(console.error);
