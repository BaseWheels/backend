/**
 * Script to grant MINTER_ROLE to backend wallet
 * Run once only, then delete this file!
 */

const { ethers } = require("ethers");

// Configuration
const RPC_URL = "https://sepolia.base.org";
const CAR_CONTRACT_ADDRESS = "0xb744cec7EfA685301Cc24EAFfdC2a0B4975e5B30";
const FRAGMENT_CONTRACT_ADDRESS = "0x832eBb3063499843070FA2C41a35c195fa38162D";

// MINTER_ROLE hash (keccak256("MINTER_ROLE"))
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

// Minimal ABI for grantRole
const ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) external view returns (bool)"
];

async function grantMinterRole() {
  try {
    console.log("🔐 Grant MINTER_ROLE Script");
    console.log("========================================\n");

    // Get private keys from environment or prompt
    const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
    const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;

    if (!OWNER_PRIVATE_KEY) {
      console.error("❌ Missing OWNER_PRIVATE_KEY in environment");
      console.log("\nUsage:");
      console.log("  OWNER_PRIVATE_KEY=0x... BACKEND_WALLET_ADDRESS=0x... node grant-minter-role.js");
      process.exit(1);
    }

    if (!BACKEND_WALLET_ADDRESS) {
      console.error("❌ Missing BACKEND_WALLET_ADDRESS in environment");
      console.log("\nUsage:");
      console.log("  OWNER_PRIVATE_KEY=0x... BACKEND_WALLET_ADDRESS=0x... node grant-minter-role.js");
      process.exit(1);
    }

    // Connect to provider
    console.log("📡 Connecting to Base Sepolia...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Create wallet from owner private key
    const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    console.log(`✅ Owner wallet: ${ownerWallet.address}\n`);

    // Get wallet balance
    const balance = await provider.getBalance(ownerWallet.address);
    console.log(`💰 Owner balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error("❌ Owner wallet has no ETH for gas fees!");
      console.log("   Get ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
      process.exit(1);
    }

    console.log("\n📝 Granting MINTER_ROLE...");
    console.log(`   Backend wallet: ${BACKEND_WALLET_ADDRESS}`);

    // Grant role for Car Contract
    console.log("\n1️⃣ Car Contract (ERC721)...");
    const carContract = new ethers.Contract(CAR_CONTRACT_ADDRESS, ABI, ownerWallet);

    // Check if already has role
    const hasCarRole = await carContract.hasRole(MINTER_ROLE, BACKEND_WALLET_ADDRESS);
    if (hasCarRole) {
      console.log("   ✅ Already has MINTER_ROLE for Car contract");
    } else {
      console.log("   🔄 Granting MINTER_ROLE...");
      const tx1 = await carContract.grantRole(MINTER_ROLE, BACKEND_WALLET_ADDRESS);
      console.log(`   ⏳ TX: ${tx1.hash}`);
      await tx1.wait();
      console.log("   ✅ MINTER_ROLE granted for Car contract!");
    }

    // Grant role for Fragment Contract
    console.log("\n2️⃣ Fragment Contract (ERC1155)...");
    const fragmentContract = new ethers.Contract(FRAGMENT_CONTRACT_ADDRESS, ABI, ownerWallet);

    const hasFragmentRole = await fragmentContract.hasRole(MINTER_ROLE, BACKEND_WALLET_ADDRESS);
    if (hasFragmentRole) {
      console.log("   ✅ Already has MINTER_ROLE for Fragment contract");
    } else {
      console.log("   🔄 Granting MINTER_ROLE...");
      const tx2 = await fragmentContract.grantRole(MINTER_ROLE, BACKEND_WALLET_ADDRESS);
      console.log(`   ⏳ TX: ${tx2.hash}`);
      await tx2.wait();
      console.log("   ✅ MINTER_ROLE granted for Fragment contract!");
    }

    console.log("\n========================================");
    console.log("🎉 SUCCESS! Backend wallet can now mint NFTs!");
    console.log("========================================");
    console.log("\nNext steps:");
    console.log("1. Update .env with backend wallet private key");
    console.log("2. Fund backend wallet with 0.1-0.5 ETH");
    console.log("3. Restart backend: npm run dev");
    console.log("4. DELETE this script file!");
    console.log("5. ROTATE owner wallet (transfer assets to new wallet)");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

// Run
grantMinterRole();
