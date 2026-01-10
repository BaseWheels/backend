"use strict";
/**
 * Blockchain Contract Configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAR_CONTRACT_ABI = exports.CAR_CONTRACT_ADDRESS = exports.FRAGMENT_CONTRACT_ABI = exports.FRAGMENT_CONTRACT_ADDRESS = void 0;
// Fragment ERC1155 Contract
exports.FRAGMENT_CONTRACT_ADDRESS = process.env.FRAGMENT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
exports.FRAGMENT_CONTRACT_ABI = [
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
        "name": "mintFragment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "checkAllParts",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "name": "burnForAssembly",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
// Car NFT Contract (ERC721)
exports.CAR_CONTRACT_ADDRESS = process.env.CAR_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
exports.CAR_CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }
        ],
        "name": "mintCar",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "name": "CarMinted",
        "type": "event"
    }
];
//# sourceMappingURL=config.js.map