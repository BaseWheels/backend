/**
 * Check User Balance - MockIDRX, Car NFT, Fragment NFT
 * Usage: node check-user-balance.js <wallet-address>
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS;
const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS;
const MOCKIDRX_CONTRACT_ADDRESS = process.env.MOCKIDRX_CONTRACT_ADDRESS;

async function checkUserBalance(userAddress) {
  console.log("💰 User Balance Check");
  console.log("========================================\n");
  console.log(`Wallet Address: ${userAddress}\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Validate address
  try {
    ethers.getAddress(userAddress);
  } catch (error) {
    console.log("❌ Invalid wallet address!");
    return;
  }

  // MockIDRX Balance
  console.log("1️⃣ MockIDRX (ERC20):");
  try {
    const mockIDRXContract = new ethers.Contract(
      MOCKIDRX_CONTRACT_ADDRESS,
      [
        "function balanceOf(address) external view returns (uint256)",
        "function decimals() external view returns (uint8)",
        "function symbol() external view returns (string)"
      ],
      provider
    );

    const balance = await mockIDRXContract.balanceOf(userAddress);
    const decimals = await mockIDRXContract.decimals();
    const symbol = await mockIDRXContract.symbol();

    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log(`   Balance: ${formattedBalance} ${symbol}`);

    if (parseFloat(formattedBalance) === 0) {
      console.log(`   ⚠️  No IDRX tokens yet`);
      console.log(`   → Do check-in to earn IDRX!`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message.substring(0, 80)}`);
  }
  console.log();

  // Car NFT Balance
  console.log("2️⃣ Car NFT (ERC721):");
  try {
    const carContract = new ethers.Contract(
      CAR_CONTRACT_ADDRESS,
      [
        "function balanceOf(address) external view returns (uint256)",
        "function name() external view returns (string)"
      ],
      provider
    );

    const balance = await carContract.balanceOf(userAddress);
    const name = await carContract.name();

    console.log(`   ${name}`);
    console.log(`   Balance: ${balance.toString()} cars`);

    if (balance === 0n) {
      console.log(`   ⚠️  No cars yet`);
      console.log(`   → Open gacha or assemble fragments to get cars!`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message.substring(0, 80)}`);
  }
  console.log();

  // Fragment NFT Balance
  console.log("3️⃣ Fragment NFT (ERC1155):");
  try {
    const fragmentContract = new ethers.Contract(
      FRAGMENT_CONTRACT_ADDRESS,
      ["function balanceOf(address account, uint256 id) external view returns (uint256)"],
      provider
    );

    const fragmentTypes = ["CHASSIS", "WHEELS", "ENGINE", "BODY", "INTERIOR"];
    console.log(`   Fragment balances by type:`);

    let totalFragments = 0;
    for (let i = 0; i < 5; i++) {
      const balance = await fragmentContract.balanceOf(userAddress, i);
      const balanceNum = Number(balance);
      totalFragments += balanceNum;

      const status = balanceNum > 0 ? '✅' : '❌';
      console.log(`     ${status} Type ${i} (${fragmentTypes[i]}): ${balance.toString()}`);
    }

    console.log(`   Total fragments: ${totalFragments}`);

    if (totalFragments === 0) {
      console.log(`   ⚠️  No fragments yet`);
      console.log(`   → Do check-in to earn fragments!`);
    } else if (totalFragments >= 5) {
      // Check if has all types
      let hasAllTypes = true;
      for (let i = 0; i < 5; i++) {
        const balance = await fragmentContract.balanceOf(userAddress, i);
        if (balance === 0n) {
          hasAllTypes = false;
          break;
        }
      }

      if (hasAllTypes) {
        console.log(`   🎉 You have all 5 fragment types!`);
        console.log(`   → You can assemble a car!`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message.substring(0, 80)}`);
  }

  console.log("\n========================================");
  console.log("✅ Balance check complete!");
  console.log("\nTo import IDRX token to MetaMask:");
  console.log(`  Token Address: ${MOCKIDRX_CONTRACT_ADDRESS}`);
  console.log(`  Symbol: IDRX`);
  console.log(`  Decimals: 18`);
  console.log(`  Network: Base Sepolia`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node check-user-balance.js <wallet-address>");
    console.log("\nExample:");
    console.log("  node check-user-balance.js 0x1234567890123456789012345678901234567890");
    process.exit(1);
  }

  const userAddress = args[0];
  await checkUserBalance(userAddress);
}

main().catch(console.error);
