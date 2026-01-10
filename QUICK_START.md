# ⚡ Quick Start - Run Backend

## 🚀 Step-by-Step (5 Menit)

### 1. Install Dependencies
```bash
cd E:\HackatonBase\backends
npm install
```

### 2. Setup Database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Configure Environment (OPTIONAL untuk testing minimal)

File `.env` sudah ada. Untuk testing dasar (tanpa blockchain), bisa langsung run!

**Untuk full testing (dengan blockchain mint):**
- Edit `.env` → tambah `BACKEND_PRIVATE_KEY` dan `CAR_CONTRACT_ADDRESS`
- Lihat detail di `SETUP_GUIDE.md`

### 4. Run Server
```bash
npm run dev
```

✅ Server berjalan di **http://localhost:3000**

---

## 🧪 Quick Test (Tanpa Frontend)

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

Expected: `{"status": "ok"}`

---

## 🎯 Testing dengan Frontend

### 1. Start Backend
```bash
# Terminal 1
cd E:\HackatonBase\backends
npm run dev
```

### 2. Start Frontend
```bash
# Terminal 2
cd E:\HackatonBase\frontend
npm run dev
```

### 3. Login & Mint Coins

1. Buka `http://localhost:3001`
2. Login dengan Google/Email
3. Backend otomatis create user baru
4. **Mint coins untuk testing:**
   ```bash
   # Terminal 3
   npx prisma studio
   ```
   - Buka `User` table
   - Edit user → set `coins = 1000`
   - Save

### 4. Test Gacha!
1. Buka halaman Gacha di frontend
2. Pilih box type (Standard/Premium/Legendary)
3. Slide to open
4. Lihat result!

---

## ⚠️ Troubleshooting

### "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Database error"
```bash
rm prisma/dev.db
npx prisma migrate dev --name init
```

---

## 📝 Next Steps

Setelah testing dasar berhasil, lihat `SETUP_GUIDE.md` untuk:
- Setup blockchain integration (mint NFT on-chain)
- Deploy smart contracts
- Configure wallet & gas fees
- Production deployment

---

**That's it!** 🎉 Backend sekarang running dan siap ditest!
