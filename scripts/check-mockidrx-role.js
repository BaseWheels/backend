/**
 * Check MockIDRX Minter Role - Verify backend wallet has minter permission
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;
const MOCKIDRX_CONTRACT_ADDRESS = process.env.MOCKIDRX_CONTRACT_ADDRESS;

// MockIDRX Contract ABI - hanya fungsi yang diperlukan
const ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function MINTER_ROLE() external view returns (bytes32)",
  "function owner() external view returns (address)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)"
];

async function checkMinterRole() {
  console.log("🔍 Checking MockIDRX Minter Role");
  console.log("========================================\n");

  // 1. Validasi environment variables
  console.log("1️⃣ Environment Variables:");
  console.log(`   RPC_URL: ${RPC_URL}`);
  console.log(`   MockIDRX Contract: ${MOCKIDRX_CONTRACT_ADDRESS}`);

  if (!BACKEND_PRIVATE_KEY) {
    console.log("   ❌ BACKEND_PRIVATE_KEY not set!");
    process.exit(1);
  }
  console.log("   ✅ BACKEND_PRIVATE_KEY is set");

  // 2. Connect ke network
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
    console.log("   ⚠️  No ETH for gas fees!");
    console.log("   → Get ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
  }

  // 4. Connect ke MockIDRX contract
  console.log("\n4️⃣ MockIDRX Contract Info:");
  const mockIDRXContract = new ethers.Contract(
    MOCKIDRX_CONTRACT_ADDRESS,
    ABI,
    provider
  );

  try {
    const name = await mockIDRXContract.name();
    const symbol = await mockIDRXContract.symbol();
    const decimals = await mockIDRXContract.decimals();

    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
  } catch (error) {
    console.log(`   ❌ Failed to get contract info: ${error.message}`);
    console.log("   → Make sure the contract address is correct!");
    process.exit(1);
  }

  // 5. Check contract owner
  try {
    const owner = await mockIDRXContract.owner();
    console.log(`   Owner: ${owner}`);

    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("   ✅ Backend wallet is the contract owner!");
    }
  } catch (error) {
    console.log(`   ⚠️  Could not get owner: ${error.message}`);
  }

  // 6. Check MINTER_ROLE
  console.log("\n5️⃣ Minter Role Check:");

  try {
    // Dapatkan MINTER_ROLE hash
    const MINTER_ROLE = await mockIDRXContract.MINTER_ROLE();
    console.log(`   MINTER_ROLE hash: ${MINTER_ROLE}`);

    // Check apakah backend wallet punya role
    const hasMinterRole = await mockIDRXContract.hasRole(MINTER_ROLE, wallet.address);

    if (hasMinterRole) {
      console.log(`   ✅ Backend wallet HAS minter role!`);
      console.log(`   ✅ Backend can mint MockIDRX tokens`);
    } else {
      console.log(`   ❌ Backend wallet DOES NOT have minter role!`);
      console.log(`   ❌ Backend CANNOT mint MockIDRX tokens`);
      console.log("\n   📝 To grant minter role:");
      console.log(`   1. Go to contract owner wallet`);
      console.log(`   2. Call grantRole(MINTER_ROLE, ${wallet.address})`);
      console.log(`   3. Or run: node scripts/grant-minter-role.js`);
    }

    return hasMinterRole;
  } catch (error) {
    console.log(`   ❌ Failed to check role: ${error.message}`);
    console.log(`   → Contract might not have role-based access control`);
    console.log(`   → Or contract might use different role mechanism`);
    return false;
  }
}

checkMinterRole()
  .then((hasRole) => {
    console.log("\n========================================");
    console.log(hasRole ? "✅ All checks passed!" : "⚠️  Action required!");
    console.log("========================================");
    process.exit(hasRole ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
