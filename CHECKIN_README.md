# Daily Check-in Backend Implementation

## ✅ Implementation Complete

This backend implements a Web3 daily check-in feature with the following capabilities:

- User authentication via Privy
- Auto-registration of new users
- 24-hour check-in cooldown
- Random fragment type selection (0-4)
- On-chain fragment minting (ERC1155)
- Database tracking of fragments and user check-ins

---

## 📁 Project Structure

```
backends/
├── src/
│   ├── index.ts                    # Main Express app
│   ├── lib/
│   │   └── prisma.ts               # Prisma client singleton
│   ├── middleware/
│   │   └── auth.ts                 # Privy authentication middleware
│   ├── blockchain/
│   │   ├── client.ts               # Blockchain client & mint function
│   │   └── config.ts               # Contract ABI & address
│   └── routes/
│       └── checkin.ts              # Check-in endpoint handler
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── dev.db                      # SQLite database (development)
├── .env                            # Environment variables
└── package.json
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Update `.env` with your actual values:

```env
# Privy Authentication
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Blockchain
RPC_URL=https://sepolia.base.org
BACKEND_PRIVATE_KEY=0xYourPrivateKey
FRAGMENT_CONTRACT_ADDRESS=0xYourContractAddress

# Database (SQLite for dev, PostgreSQL for production)
DATABASE_URL="file:./prisma/dev.db"
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

---

## 🔌 API Endpoint

### POST `/api/check-in`

Daily check-in endpoint that mints a random fragment to the user's wallet.

#### Request Headers

```
Authorization: Bearer <privy_access_token>
Content-Type: application/json
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "fragmentType": 2,
  "txHash": "0xabc123...",
  "message": "Check-in successful! Fragment minted."
}
```

#### Error Responses

**Cooldown Active (429 Too Many Requests)**
```json
{
  "error": "Check-in cooldown active",
  "remainingHours": 12,
  "nextCheckInAt": "2024-01-04T14:30:00.000Z"
}
```

**Unauthorized (401)**
```json
{
  "error": "Unauthorized"
}
```

**No Wallet Linked (400)**
```json
{
  "error": "User has no linked wallet"
}
```

**Blockchain Error (500)**
```json
{
  "error": "Failed to mint fragment on blockchain"
}
```

---

## 🧪 Testing the Endpoint

### Using curl

```bash
curl -X POST http://localhost:3000/api/check-in \
  -H "Authorization: Bearer YOUR_PRIVY_TOKEN" \
  -H "Content-Type: application/json"
```

### Using Postman/Insomnia

1. Method: `POST`
2. URL: `http://localhost:3000/api/check-in`
3. Headers:
   - `Authorization`: `Bearer YOUR_PRIVY_TOKEN`
   - `Content-Type`: `application/json`

---

## 🔐 How It Works

1. **Authentication**: Verifies Privy access token and extracts wallet address
2. **User Registration**: Auto-creates user in database if first-time check-in
3. **Cooldown Check**: Enforces 24-hour cooldown between check-ins
4. **Random Selection**: Randomly selects fragment type (0-4)
5. **Blockchain Mint**: Calls smart contract to mint 1 fragment NFT
6. **Database Update**: Stores fragment record and updates `lastCheckIn`
7. **Response**: Returns fragment type and transaction hash

---

## 🗄️ Database Schema

The implementation uses the existing Prisma schema:

```prisma
model User {
  id            String   @id
  walletAddress String   @unique
  lastCheckIn   DateTime @default(now())
  createdAt     DateTime @default(now())
  fragments     Fragment[]
  cars          Car[]
}

model Fragment {
  id        Int      @id @default(autoincrement())
  userId    String
  typeId    Int
  txHash    String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 🚢 Deployment to Railway

### 1. Update for PostgreSQL

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from sqlite
}
```

### 2. Set Environment Variables in Railway

```env
DATABASE_URL=<Railway_Auto_Provided>
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
BACKEND_PRIVATE_KEY=0xYourPrivateKey
FRAGMENT_CONTRACT_ADDRESS=0xYourContractAddress
RPC_URL=https://sepolia.base.org
```

### 3. Deploy

```bash
railway up
```

### 4. Run Migrations

```bash
railway run npx prisma migrate deploy
```

---

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `PRIVY_APP_ID` | Yes | Privy application ID |
| `PRIVY_APP_SECRET` | Yes | Privy application secret |
| `BACKEND_PRIVATE_KEY` | Yes | Wallet private key for minting |
| `FRAGMENT_CONTRACT_ADDRESS` | Yes | ERC1155 contract address |
| `RPC_URL` | Yes | Blockchain RPC endpoint |
| `PORT` | No | Server port (default: 3000) |

---

## 🛠️ Development Commands

```bash
# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Deploy migrations (production)
npm run migrate:deploy
```

---

## ⚠️ Important Notes

1. **Private Key Security**: Never commit `BACKEND_PRIVATE_KEY` to version control
2. **Cooldown**: 24-hour cooldown is enforced server-side
3. **Gas Fees**: Backend wallet must have sufficient ETH for gas fees
4. **Fragment Types**: Random selection from 0-4 (5 types total)
5. **Database**: SQLite for development, PostgreSQL for production

---

## 🐛 Troubleshooting

### "Missing PRIVY_APP_ID" Error
- Ensure `.env` file has `PRIVY_APP_ID` set
- Restart the dev server after updating `.env`

### "Failed to mint fragment on blockchain" Error
- Check that `BACKEND_PRIVATE_KEY` has sufficient ETH
- Verify `FRAGMENT_CONTRACT_ADDRESS` is correct
- Ensure RPC endpoint is accessible

### "User has no linked wallet" Error
- User must have a wallet connected in Privy
- Verify Privy authentication is working correctly

---

## 📚 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma 7
- **Auth**: Privy server-side verification
- **Blockchain**: ethers.js v6
- **Network**: Base Sepolia / Sepolia testnet

---

## ✨ Features Implemented

- ✅ POST /check-in endpoint
- ✅ Privy token verification
- ✅ Auto user registration
- ✅ 24-hour cooldown enforcement
- ✅ Random fragment type selection (0-4)
- ✅ On-chain ERC1155 minting
- ✅ Database fragment tracking
- ✅ Transaction hash storage
- ✅ lastCheckIn timestamp update
- ✅ JSON response with fragmentType and txHash
- ✅ CORS enabled
- ✅ Dynamic port for deployment
- ✅ Production-ready error handling

---

## 🎯 Next Steps

1. Deploy your ERC1155 fragment contract
2. Update `FRAGMENT_CONTRACT_ADDRESS` in `.env`
3. Fund backend wallet with testnet ETH
4. Get Privy credentials from dashboard
5. Test the endpoint locally
6. Deploy to Railway

---

**Implementation Status**: ✅ Complete and ready for testing!
