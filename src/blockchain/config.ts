/**
 * Blockchain Contract Configurations
 */

// Fragment ERC1155 Contract
export const FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export const FRAGMENT_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "checkAllParts",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      }
    ],
    "name": "burnForAssembly",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Car NFT Contract (ERC721)
export const CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export const CAR_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "modelName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "series",
        "type": "string"
      }
    ],
    "name": "mintCar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
