# 🎰 Gacha Box System - Documentation

## ✅ Implementation Complete

Gacha box system yang memungkinkan user membeli mystery box dengan coins dan mendapat Car NFT random on-chain.

---

## 🎯 Features

✅ **3 Gacha Box Types** (Standard, Premium, Legendary)
✅ **Rarity-based rewards** (Common, Rare, Epic, Legendary)
✅ **Verifiable on-chain minting** (ERC721 Car NFT)
✅ **Coin-based payment** (off-chain currency)
✅ **Probabilistic reward system**
✅ **Database tracking** (Car ownership)

---

## 📁 Files Created

```
backends/
├── src/
│   ├── config/
│   │   └── gacha.ts           # Gacha box config & reward logic
│   ├── routes/
│   │   └── gacha.ts           # Gacha API endpoints
│   ├── blockchain/
│   │   ├── client.ts          # mintCar() function added
│   │   └── config.ts          # Car NFT contract ABI
└── .env                       # CAR_CONTRACT_ADDRESS added
```

---

## 🎁 Gacha Box Types

### 1. Standard Box
- **Cost**: 50 coins
- **Rewards**:
  - 50% - Honda Civic (Common)
  - 30% - Toyota Corolla (Common)
  - 15% - BMW M3 (Rare)
  - 5% - Audi A4 (Rare)

### 2. Premium Box
- **Cost**: 150 coins
- **Rewards**:
  - 40% - Porsche 911 (Rare)
  - 30% - Mercedes AMG (Rare)
  - 20% - Ferrari F8 (Epic)
  - 10% - Lamborghini Huracan (Epic)

### 3. Legendary Box
- **Cost**: 500 coins
- **Rewards**:
  - 50% - McLaren 720S (Epic)
  - 30% - Bugatti Chiron (Legendary)
  - 15% - Koenigsegg Jesko (Legendary)
  - 5% - Pagani Huayra (Legendary)

---

## 🔌 API Endpoints

### 1. Open Gacha Box

**POST** `/api/gacha/open`

Beli gacha box dan mint Car NFT.

#### Request Headers
```
Authorization: Bearer <privy_access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "boxType": "standard"  // "standard" | "premium" | "legendary"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "boxType": "premium",
  "reward": {
    "tokenId": 1735934582341234,
    "modelName": "Ferrari F8",
    "series": "Supercar",
    "rarity": "epic",
    "txHash": "0xabc123..."
  },
  "coins": {
    "spent": 150,
    "remaining": 350
  },
  "message": "Congratulations! You got a epic Ferrari F8!"
}
```

#### Error Responses

**Insufficient Coins (400)**
```json
{
  "error": "Insufficient coins",
  "required": 150,
  "current": 75,
  "needed": 75
}
```

**Invalid Box Type (400)**
```json
{
  "error": "Invalid box type",
  "availableBoxes": ["standard", "premium", "legendary"]
}
```

**Blockchain Error (500)**
```json
{
  "error": "Failed to mint Car NFT on blockchain"
}
```

---

### 2. Get Available Boxes

**GET** `/api/gacha/boxes`

Lihat semua gacha box yang tersedia dan info user coins.

#### Request Headers
```
Authorization: Bearer <privy_access_token>
```

#### Success Response (200 OK)
```json
{
  "userCoins": 500,
  "boxes": [
    {
      "type": "standard",
      "costCoins": 50,
      "canAfford": true,
      "rewards": [
        {
          "rarity": "common",
          "modelName": "Honda Civic",
          "series": "Economy",
          "probability": "50%"
        },
        ...
      ]
    },
    {
      "type": "premium",
      "costCoins": 150,
      "canAfford": true,
      "rewards": [...]
    },
    {
      "type": "legendary",
      "costCoins": 500,
      "canAfford": true,
      "rewards": [...]
    }
  ]
}
```

---

## 🧪 Testing

### Using curl

```bash
# Get available boxes
curl -X GET http://localhost:3000/api/gacha/boxes \
  -H "Authorization: Bearer YOUR_PRIVY_TOKEN"

# Open standard box
curl -X POST http://localhost:3000/api/gacha/open \
  -H "Authorization: Bearer YOUR_PRIVY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"boxType": "standard"}'

# Open legendary box
curl -X POST http://localhost:3000/api/gacha/open \
  -H "Authorization: Bearer YOUR_PRIVY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"boxType": "legendary"}'
```

---

## 🔧 How It Works

1. **User Request**: User sends POST request dengan boxType
2. **Validation**: Backend check coins user & validate box type
3. **Random Selection**: Select random reward berdasarkan probability
4. **Token ID Generation**: Generate unique tokenId untuk NFT
5. **On-chain Minting**: Call smart contract `mintCar()` function
6. **Database Update**: Store car record & deduct coins
7. **Response**: Return reward details + transaction hash

---

## 🎨 Customize Rewards

Edit file [src/config/gacha.ts](src/config/gacha.ts):

### Add New Box Type
```typescript
export const GACHA_BOXES: Record<string, GachaBox> = {
  // ... existing boxes
  special: {
    type: "special",
    costCoins: 1000,
    rewards: [
      { rarity: "legendary", modelName: "Custom Car", series: "Exclusive", probability: 100 },
    ],
  },
};
```

### Modify Probabilities
```typescript
standard: {
  type: "standard",
  costCoins: 50,
  rewards: [
    { rarity: "common", modelName: "Honda Civic", series: "Economy", probability: 70 }, // Increased
    { rarity: "rare", modelName: "BMW M3", series: "Sport", probability: 30 }, // Increased
  ],
},
```

### Change Box Costs
```typescript
premium: {
  type: "premium",
  costCoins: 100, // Reduced from 150
  rewards: [...],
},
```

---

## 💾 Database Schema

Car NFTs disimpan di table `Car`:

```prisma
model Car {
  tokenId     Int      @id
  ownerId     String
  modelName   String?  // "Ferrari F8"
  series      String?  // "Supercar"
  isRedeemed  Boolean  @default(false)
  mintTxHash  String?  // Transaction hash
  user        User     @relation(fields: [ownerId], references: [id])
}
```

---

## 🚀 Setup Instructions

### 1. Deploy Car NFT Contract

Deploy ERC721 contract dengan function:
```solidity
function mintCar(
  address to,
  uint256 tokenId,
  string memory modelName,
  string memory series
) external;
```

### 2. Update .env

```env
CAR_CONTRACT_ADDRESS=0xYourCarContractAddress
```

### 3. Run Migration (if needed)

```bash
npx prisma generate
npm run dev
```

---

## 🎮 Integration with Game Economy

### Earn Coins
- ✅ Daily check-in: 10-50 coins
- ✅ Complete quests
- ✅ Win races
- ✅ Sell duplicate cars

### Spend Coins
- ✅ Gacha boxes
- ✅ Upgrade cars
- ✅ Buy items
- ✅ Enter tournaments

---

## 📊 Rarity Distribution

| Rarity | Standard | Premium | Legendary |
|--------|----------|---------|-----------|
| Common | 80% | 0% | 0% |
| Rare | 20% | 70% | 0% |
| Epic | 0% | 30% | 50% |
| Legendary | 0% | 0% | 50% |

---

## ⚙️ Smart Contract Requirements

Your Car NFT contract harus implement:

```solidity
interface ICarNFT {
  function mintCar(
    address to,
    uint256 tokenId,
    string calldata modelName,
    string calldata series
  ) external;
}
```

**Important**:
- Backend wallet harus punya role MINTER
- Contract harus allow backend mint NFT
- tokenId harus unique (handled by backend)

---

## 🔐 Security Notes

1. **Coin Balance**: Always check user coins before minting
2. **Transaction Atomicity**: Use Prisma `$transaction` to ensure coins are deducted ONLY if mint succeeds
3. **Unique Token IDs**: Generated using timestamp + random to prevent collisions
4. **On-chain Verification**: All rewards are verifiable on blockchain

---

## 🐛 Troubleshooting

### "Insufficient coins" Error
- User perlu earn more coins via check-in atau activities

### "Failed to mint Car NFT on blockchain" Error
- Check backend wallet has ETH untuk gas
- Verify CAR_CONTRACT_ADDRESS is correct
- Ensure backend wallet has MINTER role di contract

### Duplicate Token ID Error
- Very rare - restart backend if happens
- Token ID generator uses timestamp + random

---

## 📈 Next Steps

1. ✅ Deploy Car NFT smart contract
2. ✅ Set CAR_CONTRACT_ADDRESS di .env
3. ✅ Fund backend wallet dengan ETH
4. ✅ Test gacha endpoints
5. ✅ Integrate dengan frontend
6. ✅ Monitor gas costs & optimize

---

**Status**: ✅ **Ready to use!**

Happy Gacha! 🎰🚗
