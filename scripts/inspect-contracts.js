/**
 * Inspect All Contracts - Check ownership and authorization patterns
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const MOCKIDRX_CONTRACT_ADDRESS = process.env.MOCKIDRX_CONTRACT_ADDRESS;
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

// Extended ABI to check various patterns
const INSPECT_ABI = [
  // Ownable pattern
  "function owner() external view returns (address)",

  // AccessControl pattern
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function MINTER_ROLE() external view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",

  // Basic info
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
];

const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

async function inspectContract(name, address, provider, backendWallet) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📦 ${name} Contract`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Address: ${address}\n`);

  const contract = new ethers.Contract(address, INSPECT_ABI, provider);

  // Check if contract exists
  const code = await provider.getCode(address);
  if (code === "0x") {
    console.log(`❌ No contract deployed at this address!\n`);
    return { pattern: "none", isOwner: false, hasRole: false };
  }
  console.log(`✅ Contract deployed (${code.length} bytes)\n`);

  // Get basic info
  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}\n`);
  } catch (error) {
    // Might not have name/symbol (e.g., ERC1155)
  }

  let pattern = "unknown";
  let isOwner = false;
  let hasRole = false;

  // Check Ownable pattern
  console.log("1️⃣ Checking Ownable Pattern:");
  try {
    const owner = await contract.owner();
    console.log(`   ✅ Uses Ownable pattern`);
    console.log(`   Current Owner: ${owner}`);

    isOwner = owner.toLowerCase() === backendWallet.address.toLowerCase();
    console.log(`   Backend is Owner? ${isOwner ? '✅ YES' : '❌ NO'}`);

    pattern = "ownable";
  } catch (error) {
    console.log(`   ❌ No owner() function`);
  }

  // Check AccessControl pattern
  console.log("\n2️⃣ Checking AccessControl Pattern:");
  try {
    const minterRole = await contract.MINTER_ROLE();
    console.log(`   ✅ Uses AccessControl pattern`);
    console.log(`   MINTER_ROLE: ${minterRole}`);

    hasRole = await contract.hasRole(minterRole, backendWallet.address);
    console.log(`   Backend has MINTER_ROLE? ${hasRole ? '✅ YES' : '❌ NO'}`);

    pattern = "accesscontrol";
  } catch (error) {
    console.log(`   ❌ No MINTER_ROLE() function`);
  }

  // Summary
  console.log("\n📋 Summary:");
  console.log(`   Pattern: ${pattern.toUpperCase()}`);

  if (pattern === "ownable") {
    if (isOwner) {
      console.log(`   ✅ Backend can mint (is owner)`);
    } else {
      console.log(`   ❌ Backend CANNOT mint (not owner)`);
      console.log(`   → Need to transfer ownership`);
    }
  } else if (pattern === "accesscontrol") {
    if (hasRole) {
      console.log(`   ✅ Backend can mint (has MINTER_ROLE)`);
    } else {
      console.log(`   ❌ Backend CANNOT mint (no MINTER_ROLE)`);
      console.log(`   → Need to grant MINTER_ROLE`);
    }
  } else {
    console.log(`   ⚠️  Unknown pattern - manual inspection needed`);
  }

  return { pattern, isOwner, hasRole };
}

async function main() {
  console.log("🔍 Inspecting All Contracts");
  console.log("========================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const backendWallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);

  console.log(`Backend Wallet: ${backendWallet.address}\n`);

  // Inspect all contracts
  const mockIDRXResult = await inspectContract(
    "MockIDRX (ERC20)",
    MOCKIDRX_CONTRACT_ADDRESS,
    provider,
    backendWallet
  );

  const carResult = await inspectContract(
    "BaseWheelsCars (ERC721)",
    CAR_CONTRACT_ADDRESS,
    provider,
    backendWallet
  );

  const fragmentResult = await inspectContract(
    "BaseWheelsFragments (ERC1155)",
    FRAGMENT_CONTRACT_ADDRESS,
    provider,
    backendWallet
  );

  // Final summary
  console.log(`\n${"=".repeat(50)}`);
  console.log("🎯 FINAL SUMMARY");
  console.log(`${"=".repeat(50)}\n`);

  const contracts = [
    { name: "MockIDRX", ...mockIDRXResult },
    { name: "Car", ...carResult },
    { name: "Fragment", ...fragmentResult },
  ];

  let allReady = true;
  contracts.forEach(({ name, pattern, isOwner, hasRole }) => {
    const canMint = (pattern === "ownable" && isOwner) || (pattern === "accesscontrol" && hasRole);
    console.log(`${name}: ${canMint ? '✅ READY' : '❌ NOT READY'} (${pattern})`);
    if (!canMint) allReady = false;
  });

  console.log(`\n${"=".repeat(50)}`);
  if (allReady) {
    console.log("✅ All contracts ready! Backend can mint.");
  } else {
    console.log("⚠️  Some contracts need setup:");

    contracts.forEach(({ name, pattern, isOwner, hasRole }) => {
      if (pattern === "ownable" && !isOwner) {
        console.log(`\n${name}:`);
        console.log(`  → Run: node scripts/transfer-ownership-${name.toLowerCase()}.js`);
      } else if (pattern === "accesscontrol" && !hasRole) {
        console.log(`\n${name}:`);
        console.log(`  → Owner needs to grant MINTER_ROLE to backend`);
      }
    });
  }
  console.log(`${"=".repeat(50)}`);
}

main().catch(console.error);
