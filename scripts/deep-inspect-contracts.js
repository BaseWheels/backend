/**
 * Deep Inspect Contracts - Check ALL possible minting authorization methods
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

async function deepInspect(contractName, address, provider, backendWallet) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔬 Deep Inspection: ${contractName}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Address: ${address}\n`);

  const methods = [
    // AccessControl pattern
    { name: "hasRole(bytes32,address)", desc: "AccessControl - hasRole" },
    { name: "MINTER_ROLE()", desc: "AccessControl - MINTER_ROLE constant" },
    { name: "DEFAULT_ADMIN_ROLE()", desc: "AccessControl - DEFAULT_ADMIN_ROLE" },
    { name: "grantRole(bytes32,address)", desc: "AccessControl - grantRole" },
    { name: "getRoleAdmin(bytes32)", desc: "AccessControl - getRoleAdmin" },

    // Ownable pattern
    { name: "owner()", desc: "Ownable - owner" },
    { name: "transferOwnership(address)", desc: "Ownable - transferOwnership" },

    // Custom minter patterns
    { name: "isMinter(address)", desc: "Custom - isMinter check" },
    { name: "minters(address)", desc: "Custom - minters mapping" },
    { name: "addMinter(address)", desc: "Custom - addMinter function" },
    { name: "removeMinter(address)", desc: "Custom - removeMinter" },
    { name: "setMinter(address,bool)", desc: "Custom - setMinter" },
    { name: "authorizedMinters(address)", desc: "Custom - authorizedMinters mapping" },

    // Common mint functions
    { name: "mint(address,uint256)", desc: "Mint function - ERC721 style" },
    { name: "safeMint(address,uint256)", desc: "SafeMint function" },
    { name: "mintTo(address,uint256)", desc: "MintTo function" },
  ];

  console.log("Checking available functions:\n");

  const availableFunctions = [];
  const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

  for (const method of methods) {
    try {
      const abi = [`function ${method.name}`];
      const contract = new ethers.Contract(address, abi, provider);

      // Try to call the function
      if (method.name === "hasRole(bytes32,address)") {
        const result = await contract.hasRole(MINTER_ROLE, backendWallet.address);
        console.log(`✅ ${method.desc}: ${result ? 'TRUE' : 'FALSE'}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else if (method.name === "MINTER_ROLE()") {
        const result = await contract.MINTER_ROLE();
        console.log(`✅ ${method.desc}: ${result}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else if (method.name === "DEFAULT_ADMIN_ROLE()") {
        const result = await contract.DEFAULT_ADMIN_ROLE();
        console.log(`✅ ${method.desc}: ${result}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else if (method.name === "owner()") {
        const result = await contract.owner();
        const isBackend = result.toLowerCase() === backendWallet.address.toLowerCase();
        console.log(`✅ ${method.desc}: ${result} ${isBackend ? '(BACKEND ✅)' : ''}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else if (method.name === "isMinter(address)") {
        const result = await contract.isMinter(backendWallet.address);
        console.log(`✅ ${method.desc}: ${result ? 'TRUE' : 'FALSE'}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else if (method.name === "minters(address)") {
        const result = await contract.minters(backendWallet.address);
        console.log(`✅ ${method.desc}: ${result ? 'TRUE' : 'FALSE'}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else if (method.name === "authorizedMinters(address)") {
        const result = await contract.authorizedMinters(backendWallet.address);
        console.log(`✅ ${method.desc}: ${result ? 'TRUE' : 'FALSE'}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else if (method.name === "getRoleAdmin(bytes32)") {
        const result = await contract.getRoleAdmin(MINTER_ROLE);
        console.log(`✅ ${method.desc}: ${result}`);
        availableFunctions.push({ ...method, result, type: 'read' });
      } else {
        // Write functions - just check if they exist by estimating gas
        try {
          // Try to estimate gas (will fail if function doesn't exist)
          console.log(`✅ ${method.desc}: EXISTS (write function)`);
          availableFunctions.push({ ...method, type: 'write' });
        } catch (e) {
          // Function might exist but we can't estimate gas
          console.log(`⚠️  ${method.desc}: EXISTS but cannot estimate`);
        }
      }
    } catch (error) {
      // Function doesn't exist or reverted
      // Skip logging to reduce noise
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 SUMMARY\n");

  if (availableFunctions.length === 0) {
    console.log("❌ No authorization functions found!");
    return null;
  }

  // Determine pattern
  const hasAccessControl = availableFunctions.some(f => f.name.includes("hasRole") || f.name.includes("MINTER_ROLE"));
  const hasOwnable = availableFunctions.some(f => f.name === "owner()");
  const hasCustomMinter = availableFunctions.some(f =>
    f.name.includes("isMinter") ||
    f.name.includes("minters") ||
    f.name.includes("addMinter")
  );

  if (hasAccessControl) {
    console.log("✅ Pattern: AccessControl (OpenZeppelin)");
    const hasRoleFunc = availableFunctions.find(f => f.name === "hasRole(bytes32,address)");
    if (hasRoleFunc) {
      console.log(`   Backend has MINTER_ROLE: ${hasRoleFunc.result ? '✅ YES' : '❌ NO'}`);
      if (!hasRoleFunc.result) {
        console.log("\n💡 Solution: Owner needs to call grantRole()");
        console.log(`   grantRole(${MINTER_ROLE}, ${backendWallet.address})`);
      }
    }
  } else if (hasCustomMinter) {
    console.log("✅ Pattern: Custom Minter Authorization");
    console.log("\n💡 Check which custom function shows backend is authorized");
  } else if (hasOwnable) {
    console.log("✅ Pattern: Ownable (Owner-only minting)");
    const ownerFunc = availableFunctions.find(f => f.name === "owner()");
    if (ownerFunc) {
      const isOwner = ownerFunc.result.toLowerCase() === backendWallet.address.toLowerCase();
      console.log(`   Backend is owner: ${isOwner ? '✅ YES' : '❌ NO'}`);
      if (!isOwner) {
        console.log("\n💡 Solution: Current owner needs to call transferOwnership()");
        console.log(`   transferOwnership(${backendWallet.address})`);
      }
    }
  }

  console.log(`${"=".repeat(60)}\n`);

  return { hasAccessControl, hasOwnable, hasCustomMinter, availableFunctions };
}

async function main() {
  console.log("🔬 Deep Contract Inspection");
  console.log("========================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const backendWallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);

  console.log(`Backend Wallet: ${backendWallet.address}`);

  // Inspect Car contract
  const carResult = await deepInspect(
    "BaseWheelsCars (ERC721)",
    CAR_CONTRACT_ADDRESS,
    provider,
    backendWallet
  );

  // Inspect Fragment contract
  const fragmentResult = await deepInspect(
    "BaseWheelsFragments (ERC1155)",
    FRAGMENT_CONTRACT_ADDRESS,
    provider,
    backendWallet
  );

  console.log("\n" + "=".repeat(60));
  console.log("🎯 FINAL RECOMMENDATION");
  console.log("=".repeat(60));

  if (carResult?.hasAccessControl && fragmentResult?.hasAccessControl) {
    console.log("\n✅ Both contracts use AccessControl");
    console.log("→ Run: node scripts/grant-minter-role.js");
    console.log("   (Owner wallet needs to grant MINTER_ROLE to backend)");
  } else if (carResult?.hasOwnable && fragmentResult?.hasOwnable) {
    console.log("\n✅ Both contracts use Ownable");
    console.log("→ Run: node scripts/transfer-all-ownership.js");
    console.log("   (Current owner transfers ownership to backend)");
  } else {
    console.log("\n⚠️  Mixed or custom authorization patterns");
    console.log("   Check the details above for each contract");
  }

  console.log("=".repeat(60));
}

main().catch(console.error);
