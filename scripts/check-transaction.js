/**
 * Check Transaction Details
 * Inspect what happened in the minting transactions
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;

async function checkTransaction(txHash) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔍 Transaction: ${txHash}`);
  console.log(`${"=".repeat(60)}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      console.log("❌ Transaction not found");
      return;
    }

    console.log(`Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Block: ${receipt.blockNumber}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`From: ${receipt.from}`);
    console.log(`To: ${receipt.to}`);
    console.log(`\nLogs (${receipt.logs.length} events):`);

    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\nEvent #${i + 1}:`);
      console.log(`  Contract: ${log.address}`);
      console.log(`  Topics:`);
      log.topics.forEach((topic, idx) => {
        console.log(`    [${idx}] ${topic}`);
      });
      console.log(`  Data: ${log.data}`);

      // Try to decode Transfer event (ERC721)
      if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
        console.log(`  → ERC721 Transfer Event`);
        console.log(`    From: ${ethers.getAddress('0x' + log.topics[1].slice(26))}`);
        console.log(`    To: ${ethers.getAddress('0x' + log.topics[2].slice(26))}`);
        console.log(`    TokenId: ${parseInt(log.topics[3], 16)}`);
      }

      // Try to decode TransferSingle event (ERC1155)
      if (log.topics[0] === "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62") {
        console.log(`  → ERC1155 TransferSingle Event`);
        console.log(`    Operator: ${ethers.getAddress('0x' + log.topics[1].slice(26))}`);
        console.log(`    From: ${ethers.getAddress('0x' + log.topics[2].slice(26))}`);
        console.log(`    To: ${ethers.getAddress('0x' + log.topics[3].slice(26))}`);
        // Data contains id and value
        const id = parseInt(log.data.slice(0, 66), 16);
        const value = parseInt('0x' + log.data.slice(66), 16);
        console.log(`    TokenId: ${id}`);
        console.log(`    Amount: ${value}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log("🔍 Transaction Inspector");
  console.log("========================================\n");

  // Car mint transaction
  await checkTransaction("0x630e9c41970c6e354a6f8e223c81b1b922cf0c146302a507fae5b92b318c5014");

  // Fragment mint transaction
  await checkTransaction("0x140376c7b5f2701cbacb61a2756d8507603024bcf3e8f018e293f1ded0158276");

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);
