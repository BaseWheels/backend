/**
 * Script to check who is the owner of the contract
 */

const { ethers } = require("ethers");

const RPC_URL = "https://sepolia.base.org";
const CAR_CONTRACT_ADDRESS = "0xb744cec7EfA685301Cc24EAFfdC2a0B4975e5B30";

// Minimal ABI
const ABI = [
  "function owner() external view returns (address)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function getRoleAdmin(bytes32 role) external view returns (bytes32)"
];

// Role hashes
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

async function checkOwner() {
  try {
    console.log("🔍 Checking Contract Owner & Roles");
    console.log("========================================\n");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CAR_CONTRACT_ADDRESS, ABI, provider);

    // Check owner
    try {
      const owner = await contract.owner();
      console.log(`✅ Contract Owner: ${owner}\n`);
    } catch (e) {
      console.log("⚠️ Contract doesn't have owner() function (using roles only)\n");
    }

    // Check who has DEFAULT_ADMIN_ROLE
    const currentWallet = "0xAb4cBeFaeb226BC23F6399E0327F40e362cdDC3B";

    console.log("Checking roles for wallet:", currentWallet);
    const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, currentWallet);
    const hasMinterRole = await contract.hasRole(MINTER_ROLE, currentWallet);

    console.log(`  DEFAULT_ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
    console.log(`  MINTER_ROLE: ${hasMinterRole ? '✅ YES' : '❌ NO'}`);

    console.log("\n========================================");

    if (!hasAdminRole) {
      console.log("❌ Current wallet CANNOT grant MINTER_ROLE!");
      console.log("\nSolutions:");
      console.log("1. Use wallet yang deploy contract (has DEFAULT_ADMIN_ROLE)");
      console.log("2. Check di BaseScan event logs siapa yang punya admin role");
      console.log("3. Grant role manual via BaseScan Write Contract");
    } else {
      console.log("✅ Current wallet CAN grant MINTER_ROLE!");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

checkOwner();
