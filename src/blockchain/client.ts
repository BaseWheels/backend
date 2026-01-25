import { ethers } from "ethers";
import {
  MOCKIDRX_CONTRACT_ABI,
  MOCKIDRX_CONTRACT_ADDRESS,
  FRAGMENT_CONTRACT_ABI,
  FRAGMENT_CONTRACT_ADDRESS,
  CAR_CONTRACT_ABI,
  CAR_CONTRACT_ADDRESS
} from "./config";

if (!process.env.RPC_URL) {
  throw new Error("Missing RPC_URL environment variable");
}

if (!process.env.BACKEND_PRIVATE_KEY) {
  throw new Error("Missing BACKEND_PRIVATE_KEY environment variable");
}

export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
export const wallet = new ethers.Wallet(
  process.env.BACKEND_PRIVATE_KEY,
  provider
);

// MockIDRX Token Contract (ERC20)
export const mockIDRXContract = new ethers.Contract(
  MOCKIDRX_CONTRACT_ADDRESS,
  MOCKIDRX_CONTRACT_ABI,
  wallet
);

// Fragment Contract (ERC1155)
export const fragmentContract = new ethers.Contract(
  FRAGMENT_CONTRACT_ADDRESS,
  FRAGMENT_CONTRACT_ABI,
  wallet
);

// Car Contract (ERC721)
export const carContract = new ethers.Contract(
  CAR_CONTRACT_ADDRESS,
  CAR_CONTRACT_ABI,
  wallet
);

/**
 * Mint a fragment NFT to a user
 * @param toAddress - Recipient wallet address
 * @param fragmentType - Fragment type ID (0-4)
 * @param amount - Number of fragments to mint (default: 1)
 * @returns Transaction hash
 */
export async function mintFragment(
  toAddress: string,
  fragmentType: number,
  amount: number = 1
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (fragmentContract as any).mintFragment(toAddress, fragmentType, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Mint fragment error:", error);
    throw new Error("Failed to mint fragment on-chain");
  }
}

/**
 * Mint a Car NFT to a user
 * @param toAddress - Recipient wallet address
 * @returns Object with tokenId and transaction hash
 * @note Contract auto-generates tokenId. ModelName/series stored off-chain in backend DB.
 */
export async function mintCar(
  toAddress: string
): Promise<{ tokenId: number; txHash: string }> {
  try {
    // Call contract - it returns tokenId directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (carContract as any).mintCar(toAddress);
    const receipt = await tx.wait();

    // Parse logs to get tokenId from CarMinted event
    const iface = carContract.interface;
    let tokenId = 0;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === "CarMinted") {
          tokenId = Number(parsed.args[1]); // Second arg is tokenId
          break;
        }
      } catch {
        // Skip logs that don't match
        continue;
      }
    }

    return {
      tokenId,
      txHash: receipt.hash
    };
  } catch (error) {
    console.error("Mint car error:", error);
    throw new Error("Failed to mint car NFT on-chain");
  }
}

/**
 * Check if user has all 5 fragment types (0-4) for assembly
 * @param userAddress - User wallet address to check
 * @returns Boolean - true if user has at least 1 of each fragment type
 */
export async function checkAllParts(userAddress: string): Promise<boolean> {
  try {
    // Contract returns array of balances [CHASSIS, WHEELS, ENGINE, BODY, INTERIOR]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const balances: bigint[] = await (fragmentContract as any).checkAllParts(userAddress);

    // Check if user has at least 1 of each fragment type
    return balances.every((balance) => balance >= 1n);
  } catch (error) {
    console.error("Check all parts error:", error);
    throw new Error("Failed to check fragment balance on-chain");
  }
}

/**
 * Burn all 5 fragment types from user for assembly
 * @param fromAddress - User wallet address to burn from
 * @returns Transaction hash
 */
export async function burnForAssembly(fromAddress: string): Promise<string> {
  try {
    // Burn 1 of each fragment type (0-4)
    const fragmentIds = [0, 1, 2, 3, 4]; // CHASSIS, WHEELS, ENGINE, BODY, INTERIOR
    const amounts = [1, 1, 1, 1, 1]; // 1 of each

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (fragmentContract as any).burnForAssembly(fromAddress, fragmentIds, amounts);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Burn for assembly error:", error);
    throw new Error("Failed to burn fragments on-chain");
  }
}

/**
 * Get MockIDRX token balance for a user
 * @param userAddress - User wallet address
 * @returns Balance in token units (e.g., 100.5 IDRX)
 */
export async function getMockIDRXBalance(userAddress: string): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const balance: bigint = await (mockIDRXContract as any).balanceOf(userAddress);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals: number = await (mockIDRXContract as any).decimals();

    // Convert from wei to token units
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch (error) {
    console.error("Get MockIDRX balance error:", error);
    throw new Error("Failed to get MockIDRX balance on-chain");
  }
}

/**
 * Mint MockIDRX tokens to a user (for check-in rewards)
 * @param toAddress - Recipient wallet address
 * @param amount - Amount of tokens to mint (in token units, e.g., 10 = 10 IDRX)
 * @returns Transaction hash
 * @note Requires backend wallet to be contract owner
 */
export async function mintMockIDRX(
  toAddress: string,
  amount: number
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals: number = await (mockIDRXContract as any).decimals();
    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    // Use mintTreasury (owner only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (mockIDRXContract as any).mintTreasury(toAddress, amountInWei);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Mint MockIDRX error:", error);
    throw new Error("Failed to mint MockIDRX on-chain");
  }
}

/**
 * Verify a transfer transaction to treasury wallet
 * @param txHash - Transaction hash to verify
 * @param expectedSender - Expected address that sent tokens
 * @param expectedAmount - Expected amount transferred (in token units)
 * @returns True if transfer is valid
 */
export async function verifyTransferTransaction(
  txHash: string,
  expectedSender: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      throw new Error("Transaction not found");
    }

    if (!receipt.status) {
      throw new Error("Transaction failed");
    }

    // Check if transaction is to MockIDRX contract
    if (receipt.to?.toLowerCase() !== MOCKIDRX_CONTRACT_ADDRESS.toLowerCase()) {
      throw new Error("Transaction not to MockIDRX contract");
    }

    // Get treasury wallet address from contract
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const treasuryWallet: string = await (mockIDRXContract as any).treasuryWallet();

    // Parse logs for Transfer or SpinPayment event
    const iface = mockIDRXContract.interface;
    const decimals: number = await (mockIDRXContract as any).decimals();
    const expectedAmountInWei = ethers.parseUnits(expectedAmount.toString(), decimals);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });

        // Check for SpinPayment event (preferred)
        if (parsed && parsed.name === "SpinPayment") {
          const user = parsed.args[0];
          const cost = parsed.args[1];
          const treasury = parsed.args[2];

          // Verify sender, amount, and treasury
          if (user.toLowerCase() === expectedSender.toLowerCase() &&
              cost >= expectedAmountInWei &&
              treasury.toLowerCase() === treasuryWallet.toLowerCase()) {
            return true;
          }
        }

        // Also check for Transfer event as fallback
        if (parsed && parsed.name === "Transfer") {
          const from = parsed.args[0];
          const to = parsed.args[1];
          const value = parsed.args[2];

          // Verify sender, receiver (treasury), and amount
          if (from.toLowerCase() === expectedSender.toLowerCase() &&
              to.toLowerCase() === treasuryWallet.toLowerCase() &&
              value >= expectedAmountInWei) {
            return true;
          }
        }
      } catch {
        // Skip logs that don't match
        continue;
      }
    }

    throw new Error("No valid SpinPayment or Transfer event found in transaction");
  } catch (error) {
    console.error("Verify transfer transaction error:", error);
    throw new Error(`Failed to verify transfer transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify a burn transaction on-chain (DEPRECATED - use verifyTransferTransaction instead)
 * @param txHash - Transaction hash to verify
 * @param expectedBurner - Expected address that burned tokens
 * @param expectedAmount - Expected amount burned (in token units)
 * @returns True if burn is valid
 */
export async function verifyBurnTransaction(
  txHash: string,
  expectedBurner: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      throw new Error("Transaction not found");
    }

    if (!receipt.status) {
      throw new Error("Transaction failed");
    }

    // Check if transaction is to MockIDRX contract
    if (receipt.to?.toLowerCase() !== MOCKIDRX_CONTRACT_ADDRESS.toLowerCase()) {
      throw new Error("Transaction not to MockIDRX contract");
    }

    // Parse logs for TokenBurned event
    const iface = mockIDRXContract.interface;
    const decimals: number = await (mockIDRXContract as any).decimals();
    const expectedAmountInWei = ethers.parseUnits(expectedAmount.toString(), decimals);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });

        // Check for TokenBurned event
        if (parsed && parsed.name === "TokenBurned") {
          const burner = parsed.args[0];
          const amount = parsed.args[1];

          // Verify burner and amount
          if (burner.toLowerCase() === expectedBurner.toLowerCase() &&
              amount >= expectedAmountInWei) {
            return true;
          }
        }
      } catch {
        // Skip logs that don't match
        continue;
      }
    }

    throw new Error("No valid TokenBurned event found in transaction");
  } catch (error) {
    console.error("Verify burn transaction error:", error);
    throw new Error(`Failed to verify burn transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Burn MockIDRX tokens from a user (for gacha purchases)
 * @deprecated Use verifyBurnTransaction instead - let user burn on frontend
 * @param fromAddress - User wallet address to burn tokens from
 * @param amount - Amount of tokens to burn (in token units, e.g., 100 = 100 IDRX)
 * @returns Transaction hash
 * @note User must approve backend wallet first before this can work
 */
export async function burnMockIDRX(
  fromAddress: string,
  amount: number
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals: number = await (mockIDRXContract as any).decimals();
    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    // Use burnFrom function (requires prior approval from user)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const burnTx = await (mockIDRXContract as any).burnFrom(fromAddress, amountInWei);
    const receipt = await burnTx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Burn MockIDRX error:", error);

    // Check if it's an approval issue
    if (error instanceof Error && error.message.includes("insufficient allowance")) {
      throw new Error("User must approve backend wallet to spend MockIDRX tokens");
    }

    throw new Error("Failed to burn MockIDRX on-chain");
  }
}
