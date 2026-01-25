# NFT Car Gacha Game - Backend API

> A Web3-powered car collecting game with gacha mechanics, NFT marketplace, and blockchain integration on Base Sepolia testnet.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Smart Contracts](#smart-contracts)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Overview

This is the backend service for an NFT-based car collecting game where users can:
- Open gacha boxes to collect car fragments (ERC1155 NFTs)
- Assemble fragments into complete cars (ERC721 NFTs)
- Trade cars on the marketplace
- Earn daily rewards through check-ins
- Redeem physical car models with their NFTs

Built with Express.js, Prisma ORM, and ethers.js for seamless Web3 integration.

---

## Features

### Core Gameplay
- **Gacha System**: Spend MockIDRX tokens to open boxes and receive random car fragments
- **Car Assembly**: Combine 5 matching fragments (chassis, wheels, engine, body, interior) to mint a complete car NFT
- **Waiting List Queue**: Fair distribution system when supply is limited
- **Daily Check-in**: Earn rewards for consecutive login streaks

### NFT Marketplace
- **List Cars**: Sell your car NFTs with custom pricing
- **Browse Listings**: Discover available cars with filtering
- **Secure Trading**: On-chain verification for all transactions
- **Activity History**: Track all user interactions and trades

### Web3 Integration
- **Privy Authentication**: Wallet-based login (MetaMask, WalletConnect, etc.)
- **ERC20 Token**: MockIDRX as in-game currency
- **ERC1155 Fragments**: Multi-token standard for car parts
- **ERC721 Cars**: Unique collectible car NFTs
- **Base Sepolia Testnet**: Fast and cheap transactions

### Physical Redemption
- **Burn-to-Redeem**: Exchange rare car NFTs for physical models
- **Shipping Management**: Store delivery information on-chain
- **One-time Redemption**: Prevent double-spending with blockchain verification

---

## Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js v4.21
- **Language**: TypeScript v5.9
- **Database**: PostgreSQL (Neon) with Prisma ORM v5.22
- **Blockchain**: ethers.js v6.16 for Ethereum interaction

### Infrastructure
- **Hosting**: Vercel (serverless)
- **Database**: Neon PostgreSQL (serverless)
- **Blockchain**: Base Sepolia Testnet
- **Authentication**: Privy.io (Web3 auth provider)

---

## Architecture

```
┌─────────────────┐
│  Mobile/Web App │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────────────────────────────┐
│         Express.js API Server           │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ Auth         │  │ Routes          │ │
│  │ Middleware   │  │ - Gacha         │ │
│  │ (Privy)      │  │ - Marketplace   │ │
│  └──────────────┘  │ - Assembly      │ │
│                    │ - User          │ │
│  ┌──────────────┐  │ - Check-in      │ │
│  │ Prisma ORM   │  │ - Redeem        │ │
│  └──────┬───────┘  └─────────────────┘ │
└─────────┼───────────────────────────────┘
          │                    │
          ▼                    ▼
┌──────────────────┐   ┌──────────────────┐
│  Neon PostgreSQL │   │  Base Sepolia    │
│                  │   │  Blockchain      │
│  - Users         │   │  - MockIDRX      │
│  - Fragments     │   │  - Fragments     │
│  - Cars          │   │  - Cars          │
│  - Listings      │   │  - Gacha         │
│  - WaitingList   │   │  - Vault         │
└──────────────────┘   └──────────────────┘
```

### Database Schema

**5 Main Models:**

1. **User** - User profiles and wallet addresses
2. **Fragment** - ERC1155 car parts with rarity levels
3. **Car** - ERC721 complete car NFTs
4. **Listing** - Marketplace sell orders
5. **WaitingList** - Queue system for car assembly

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- Neon PostgreSQL account (free tier)
- Privy.io account
- Base Sepolia testnet wallet with ETH

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Push database schema to Neon**
   ```bash
   npx prisma db push
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

Server will start at `http://localhost:3001`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build
- `npx prisma studio` - Open database GUI

---

## API Documentation

Base URL: `http://localhost:3001` (development) or `https://your-vercel-app.vercel.app` (production)

### Authentication

All endpoints (except `/health` and `/metadata/*`) require Privy JWT token:

```
Authorization: Bearer <privy-jwt-token>
```

### Endpoints

#### Health Check
```http
GET /health
```
Returns API status.

#### Gacha

```http
POST /api/gacha/open
Body: { "boxType": "COMMON" | "RARE" | "LEGENDARY" }
```
Open a gacha box and receive random fragments.

```http
GET /api/gacha/boxes
```
Get available box types and prices.

#### Marketplace

```http
GET /api/marketplace/listings?status=active&page=1&limit=20
```
Browse active listings.

```http
POST /api/marketplace/list
Body: { "carTokenId": 123, "price": "1000000000000000000" }
```
List a car for sale.

```http
POST /api/marketplace/buy/:listingId
```
Purchase a listed car.

```http
DELETE /api/marketplace/cancel/:listingId
```
Cancel your listing.

#### Assembly

```http
GET /api/assembly/available
```
Check available fragment sets for assembly.

```http
POST /api/assembly/combine
Body: { "fragmentIds": [1, 2, 3, 4, 5] }
```
Combine 5 fragments into a car.

```http
GET /api/assembly/waiting-list
```
Check your position in the waiting list.

```http
POST /api/assembly/claim/:waitingListId
```
Claim your assembled car when ready.

#### User

```http
GET /api/user/profile
```
Get current user profile.

```http
PUT /api/user/username
Body: { "username": "player123" }
```
Set username (one-time only).

```http
PUT /api/user/shipping
Body: { "name": "John Doe", "phone": "+1234567890", "address": "123 Main St" }
```
Update shipping information.

#### Garage

```http
GET /api/garage/cars
```
Get owned cars.

```http
GET /api/garage/fragments
```
Get owned fragments.

```http
GET /api/garage/car/:tokenId
```
Get specific car details.

#### Check-in

```http
POST /api/checkin/daily
```
Perform daily check-in and earn rewards.

```http
GET /api/checkin/status
```
Check last check-in time.

#### Redemption

```http
POST /api/redeem/claim
Body: { "carTokenId": 123 }
```
Redeem a car for physical model.

```http
GET /api/redeem/history
```
View redemption history.

#### Activity

```http
GET /api/activity/history?page=1&limit=20
```
Get user activity log.

#### Metadata (Public)

```http
GET /metadata/car/:tokenId
```
Get car NFT metadata (OpenSea compatible).

```http
GET /metadata/fragment/:tokenId
```
Get fragment NFT metadata.

---

## Smart Contracts

All contracts deployed on **Base Sepolia Testnet**.

### Contract Addresses

| Contract | Address | Type |
|----------|---------|------|
| MockIDRX | `0x57ADEa3A1F286bF386544Ec6ac53C3Ba2085217c` | ERC20 |
| Fragment | `0xf477FEcF885956eeCe8E84a1507D7b5Ef3Fae589` | ERC1155 |
| Car | `0x7AEE1BFE9fD152eA1f99818cB02E1bc64DBE8b7C` | ERC721 |
| Gacha | `0x749F3AcAeb831B07d1A1D0fDAc3D2C8af4EdbD89` | Custom |
| Vault | `0x81022BF44b772BA1d2e41A50E6948573b39F05Db` | Custom |
| Treasury | `0xAb4cBeFaeb226BC23F6399E0327F40e362cdDC3B` | Wallet |

### Network Details

- **Network**: Base Sepolia
- **Chain ID**: 84532
- **RPC URL**: `https://sepolia.base.org`
- **Block Explorer**: https://sepolia.basescan.org

---

## Deployment

### Deploy to Vercel

1. **Create `vercel.json` in project root:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **Deploy on Vercel**
   - Import GitHub repository
   - Set Framework Preset to "Other"
   - Configure environment variables (see below)
   - Deploy!

### Database Setup (Neon)

1. Create account at https://console.neon.tech
2. Create new project
3. Copy connection string
4. Add to Vercel environment variables as `DATABASE_URL`
5. Schema will auto-sync on first deployment

---

## Environment Variables

Create a `.env` file with these variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Privy Authentication
PRIVY_APP_ID="your_privy_app_id"
PRIVY_APP_SECRET="your_privy_secret"

# Blockchain (Base Sepolia)
RPC_URL="https://sepolia.base.org"
BACKEND_PRIVATE_KEY="0x..."

# Smart Contracts
MOCKIDRX_CONTRACT_ADDRESS="0x..."
FRAGMENT_CONTRACT_ADDRESS="0x..."
CAR_CONTRACT_ADDRESS="0x..."
VAULT_CONTRACT_ADDRESS="0x..."
GACHA_CONTRACT_ADDRESS="0x..."
TREASURY_WALLET="0x..."

# Server
PORT=3001
```

See `.env.example` for complete reference.

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main Express app
│   ├── lib/
│   │   └── prisma.ts         # Prisma client singleton
│   ├── middleware/
│   │   └── auth.ts           # Privy authentication
│   ├── blockchain/
│   │   ├── client.ts         # Ethers.js blockchain client
│   │   ├── marketplace-client.ts
│   │   └── config.ts         # Contract ABIs & addresses
│   ├── config/
│   │   ├── gacha.ts          # Gacha configurations
│   │   ├── assembly.ts       # Assembly rules
│   │   └── supply.ts         # Supply management
│   └── routes/
│       ├── gacha.ts          # Gacha endpoints
│       ├── marketplace.ts    # Marketplace endpoints
│       ├── assembly.ts       # Assembly endpoints
│       ├── garage.ts         # Garage endpoints
│       ├── user.ts           # User endpoints
│       ├── checkin.ts        # Check-in endpoints
│       ├── redeem.ts         # Redemption endpoints
│       ├── activity.ts       # Activity log endpoints
│       ├── supply.ts         # Supply endpoints
│       └── metadata.ts       # NFT metadata endpoints
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration history
├── dist/                     # Compiled JavaScript
├── .env                      # Environment variables
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies

```

---

## Development Roadmap

- [x] Core gacha system
- [x] NFT marketplace
- [x] Car assembly mechanics
- [x] Daily check-in rewards
- [x] Physical redemption
- [x] PostgreSQL migration
- [ ] Batch operations for gas optimization
- [ ] Enhanced marketplace filters
- [ ] Leaderboard system
- [ ] Staking rewards
- [ ] Mainnet deployment

---

## Contributing

This is a hackathon project. Contributions, issues, and feature requests are welcome!

---

## License

MIT License - feel free to use this project for learning and development.

---

## Team

Built with ❤️ for [Hackathon Name]

- [Team Member 1] - Role
- [Team Member 2] - Role
- [Team Member 3] - Role

---

## Acknowledgments

- [Privy.io](https://privy.io) - Web3 authentication
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Base](https://base.org) - Ethereum L2 network
- [Vercel](https://vercel.com) - Deployment platform
