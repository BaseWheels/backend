# 🚀 Backend Setup Guide

## 📋 Prerequisites

Pastikan sudah install:
- ✅ **Node.js** (v18 atau lebih baru)
- ✅ **npm** atau **yarn**
- ✅ **Git** (optional)

---

## 1️⃣ Install Dependencies

Buka terminal di folder `backends` dan jalankan:

```bash
cd E:\HackatonBase\backends
npm install
```

Ini akan install semua dependencies yang diperlukan:
- Express.js (backend framework)
- Prisma (database ORM)
- Ethers.js (blockchain interaction)
- Privy SDK (authentication)

---

## 2️⃣ Setup Database

Backend menggunakan **SQLite** untuk development (file-based database, tidak perlu install server database).

### Generate Prisma Client
```bash
npx prisma generate
```

### Run Database Migration
```bash
npx prisma migrate dev --name init
```

Ini akan:
- ✅ Buat database file di `prisma/dev.db`
- ✅ Buat tabel: `User`, `Fragment`, `Car`
- ✅ Setup schema sesuai `prisma/schema.prisma`

### (Optional) View Database
Untuk lihat isi database:
```bash
npx prisma studio
```
Buka browser di `http://localhost:5555` untuk GUI database explorer.

---

## 3️⃣ Configure Environment Variables

File `.env` sudah ada dengan konfigurasi berikut:

```env
# Database Configuration
DATABASE_URL="file:./prisma/dev.db"

# Privy Authentication (sudah terisi)
PRIVY_APP_ID=cmjxyscmx03pulf0cadbpdmvq
PRIVY_APP_SECRET=privy_app_secret_...

# Blockchain Configuration
RPC_URL=https://sepolia.base.org

# PERLU DIISI:
BACKEND_PRIVATE_KEY=0x_your_private_key_here
CAR_CONTRACT_ADDRESS=0x_your_car_contract_address_here
FRAGMENT_CONTRACT_ADDRESS=0x_your_fragment_contract_address_here
```

### 🔑 Setup Private Key (PENTING!)

Backend perlu private key untuk mint NFT on-chain.

**Option 1: Buat Wallet Baru (Recommended untuk testing)**
```bash
# Install ethers CLI (optional)
npm install -g ethers

# Atau buat manual di MetaMask:
# 1. Buka MetaMask
# 2. Create new account
# 3. Export private key (Settings → Security → Export Private Key)
```

**Option 2: Gunakan Existing Wallet**
- ⚠️ **JANGAN gunakan wallet dengan ETH real di mainnet!**
- Gunakan wallet khusus untuk testing saja

Setelah dapat private key, update `.env`:
```env
BACKEND_PRIVATE_KEY=0xabcd1234... # ganti dengan private key Anda
```

### 🏗️ Smart Contract Addresses

Anda perlu deploy smart contracts terlebih dahulu:

1. **Car NFT Contract** (`E:\HackatonBase\src\Fullcar.sol`)
   - Deploy ke Base Sepolia
   - Copy contract address
   - Update `.env`:
   ```env
   CAR_CONTRACT_ADDRESS=0x... # alamat contract Car NFT
   ```

2. **Fragment Contract** (jika ada)
   - Deploy ke Base Sepolia
   - Copy contract address
   - Update `.env`:
   ```env
   FRAGMENT_CONTRACT_ADDRESS=0x... # alamat contract Fragment
   ```

### 💰 Fund Backend Wallet

Backend wallet perlu ETH untuk gas fees:

1. Copy wallet address dari private key Anda
2. Dapatkan Base Sepolia ETH dari faucet:
   - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
   - https://sepolia-faucet.base.org/
3. Transfer 0.1-0.5 ETH ke wallet address

---

## 4️⃣ Run Backend Server

### Development Mode (auto-reload)
```bash
npm run dev
```

Server akan berjalan di **http://localhost:3000**

Jika berhasil, akan muncul log:
```
🚀 Server running on port 3000
✅ Database connected
✅ Privy authentication configured
```

### Production Mode
```bash
# Build TypeScript to JavaScript
npm run build

# Run compiled code
npm start
```

---

## 5️⃣ Testing Backend

### Test API Health
Buka browser atau Postman:
```
GET http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-10T..."
}
```

### Test Gacha API (Requires Auth)

1. **Login di frontend** untuk dapat Privy auth token
2. **Open browser console** → jalankan:
   ```javascript
   const token = await window.privy?.getAccessToken();
   console.log(token);
   ```
3. **Test API dengan token**:

   **Get Gacha Boxes:**
   ```bash
   curl -X GET http://localhost:3000/gacha/boxes \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

   **Open Gacha Box:**
   ```bash
   curl -X POST http://localhost:3000/gacha/open \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"boxType": "standard"}'
   ```

---

## 6️⃣ Setup User Coins (For Testing)

User baru akan memiliki **0 coins** secara default. Untuk testing, Anda perlu menambah coins manual.

### Option 1: Via Prisma Studio
```bash
npx prisma studio
```
1. Buka `User` table
2. Klik user yang baru login
3. Edit field `coins` → set ke `1000`
4. Save

### Option 2: Via SQL (Direct)
```bash
# Buka SQLite database
sqlite3 prisma/dev.db

# Lihat semua users
SELECT * FROM User;

# Update coins untuk user tertentu
UPDATE User SET coins = 1000 WHERE walletAddress = '0xYourWalletAddress';

# Exit
.exit
```

### Option 3: Via API Endpoint (Jika ada)
Buat endpoint temporary untuk mint coins:

```javascript
// backends/src/routes/admin.ts (create if not exists)
router.post("/admin/mint-coins", auth, async (req, res) => {
  const { amount } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { coins: { increment: amount } }
  });
  res.json({ coins: user.coins });
});
```

---

## 7️⃣ Frontend Configuration

Pastikan frontend sudah dikonfigurasi untuk connect ke backend:

```javascript
// frontend/src/lib/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
```

Atau tambah di `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🧪 Complete Testing Flow

### 1. Start Backend
```bash
cd E:\HackatonBase\backends
npm run dev
```

### 2. Start Frontend
```bash
cd E:\HackatonBase\frontend
npm run dev
```

### 3. Test Flow
1. ✅ Buka `http://localhost:3001` (frontend)
2. ✅ Login dengan Google/Email (Privy)
3. ✅ Backend otomatis buat user baru di database
4. ✅ Mint coins untuk user (via Prisma Studio)
5. ✅ Buka halaman Gacha
6. ✅ Pilih box type (Standard/Premium/Legendary)
7. ✅ Slide to open
8. ✅ Backend mint NFT on-chain → Display result

---

## 📊 Database Schema

```prisma
model User {
  id            String     @id           // Privy user ID
  walletAddress String     @unique       // Wallet address
  coins         Int        @default(0)   // User coins for gacha
  lastCheckIn   DateTime   @default(now())
  createdAt     DateTime   @default(now())
  fragments     Fragment[]
  cars          Car[]
}

model Car {
  tokenId     Int      @id             // NFT token ID
  ownerId     String                   // User ID (foreign key)
  modelName   String?                  // BMW M3, Ferrari, etc
  series      String?                  // Sport, Luxury, etc
  isRedeemed  Boolean  @default(false) // Has user claimed physical car?
  mintTxHash  String?                  // Blockchain transaction hash
  user        User     @relation(...)
}
```

---

## 🐛 Troubleshooting

### Error: "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### Error: "Prisma Client not found"
```bash
npx prisma generate
```

### Error: "Database migration failed"
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually delete database
rm prisma/dev.db
npx prisma migrate dev --name init
```

### Error: "Failed to mint NFT"
- ✅ Check smart contract deployed di Base Sepolia
- ✅ Check backend wallet punya ETH
- ✅ Check contract address di `.env` benar
- ✅ Check RPC_URL di `.env` benar

### Error: "Privy authentication failed"
- ✅ Check `PRIVY_APP_ID` dan `PRIVY_APP_SECRET` di `.env`
- ✅ Check sama dengan yang di frontend `providers.jsx`

---

## 📝 API Endpoints

### **Authentication** (All endpoints require Privy JWT token)
- Header: `Authorization: Bearer <privy_token>`

### **Gacha Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gacha/boxes` | Get available boxes & user coins |
| POST | `/gacha/open` | Open gacha box & mint NFT |

### **User Endpoints** (if implemented)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get user profile |
| GET | `/user/cars` | Get user's car collection |
| POST | `/user/checkin` | Daily check-in for coins |

---

## ✅ Checklist

Setup Backend:
- [ ] `npm install` di folder backends
- [ ] `npx prisma generate`
- [ ] `npx prisma migrate dev`
- [ ] Setup `.env` (private key, contract addresses)
- [ ] Fund backend wallet dengan Base Sepolia ETH
- [ ] Deploy smart contracts
- [ ] `npm run dev` (start backend server)

Setup Database:
- [ ] Database created (`prisma/dev.db`)
- [ ] Migrations applied
- [ ] Test user created (auto saat login)
- [ ] Mint test coins untuk user

Testing:
- [ ] Backend running di `http://localhost:3000`
- [ ] Frontend running di `http://localhost:3001`
- [ ] Login berhasil (user created di DB)
- [ ] User punya coins
- [ ] Gacha open berhasil
- [ ] NFT minted on-chain

---

## 🎉 Ready to Test!

Jika semua step selesai, sekarang bisa test full flow gacha dari frontend! 🚀

**Next Steps:**
1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Login ke aplikasi
4. Mint coins untuk user
5. Test gacha!
