/**
 * Script to authorize backend wallet as minter
 * Uses setMinter() function (Ownable pattern, not AccessControl)
 */

const { ethers } = require("ethers");

// Configuration
const RPC_URL = "https://sepolia.base.org";
const CAR_CONTRACT_ADDRESS = "0xb744cec7EfA685301Cc24EAFfdC2a0B4975e5B30";
const FRAGMENT_CONTRACT_ADDRESS = "0x832eBb3063499843070FA2C41a35c195fa38162D";

// Minimal ABI for setMinter
const ABI = [
  "function setMinter(address minter, bool authorized) external",
  "function authorizedMinters(address) external view returns (bool)",
  "function owner() external view returns (address)"
];

async function authorizeMinter() {
  try {
    console.log("🔐 Authorize Backend Minter Script");
    console.log("========================================\n");

    // Get environment variables
    const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
    const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;

    if (!OWNER_PRIVATE_KEY) {
      console.error("❌ Missing OWNER_PRIVATE_KEY in environment");
      console.log("\nUsage:");
      console.log("  OWNER_PRIVATE_KEY=0x... BACKEND_WALLET_ADDRESS=0x... node authorize-minter.js");
      process.exit(1);
    }

    if (!BACKEND_WALLET_ADDRESS) {
      console.error("❌ Missing BACKEND_WALLET_ADDRESS in environment");
      console.log("\nUsage:");
      console.log("  OWNER_PRIVATE_KEY=0x... BACKEND_WALLET_ADDRESS=0x... node authorize-minter.js");
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

    console.log(`\n📝 Authorizing backend wallet: ${BACKEND_WALLET_ADDRESS}\n`);

    // Authorize for Car Contract
    console.log("1️⃣ Car Contract (ERC721)...");
    const carContract = new ethers.Contract(CAR_CONTRACT_ADDRESS, ABI, ownerWallet);

    // Verify owner
    const carOwner = await carContract.owner();
    console.log(`   Contract owner: ${carOwner}`);

    if (carOwner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
      console.error(`   ❌ WARNING: Wallet ${ownerWallet.address} is NOT the owner!`);
      console.error(`   Actual owner: ${carOwner}`);
      process.exit(1);
    }

    // Check if already authorized
    const isCarMinter = await carContract.authorizedMinters(BACKEND_WALLET_ADDRESS);
    if (isCarMinter) {
      console.log("   ✅ Already authorized as minter for Car contract");
    } else {
      console.log("   🔄 Calling setMinter(true)...");
      const tx1 = await carContract.setMinter(BACKEND_WALLET_ADDRESS, true);
      console.log(`   ⏳ TX: ${tx1.hash}`);
      await tx1.wait();
      console.log("   ✅ Backend wallet authorized for Car contract!");
    }

    // Authorize for Fragment Contract
    console.log("\n2️⃣ Fragment Contract (ERC1155)...");
    const fragmentContract = new ethers.Contract(FRAGMENT_CONTRACT_ADDRESS, ABI, ownerWallet);

    // Verify owner
    const fragmentOwner = await fragmentContract.owner();
    console.log(`   Contract owner: ${fragmentOwner}`);

    if (fragmentOwner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
      console.error(`   ❌ WARNING: Wallet ${ownerWallet.address} is NOT the owner!`);
      console.error(`   Actual owner: ${fragmentOwner}`);
      process.exit(1);
    }

    const isFragmentMinter = await fragmentContract.authorizedMinters(BACKEND_WALLET_ADDRESS);
    if (isFragmentMinter) {
      console.log("   ✅ Already authorized as minter for Fragment contract");
    } else {
      console.log("   🔄 Calling setMinter(true)...");
      const tx2 = await fragmentContract.setMinter(BACKEND_WALLET_ADDRESS, true);
      console.log(`   ⏳ TX: ${tx2.hash}`);
      await tx2.wait();
      console.log("   ✅ Backend wallet authorized for Fragment contract!");
    }

    console.log("\n========================================");
    console.log("🎉 SUCCESS! Backend wallet is now authorized!");
    console.log("========================================");
    console.log("\nNext steps:");
    console.log("1. Update .env with backend wallet private key");
    console.log("2. Fund backend wallet with 0.1-0.5 ETH from faucet");
    console.log("3. Restart backend: npm run dev");
    console.log("4. Test check-in and gacha features");
    console.log("5. DELETE this script and check-owner.js");
    console.log("6. ROTATE owner wallet (transfer ownership to new secure wallet)");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

// Run
authorizeMinter();
