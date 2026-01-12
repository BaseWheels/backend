/**
 * Test Minting - Verify backend can mint NFTs
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;
const MOCKIDRX_CONTRACT_ADDRESS = process.env.MOCKIDRX_CONTRACT_ADDRESS;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

const CAR_ABI = [
  "function mintCar(address to) external returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
];

const FRAGMENT_ABI = [
  "function mintFragment(address to, uint256 fragmentType, uint256 amount) external",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
];

const MOCKIDRX_ABI = [
  "function mintTreasury(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

async function testMintCar(backendWallet) {
  console.log("\n🚗 Testing Car Minting...");
  console.log("======================================");

  try {
    const carContract = new ethers.Contract(
      CAR_CONTRACT_ADDRESS,
      CAR_ABI,
      backendWallet
    );

    // Get current balance
    const balanceBefore = await carContract.balanceOf(backendWallet.address);
    console.log(`   Current balance: ${balanceBefore} cars`);

    // Try to mint
    console.log(`   🔄 Minting car to backend wallet...`);
    const tx = await carContract.mintCar(backendWallet.address);
    console.log(`   ⏳ TX: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Mint successful!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // Verify balance increased
    const balanceAfter = await carContract.balanceOf(backendWallet.address);
    console.log(`   New balance: ${balanceAfter} cars`);

    if (balanceAfter > balanceBefore) {
      console.log(`   ✅ Car NFT minted successfully!`);
      return true;
    } else {
      console.log(`   ⚠️  Balance didn't increase`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Failed to mint car: ${error.message.substring(0, 100)}`);
    if (error.message.includes("not a minter") || error.message.includes("not authorized")) {
      console.log(`   → Backend wallet is not authorized as minter`);
    }
    return false;
  }
}

async function testMintFragment(backendWallet) {
  console.log("\n🧩 Testing Fragment Minting...");
  console.log("======================================");

  try {
    const fragmentContract = new ethers.Contract(
      FRAGMENT_CONTRACT_ADDRESS,
      FRAGMENT_ABI,
      backendWallet
    );

    // Test minting fragment type 0 (CHASSIS)
    const fragmentType = 0;
    const amount = 1;

    // Get current balance
    const balanceBefore = await fragmentContract.balanceOf(backendWallet.address, fragmentType);
    console.log(`   Current balance (type ${fragmentType}): ${balanceBefore}`);

    // Try to mint
    console.log(`   🔄 Minting fragment type ${fragmentType}...`);
    const tx = await fragmentContract.mintFragment(backendWallet.address, fragmentType, amount);
    console.log(`   ⏳ TX: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Mint successful!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // Verify balance increased
    const balanceAfter = await fragmentContract.balanceOf(backendWallet.address, fragmentType);
    console.log(`   New balance (type ${fragmentType}): ${balanceAfter}`);

    if (balanceAfter > balanceBefore) {
      console.log(`   ✅ Fragment NFT minted successfully!`);
      return true;
    } else {
      console.log(`   ⚠️  Balance didn't increase`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Failed to mint fragment: ${error.message.substring(0, 100)}`);
    if (error.message.includes("not a minter") || error.message.includes("not authorized")) {
      console.log(`   → Backend wallet is not authorized as minter`);
    }
    return false;
  }
}

async function testMintMockIDRX(backendWallet) {
  console.log("\n💰 Testing MockIDRX Minting...");
  console.log("======================================");

  try {
    const mockIDRXContract = new ethers.Contract(
      MOCKIDRX_CONTRACT_ADDRESS,
      MOCKIDRX_ABI,
      backendWallet
    );

    const decimals = await mockIDRXContract.decimals();
    const amount = ethers.parseUnits("100", decimals); // Mint 100 IDRX

    // Get current balance
    const balanceBefore = await mockIDRXContract.balanceOf(backendWallet.address);
    console.log(`   Current balance: ${ethers.formatUnits(balanceBefore, decimals)} IDRX`);

    // Try to mint
    console.log(`   🔄 Minting 100 IDRX to backend wallet...`);
    const tx = await mockIDRXContract.mintTreasury(backendWallet.address, amount);
    console.log(`   ⏳ TX: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Mint successful!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // Verify balance increased
    const balanceAfter = await mockIDRXContract.balanceOf(backendWallet.address);
    console.log(`   New balance: ${ethers.formatUnits(balanceAfter, decimals)} IDRX`);

    if (balanceAfter > balanceBefore) {
      console.log(`   ✅ MockIDRX minted successfully!`);
      return true;
    } else {
      console.log(`   ⚠️  Balance didn't increase`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Failed to mint MockIDRX: ${error.message.substring(0, 100)}`);
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log(`   → Backend wallet is not the owner`);
    }
    return false;
  }
}

async function main() {
  console.log("🧪 Test Minting - All Contracts");
  console.log("========================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const backendWallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);

  console.log(`Backend Wallet: ${backendWallet.address}`);

  // Check balance
  const balance = await provider.getBalance(backendWallet.address);
  console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.log("❌ Backend wallet has no ETH for gas fees!");
    process.exit(1);
  }

  // Test all minting
  const mockIDRXSuccess = await testMintMockIDRX(backendWallet);
  const carSuccess = await testMintCar(backendWallet);
  const fragmentSuccess = await testMintFragment(backendWallet);

  // Summary
  console.log("\n========================================");
  console.log("📊 TEST RESULTS");
  console.log("========================================");
  console.log(`MockIDRX: ${mockIDRXSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Car NFT: ${carSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Fragment NFT: ${fragmentSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log("========================================\n");

  if (mockIDRXSuccess && carSuccess && fragmentSuccess) {
    console.log("🎉 All tests passed! Backend can mint everything!");
    console.log("\nYour backend is ready to:");
    console.log("  - Mint MockIDRX tokens (check-in rewards)");
    console.log("  - Mint Car NFTs (gacha rewards)");
    console.log("  - Mint Fragment NFTs (check-in rewards)");
  } else {
    console.log("⚠️  Some tests failed. Check permissions above.");
  }
}

main().catch(console.error);
