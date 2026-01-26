# Setup Minter Role untuk Backend Wallet

Panduan lengkap untuk memastikan backend wallet memiliki izin minting di semua kontrak.

## Mengapa Diperlukan?

Backend wallet perlu memiliki `MINTER_ROLE` di tiga kontrak:
1. **MockIDRX** - Untuk mint token IDRX sebagai reward check-in
2. **BaseWheelsFragments** - Untuk mint fragment NFT sebagai reward check-in
3. **BaseWheelsCars** - Untuk mint car NFT dari gacha dan assembly

Tanpa role ini, backend tidak bisa memberikan reward kepada user.

## Langkah 1: Cek Status Role

Jalankan script untuk mengecek apakah backend wallet sudah memiliki role:

```bash
cd backends
node scripts/check-mockidrx-role.js
```

Script ini akan mengecek:
- ✅ Koneksi ke network Base Sepolia
- ✅ Backend wallet address dan balance
- ✅ Info kontrak MockIDRX (name, symbol, decimals)
- ✅ Apakah backend wallet punya MINTER_ROLE

### Output yang Diharapkan

Jika **sudah punya role**:
```
✅ Backend wallet HAS minter role!
✅ Backend can mint MockIDRX tokens
```

Jika **belum punya role**:
```
❌ Backend wallet DOES NOT have minter role!
❌ Backend CANNOT mint MockIDRX tokens

📝 To grant minter role:
1. Go to contract owner wallet
2. Call grantRole(MINTER_ROLE, 0xYourBackendAddress)
3. Or run: node scripts/grant-minter-role.js
```

## Langkah 2: Grant Minter Role (Jika Belum Ada)

### Persiapan

Anda membutuhkan:
1. **Private key dari contract owner** - Wallet yang deploy kontrak
2. **Backend wallet address** - Address yang akan diberi role

### Setup Environment Variables

Tambahkan di file `.env`:

```bash
# Owner wallet (yang deploy kontrak)
OWNER_PRIVATE_KEY=0xYOUR_OWNER_PRIVATE_KEY_HERE

# Backend wallet address (dapatkan dari BACKEND_PRIVATE_KEY)
BACKEND_WALLET_ADDRESS=0xYOUR_BACKEND_WALLET_ADDRESS_HERE
```

**PENTING**:
- `OWNER_PRIVATE_KEY` adalah private key dari wallet yang **deploy kontrak**
- `BACKEND_WALLET_ADDRESS` adalah address dari wallet backend (bukan private key!)

### Dapatkan Backend Wallet Address

Jika tidak tahu backend wallet address, jalankan:

```bash
node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet('GANTI_DENGAN_BACKEND_PRIVATE_KEY'); console.log(wallet.address)"
```

Atau gunakan nilai dari `check-mockidrx-role.js` output.

### Jalankan Grant Role Script

```bash
cd backends
node scripts/grant-minter-role.js
```

Script ini akan:
1. Connect menggunakan owner wallet
2. Check balance owner wallet (butuh ETH untuk gas)
3. Grant MINTER_ROLE ke backend wallet di 3 kontrak:
   - MockIDRX (ERC20)
   - BaseWheelsCars (ERC721)
   - BaseWheelsFragments (ERC1155)

### Output yang Diharapkan

```
🔐 Grant MINTER_ROLE Script
========================================

📡 Connecting to Base Sepolia...
✅ Owner wallet: 0x...

💰 Owner balance: 0.05 ETH

📝 Granting MINTER_ROLE...
   Backend wallet: 0x...

1️⃣ MockIDRX Contract (ERC20)...
   🔄 Granting MINTER_ROLE...
   ⏳ TX: 0x...
   ✅ MINTER_ROLE granted for MockIDRX contract!

2️⃣ Car Contract (ERC721)...
   ✅ Already has MINTER_ROLE for Car contract

3️⃣ Fragment Contract (ERC1155)...
   ✅ Already has MINTER_ROLE for Fragment contract

========================================
🎉 SUCCESS! Backend wallet can now mint NFTs!
========================================
```

## Langkah 3: Verifikasi

Jalankan lagi script check untuk memastikan:

```bash
node scripts/check-mockidrx-role.js
```

Sekarang seharusnya output:
```
✅ Backend wallet HAS minter role!
✅ Backend can mint MockIDRX tokens
```

## Troubleshooting

### Error: "No ETH for gas fees"

Owner wallet perlu ETH untuk gas. Dapatkan dari faucet:
```
https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
```

### Error: "You don't have permission to grant roles"

- Pastikan `OWNER_PRIVATE_KEY` adalah wallet yang deploy kontrak
- Cek dengan melihat contract di Basescan untuk tahu siapa owner

### Error: "AccessControl: account ... is missing role"

Owner wallet tidak memiliki permission untuk grant role. Ini terjadi jika:
- Kontrak menggunakan sistem permission berbeda
- Owner wallet bukan admin role

Solusi: Hubungi deployer kontrak asli untuk grant role.

### Contract Address Salah

Pastikan address kontrak di `.env` sesuai dengan yang di deploy:

```bash
MOCKIDRX_CONTRACT_ADDRESS=0x4bEe5C6495fdba24f708c749B46F099B38c9D998
FRAGMENT_CONTRACT_ADDRESS=0xf477FEcF885956eeCe8E84a1507D7b5Ef3Fae589
CAR_CONTRACT_ADDRESS=0x7AEE1BFE9fD152eA1f99818cB02E1bc64DBE8b7C
```

## Security Best Practices

1. **Jangan commit private key** ke git
2. **Hapus `OWNER_PRIVATE_KEY`** dari `.env` setelah grant role selesai
3. **Backup private key** di tempat aman (password manager, hardware wallet)
4. **Minimal ETH** di backend wallet (cukup untuk gas fees)
5. **Monitor transactions** di Basescan secara berkala

## Verifikasi di Blockchain

Anda juga bisa verify langsung di Basescan:

1. Buka kontrak di Basescan:
   - MockIDRX: https://sepolia.basescan.org/address/0x4bEe5C6495fdba24f708c749B46F099B38c9D998
2. Klik tab "Read Contract"
3. Panggil fungsi `hasRole` dengan:
   - `role`: `0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6` (MINTER_ROLE hash)
   - `account`: Backend wallet address Anda
4. Harusnya return `true`

## Summary Checklist

- [ ] Backend wallet punya ETH untuk gas (minimal 0.01 ETH)
- [ ] MockIDRX contract: Backend wallet punya MINTER_ROLE ✓
- [ ] Fragment contract: Backend wallet punya MINTER_ROLE ✓
- [ ] Car contract: Backend wallet punya MINTER_ROLE ✓
- [ ] Test check-in endpoint berhasil mint MockIDRX
- [ ] Test gacha endpoint berhasil burn MockIDRX
- [ ] OWNER_PRIVATE_KEY sudah dihapus dari .env

## Next Steps

Setelah semua role granted, Anda bisa:
1. Test backend API endpoints
2. Verifikasi transactions di Basescan
3. Monitor gas usage dan balance
4. Deploy ke production (Railway)

Untuk production, pastikan:
- Gunakan backend wallet yang berbeda (lebih aman)
- Fund backend wallet dengan ETH yang cukup
- Setup monitoring untuk low balance alerts
