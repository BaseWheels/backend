# Setup MockIDRX Contract - Ownable Pattern

## Masalah yang Ditemukan

Kontrak **MockIDRX menggunakan `Ownable`**, bukan `AccessControl`:
- ❌ Tidak ada `grantRole()` atau `MINTER_ROLE`
- ✅ Hanya **owner** yang bisa call `mintTreasury()`
- ✅ User burn token sendiri dengan `burn()`

## Solusi: Transfer Ownership ke Backend

Karena hanya owner yang bisa mint, backend wallet **HARUS** menjadi owner.

### Langkah 1: Prepare Environment

Tambahkan ke `.env`:

```bash
# Owner wallet current (yang deploy MockIDRX contract)
OWNER_PRIVATE_KEY=0xYOUR_CURRENT_OWNER_PRIVATE_KEY

# Backend wallet address (akan jadi owner baru)
BACKEND_WALLET_ADDRESS=0x92F9778c18D43b9721E58A7a634cb65eeA80661d
```

**Cara dapat Backend Wallet Address:**
```bash
node -e "const ethers = require('ethers'); const pk = process.env.BACKEND_PRIVATE_KEY || 'YOUR_BACKEND_PRIVATE_KEY'; const wallet = new ethers.Wallet(pk); console.log(wallet.address)"
```

### Langkah 2: Transfer Ownership

Jalankan script transfer ownership:

```bash
cd backends
node scripts/transfer-ownership.js
```

Script ini akan:
1. Verifikasi Anda adalah owner current
2. Tunggu 5 detik (waktu untuk cancel jika ragu)
3. Transfer ownership ke backend wallet
4. Verifikasi transfer berhasil

**Output yang diharapkan:**
```
✅ SUCCESS! Backend is now the owner!
```

### Langkah 3: Verifikasi Setup

Cek ownership dengan inspect script:

```bash
node scripts/inspect-mockidrx.js
```

Harus menampilkan:
```
2️⃣ Ownership Check:
   Contract Owner: 0x92F9778c18D43b9721E58A7a634cb65eeA80661d
   Is Backend Owner? ✅ YES
```

## Cara Kerja Sistem Baru

### Check-in Flow (Mint Tokens)

1. User hit `/api/check-in`
2. Backend wallet (sebagai owner) call `mintTreasury(userAddress, amount)`
3. User dapat MockIDRX tokens
4. Response: transaction hash + balance baru

✅ **WORKS** - Backend adalah owner, bisa mint

### Gacha Flow (Burn Tokens)

**PENTING**: Gacha memerlukan user approval!

1. **Frontend**: User harus approve backend wallet dulu:
   ```javascript
   const mockIDRXContract = new ethers.Contract(address, abi, signer);
   await mockIDRXContract.approve(BACKEND_WALLET_ADDRESS, ethers.MaxUint256);
   ```

2. User hit `/api/gacha/open`
3. Backend call `transferFrom(userAddress, backendAddress, amount)` - ambil tokens
4. Backend call `burn(amount)` - burn tokens yang diambil
5. Backend mint Car NFT
6. Response: car NFT + balance baru

⚠️ **REQUIRES APPROVAL** - User harus approve backend wallet

## Update Code yang Diperlukan

### 1. ABI Updated ✅

File: `backends/src/blockchain/config.ts`

```typescript
export const MOCKIDRX_CONTRACT_ABI = [
  // balanceOf, decimals, owner - tetap sama
  {
    "name": "mintTreasury",  // ✅ CHANGED dari "mint"
    // ...
  },
  {
    "name": "burn",  // ✅ CHANGED signature (no "from" param)
    "inputs": [{ "internalType": "uint256", "name": "amount" }]
    // ...
  }
]
```

### 2. Client Functions Updated ✅

File: `backends/src/blockchain/client.ts`

**mintMockIDRX():**
- Sekarang menggunakan `mintTreasury()`
- Requires backend wallet = owner

**burnMockIDRX():**
- Call `transferFrom()` untuk ambil tokens dari user
- Call `burn()` untuk burn tokens
- Requires user approval

### 3. Frontend: Add Approval Step

File: `frontend/src/lib/gachaApi.js` (atau di component)

Tambahkan function untuk approve:

```javascript
import { ethers } from "ethers";

const BACKEND_WALLET = "0x92F9778c18D43b9721E58A7a634cb65eeA80661d";
const MOCKIDRX_ADDRESS = "0x4bEe5C6495fdba24f708c749B46F099B38c9D998";

const ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

export async function approveMockIDRX(signer) {
  const contract = new ethers.Contract(MOCKIDRX_ADDRESS, ABI, signer);

  // Check current allowance
  const currentAllowance = await contract.allowance(
    await signer.getAddress(),
    BACKEND_WALLET
  );

  // If already approved, skip
  if (currentAllowance > 0) {
    console.log("Already approved");
    return;
  }

  // Approve max amount
  const tx = await contract.approve(BACKEND_WALLET, ethers.MaxUint256);
  await tx.wait();
  console.log("Approval successful!");
}
```

Panggil sebelum buka gacha:

```javascript
// Di gacha page
const handleOpenGacha = async () => {
  // 1. Approve dulu (one-time)
  if (embeddedWallet) {
    const provider = await embeddedWallet.getEthersProvider();
    const signer = provider.getSigner();
    await approveMockIDRX(signer);
  }

  // 2. Baru open gacha
  const result = await openGachaBox(boxType, authToken);
  // ...
}
```

## Alternative: Gunakan Faucet (Workaround)

Jika tidak mau handle approval yang kompleks, user bisa claim dari faucet:

**Smart Contract:**
```solidity
function claimFaucet() external {
  // User dapat 1 juta IDRX gratis setiap 24 jam
  // Langsung masuk ke wallet mereka
}
```

**Implementation:**
1. Tambahkan endpoint `/api/mockidrx/faucet`
2. Backend call `claimFaucet()` atas nama user (via user signature)
3. User dapat free MockIDRX tanpa backend mint

## Security Notes

### ⚠️ Owner Wallet = Backend Wallet

Setelah transfer ownership:
- Backend wallet adalah owner MockIDRX
- Owner wallet lama kehilangan semua privileges
- **BACKUP** backend private key dengan aman
- **FUND** backend wallet dengan ETH untuk gas

### 🔒 Best Practices

1. **Testnet Only**: Kontrak ini untuk Base Sepolia
2. **Secure Private Key**: Gunakan environment variables
3. **Monitor Balance**: Backend wallet perlu ETH untuk gas
4. **Rate Limiting**: Implement di backend untuk prevent abuse

## Testing Checklist

- [ ] Backend wallet adalah owner MockIDRX
- [ ] Backend wallet punya ETH untuk gas (min 0.01 ETH)
- [ ] Test check-in → Harus berhasil mint MockIDRX
- [ ] Test approval → User bisa approve backend wallet
- [ ] Test gacha → Harus berhasil burn MockIDRX dan mint Car
- [ ] Verify transactions di [Basescan](https://sepolia.basescan.org)

## Troubleshooting

### Error: "Ownable: caller is not the owner"

- Backend wallet belum jadi owner
- Jalankan `transfer-ownership.js`

### Error: "User must approve backend wallet"

- User belum approve backend untuk spend tokens
- Tambahkan approval step di frontend

### Error: "No ETH for gas fees"

- Backend wallet kehabisan ETH
- Top up dari [faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

## Summary

| Kontrak | Pattern | Mint Permission | Burn Permission |
|---------|---------|----------------|----------------|
| MockIDRX | Ownable | Owner only | User themselves |
| Fragment | AccessControl | MINTER_ROLE | MINTER_ROLE |
| Car | AccessControl | MINTER_ROLE | - |

**Action Items:**
1. ✅ Transfer MockIDRX ownership ke backend
2. ✅ Update ABI dan client functions
3. ⏳ Tambahkan approval di frontend gacha
4. ⏳ Test full flow check-in + gacha

