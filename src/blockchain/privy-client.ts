/**
 * Privy Server SDK Client for Gasless Transactions
 * Handles transaction relay with gas sponsorship
 */

import { PrivyClient } from "@privy-io/server-auth";

if (!process.env.PRIVY_APP_ID) {
  throw new Error("Missing PRIVY_APP_ID environment variable");
}

if (!process.env.PRIVY_APP_SECRET) {
  throw new Error("Missing PRIVY_APP_SECRET environment variable");
}

// Initialize Privy client
export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

/**
 * Send a gasless transaction via Privy
 * @param walletAddress - User's Privy wallet address (embedded wallet)
 * @param transaction - Transaction data (to, value, data)
 * @param chainId - Chain ID (84532 for Base Sepolia)
 * @returns Transaction hash
 */
export async function sendGaslessTransaction(
  walletAddress: string,
  transaction: {
    to: string;
    value?: string;
    data?: string;
    gas?: string;
  },
  chainId: number = 84532 // Base Sepolia default
): Promise<string> {
  try {
    // Send transaction with gas sponsorship using Privy Wallet API
    const txPayload: any = {
      address: walletAddress,
      chainType: "ethereum" as const,
      caip2: `eip155:${chainId}`,
      transaction: {
        to: transaction.to,
        ...(transaction.data && { data: transaction.data }),
        ...(transaction.value && { value: transaction.value }),
        ...(transaction.gas && { gasLimit: transaction.gas }),
      },
      sponsor: true, // 🔥 Enable gas sponsorship!
    };

    const response = await privyClient.walletApi.ethereum.sendTransaction(txPayload);

    return response.hash;
  } catch (error) {
    console.error("Gasless transaction error:", error);
    throw new Error(`Failed to send gasless transaction: ${error}`);
  }
}
