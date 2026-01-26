/**
 * Privy Server SDK Client for Gasless Transactions
 * Handles transaction relay with gas sponsorship
 */

import { PrivyClient } from "@privy-io/server-auth";
// import * as fs from "fs";
// import * as path from "path";

if (!process.env.PRIVY_APP_ID) {
  throw new Error("Missing PRIVY_APP_ID environment variable");
}

if (!process.env.PRIVY_APP_SECRET) {
  throw new Error("Missing PRIVY_APP_SECRET environment variable");
}

// TEMPORARY: Testing without authorization key to see if gasless works
// If gasless works without key, then issue is with key format
// If gasless doesn't work, then issue is with overall setup

// Load authorization private key from file
// This ensures proper PEM format with actual newlines (not escaped \n)
// const privateKeyPath = path.join(__dirname, '..', '..', 'private.pem');
// if (!fs.existsSync(privateKeyPath)) {
//   throw new Error(`Authorization private key file not found at: ${privateKeyPath}`);
// }
// const authorizationPrivateKey = fs.readFileSync(privateKeyPath, 'utf-8');

// Initialize Privy client (WITHOUT authorization key for now)
export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
  // Commented out for testing:
  // {
  //   walletApi: {
  //     authorizationPrivateKey: authorizationPrivateKey
  //   }
  // }
);

/**
 * Send a gasless transaction via Privy
 * @param walletId - User's Privy wallet ID (embedded wallet address)
 * @param transaction - Transaction data (to, value, data)
 * @param chainId - Chain ID (84532 for Base Sepolia)
 * @returns Transaction hash
 */
export async function sendGaslessTransaction(
  walletId: string,
  transaction: {
    to: string;
    value?: string;
    data?: string;
    gas?: string;
  },
  chainId: number = 84532 // Base Sepolia default
): Promise<string> {
  try {
    console.log(`[sendGaslessTransaction] Using walletId: ${walletId}, chainId: ${chainId}`);

    // Send transaction with gas sponsorship using Privy Wallet API
    const txPayload: any = {
      walletId: walletId, // Use walletId instead of deprecated 'address'
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

    console.log(`[sendGaslessTransaction] Success! TX Hash: ${response.hash}`);
    return response.hash;
  } catch (error) {
    console.error("Gasless transaction error:", error);
    throw new Error(`Failed to send gasless transaction: ${error}`);
  }
}
