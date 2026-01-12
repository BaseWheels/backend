/**
 * Inspect MockIDRX Contract - Check available functions and ownership
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const MOCKIDRX_CONTRACT_ADDRESS = process.env.MOCKIDRX_CONTRACT_ADDRESS;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

// Extended ABI untuk inspect berbagai kemungkinan
const INSPECT_ABI = [
  // Standard ERC20
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",

  // Ownable pattern
  "function owner() external view returns (address)",

  // AccessControl pattern
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function getRoleAdmin(bytes32 role) external view returns (bytes32)",
  "function MINTER_ROLE() external view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",

  // Minting functions
  "function mint(address to, uint256 amount) external",
  "function burn(address from, uint256 amount) external",

  // Authorization check functions
  "function authorizedMinters(address) external view returns (bool)",
  "function isMinter(address) external view returns (bool)",
  "function minters(address) external view returns (bool)"
];

async function inspectContract() {
  console.log("🔍 Inspecting MockIDRX Contract");
  console.log("========================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const backendWallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);

  console.log("📋 Contract Info:");
  console.log(`   Address: ${MOCKIDRX_CONTRACT_ADDRESS}`);
  console.log(`   Backend Wallet: ${backendWallet.address}\n`);

  const contract = new ethers.Contract(
    MOCKIDRX_CONTRACT_ADDRESS,
    INSPECT_ABI,
    provider
  );

  // 1. Basic ERC20 Info
  console.log("1️⃣ ERC20 Basic Info:");
  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const totalSupply = await contract.totalSupply();

    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 2. Check Ownable
  console.log("\n2️⃣ Ownership Check:");
  try {
    const owner = await contract.owner();
    console.log(`   Contract Owner: ${owner}`);
    console.log(`   Is Backend Owner? ${owner.toLowerCase() === backendWallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
  } catch (error) {
    console.log(`   ⚠️  No owner() function: ${error.message}`);
  }

  // 3. Check AccessControl
  console.log("\n3️⃣ AccessControl Check:");

  // Try to get MINTER_ROLE
  try {
    const MINTER_ROLE = await contract.MINTER_ROLE();
    console.log(`   ✅ MINTER_ROLE exists: ${MINTER_ROLE}`);

    // Check if backend has role
    const hasRole = await contract.hasRole(MINTER_ROLE, backendWallet.address);
    console.log(`   Backend has MINTER_ROLE? ${hasRole ? '✅ YES' : '❌ NO'}`);

    // Check role admin
    try {
      const roleAdmin = await contract.getRoleAdmin(MINTER_ROLE);
      console.log(`   MINTER_ROLE admin: ${roleAdmin}`);
    } catch (e) {
      console.log(`   ⚠️  Could not get role admin`);
    }
  } catch (error) {
    console.log(`   ❌ No AccessControl: ${error.message}`);
  }

  // Try DEFAULT_ADMIN_ROLE
  try {
    const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    console.log(`   DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);

    const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, backendWallet.address);
    console.log(`   Backend has DEFAULT_ADMIN_ROLE? ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
  } catch (error) {
    // Not using AccessControl
  }

  // 4. Check alternative authorization patterns
  console.log("\n4️⃣ Alternative Authorization Patterns:");

  // Check authorizedMinters mapping
  try {
    const isAuthorizedMinter = await contract.authorizedMinters(backendWallet.address);
    console.log(`   authorizedMinters[backend]: ${isAuthorizedMinter ? '✅ YES' : '❌ NO'}`);
  } catch (error) {
    console.log(`   ⚠️  No authorizedMinters: ${error.message.substring(0, 50)}...`);
  }

  // Check isMinter function
  try {
    const isMinter = await contract.isMinter(backendWallet.address);
    console.log(`   isMinter(backend): ${isMinter ? '✅ YES' : '❌ NO'}`);
  } catch (error) {
    console.log(`   ⚠️  No isMinter: ${error.message.substring(0, 50)}...`);
  }

  // Check minters mapping
  try {
    const minterStatus = await contract.minters(backendWallet.address);
    console.log(`   minters[backend]: ${minterStatus ? '✅ YES' : '❌ NO'}`);
  } catch (error) {
    console.log(`   ⚠️  No minters: ${error.message.substring(0, 50)}...`);
  }

  // 5. Try to call mintTreasury (will fail if not authorized, but we can see the error)
  console.log("\n5️⃣ Testing Mint Permission:");
  try {
    // Use mintTreasury for Ownable pattern
    const mintABI = ["function mintTreasury(address to, uint256 amount) external"];
    const testContract = new ethers.Contract(MOCKIDRX_CONTRACT_ADDRESS, mintABI, backendWallet);

    // Estimate gas to see if it would work
    const gasEstimate = await testContract.mintTreasury.estimateGas(backendWallet.address, ethers.parseUnits("1", 18));
    console.log(`   ✅ Can mint! Estimated gas: ${gasEstimate.toString()}`);
    console.log(`   ✅ Backend wallet is authorized to mint MockIDRX`);
  } catch (error) {
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log(`   ❌ Only owner can mint`);
      console.log(`   → Transfer ownership to backend wallet`);
      console.log(`   → Run: node scripts/transfer-ownership.js`);
    } else if (error.message.includes("AccessControl")) {
      console.log(`   ❌ Missing required role`);
      console.log(`   → Need to grant role first`);
    } else if (error.message.includes("not authorized") || error.message.includes("not a minter")) {
      console.log(`   ❌ Not authorized to mint`);
      console.log(`   → Need authorization from owner`);
    } else {
      console.log(`   ⚠️  Could not test mint: ${error.message.substring(0, 100)}`);
    }
  }

  // 6. Get contract bytecode to verify deployment
  console.log("\n6️⃣ Contract Deployment Check:");
  const code = await provider.getCode(MOCKIDRX_CONTRACT_ADDRESS);
  if (code === "0x") {
    console.log(`   ❌ No contract deployed at this address!`);
  } else {
    console.log(`   ✅ Contract is deployed (${code.length} bytes)`);
  }

  console.log("\n========================================");
  console.log("Inspection complete!");
  console.log("========================================");
}

inspectContract().catch(console.error);
