/**
 * Check Current Balances
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;
const MOCKIDRX_CONTRACT_ADDRESS = process.env.MOCKIDRX_CONTRACT_ADDRESS;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

async function main() {
  console.log("💰 Current Balance Check");
  console.log("========================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const backendWallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);

  console.log(`Backend Wallet: ${backendWallet.address}\n`);

  // MockIDRX
  console.log("1️⃣ MockIDRX (ERC20):");
  const mockIDRXContract = new ethers.Contract(
    MOCKIDRX_CONTRACT_ADDRESS,
    ["function balanceOf(address) external view returns (uint256)", "function decimals() external view returns (uint8)"],
    provider
  );
  const mockIDRXBalance = await mockIDRXContract.balanceOf(backendWallet.address);
  const decimals = await mockIDRXContract.decimals();
  console.log(`   Balance: ${ethers.formatUnits(mockIDRXBalance, decimals)} IDRX\n`);

  // Car NFT
  console.log("2️⃣ Car NFT (ERC721):");
  const carContract = new ethers.Contract(
    CAR_CONTRACT_ADDRESS,
    [
      "function balanceOf(address) external view returns (uint256)",
      "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)"
    ],
    provider
  );

  try {
    const carBalance = await carContract.balanceOf(backendWallet.address);
    console.log(`   Balance: ${carBalance.toString()} cars`);

    if (carBalance > 0) {
      console.log(`   Token IDs owned:`);
      for (let i = 0; i < carBalance; i++) {
        try {
          const tokenId = await carContract.tokenOfOwnerByIndex(backendWallet.address, i);
          console.log(`     - Token #${tokenId.toString()}`);
        } catch (e) {
          // tokenOfOwnerByIndex might not be implemented
          console.log(`     - (Cannot enumerate tokens)`);
          break;
        }
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Error checking balance: ${error.message.substring(0, 80)}`);
  }
  console.log();

  // Fragment NFT
  console.log("3️⃣ Fragment NFT (ERC1155):");
  const fragmentContract = new ethers.Contract(
    FRAGMENT_CONTRACT_ADDRESS,
    ["function balanceOf(address account, uint256 id) external view returns (uint256)"],
    provider
  );

  const fragmentTypes = ["CHASSIS", "WHEELS", "ENGINE", "BODY", "INTERIOR"];
  console.log(`   Fragment balances by type:`);
  for (let i = 0; i < 5; i++) {
    const balance = await fragmentContract.balanceOf(backendWallet.address, i);
    console.log(`     Type ${i} (${fragmentTypes[i]}): ${balance.toString()}`);
  }

  console.log("\n========================================");
  console.log("✅ Balance check complete!");
}

main().catch(console.error);
